import { supabase } from '../database/supabase';

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
 * ACCEPT ORDER - Driver terima pesanan
 */
export const acceptOrder = async (orderId, driverId) => {
  try {
    console.log('[acceptOrder] ===== STARTING ACCEPT ORDER =====');
    console.log('[acceptOrder] Order ID:', orderId, 'Type:', typeof orderId);
    console.log('[acceptOrder] Driver ID:', driverId, 'Type:', typeof driverId);

    // Keep orderId as is - it could be UUID or integer
    console.log('[acceptOrder] Using Order ID:', orderId);

    const { data, error } = await supabase
      .from('scoot_ride')
      .update({
        id_driver: driverId,
        status: 'accepted'
      })
      .eq('id', orderId) // Use as-is, Supabase will handle type
      .eq('status', 'pending') // Hanya bisa terima kalau masih pending
      .select()
      .single();

    if (error) {
      console.error('[acceptOrder] ❌ Supabase error:', error);
      throw error;
    }

    if (!data) {
      console.warn('[acceptOrder] ⚠️ No data returned - order might be taken already');
      return { success: false, error: 'Order sudah diambil driver lain' };
    }

    console.log('[acceptOrder] ✅ Order accepted successfully!');
    console.log('[acceptOrder] Updated row:', JSON.stringify(data, null, 2));
    console.log('[acceptOrder] New status:', data.status);
    console.log('[acceptOrder] Driver assigned:', data.id_driver);
    console.log('[acceptOrder] ===== ACCEPT ORDER COMPLETED =====');
    
    return { success: true, data };
  } catch (error) {
    console.error('[acceptOrder] ❌ Exception:', error);
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
 * COMPLETE ORDER - Driver selesaikan pesanan
 */
export const completeOrder = async (orderId) => {
  try {
    console.log('[completeOrder] Completing order', orderId);

    const { data, error } = await supabase
      .from('scoot_ride')
      .update({ status: 'completed' })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('[completeOrder] Error:', error);
      throw error;
    }

    console.log('[completeOrder] Order completed successfully');
    return { success: true, data };
  } catch (error) {
    console.error('[completeOrder] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * SUBSCRIBE TO PENDING ORDERS - Real-time untuk driver
 * Driver akan auto-refresh saat ada order baru atau status berubah
 * 
 * PENTING: Tidak pakai filter status karena kita perlu menangkap:
 * - INSERT (order baru pending)
 * - UPDATE dari pending ke cancelled/accepted (agar bisa hapus dari list)
 */
export const subscribeToPendingOrders = (callback) => {
  console.log('[subscribeToPendingOrders] Setting up real-time subscription (no filter)');

  const channel = supabase
    .channel('ride-all-orders')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_ride'
        // Tidak pakai filter agar menangkap semua perubahan termasuk cancel/accept
      },
      (payload) => {
        console.log('[subscribeToPendingOrders] Change detected:', payload.eventType, 'status:', payload.new?.status || payload.old?.status);
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
