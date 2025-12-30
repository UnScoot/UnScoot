import { supabase } from '../database/supabase';

/**
 * INSERT ORDER BARU - Customer pesan ride
 * CATATAN: Kolom id_driver HARUS sudah diset nullable di database!
 * Jalankan SQL ini di Supabase SQL Editor:
 * ALTER TABLE scoot_ride ALTER COLUMN id_driver DROP NOT NULL;
 */
export const createRideOrder = async (orderData) => {
  try {
    console.log('[createRideOrder] Creating order:', orderData);

    const { data, error } = await supabase
      .from('scoot_ride')
      .insert({
        id_customer: orderData.customerId,
        lokasi_jemput: orderData.lokasiJemput,
        lokasi_tujuan: orderData.lokasiTujuan,
        tanggal: new Date().toISOString(),
        status: 'pending',
        biaya: orderData.biaya || 9000,
        // id_driver TIDAK diisi - akan NULL sampai driver terima
      })
      .select()
      .single();

    if (error) {
      console.error('[createRideOrder] Supabase error:', error);
      throw error;
    }

    console.log('[createRideOrder] Order created successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[createRideOrder] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * GET CUSTOMER ORDERS - Customer lihat pesanan nya
 */
export const getCustomerOrders = async (customerId) => {
  try {
    console.log('[getCustomerOrders] Fetching for customer:', customerId);

    const { data, error } = await supabase
      .from('scoot_ride')
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
      console.error('[getCustomerOrders] Error:', error);
      throw error;
    }

    console.log(`[getCustomerOrders] Found ${data?.length || 0} orders`);
    return { success: true, data };
  } catch (error) {
    console.error('[getCustomerOrders] Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * UPDATE ORDER STATUS - Customer bisa cancel pesanan
 */
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    console.log('[updateOrderStatus] Updating order', orderId, 'to', newStatus);

    const { data, error } = await supabase
      .from('scoot_ride')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('[updateOrderStatus] Error:', error);
      throw error;
    }

    console.log('[updateOrderStatus] Status updated successfully');
    return { success: true, data };
  } catch (error) {
    console.error('[updateOrderStatus] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * SUBSCRIBE TO CUSTOMER ORDERS - Real-time untuk customer
 * Customer akan auto-update saat status berubah
 */
export const subscribeToCustomerOrders = (customerId, callback) => {
  console.log(
    '[subscribeToCustomerOrders] Setting up subscription for customer:',
    customerId
  );

  const channel = supabase
    .channel(`customer-orders-${customerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_ride',
        filter: `id_customer=eq.${customerId}`,
      },
      (payload) => {
        console.log('[subscribeToCustomerOrders] ===== REALTIME EVENT =====');
        console.log('[subscribeToCustomerOrders] Event:', payload.eventType);
        console.log('[subscribeToCustomerOrders] Payload:', JSON.stringify(payload, null, 2));
        console.log('[subscribeToCustomerOrders] =========================');
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[subscribeToCustomerOrders] Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('[subscribeToCustomerOrders] ✅ Successfully subscribed!');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[subscribeToCustomerOrders] ❌ Subscription error!');
      } else if (status === 'TIMED_OUT') {
        console.error('[subscribeToCustomerOrders] ⏱️ Subscription timed out!');
      }
    });

  return channel;
};

/**
 * UNSUBSCRIBE - Cleanup subscription
 */
export const unsubscribe = async (channel) => {
  if (channel) {
    console.log('[unsubscribe] Removing subscription');
    await supabase.removeChannel(channel);
  }
};
