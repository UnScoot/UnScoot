import { createClient } from "@supabase/supabase-js";

// Load from environment variables - set in .env file
// Copy .env.example to .env and fill in your values
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("⚠️ Supabase credentials not found. Please set environment variables in .env file.");
}

// Supabase Client - pakai ini untuk SEMUA operasi (Auth + Database)
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

