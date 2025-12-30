import { supabase } from './supabase';

/**
 * SEND MESSAGE - Kirim pesan chat
 * Struktur table chat_ride (actual Supabase schema):
 * - id (uuid, primary key)
 * - id_scoot_ride (uuid, foreign key)
 * - chat (text) - pesan
 * - tanggal (timestamptz)
 */
export const sendMessage = async (messageData) => {
  try {
    console.log('[sendMessage] Sending message:', messageData);

    const payload = {
      id_scoot_ride: messageData.orderId,
      chat: messageData.message || '',
      tanggal: new Date().toISOString(),
      image_url: messageData.imageUrl || null, // Support for chat images
    };

    const { data, error } = await supabase
      .from('chat_ride')
      .insert([payload])
      .select();

    if (error) {
      console.error('[sendMessage] Error:', error);
      throw error;
    }

    console.log('[sendMessage] Message sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[sendMessage] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * GET MESSAGES - Ambil semua pesan untuk order tertentu
 * @param {string} orderId - ID order (scoot_ride)
 * @param {string} currentUserId - ID user saat ini (untuk menentukan siapa yang mengirim)
 */
export const getMessages = async (orderId, currentUserId) => {
  try {
    console.log('[getMessages] Fetching messages for order:', orderId);

    const { data, error } = await supabase
      .from('chat_ride')
      .select('id, chat, tanggal, image_url')
      .eq('id_scoot_ride', orderId)
      .order('tanggal', { ascending: true });

    if (error) {
      console.error('[getMessages] Error:', error);
      throw error;
    }

    // Transform to message format
    const messages = data?.map((row) => ({
      id: row.id,
      text: row.chat,
      timestamp: row.tanggal,
      imageUrl: row.image_url || null, // Chat image URL
      sentBy: 'other',
    })) || [];

    console.log(`[getMessages] Loaded ${messages.length} messages`);
    return { success: true, data: messages };
  } catch (error) {
    console.error('[getMessages] Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * SUBSCRIBE TO MESSAGES - Real-time subscription untuk chat
 * @param {string} orderId - ID order
 * @param {Function} callback - Function yang dipanggil saat ada pesan baru
 */
export const subscribeToMessages = (orderId, callback) => {
  console.log('[subscribeToMessages] Setting up subscription for order:', orderId);

  const channel = supabase
    .channel(`chat-ride-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_ride',
        filter: `id_scoot_ride=eq.${orderId}`,
      },
      (payload) => {
        console.log('[subscribeToMessages] New message received:', payload.new);
        
        const newRow = payload.new;
        const message = {
          id: newRow.id,
          text: newRow.chat,
          timestamp: newRow.tanggal,
          imageUrl: newRow.image_url || null,
        };

        callback({ new: message });
      }
    )
    .subscribe((status) => {
      console.log('[subscribeToMessages] Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('[subscribeToMessages] ✅ Successfully subscribed to chat!');
      }
    });

  return channel;
};

/**
 * GET USER PROFILE - Ambil nama dan foto user
 * @param {string} userId - ID user (customer atau driver)
 * @param {string} userRole - 'customer' atau 'driver'
 */
export const getUserProfile = async (userId, userRole) => {
  try {
    if (!userId || !userRole) {
      return { success: false, error: 'Missing userId or userRole' };
    }

    const table = userRole === 'driver' ? 'driver' : 'customer';
    
    const { data, error } = await supabase
      .from(table)
      .select('nama, profile_image_url')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[getUserProfile] Error fetching profile:', error);
      return { success: false, error: error.message, data: null };
    }

    console.log('[getUserProfile] Profile loaded:', { nama: data?.nama, foto: data?.profile_image_url });
    return { success: true, data };
  } catch (error) {
    console.error('[getUserProfile] Exception:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * UNSUBSCRIBE - Cleanup subscription
 */
export const unsubscribeFromMessages = async (channel) => {
  if (channel) {
    console.log('[unsubscribeFromMessages] Unsubscribing from channel');
    await supabase.removeChannel(channel);
  }
};

/**
 * GET ACTIVE ORDER - Cek apakah customer punya pesanan aktif (accepted/ongoing/waiting_confirmation/waiting_payment)
 * @param {string} customerId - ID customer
 * @returns {object} Active order dengan detail driver atau null jika tidak ada
 */
export const getActiveOrderForCustomer = async (customerId) => {
  try {
    if (!customerId) {
      return { success: false, error: 'Missing customerId', data: null };
    }

    // Query scoot_ride dengan status yang masih aktif
    const { data, error } = await supabase
      .from('scoot_ride')
      .select(`
        id,
        id_customer,
        id_driver,
        lokasi_jemput,
        lokasi_tujuan,
        status,
        biaya,
        driver:id_driver(id, nama, profile_image_url)
      `)
      .eq('id_customer', customerId)
      .in('status', ['accepted', 'ongoing', 'waiting_confirmation', 'waiting_payment'])
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is OK
      console.error('[getActiveOrderForCustomer] Error:', error);
      return { success: false, error: error.message, data: null };
    }

    if (!data) {
      console.log('[getActiveOrderForCustomer] No active order found for customer:', customerId);
      return { success: true, data: null };
    }

    console.log('[getActiveOrderForCustomer] Found active order:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('[getActiveOrderForCustomer] Exception:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * GET ACTIVE ORDER FOR DRIVER - Cek apakah driver punya pesanan aktif
 * @param {string} driverId - ID driver
 * @returns {object} Active order dengan detail customer atau null jika tidak ada
 */
export const getActiveOrderForDriver = async (driverId) => {
  try {
    if (!driverId) {
      return { success: false, error: 'Missing driverId', data: null };
    }

    const { data, error } = await supabase
      .from('scoot_ride')
      .select(`
        id,
        id_customer,
        id_driver,
        lokasi_jemput,
        lokasi_tujuan,
        status,
        biaya,
        customer:id_customer(id, nama, profile_image_url)
      `)
      .eq('id_driver', driverId)
      .in('status', ['accepted', 'ongoing', 'waiting_confirmation', 'waiting_payment'])
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[getActiveOrderForDriver] Error:', error);
      return { success: false, error: error.message, data: null };
    }

    if (!data) {
      console.log('[getActiveOrderForDriver] No active order found for driver:', driverId);
      return { success: true, data: null };
    }

    console.log('[getActiveOrderForDriver] Found active order:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('[getActiveOrderForDriver] Exception:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * UPDATE ORDER STATUS - Update status pesanan ke 'completed'
 * @param {string} orderId - ID order (scoot_ride)
 * @param {string} newStatus - Status baru ('accepted', 'ongoing', 'completed', dll)
 */
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    if (!orderId || !newStatus) {
      return { success: false, error: 'Missing orderId or newStatus' };
    }

    console.log('[updateOrderStatus] Updating order:', orderId, 'to status:', newStatus);

    const { data, error } = await supabase
      .from('scoot_ride')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select();

    if (error) {
      console.error('[updateOrderStatus] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[updateOrderStatus] Order updated successfully');
    return { success: true, data };
  } catch (error) {
    console.error('[updateOrderStatus] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * SUBSCRIBE TO ORDER STATUS - Monitor perubahan status order
 * @param {string} orderId - ID order
 * @param {function} callback - Function dipanggil saat status berubah
 */
/**
 * SUBSCRIBE TO ORDER STATUS - Monitor perubahan status order
 * Returns subscription object dengan unsubscribe method
 */
export const subscribeToOrderStatus = (orderId, callback) => {
  if (!orderId) {
    console.error('[subscribeToOrderStatus] Missing orderId');
    return null;
  }

  console.log('[subscribeToOrderStatus] Setting up subscription for order:', orderId);

  const channel = supabase
    .channel(`order-status-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scoot_ride',
        filter: `id=eq.${orderId}`
      },
      (payload) => {
        console.log('[subscribeToOrderStatus] ✅ CALLBACK TRIGGERED! Order updated:', payload);
        console.log('[subscribeToOrderStatus] New record:', payload.new);
        console.log('[subscribeToOrderStatus] New status:', payload.new?.status);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[subscribeToOrderStatus] 🔔 Subscription status changed to:', status);
      if (status === 'SUBSCRIBED') {
        console.log('[subscribeToOrderStatus] ✅ Successfully subscribed to order:', orderId);
      } else {
        console.warn('[subscribeToOrderStatus] ⚠️ Subscription not ready, status:', status);
      }
    });

  // Return object dengan unsubscribe method
  return {
    channel,
    unsubscribe: async () => {
      console.log('[subscribeToOrderStatus] Unsubscribing from order:', orderId);
      await supabase.removeChannel(channel);
    }
  };
};
