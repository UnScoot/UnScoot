import { supabase } from './supabase';

/**
 * SEND MESSAGE - Kirim pesan chat untuk ScootFood
 * Struktur table chat_food:
 * - id (uuid, primary key)
 * - id_scoot_food (uuid, foreign key)
 * - chat (text) - pesan
 * - tanggal (timestamptz)
 */
export const sendMessage = async (messageData) => {
  try {
    console.log('[sendMessage:Food] Sending message:', messageData);

    const payload = {
      id_scoot_food: messageData.orderId,
      chat: messageData.message || ' ', // Ensure not empty string
      tanggal: new Date().toISOString(),
      image_url: messageData.imageUrl || null,
    };

    const { data, error } = await supabase
      .from('chat_food')
      .insert([payload])
      .select();

    if (error) {
      console.error('[sendMessage:Food] Error:', error);
      throw error;
    }

    console.log('[sendMessage:Food] Message sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[sendMessage:Food] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * GET MESSAGES - Ambil semua pesan untuk order tertentu
 * @param {string} orderId - ID order (scoot_food)
 * @param {string} currentUserId - ID user saat ini (untuk menentukan siapa yang mengirim)
 */
export const getMessages = async (orderId, currentUserId) => {
  try {
    console.log('[getMessages:Food] Fetching messages for order:', orderId);

    const { data, error } = await supabase
      .from('chat_food')
      .select('id, chat, tanggal, image_url')
      .eq('id_scoot_food', orderId)
      .order('tanggal', { ascending: true });

    if (error) {
      console.error('[getMessages:Food] Error:', error);
      throw error;
    }

    // Transform to message format
    const messages =
      data?.map((row) => ({
        id: row.id,
        text: row.chat,
        timestamp: row.tanggal,
        imageUrl: row.image_url || null,
        sentBy: 'other',
      })) || [];

    console.log(`[getMessages:Food] Loaded ${messages.length} messages`);
    return { success: true, data: messages };
  } catch (error) {
    console.error('[getMessages:Food] Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * SUBSCRIBE TO MESSAGES - Real-time subscription untuk chat
 * @param {string} orderId - ID order
 * @param {Function} callback - Function yang dipanggil saat ada pesan baru
 */
export const subscribeToMessages = (orderId, callback) => {
  console.log(
    '[subscribeToMessages:Food] Setting up subscription for order:',
    orderId
  );

  // Some Supabase setups have trouble matching complex filters for UUIDs.
  // Subscribe to all INSERTs on `chat_food` and filter client-side by `id_scoot_food`.
  const channel = supabase
    .channel(`chat-food-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_food',
        filter: `id_scoot_food=eq.${orderId}`,
      },
      (payload) => {
        // payload.new contains the new row; guard by orderId to avoid unrelated rows
        const newRowRaw = payload.new;
        if (!newRowRaw) return;
        if (String(newRowRaw.id_scoot_food) !== String(orderId)) return;

        console.log(
          '[subscribeToMessages:Food] New message received for order:',
          orderId,
          newRowRaw
        );

        const message = {
          id: newRowRaw.id,
          text: newRowRaw.chat,
          timestamp: newRowRaw.tanggal,
          imageUrl: newRowRaw.image_url || null,
        };

        try {
          callback({ new: message });
        } catch (err) {
          console.error('[subscribeToMessages:Food] callback error:', err);
        }
      }
    )
    .subscribe((status) => {
      console.log('[subscribeToMessages:Food] Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log(
          '[subscribeToMessages:Food] ✅ Successfully subscribed to chat!'
        );
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
      console.error('[getUserProfile:Food] Error fetching profile:', error);
      return { success: false, error: error.message, data: null };
    }

    console.log('[getUserProfile:Food] Profile loaded:', {
      nama: data?.nama,
      foto: data?.profile_image_url,
    });
    return { success: true, data };
  } catch (error) {
    console.error('[getUserProfile:Food] Exception:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * UNSUBSCRIBE - Cleanup subscription
 */
export const unsubscribeFromMessages = async (channel) => {
  if (channel) {
    console.log('[unsubscribeFromMessages:Food] Unsubscribing from channel');
    await supabase.removeChannel(channel);
  }
};

/**
 * GET ACTIVE ORDER - Cek apakah customer punya pesanan aktif ScootFood
 * @param {string} customerId - ID customer
 * @returns {object} Active order dengan detail driver atau null jika tidak ada
 */
export const getActiveOrderForCustomer = async (customerId) => {
  try {
    if (!customerId) {
      return { success: false, error: 'Missing customerId', data: null };
    }

    const { data, error } = await supabase
      .from('scoot_food')
      .select(
        `
        id,
        id_customer,
        id_driver,
        lokasi_resto,
        lokasi_tujuan,
        detail_pesanan,
        status,
        biaya,
        driver:id_driver(id, nama, profile_image_url)
      `
      )
      .eq('id_customer', customerId)
      .in('status', [
        'accepted',
        'ongoing',
        'waiting_confirmation',
        'waiting_payment',
      ])
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[getActiveOrderForCustomer:Food] Error:', error);
      return { success: false, error: error.message, data: null };
    }

    if (!data) {
      console.log(
        '[getActiveOrderForCustomer:Food] No active order found for customer:',
        customerId
      );
      return { success: true, data: null };
    }

    console.log(
      '[getActiveOrderForCustomer:Food] Found active order:',
      data.id
    );
    return { success: true, data };
  } catch (error) {
    console.error('[getActiveOrderForCustomer:Food] Exception:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * GET ACTIVE ORDER FOR DRIVER - Cek apakah driver punya pesanan aktif ScootFood
 * @param {string} driverId - ID driver
 * @returns {object} Active order dengan detail customer atau null jika tidak ada
 */
export const getActiveOrderForDriver = async (driverId) => {
  try {
    if (!driverId) {
      return { success: false, error: 'Missing driverId', data: null };
    }

    const { data, error } = await supabase
      .from('scoot_food')
      .select(
        `
        id,
        id_customer,
        id_driver,
        lokasi_resto,
        lokasi_tujuan,
        detail_pesanan,
        status,
        biaya,
        customer:id_customer(id, nama, profile_image_url)
      `
      )
      .eq('id_driver', driverId)
      .in('status', [
        'accepted',
        'ongoing',
        'waiting_confirmation',
        'waiting_payment',
      ])
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[getActiveOrderForDriver:Food] Error:', error);
      return { success: false, error: error.message, data: null };
    }

    if (!data) {
      console.log(
        '[getActiveOrderForDriver:Food] No active order found for driver:',
        driverId
      );
      return { success: true, data: null };
    }

    console.log('[getActiveOrderForDriver:Food] Found active order:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('[getActiveOrderForDriver:Food] Exception:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * UPDATE ORDER STATUS - Update status pesanan ScootFood
 * @param {string} orderId - ID order (scoot_food)
 * @param {string} newStatus - Status baru ('accepted', 'ongoing', 'waiting_confirmation', 'waiting_payment', 'completed', dll)
 */
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    if (!orderId || !newStatus) {
      return { success: false, error: 'Missing orderId or newStatus' };
    }

    console.log(
      '[updateOrderStatus:Food] Updating order:',
      orderId,
      'to status:',
      newStatus
    );

    const { data, error } = await supabase
      .from('scoot_food')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select();

    if (error) {
      console.error('[updateOrderStatus:Food] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[updateOrderStatus:Food] Order updated successfully');
    return { success: true, data };
  } catch (error) {
    console.error('[updateOrderStatus:Food] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * SUBSCRIBE TO ORDER STATUS - Monitor perubahan status order
 * Returns subscription object dengan unsubscribe method
 */
export const subscribeToOrderStatus = (orderId, callback) => {
  if (!orderId) {
    console.error('[subscribeToOrderStatus:Food] Missing orderId');
    return null;
  }

  console.log(
    '[subscribeToOrderStatus:Food] Setting up subscription for order:',
    orderId
  );

  const channel = supabase
    .channel(`order-status-food-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scoot_food',
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        console.log(
          '[subscribeToOrderStatus:Food] ✅ CALLBACK TRIGGERED! Order updated:',
          payload
        );
        console.log(
          '[subscribeToOrderStatus:Food] New status:',
          payload.new?.status
        );
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log(
        '[subscribeToOrderStatus:Food] 🔔 Subscription status changed to:',
        status
      );
      if (status === 'SUBSCRIBED') {
        console.log(
          '[subscribeToOrderStatus:Food] ✅ Successfully subscribed to order:',
          orderId
        );
      }
    });

  return {
    channel,
    unsubscribe: async () => {
      console.log(
        '[subscribeToOrderStatus:Food] Unsubscribing from order:',
        orderId
      );
      await supabase.removeChannel(channel);
    },
  };
};

/**
 * GET ORDER BY ID - Ambil detail order berdasarkan ID
 * @param {string} orderId - ID order
 */
export const getOrderById = async (orderId) => {
  try {
    if (!orderId) {
      return { success: false, error: 'Missing orderId', data: null };
    }

    const { data, error } = await supabase
      .from('scoot_food')
      .select(
        `
        id,
        id_customer,
        id_driver,
        lokasi_resto,
        lokasi_tujuan,
        detail_pesanan,
        status,
        biaya,
        rating,
        tanggal,
        customer:id_customer(id, nama, profile_image_url),
        driver:id_driver(id, nama, profile_image_url)
      `
      )
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('[getOrderById:Food] Error:', error);
      return { success: false, error: error.message, data: null };
    }

    console.log('[getOrderById:Food] Order loaded:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('[getOrderById:Food] Exception:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * UPDATE ORDER RATING - Update rating pesanan ScootFood
 * @param {string} orderId - ID order
 * @param {number} rating - Rating 1-5
 */
export const updateOrderRating = async (orderId, rating) => {
  try {
    if (!orderId || !rating) {
      return { success: false, error: 'Missing orderId or rating' };
    }

    console.log(
      '[updateOrderRating:Food] Updating rating for order:',
      orderId,
      'to:',
      rating
    );

    const { data, error } = await supabase
      .from('scoot_food')
      .update({ rating })
      .eq('id', orderId)
      .select();

    if (error) {
      console.error('[updateOrderRating:Food] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[updateOrderRating:Food] Rating updated successfully');
    return { success: true, data };
  } catch (error) {
    console.error('[updateOrderRating:Food] Exception:', error);
    return { success: false, error: error.message };
  }
};
