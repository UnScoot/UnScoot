import { supabase } from '../database/supabase';

/**
 * ACCEPT SEND ORDER - Driver terima pesanan (scoot_send)
 */
export const acceptSendOrder = async (orderId, driverId) => {
  try {
    console.log('[acceptSendOrder] ===== STARTING ACCEPT SEND ORDER =====');
    console.log('[acceptSendOrder] Order ID:', orderId);
    console.log('[acceptSendOrder] Driver ID:', driverId);

    // Prevent driver from accepting new order if they already have an active order
    try {
      const { data: active, error: activeErr } = await supabase
        .from('scoot_send')
        .select('id, status')
        .eq('id_driver', driverId)
        .in('status', ['accepted', 'ongoing', 'waiting_confirmation']);

      if (activeErr) {
        console.warn(
          '[acceptSendOrder] Could not check active orders:',
          activeErr
        );
      } else if (active && active.length > 0) {
        console.log(
          '[acceptSendOrder] Driver has active order(s), rejecting accept'
        );
        return {
          success: false,
          error:
            'Anda masih memiliki pesanan aktif. Selesaikan pesanan tersebut terlebih dahulu.',
        };
      }
    } catch (chkErr) {
      console.error('[acceptSendOrder] Error checking active orders:', chkErr);
    }

    const { data, error } = await supabase
      .from('scoot_send')
      .update({ id_driver: driverId, status: 'accepted' })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    if (error) {
      // Handle case where PostgREST returns PGRST116 when no rows match
      if (error?.code === 'PGRST116') {
        console.warn(
          '[acceptSendOrder] ⚠️ No rows updated (likely already taken)',
          error
        );
        return {
          success: false,
          error: 'Order sudah diambil driver lain',
          details: error,
        };
      }
      console.error('[acceptSendOrder] ❌ Supabase error:', error);
      return { success: false, error: error.message || error, details: error };
    }

    if (!data) {
      console.warn(
        '[acceptSendOrder] ⚠️ No data returned - order might be taken already'
      );
      return { success: false, error: 'Order sudah diambil driver lain' };
    }

    console.log('[acceptSendOrder] ✅ Order accepted successfully!');
    console.log(
      '[acceptSendOrder] Updated row:',
      JSON.stringify(data, null, 2)
    );
    return { success: true, data };
  } catch (error) {
    console.error('[acceptSendOrder] ❌ Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * UNSUBSCRIBE placeholder included in similar driver helpers for parity.
 */
export const unsubscribe = async (channel) => {
  if (channel) {
    console.log('[scootSendTerimaPesanan.unsubscribe] Removing subscription');
    await supabase.removeChannel(channel);
  }
};

/**
 * GET DRIVER'S ACTIVE ORDERS - Driver lihat pesanan yang dia terima (accepted/ongoing)
 */
export const getDriverActiveOrders = async (driverId) => {
  try {
    console.log(
      '[getDriverActiveOrders] Fetching active send orders for driver:',
      driverId
    );

    const { data, error } = await supabase
      .from('scoot_send')
      .select(`*, customer:id_customer (nama, email)`)
      .eq('id_driver', driverId)
      .in('status', ['accepted', 'ongoing', 'waiting_confirmation'])
      .order('tanggal', { ascending: false });

    if (error) {
      console.error('[getDriverActiveOrders] Error:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('[getDriverActiveOrders] Exception:', error);
    return { success: false, error: error.message, data: [] };
  }
};
