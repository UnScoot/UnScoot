import { supabase } from "./supabase";

/**
 * Insert ke tabel customer/driver jika belum ada
 * @param {Object} user - user object dari supabase.auth
 * @param {string} role - 'customer' atau 'driver'
 * @param {Object} profile - data tambahan (nim, nama, dll)
 */
export async function insertProfile(user, role, profile) {
  const table = role === "driver" ? "driver" : "customer";
  
  console.log(`[insertProfile] Checking ${table} for user:`, user.id);
  
  // Cek sudah ada atau belum - pakai maybeSingle() agar tidak throw error
  const { data: existing, error: checkError } = await supabase
    .from(table)
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  
  if (checkError) {
    console.error(`[insertProfile] Error checking ${table}:`, checkError);
  }
  
  if (existing) {
    console.log(`[insertProfile] User already exists in ${table}, skipping insert`);
    return true; // Sudah ada, skip
  }

  console.log(`[insertProfile] Inserting new user to ${table}:`, { id: user.id, ...profile });
  
  // Insert data baru
  const { data: insertData, error: insertError } = await supabase
    .from(table)
    .insert([{ id: user.id, ...profile }])
    .select();
  
  if (insertError) {
    console.error(`[insertProfile] Error inserting to ${table}:`, insertError);
    console.error(`[insertProfile] Insert error details:`, JSON.stringify(insertError, null, 2));
    return false;
  }
  
  console.log(`[insertProfile] Successfully inserted to ${table}:`, insertData);
  return true;
}
