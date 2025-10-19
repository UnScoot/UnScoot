import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fghygbrmjatgmopywmlb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaHlnYnJtamF0Z21vcHl3bWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTc3MDUsImV4cCI6MjA3NTQ5MzcwNX0.UBi3B7sWWqv7DVlRhbhI8PrJBDSlLDfehJy_R8v5I7Y";

// Supabase Client - pakai ini untuk SEMUA operasi (Auth + Database)
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
