// =====================================================
// SCOOT SEND - INDEX
// Export semua services ScootSend
// =====================================================

export * as Customer from './customer';
export * as Driver from './driver';
export * as Chat from './chat';

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
