// =====================================================
// SCOOT FOOD - CUSTOMER ORDER SERVICES
// Backend logic untuk customer ScootFood
// =====================================================

import { supabase } from '../../core/supabase';

/**
 * CREATE ORDER - Customer buat pesanan baru
 */
export const createOrder = async (orderData) => {
  try {
    console.log('[ScootFood:Customer] Creating order:', orderData);

    const pesananStr = orderData.orderItems
      .map((item) => `${item.name} x${item.quantity}`)
      .join(', ');

    const detailPesanan = orderData.notes
      ? `${pesananStr}\n\nCatatan: ${orderData.notes}`
      : pesananStr;

    const { data, error } = await supabase
      .from('scoot_food')
      .insert({
        id_customer: orderData.customerId,
        lokasi_tujuan: orderData.lokasiCustomer,
        lokasi_resto: orderData.lokasiResto,
        tanggal: new Date().toISOString(),
        status: 'pending',
        biaya: orderData.biaya || 5000,
        detail_pesanan: detailPesanan,
        order_items: JSON.stringify(orderData.orderItems),
        catatan: orderData.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[ScootFood:Customer] ✅ Order created:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('[ScootFood:Customer] ❌ Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * GET ORDERS - Ambil semua pesanan customer
 */
export const getOrders = async (customerId) => {
  try {
    const { data, error } = await supabase
      .from('scoot_food')
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
 * GET ORDER BY ID - Ambil detail pesanan
 */
export const getOrderById = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('scoot_food')
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
 * UPDATE STATUS - Update status pesanan (cancel, dll)
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
 * GET ACTIVE ORDER - Cek apakah ada pesanan aktif
 */
export const getActiveOrder = async (customerId) => {
  try {
    const { data, error } = await supabase
      .from('scoot_food')
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
    .channel(`food-customer-${customerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_food',
        filter: `id_customer=eq.${customerId}`,
      },
      (payload) => {
        console.log('[ScootFood:Customer] Realtime event:', payload.eventType);
        callback(payload);
      }
    )
    .subscribe();

  return channel;
};

/**
 * UNSUBSCRIBE
 */
export const unsubscribe = async (channel) => {
  if (channel) {
    await supabase.removeChannel(channel);
  }
};
