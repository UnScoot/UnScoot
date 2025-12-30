import { supabase } from './supabase';

/**
 * Chat helpers for ScootSend (chat_send + scoot_send)
 */
export const sendMessage = async (messageData) => {
  try {
    console.log('[sendMessage:Send] Sending message:', messageData);

    const payload = {
      id_scoot_send: messageData.orderId,
      chat: messageData.message || '',
      tanggal: new Date().toISOString(),
      image_url: messageData.imageUrl || null,
    };

    const { data, error } = await supabase
      .from('chat_send')
      .insert([payload])
      .select();

    if (error) {
      console.error('[sendMessage:Send] Error:', error);
      throw error;
    }

    console.log('[sendMessage:Send] Message sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[sendMessage:Send] Exception:', error);
    return { success: false, error: error.message };
  }
};

export const getMessages = async (orderId, currentUserId) => {
  try {
    console.log('[getMessages:Send] Fetching messages for order:', orderId);

    const { data, error } = await supabase
      .from('chat_send')
      .select('id, chat, tanggal, image_url')
      .eq('id_scoot_send', orderId)
      .order('tanggal', { ascending: true });

    if (error) {
      console.error('[getMessages:Send] Error:', error);
      throw error;
    }

    const messages =
      data?.map((row) => ({
        id: row.id,
        text: row.chat,
        timestamp: row.tanggal,
        imageUrl: row.image_url || null,
        sentBy: 'other',
      })) || [];

    console.log(`[getMessages:Send] Loaded ${messages.length} messages`);
    return { success: true, data: messages };
  } catch (error) {
    console.error('[getMessages:Send] Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const subscribeToMessages = (orderId, callback) => {
  console.log(
    '[subscribeToMessages:Send] Setting up subscription for order:',
    orderId
  );

  const channel = supabase
    .channel(`chat-send-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_send',
        filter: `id_scoot_send=eq.${orderId}`,
      },
      (payload) => {
        const newRowRaw = payload.new;
        if (!newRowRaw) return;
        if (String(newRowRaw.id_scoot_send) !== String(orderId)) return;

        console.log(
          '[subscribeToMessages:Send] New message received for order:',
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
          console.error('[subscribeToMessages:Send] callback error:', err);
        }
      }
    )
    .subscribe((status) => {
      console.log('[subscribeToMessages:Send] Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log(
          '[subscribeToMessages:Send] ✅ Successfully subscribed to chat!'
        );
      }
    });

  return channel;
};

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
      console.error('[getUserProfile:Send] Error fetching profile:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[getUserProfile:Send] Exception:', error);
    return { success: false, error: error.message, data: null };
  }
};

export const unsubscribeFromMessages = async (channel) => {
  if (channel) {
    console.log('[unsubscribeFromMessages:Send] Unsubscribing from channel');
    await supabase.removeChannel(channel);
  }
};

export const getOrderById = async (orderId) => {
  try {
    if (!orderId)
      return { success: false, error: 'Missing orderId', data: null };

    const { data, error } = await supabase
      .from('scoot_send')
      .select(
        `
        id,
        id_customer,
        id_driver,
        lokasi_jemput_barang,
        lokasi_tujuan,
        nama_penerima,
        berat,
        kategori_barang,
        status,
        biaya,
        tanggal,
        customer:id_customer(id, nama, profile_image_url),
        driver:id_driver(id, nama, profile_image_url)
      `
      )
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('[getOrderById:Send] Error:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[getOrderById:Send] Exception:', error);
    return { success: false, error: error.message, data: null };
  }
};

export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    if (!orderId || !newStatus)
      return { success: false, error: 'Missing orderId or newStatus' };

    const { data, error } = await supabase
      .from('scoot_send')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select();

    if (error) {
      console.error('[updateOrderStatus:Send] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[updateOrderStatus:Send] Exception:', error);
    return { success: false, error: error.message };
  }
};

export const subscribeToOrderStatus = (orderId, callback) => {
  if (!orderId) return null;

  const channel = supabase
    .channel(`order-status-send-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scoot_send',
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        console.log('[subscribeToOrderStatus:Send] Order updated:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('[subscribeToOrderStatus:Send] Subscription status:', status);
    });

  return {
    channel,
    unsubscribe: async () => {
      await supabase.removeChannel(channel);
    },
  };
};

/**
 * GET ACTIVE ORDER FOR CUSTOMER - Cek apakah customer punya pesanan aktif ScootSend
 * @param {string} customerId - ID customer
 * @returns {object} Active order dengan detail driver atau null jika tidak ada
 */
export const getActiveOrderForCustomer = async (customerId) => {
  try {
    if (!customerId) {
      return { success: false, error: 'Missing customerId', data: null };
    }

    const { data, error } = await supabase
      .from('scoot_send')
      .select(
        `
        id,
        id_customer,
        id_driver,
        lokasi_jemput_barang,
        lokasi_tujuan,
        nama_penerima,
        berat,
        kategori_barang,
        status,
        biaya,
        driver:id_driver(id, nama, profile_image_url)
      `
      )
      .eq('id_customer', customerId)
      .in('status', [
        'pending',
        'accepted',
        'ongoing',
        'waiting_confirmation',
        'waiting_payment',
      ])
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[getActiveOrderForCustomer:Send] Error:', error);
      return { success: false, error: error.message, data: null };
    }

    if (!data) {
      console.log(
        '[getActiveOrderForCustomer:Send] No active order found for customer:',
        customerId
      );
      return { success: true, data: null };
    }

    console.log(
      '[getActiveOrderForCustomer:Send] Found active order:',
      data.id
    );
    return { success: true, data };
  } catch (error) {
    console.error('[getActiveOrderForCustomer:Send] Exception:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * GET ACTIVE ORDER FOR DRIVER - Cek apakah driver punya pesanan aktif ScootSend
 * @param {string} driverId - ID driver
 * @returns {object} Active order dengan detail customer atau null jika tidak ada
 */
export const getActiveOrderForDriver = async (driverId) => {
  try {
    if (!driverId) {
      return { success: false, error: 'Missing driverId', data: null };
    }

    const { data, error } = await supabase
      .from('scoot_send')
      .select(
        `
        id,
        id_customer,
        id_driver,
        lokasi_jemput_barang,
        lokasi_tujuan,
        nama_penerima,
        berat,
        kategori_barang,
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
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[getActiveOrderForDriver:Send] Error:', error);
      return { success: false, error: error.message, data: null };
    }

    if (!data) {
      console.log(
        '[getActiveOrderForDriver:Send] No active order found for driver:',
        driverId
      );
      return { success: true, data: null };
    }

    console.log('[getActiveOrderForDriver:Send] Found active order:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('[getActiveOrderForDriver:Send] Exception:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * UPDATE ORDER RATING - Update rating pesanan ScootSend
 * @param {string} orderId - ID order
 * @param {number} rating - Rating 1-5
 */
export const updateOrderRating = async (orderId, rating) => {
  try {
    if (!orderId || !rating) {
      return { success: false, error: 'Missing orderId or rating' };
    }

    console.log(
      '[updateOrderRating:Send] Updating rating for order:',
      orderId,
      'to:',
      rating
    );

    const { data, error } = await supabase
      .from('scoot_send')
      .update({ rating })
      .eq('id', orderId)
      .select();

    if (error) {
      console.error('[updateOrderRating:Send] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[updateOrderRating:Send] Rating updated successfully');
    return { success: true, data };
  } catch (error) {
    console.error('[updateOrderRating:Send] Exception:', error);
    return { success: false, error: error.message };
  }
};
