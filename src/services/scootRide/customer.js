// =====================================================
// SCOOT RIDE - CUSTOMER ORDER SERVICES
// Backend logic untuk customer ScootRide
// =====================================================

import { supabase } from '../../core/supabase';

/**
 * CREATE ORDER - Customer buat pesanan ride
 */
export const createOrder = async (orderData) => {
  try {
    console.log('[ScootRide:Customer] Creating order:', orderData);

    const { data, error } = await supabase
      .from('scoot_ride')
      .insert({
        id_customer: orderData.customerId,
        lokasi_jemput: orderData.lokasiJemput,
        lokasi_turun: orderData.lokasiTujuan,
        tanggal: new Date().toISOString(),
        status: 'pending',
        biaya: orderData.biaya || 9000,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[ScootRide:Customer] ✅ Order created:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('[ScootRide:Customer] ❌ Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * GET ORDERS - Ambil semua pesanan customer
 */
export const getOrders = async (customerId) => {
  try {
    const { data, error } = await supabase
      .from('scoot_ride')
      .select(`
        *,
        driver:id_driver (nama, nim, email, jenis_motor, plat_motor, profile_image_url)
      `)
      .eq('id_customer', customerId)
      .order('tanggal', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * GET ORDER BY ID
 */
export const getOrderById = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('scoot_ride')
      .select(`
        *,
        driver:id_driver (nama, nim, email, jenis_motor, plat_motor, profile_image_url),
        customer:id_customer (nama, nim, email, profile_image_url)
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
 * UPDATE STATUS - Update status pesanan
 */
export const updateStatus = async (orderId, newStatus) => {
  try {
    const { data, error } = await supabase
      .from('scoot_ride')
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
 * GET ACTIVE ORDER - Cek apakah ada pesanan aktif
 */
export const getActiveOrder = async (customerId) => {
  try {
    const { data, error } = await supabase
      .from('scoot_ride')
      .select(`
        *,
        driver:id_driver (nama, nim, email, jenis_motor, plat_motor, profile_image_url)
      `)
      .eq('id_customer', customerId)
      .in('status', ['pending', 'accepted', 'ongoing', 'waiting_confirmation', 'waiting_payment'])
      .order('tanggal', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * SUBSCRIBE TO ORDERS - Realtime subscription
 */
export const subscribeToOrders = (customerId, callback) => {
  const channel = supabase
    .channel(`ride-customer-${customerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_ride',
        filter: `id_customer=eq.${customerId}`,
      },
      callback
    )
    .subscribe();

  return channel;
};

/**
 * UNSUBSCRIBE
 */
export const unsubscribe = async (channel) => {
  if (channel) await supabase.removeChannel(channel);
};
