// =====================================================
// ACTIVE ORDER CHECKER - Prevent multiple active orders
// =====================================================

import { supabase } from '../database/supabase';

const ACTIVE_STATUSES = ['pending', 'accepted', 'ongoing', 'waiting_confirmation', 'waiting_payment'];

/**
 * Check if customer has any active order across ALL services
 * @param {string} customerId
 * @returns {object} { hasActive: boolean, service: string|null, orderId: string|null }
 */
export const hasActiveOrderCustomer = async (customerId) => {
  try {
    if (!customerId) return { hasActive: false, service: null, orderId: null };

    // Only check orders from last 24 hours to prevent old stale orders
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const yesterdayISO = yesterday.toISOString();

    console.log('[ActiveOrderChecker] Checking customer:', customerId);
    console.log('[ActiveOrderChecker] Only checking orders after:', yesterdayISO);

    // Check ScootFood
    const { data: foodData, error: foodError } = await supabase
      .from('scoot_food')
      .select('id, status, tanggal')
      .eq('id_customer', customerId)
      .in('status', ACTIVE_STATUSES)
      .gte('tanggal', yesterdayISO)
      .limit(1)
      .maybeSingle();

    if (foodError) console.error('[ActiveOrderChecker] Food query error:', foodError);
    if (foodData) {
      console.log('[ActiveOrderChecker] Found active ScootFood order:', foodData.id, foodData.status);
      return { hasActive: true, service: 'ScootFood', orderId: foodData.id, status: foodData.status };
    }

    // Check ScootRide
    const { data: rideData, error: rideError } = await supabase
      .from('scoot_ride')
      .select('id, status, tanggal')
      .eq('id_customer', customerId)
      .in('status', ACTIVE_STATUSES)
      .gte('tanggal', yesterdayISO)
      .limit(1)
      .maybeSingle();

    if (rideError) console.error('[ActiveOrderChecker] Ride query error:', rideError);
    if (rideData) {
      console.log('[ActiveOrderChecker] Found active ScootRide order:', rideData.id, rideData.status);
      return { hasActive: true, service: 'ScootRide', orderId: rideData.id, status: rideData.status };
    }

    // Check ScootSend
    const { data: sendData, error: sendError } = await supabase
      .from('scoot_send')
      .select('id, status, tanggal')
      .eq('id_customer', customerId)
      .in('status', ACTIVE_STATUSES)
      .gte('tanggal', yesterdayISO)
      .limit(1)
      .maybeSingle();

    if (sendError) console.error('[ActiveOrderChecker] Send query error:', sendError);
    if (sendData) {
      console.log('[ActiveOrderChecker] Found active ScootSend order:', sendData.id, sendData.status);
      return { hasActive: true, service: 'ScootSend', orderId: sendData.id, status: sendData.status };
    }

    console.log('[ActiveOrderChecker] No active order found for customer');
    return { hasActive: false, service: null, orderId: null };
  } catch (error) {
    console.error('[ActiveOrderChecker] Customer check error:', error);
    return { hasActive: false, service: null, orderId: null };
  }
};

/**
 * Check if driver has any active order across ALL services
 * Auto-cancels orders that are stuck for more than 30 minutes
 * @param {string} driverId
 * @returns {object} { hasActive: boolean, service: string|null, orderId: string|null }
 */
export const hasActiveOrderDriver = async (driverId) => {
  try {
    if (!driverId) return { hasActive: false, service: null, orderId: null };

    const DRIVER_ACTIVE_STATUSES = ['accepted', 'ongoing', 'waiting_confirmation', 'waiting_payment'];

    // Auto-cleanup: Cancel orders older than 30 minutes (stuck orders)
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    const thirtyMinutesAgoISO = thirtyMinutesAgo.toISOString();

    // Auto-cancel old stuck orders (silent cleanup)
    await supabase.from('scoot_food')
      .update({ status: 'cancelled' })
      .eq('id_driver', driverId)
      .in('status', DRIVER_ACTIVE_STATUSES)
      .lt('tanggal', thirtyMinutesAgoISO);

    await supabase.from('scoot_ride')
      .update({ status: 'cancelled' })
      .eq('id_driver', driverId)
      .in('status', DRIVER_ACTIVE_STATUSES)
      .lt('tanggal', thirtyMinutesAgoISO);

    await supabase.from('scoot_send')
      .update({ status: 'cancelled' })
      .eq('id_driver', driverId)
      .in('status', DRIVER_ACTIVE_STATUSES)
      .lt('tanggal', thirtyMinutesAgoISO);

    // Now check for actually active orders (within 30 minutes)
    // Check ScootFood
    const { data: foodData } = await supabase
      .from('scoot_food')
      .select('id, status')
      .eq('id_driver', driverId)
      .in('status', DRIVER_ACTIVE_STATUSES)
      .gte('tanggal', thirtyMinutesAgoISO)
      .limit(1)
      .maybeSingle();

    if (foodData) {
      return { hasActive: true, service: 'ScootFood', orderId: foodData.id, status: foodData.status };
    }

    // Check ScootRide
    const { data: rideData } = await supabase
      .from('scoot_ride')
      .select('id, status')
      .eq('id_driver', driverId)
      .in('status', DRIVER_ACTIVE_STATUSES)
      .gte('tanggal', thirtyMinutesAgoISO)
      .limit(1)
      .maybeSingle();

    if (rideData) {
      return { hasActive: true, service: 'ScootRide', orderId: rideData.id, status: rideData.status };
    }

    // Check ScootSend
    const { data: sendData } = await supabase
      .from('scoot_send')
      .select('id, status')
      .eq('id_driver', driverId)
      .in('status', DRIVER_ACTIVE_STATUSES)
      .gte('tanggal', thirtyMinutesAgoISO)
      .limit(1)
      .maybeSingle();

    if (sendData) {
      return { hasActive: true, service: 'ScootSend', orderId: sendData.id, status: sendData.status };
    }

    return { hasActive: false, service: null, orderId: null };
  } catch (error) {
    console.error('[ActiveOrderChecker] Driver check error:', error);
    return { hasActive: false, service: null, orderId: null };
  }
};

export const clearAllActiveOrdersCustomer = async (customerId) => {
  try {
    if (!customerId) return false;
    console.log('[ActiveOrderChecker] Force clearing all active orders for customer:', customerId);

    const statusesToClear = ACTIVE_STATUSES;

    // Clear ScootFood
    await supabase.from('scoot_food')
      .update({ status: 'cancelled' })
      .eq('id_customer', customerId)
      .in('status', statusesToClear);

    // Clear ScootRide
    await supabase.from('scoot_ride')
      .update({ status: 'cancelled' })
      .eq('id_customer', customerId)
      .in('status', statusesToClear);

    // Clear ScootSend
    await supabase.from('scoot_send')
      .update({ status: 'cancelled' })
      .eq('id_customer', customerId)
      .in('status', statusesToClear);

    return true;
  } catch (error) {
    console.error('[ActiveOrderChecker] Error clearing orders:', error);
    return false;
  }
};

export const clearAllActiveOrdersDriver = async (driverId) => {
  try {
    if (!driverId) return false;
    console.log('[ActiveOrderChecker] Force clearing all active orders for driver:', driverId);

    const DRIVER_ACTIVE_STATUSES = ['accepted', 'ongoing', 'waiting_confirmation', 'waiting_payment'];

    // Clear ScootFood
    await supabase.from('scoot_food')
      .update({ status: 'cancelled' })
      .eq('id_driver', driverId)
      .in('status', DRIVER_ACTIVE_STATUSES);

    // Clear ScootRide
    await supabase.from('scoot_ride')
      .update({ status: 'cancelled' })
      .eq('id_driver', driverId)
      .in('status', DRIVER_ACTIVE_STATUSES);

    // Clear ScootSend
    await supabase.from('scoot_send')
      .update({ status: 'cancelled' })
      .eq('id_driver', driverId)
      .in('status', DRIVER_ACTIVE_STATUSES);

    return true;
  } catch (error) {
    console.error('[ActiveOrderChecker] Error clearing driver orders:', error);
    return false;
  }
};

export default {
  hasActiveOrderCustomer,
  hasActiveOrderDriver,
  clearAllActiveOrdersCustomer,
  clearAllActiveOrdersDriver
};
