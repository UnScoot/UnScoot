import { supabase } from '../database/supabase';

/**
 * INSERT ORDER BARU - Customer pesan ScootFood
 * CATATAN: Kolom id_driver HARUS sudah diset nullable di database!
 *
 * Struktur tabel scoot_food (sesuai schema Supabase):
 * - id (uuid)
 * - id_customer (uuid)
 * - id_driver (uuid, nullable)
 * - tanggal (timestamptz)
 * - lokasi_resto (text)
 * - lokasi_tujuan (text) - lokasi customer/pengantaran
 * - detail_pesanan (text) - item pesanan + catatan
 * - status (text)
 * - biaya (numeric)
 * - rating (real)
 */
export const createFoodOrder = async (orderData) => {
  try {
    console.log('[ScootFood-createOrder] Creating order:', orderData);

    // Format order items + catatan ke string detail_pesanan
    const pesananStr = orderData.orderItems
      .map((item) => `${item.name} x${item.quantity}`)
      .join(', ');

    // Gabungkan pesanan dengan catatan
    const detailPesanan = orderData.notes
      ? `${pesananStr}\n\nCatatan: ${orderData.notes}`
      : pesananStr;

    const { data, error } = await supabase
      .from('scoot_food')
      .insert({
        id_customer: orderData.customerId,
        lokasi_tujuan: orderData.lokasiCustomer, // lokasi pengantaran
        lokasi_resto: orderData.lokasiResto,
        tanggal: new Date().toISOString(),
        status: 'pending',
        biaya: orderData.biaya || 5000,
        detail_pesanan: detailPesanan,
        // order_items removed - not in schema, detailed in detail_pesanan
        // catatan removed - already included in detail_pesanan
        // id_driver TIDAK diisi - akan NULL sampai driver terima
      })
      .select()
      .single();

    if (error) {
      console.error('[ScootFood-createOrder] Supabase error:', error);
      throw error;
    }

    console.log('[ScootFood-createOrder] Order created successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[ScootFood-createOrder] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * GET CUSTOMER ORDERS - Customer lihat pesanan nya
 */
export const getCustomerFoodOrders = async (customerId) => {
  try {
    console.log(
      '[ScootFood-getCustomerOrders] Fetching for customer:',
      customerId
    );

    const { data, error } = await supabase
      .from('scoot_food')
      .select(
        `
        *,
        driver:id_driver (
          nama,
          nim,
          email,
          jenis_motor,
          plat_motor,
          profile_image_url
        )
      `
      )
      .eq('id_customer', customerId)
      .order('tanggal', { ascending: false });

    if (error) {
      console.error('[ScootFood-getCustomerOrders] Error:', error);
      throw error;
    }

    console.log(
      `[ScootFood-getCustomerOrders] Found ${data?.length || 0} orders`
    );
    return { success: true, data };
  } catch (error) {
    console.error('[ScootFood-getCustomerOrders] Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * GET SINGLE ORDER BY ID
 */
export const getFoodOrderById = async (orderId) => {
  try {
    console.log('[ScootFood-getOrderById] Fetching order:', orderId);

    const { data, error } = await supabase
      .from('scoot_food')
      .select(
        `
        *,
        driver:id_driver (
          nama,
          nim,
          email,
          jenis_motor,
          plat_motor,
          profile_image_url
        ),
        customer:id_customer (
          nama,
          nim,
          email,
          profile_image_url
        )
      `
      )
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('[ScootFood-getOrderById] Error:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('[ScootFood-getOrderById] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * UPDATE ORDER STATUS - Customer bisa cancel pesanan
 */
export const updateFoodOrderStatus = async (orderId, newStatus) => {
  try {
    console.log(
      '[ScootFood-updateOrderStatus] Updating order',
      orderId,
      'to',
      newStatus
    );

    const { data, error } = await supabase
      .from('scoot_food')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('[ScootFood-updateOrderStatus] Error:', error);
      throw error;
    }

    console.log('[ScootFood-updateOrderStatus] Status updated successfully');
    return { success: true, data };
  } catch (error) {
    console.error('[ScootFood-updateOrderStatus] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * SUBSCRIBE TO CUSTOMER FOOD ORDERS - Real-time untuk customer
 * Customer akan auto-update saat status berubah (driver terima, dll)
 */
export const subscribeToCustomerFoodOrders = (customerId, callback) => {
  console.log(
    '[ScootFood-subscribe] Setting up subscription for customer:',
    customerId
  );

  const channel = supabase
    .channel(`food-customer-orders-${customerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_food',
        filter: `id_customer=eq.${customerId}`,
      },
      (payload) => {
        console.log('[ScootFood-subscribe] ===== REALTIME EVENT =====');
        console.log('[ScootFood-subscribe] Event:', payload.eventType);
        console.log(
          '[ScootFood-subscribe] Payload:',
          JSON.stringify(payload, null, 2)
        );
        console.log('[ScootFood-subscribe] =========================');
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[ScootFood-subscribe] Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('[ScootFood-subscribe] ✅ Successfully subscribed!');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[ScootFood-subscribe] ❌ Subscription error!');
      } else if (status === 'TIMED_OUT') {
        console.error('[ScootFood-subscribe] ⏱️ Subscription timed out!');
      }
    });

  return channel;
};

/**
 * UNSUBSCRIBE - Cleanup subscription
 */
export const unsubscribeFood = async (channel) => {
  if (channel) {
    console.log('[ScootFood-unsubscribe] Removing channel');
    await supabase.removeChannel(channel);
  }
};

/**
 * GET ACTIVE ORDER FOR CUSTOMER - Cek apakah ada pesanan aktif
 */
export const getActiveOrderForCustomer = async (customerId) => {
  try {
    console.log(
      '[ScootFood-getActiveOrder] Fetching active order for:',
      customerId
    );

    const { data, error } = await supabase
      .from('scoot_food')
      .select(
        `
        *,
        driver:id_driver (
          nama,
          nim,
          email,
          jenis_motor,
          plat_motor,
          profile_image_url
        )
      `
      )
      .eq('id_customer', customerId)
      .in('status', [
        'pending',
        'accepted',
        'ongoing',
        'waiting_confirmation',
        'waiting_payment',
      ])
      .order('tanggal', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[ScootFood-getActiveOrder] Error:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('[ScootFood-getActiveOrder] Exception:', error);
    return { success: false, error: error.message };
  }
};
