import { supabase } from './supabase';

/**
 * INSERT ORDER BARU - Customer pesan ride
 */
export const createRideOrder = async (orderData) => {
  try {
    console.log('[createRideOrder] Creating order:', orderData);

    const { data, error } = await supabase
      .from('scoot_ride')
      .insert([{
        id_customer: orderData.customerId,
        lokasi_jemput: orderData.lokasiJemput,
        lokasi_tujuan: orderData.lokasiTujuan,
        tanggal: orderData.tanggal || new Date().toISOString(),
        status: 'pending', // Status awal: pending
        biaya: orderData.biaya || 9000
      }])
      .select()
      .single();

    if (error) {
      console.error('[createRideOrder] Error:', error);
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
 * GET ALL PENDING ORDERS - Driver lihat pesanan yang belum diambil
 */
export const getPendingOrders = async () => {
  try {
    console.log('[getPendingOrders] Fetching pending orders...');

    const { data, error } = await supabase
      .from('scoot_ride')
      .select(`
        *,
        customer:id_customer (
          nama,
          nim,
          email,
          profile_image_url
        )
      `)
      .eq('status', 'pending')
      .order('tanggal', { ascending: false });

    if (error) {
      console.error('[getPendingOrders] Error:', error);
      throw error;
    }

    console.log(`[getPendingOrders] Found ${data?.length || 0} pending orders`);
    return { success: true, data };
  } catch (error) {
    console.error('[getPendingOrders] Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * GET DRIVER'S ACTIVE ORDERS - Driver lihat pesanan yang dia terima
 */
export const getDriverActiveOrders = async (driverId) => {
  try {
    console.log('[getDriverActiveOrders] Fetching for driver:', driverId);

    const { data, error } = await supabase
      .from('scoot_ride')
      .select(`
        *,
        customer:id_customer (
          nama,
          nim,
          email,
          profile_image_url
        )
      `)
      .eq('id_driver', driverId)
      .in('status', ['accepted', 'ongoing'])
      .order('tanggal', { ascending: false });

    if (error) {
      console.error('[getDriverActiveOrders] Error:', error);
      throw error;
    }

    console.log(`[getDriverActiveOrders] Found ${data?.length || 0} active orders`);
    return { success: true, data };
  } catch (error) {
    console.error('[getDriverActiveOrders] Exception:', error);
    return { success: false, error: error.message, data: [] };
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
      .select(`
        *,
        driver:id_driver (
          nama,
          nim,
          email,
          jenis_motor,
          plat_motor,
          profile_image_url
        )
      `)
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
 * ACCEPT ORDER - Driver terima pesanan
 */
export const acceptOrder = async (orderId, driverId) => {
  try {
    console.log('[acceptOrder] Driver', driverId, 'accepting order', orderId);

    const { data, error } = await supabase
      .from('scoot_ride')
      .update({
        id_driver: driverId,
        status: 'accepted'
      })
      .eq('id', orderId)
      .eq('status', 'pending') // Hanya bisa terima kalau masih pending
      .select()
      .single();

    if (error) {
      console.error('[acceptOrder] Error:', error);
      throw error;
    }

    if (!data) {
      console.warn('[acceptOrder] Order sudah diambil driver lain');
      return { success: false, error: 'Order sudah diambil driver lain' };
    }

    console.log('[acceptOrder] Order accepted successfully');
    return { success: true, data };
  } catch (error) {
    console.error('[acceptOrder] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * REJECT ORDER - Driver tolak pesanan
 */
export const rejectOrder = async (orderId) => {
  try {
    console.log('[rejectOrder] Rejecting order', orderId);

    const { data, error } = await supabase
      .from('scoot_ride')
      .update({ status: 'rejected' })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('[rejectOrder] Error:', error);
      throw error;
    }

    console.log('[rejectOrder] Order rejected successfully');
    return { success: true, data };
  } catch (error) {
    console.error('[rejectOrder] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * UPDATE ORDER STATUS - Update status pesanan (ongoing, completed, cancelled)
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
 * SUBSCRIBE TO PENDING ORDERS - Real-time untuk driver
 * Driver akan auto-refresh saat ada order baru
 */
export const subscribeToPendingOrders = (callback) => {
  console.log('[subscribeToPendingOrders] Setting up real-time subscription');

  const channel = supabase
    .channel('pending-orders')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_ride',
        filter: 'status=eq.pending'
      },
      (payload) => {
        console.log('[subscribeToPendingOrders] Change detected:', payload);
        callback(payload);
      }
    )
    .subscribe();

  return channel;
};

/**
 * SUBSCRIBE TO CUSTOMER ORDERS - Real-time untuk customer
 * Customer akan auto-update saat status berubah
 */
export const subscribeToCustomerOrders = (customerId, callback) => {
  console.log('[subscribeToCustomerOrders] Setting up subscription for customer:', customerId);

  const channel = supabase
    .channel(`customer-orders-${customerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_ride',
        filter: `id_customer=eq.${customerId}`
      },
      (payload) => {
        console.log('[subscribeToCustomerOrders] Change detected:', payload);
        callback(payload);
      }
    )
    .subscribe();

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
