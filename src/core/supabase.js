// =====================================================
// SUPABASE CLIENT - Core Database Connection
// =====================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fpafxhxuqrdsvxovmwvx.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwYWZ4aHh1cXJkc3Z4b3Ztd3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MDY4MDcsImV4cCI6MjA0ODk4MjgwN30.SXGL2gP6g2bIX6e9B96lEekb5CDV0UT4xIbPWDGPE9o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;
