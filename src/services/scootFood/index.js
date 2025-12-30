// =====================================================
// SCOOT FOOD - INDEX
// Export semua services ScootFood
// =====================================================

// Customer services
export * as Customer from './customer';

// Driver services  
export * as Driver from './driver';

// Chat services
export * as Chat from './chat';

// Re-export individual functions for convenience
export {
  createOrder,
  getOrders,
  getOrderById,
  updateStatus,
  getActiveOrder,
  subscribeToOrders,
  unsubscribe
} from './customer';

export {
  getPendingOrders,
  getActiveOrders,
  acceptOrder,
  subscribeToPending,
  subscribeToOrder
} from './driver';

export {
  sendMessage,
  getMessages,
  subscribeToMessages,
  updateRating
} from './chat';
