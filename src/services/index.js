// =====================================================
// SERVICES - MAIN INDEX
// Import semua services dengan struktur yang rapi
// =====================================================

// Core services
export * from './core';

// Service-specific modules
export * as ScootFood from './scootFood';
export * as ScootRide from './scootRide';
export * as ScootSend from './scootSend';

// Re-export for convenience
export { supabase } from './core/supabase';
