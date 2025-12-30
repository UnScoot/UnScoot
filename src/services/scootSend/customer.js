// =====================================================
// SCOOT SEND - CUSTOMER ORDER SERVICES
// Backend logic untuk customer ScootSend
// =====================================================

import { supabase } from '../../core/supabase';

/**
 * CREATE ORDER - Customer buat pesanan send
 */
export const createOrder = async (orderData) => {
  try {
    console.log('[ScootSend:Customer] Creating order:', orderData);

    const { data, error } = await supabase
      .from('scoot_send')
      .insert({
        id_customer: orderData.customerId,
        lokasi_jemput_barang: orderData.lokasiJemput,
        lokasi_tujuan: orderData.lokasiTujuan,
        nama_penerima: orderData.namaPenerima,
        no_telp_penerima: orderData.noTelpPenerima,
        detail_barang: orderData.detailBarang,
        tanggal: new Date().toISOString(),
        status: 'pending',
        biaya: orderData.biaya || 8000,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[ScootSend:Customer] ✅ Order created:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('[ScootSend:Customer] ❌ Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * GET ORDERS - Ambil semua pesanan customer
 */
export const getOrders = async (customerId) => {
  try {
    const { data, error } = await supabase
      .from('scoot_send')
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
      .from('scoot_send')
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
 * UPDATE STATUS
 */
export const updateStatus = async (orderId, newStatus) => {
  try {
    const { data, error } = await supabase
      .from('scoot_send')
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
      .from('scoot_send')
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
    .channel(`send-customer-${customerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scoot_send',
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
