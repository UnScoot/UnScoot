import { supabase } from '../database/supabase';

export const createSendOrder = async (orderData) => {
  try {
    console.log('[createSendOrder] Creating order:', orderData);

    // Build an initial payload that includes common column name variants.
    // We'll attempt to insert and, if Supabase reports a missing column (PGRST204),
    // remove that column from the payload and retry. This adapts to small schema
    // differences without requiring DB migrations immediately.
    let payload = {
      id_customer: orderData.customerId,
      lokasi_jemput_barang:
        orderData.lokasiJemput || orderData.lokasiJemputBarang || null,
      lokasi_jemput:
        orderData.lokasiJemput || orderData.lokasiJemputBarang || null,
      lokasi_tujuan: orderData.lokasiTujuan || null,
      nama_penerima: orderData.namaPenerima || null,
      berat: orderData.berat || orderData.beratBarang || null,
      kategori_barang: orderData.kategoriBarang || null,
      tanggal: new Date().toISOString(),
      status: 'pending',
      biaya: orderData.biaya || 12000,
    };

    let data, error;
    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await supabase
        .from('scoot_send')
        .insert(payload)
        .select()
        .single();
      data = res.data;
      error = res.error;
      if (!error) break;

      // If the error indicates a missing column (PostgREST PGRST204), remove that
      // column from the payload and retry. Example message: "Could not find the 'lokasi_jemput' column"
      if (error && error.code === 'PGRST204' && error.message) {
        const m = error.message.match(/Could not find the '([^']+)' column/);
        if (m && m[1]) {
          const col = m[1];
          console.warn(
            `[createSendOrder] Attempt ${attempt}: column missing: ${col}, removing and retrying`
          );
          if (Object.prototype.hasOwnProperty.call(payload, col)) {
            delete payload[col];
          } else {
            // Try removing common mapping variants if direct key not present
            const variants = {
              lokasi_jemput: ['lokasi_jemput', 'lokasi_jemput_barang'],
              lokasi_jemput_barang: ['lokasi_jemput_barang', 'lokasi_jemput'],
              berat: ['berat', 'berat_barang'],
              kategori_barang: ['kategori_barang', 'kategori'],
            };
            for (const key of variants[col] || []) {
              if (Object.prototype.hasOwnProperty.call(payload, key))
                delete payload[key];
            }
          }
          if (attempt === maxAttempts) {
            console.error(
              '[createSendOrder] reached max attempts, throwing last error',
              error
            );
            throw error;
          }
          // continue to next attempt
          continue;
        }
      }

      // For other errors that we cannot auto-resolve, rethrow so caller can inspect.
      console.error(
        '[createSendOrder] Insert failed with non-recoverable error:',
        error
      );
      throw error;
    }

    if (error) {
      console.error('[createSendOrder] Supabase error:', error);
      throw error;
    }

    console.log('[createSendOrder] Order created successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[createSendOrder] Exception:', error);
    return { success: false, error: error.message };
  }
};

export const getPendingSendOrders = async () => {
  try {
    console.log('[getPendingSendOrders] Loading pending send orders');
    const { data, error } = await supabase
      .from('scoot_send')
      .select(`*, customer:id_customer (nama, email)`)
      .eq('status', 'pending')
      .order('tanggal', { ascending: false });

    if (error) {
      console.error('[getPendingSendOrders] Error:', error);
      throw error;
    }

    // Map rows to a consistent shape expected by driver UI
    const mapped = (data || []).map((row) => ({
      id: row.id,
      time: row.tanggal || null,
      pickup: row.lokasi_jemput || row.lokasi_jemput_barang || null,
      destination: row.lokasi_tujuan || null,
      biaya: row.biaya || null,
      price: row.biaya || null,
      customer: row.customer || null,
      id_customer: row.id_customer,
      berat: row.berat || null,
      kategori_barang: row.kategori_barang || null,
    }));

    return { success: true, data: mapped };
  } catch (error) {
    console.error('[getPendingSendOrders] Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const subscribeToPendingSendOrders = (callback) => {
  console.log('[subscribeToPendingSendOrders] Setting up subscription (no filter)');
  const channel = supabase
    .channel('send-all-orders')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_send'
        // Tidak pakai filter agar menangkap semua perubahan termasuk cancel/accept
      },
      (payload) => {
        console.log('[subscribeToPendingSendOrders] Event:', payload.eventType, 'status:', payload.new?.status || payload.old?.status);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[subscribeToPendingSendOrders] status:', status);
    });

  return channel;
};

export const unsubscribe = async (channel) => {
  if (channel) {
    console.log('[scootSendMemesan.unsubscribe] Removing subscription');
    await supabase.removeChannel(channel);
  }
};

/**
 * UPDATE ORDER STATUS - Customer can cancel or other status updates
 */
export const updateSendOrderStatus = async (orderId, newStatus) => {
  try {
    const { data, error } = await supabase
      .from('scoot_send')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('[updateSendOrderStatus] Error:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('[updateSendOrderStatus] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * SUBSCRIBE TO CUSTOMER ORDERS - Real-time updates for a specific customer's orders
 */
export const subscribeToCustomerSendOrders = (customerId, callback) => {
  console.log(
    '[subscribeToCustomerSendOrders] Setting up subscription for customer:',
    customerId
  );

  const channel = supabase
    .channel(`customer-send-orders-${customerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_send',
        filter: `id_customer=eq.${customerId}`,
      },
      (payload) => {
        console.log(
          '[subscribeToCustomerSendOrders] Event:',
          payload.eventType
        );
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[subscribeToCustomerSendOrders] status:', status);
    });

  return channel;
};
