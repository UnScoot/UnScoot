import { supabase } from '../database/supabase';

/**
 * GET ALL PENDING ORDERS - Driver lihat pesanan ScootFood yang belum diambil
 */
export const getPendingOrders = async () => {
  try {
    console.log('[ScootFood-getPendingOrders] Fetching pending orders...');

    const { data, error } = await supabase
      .from('scoot_food')
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
      console.error('[ScootFood-getPendingOrders] Error:', error);
      throw error;
    }

    console.log(`[ScootFood-getPendingOrders] Found ${data?.length || 0} pending orders`);
    return { success: true, data };
  } catch (error) {
    console.error('[ScootFood-getPendingOrders] Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * GET DRIVER'S ACTIVE ORDERS - Driver lihat pesanan ScootFood yang dia terima
 */
export const getDriverActiveOrders = async (driverId) => {
  try {
    console.log('[ScootFood-getDriverActiveOrders] Fetching for driver:', driverId);

    const { data, error } = await supabase
      .from('scoot_food')
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
      .in('status', ['accepted', 'ongoing', 'waiting_confirmation', 'waiting_payment'])
      .order('tanggal', { ascending: false });

    if (error) {
      console.error('[ScootFood-getDriverActiveOrders] Error:', error);
      throw error;
    }

    console.log(`[ScootFood-getDriverActiveOrders] Found ${data?.length || 0} active orders`);
    return { success: true, data };
  } catch (error) {
    console.error('[ScootFood-getDriverActiveOrders] Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * ACCEPT ORDER - Driver terima pesanan ScootFood
 */
export const acceptOrder = async (orderId, driverId) => {
  try {
    console.log('[ScootFood-acceptOrder] ===== STARTING ACCEPT ORDER =====');
    console.log('[ScootFood-acceptOrder] Order ID:', orderId, 'Type:', typeof orderId);
    console.log('[ScootFood-acceptOrder] Driver ID:', driverId, 'Type:', typeof driverId);

    const { data, error } = await supabase
      .from('scoot_food')
      .update({
        id_driver: driverId,
        status: 'accepted'
      })
      .eq('id', orderId)
      .eq('status', 'pending') // Hanya bisa terima kalau masih pending
      .select()
      .single();

    if (error) {
      console.error('[ScootFood-acceptOrder] ❌ Supabase error:', error);
      throw error;
    }

    if (!data) {
      console.warn('[ScootFood-acceptOrder] ⚠️ No data returned - order might be taken already');
      return { success: false, error: 'Order sudah diambil driver lain' };
    }

    console.log('[ScootFood-acceptOrder] ✅ Order accepted successfully!');
    console.log('[ScootFood-acceptOrder] Updated row:', JSON.stringify(data, null, 2));
    console.log('[ScootFood-acceptOrder] New status:', data.status);
    console.log('[ScootFood-acceptOrder] Driver assigned:', data.id_driver);
    console.log('[ScootFood-acceptOrder] ===== ACCEPT ORDER COMPLETED =====');
    
    return { success: true, data };
  } catch (error) {
    console.error('[ScootFood-acceptOrder] ❌ Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * GET ORDER BY ID - Ambil detail pesanan
 */
export const getOrderById = async (orderId) => {
  try {
    console.log('[ScootFood-getOrderById] Fetching order:', orderId);

    const { data, error } = await supabase
      .from('scoot_food')
      .select(`
        *,
        customer:id_customer (
          nama,
          nim,
          email,
          profile_image_url
        ),
        driver:id_driver (
          nama,
          nim,
          email,
          profile_image_url
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('[ScootFood-getOrderById] Error:', error);
      throw error;
    }

    console.log('[ScootFood-getOrderById] Order found:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('[ScootFood-getOrderById] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * UPDATE ORDER STATUS - Update status pesanan
 */
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    console.log('[ScootFood-updateOrderStatus] Updating order', orderId, 'to', newStatus);

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
 * SUBSCRIBE TO PENDING ORDERS - Real-time subscription untuk pesanan baru
 * 
 * PENTING: Tidak pakai filter status karena kita perlu menangkap:
 * - INSERT (order baru pending)
 * - UPDATE dari pending ke cancelled/accepted (agar bisa hapus dari list)
 */
export const subscribeToPendingOrders = (callback) => {
  console.log('[ScootFood-subscribeToPendingOrders] Setting up subscription (no filter)...');
  
  const channel = supabase
    .channel('scoot_food_all_orders')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_food'
        // Tidak pakai filter agar menangkap semua perubahan termasuk cancel/accept
      },
      (payload) => {
        console.log('[ScootFood-subscribeToPendingOrders] Change received:', payload.eventType, 'status:', payload.new?.status || payload.old?.status);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[ScootFood-subscribeToPendingOrders] Subscription status:', status);
    });

  return channel;
};

/**
 * SUBSCRIBE TO ORDER STATUS CHANGES - Real-time subscription untuk order tertentu
 */
export const subscribeToOrderStatus = (orderId, callback) => {
  console.log('[ScootFood-subscribeToOrderStatus] Setting up for order:', orderId);
  
  const channel = supabase
    .channel(`scoot_food_order_${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scoot_food',
        filter: `id=eq.${orderId}`
      },
      (payload) => {
        console.log('[ScootFood-subscribeToOrderStatus] Order updated:', payload.new?.status);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[ScootFood-subscribeToOrderStatus] Subscription status:', status);
    });

  return channel;
};

/**
 * UNSUBSCRIBE - Remove subscription
 */
export const unsubscribe = (channel) => {
  if (channel) {
    console.log('[ScootFood-unsubscribe] Removing subscription');
    supabase.removeChannel(channel);
  }
};

/**
 * GET ACTIVE ORDER FOR DRIVER - Check if driver has active order
 */
export const getActiveOrderForDriver = async (driverId) => {
  try {
    console.log('[ScootFood-getActiveOrderForDriver] Checking for driver:', driverId);

    const { data, error } = await supabase
      .from('scoot_food')
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
      .in('status', ['accepted', 'ongoing', 'waiting_confirmation', 'waiting_payment'])
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[ScootFood-getActiveOrderForDriver] Error:', error);
      throw error;
    }

    if (data) {
      console.log('[ScootFood-getActiveOrderForDriver] Active order found:', data.id);
      return { success: true, data };
    }

    console.log('[ScootFood-getActiveOrderForDriver] No active order');
    return { success: true, data: null };
  } catch (error) {
    console.error('[ScootFood-getActiveOrderForDriver] Exception:', error);
    return { success: false, error: error.message };
  }
};
