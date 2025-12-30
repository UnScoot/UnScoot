// =====================================================
// SCOOT FOOD - DRIVER ORDER SERVICES
// Backend logic untuk driver ScootFood
// =====================================================

import { supabase } from '../../core/supabase';

/**
 * GET PENDING ORDERS - Ambil semua pesanan pending
 */
export const getPendingOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('scoot_food')
      .select(`
        *,
        customer:id_customer (nama, nim, email, profile_image_url)
      `)
      .eq('status', 'pending')
      .order('tanggal', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * GET ACTIVE ORDERS - Pesanan yang sedang dikerjakan driver
 */
export const getActiveOrders = async (driverId) => {
  try {
    const { data, error } = await supabase
      .from('scoot_food')
      .select(`
        *,
        customer:id_customer (nama, nim, email, profile_image_url)
      `)
      .eq('id_driver', driverId)
      .in('status', ['accepted', 'ongoing', 'waiting_confirmation', 'waiting_payment'])
      .order('tanggal', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * ACCEPT ORDER - Driver terima pesanan
 */
export const acceptOrder = async (orderId, driverId) => {
  try {
    console.log('[ScootFood:Driver] Accepting order:', orderId);

    const { data, error } = await supabase
      .from('scoot_food')
      .update({
        id_driver: driverId,
        status: 'accepted'
      })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Order sudah diambil driver lain' };

    console.log('[ScootFood:Driver] ✅ Order accepted');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * GET ORDER BY ID
 */
export const getOrderById = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('scoot_food')
      .select(`
        *,
        customer:id_customer (nama, nim, email, profile_image_url),
        driver:id_driver (nama, nim, email, profile_image_url)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * UPDATE STATUS
 */
export const updateStatus = async (orderId, newStatus) => {
  try {
    const { data, error } = await supabase
      .from('scoot_food')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * GET ACTIVE ORDER - Cek apakah driver punya pesanan aktif
 */
export const getActiveOrder = async (driverId) => {
  try {
    const { data, error } = await supabase
      .from('scoot_food')
      .select(`
        *,
        customer:id_customer (nama, nim, email, profile_image_url)
      `)
      .eq('id_driver', driverId)
      .in('status', ['accepted', 'ongoing', 'waiting_confirmation', 'waiting_payment'])
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * SUBSCRIBE TO PENDING ORDERS
 * Tanpa filter status agar menangkap semua perubahan (cancel, accept, dll)
 */
export const subscribeToPending = (callback) => {
  const channel = supabase
    .channel('food-pending-orders-all')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_food'
        // Tidak pakai filter agar menangkap cancel/accept
      },
      callback
    )
    .subscribe();

  return channel;
};

/**
 * SUBSCRIBE TO ORDER STATUS
 */
export const subscribeToOrder = (orderId, callback) => {
  const channel = supabase
    .channel(`food-order-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scoot_food',
        filter: `id=eq.${orderId}`
      },
      callback
    )
    .subscribe();

  return channel;
};

/**
 * UNSUBSCRIBE
 */
export const unsubscribe = (channel) => {
  if (channel) supabase.removeChannel(channel);
};
