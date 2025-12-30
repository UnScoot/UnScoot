// =====================================================
// NOTIFICATION TRACKER - Prevent duplicate notifications
// =====================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const SHOWN_NOTIFICATIONS_KEY = 'shownNotifications';
const SESSION_KEY = 'notificationSession';

/**
 * Check if notification has already been shown this session
 * @param {string} notifKey - Unique key like 'login', 'order_created_123', 'driver_accepted_456'
 */
export const hasShownNotification = async (notifKey) => {
  try {
    const shown = await AsyncStorage.getItem(SHOWN_NOTIFICATIONS_KEY);
    const shownList = shown ? JSON.parse(shown) : [];
    return shownList.includes(notifKey);
  } catch (error) {
    console.error('[NotificationTracker] Error checking notification:', error);
    return false;
  }
};

/**
 * Mark notification as shown
 * @param {string} notifKey - Unique key for the notification
 */
export const markNotificationShown = async (notifKey) => {
  try {
    const shown = await AsyncStorage.getItem(SHOWN_NOTIFICATIONS_KEY);
    const shownList = shown ? JSON.parse(shown) : [];
    
    if (!shownList.includes(notifKey)) {
      shownList.push(notifKey);
      await AsyncStorage.setItem(SHOWN_NOTIFICATIONS_KEY, JSON.stringify(shownList));
      console.log('[NotificationTracker] Marked as shown:', notifKey);
    }
  } catch (error) {
    console.error('[NotificationTracker] Error marking notification:', error);
  }
};

/**
 * Clear all notification tracking (call on logout)
 */
export const clearNotificationTracking = async () => {
  try {
    await AsyncStorage.removeItem(SHOWN_NOTIFICATIONS_KEY);
    console.log('[NotificationTracker] Cleared all notification tracking');
  } catch (error) {
    console.error('[NotificationTracker] Error clearing:', error);
  }
};

/**
 * Smart send notification - only sends if not already shown
 * @param {object} notification - { title, body }
 * @param {string} notifKey - Unique key for deduplication
 * @param {function} sendFn - The actual send function to call
 */
export const sendNotificationOnce = async (notification, notifKey, sendFn) => {
  const alreadyShown = await hasShownNotification(notifKey);
  
  if (alreadyShown) {
    console.log('[NotificationTracker] Skipping duplicate notification:', notifKey);
    return false;
  }
  
  await markNotificationShown(notifKey);
  await sendFn(notification);
  return true;
};

export default {
  hasShownNotification,
  markNotificationShown,
  clearNotificationTracking,
  sendNotificationOnce
};
