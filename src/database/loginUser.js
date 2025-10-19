// Helper untuk login user dan cek status email konfirmasi
import { supabase } from "./supabase";

/**
 * Login user dan cek status email konfirmasi
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{error?: string, user?: any, needsEmailConfirmation?: boolean}>}
 */
export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  if (data?.user && !data.user.confirmed_at) {
    return { user: data.user, needsEmailConfirmation: true };
  }
  return { user: data.user };
}
