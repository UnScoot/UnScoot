// =====================================================
// SCOOT RIDE - CHAT SERVICES
// Backend logic untuk chat ScootRide
// =====================================================

import { supabase } from '../../core/supabase';

/**
 * SEND MESSAGE - Kirim pesan chat
 */
export const sendMessage = async (orderId, message) => {
  try {
    const { data, error } = await supabase
      .from('chat_ride')
      .insert({
        id_scoot_ride: orderId,
        chat: message,
        tanggal: new Date().toISOString(),
      })
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * GET MESSAGES - Ambil semua pesan
 */
export const getMessages = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('chat_ride')
      .select('id, chat, tanggal')
      .eq('id_scoot_ride', orderId)
      .order('tanggal', { ascending: true });

    if (error) throw error;

    const messages = data?.map((row) => ({
      id: row.id,
      text: row.chat,
      timestamp: row.tanggal,
    })) || [];

    return { success: true, data: messages };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * SUBSCRIBE TO MESSAGES - Realtime chat
 */
export const subscribeToMessages = (orderId, callback) => {
  const channel = supabase
    .channel(`chat-ride-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_ride',
      },
      (payload) => {
        if (String(payload.new?.id_scoot_ride) !== String(orderId)) return;
        
        callback({
          new: {
            id: payload.new.id,
            text: payload.new.chat,
            timestamp: payload.new.tanggal,
          }
        });
      }
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

/**
 * UPDATE ORDER RATING
 */
export const updateRating = async (orderId, rating) => {
  try {
    const { data, error } = await supabase
      .from('scoot_ride')
      .update({ rating })
      .eq('id', orderId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
