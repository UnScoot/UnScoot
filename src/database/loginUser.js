// Helper untuk login user dan cek status email konfirmasi
import { supabase } from './supabase';

/**
 * Login user dan cek status email konfirmasi
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{error?: string, user?: any, needsEmailConfirmation?: boolean}>}
 */
export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { error: error.message };
  }
  if (data?.user && !data.user.confirmed_at) {
    return { user: data.user, needsEmailConfirmation: true };
  }

  // Tampilkan notifikasi lokal bahwa login sukses
  try {
    // Muat modul notifikasi secara dinamis agar tidak menginisialisasi
    // modul native saat app bundle sedang dimuat. Ini mengurangi risiko
    // error "Cannot find native module 'ExpoPushTokenManager'" pada
    // environment tanpa module native (mis. Expo Go).
    const { default: notifikasiregister } = await import(
      /* webpackChunkName: "notifikasiregister" */ '../notifications/notifikasiregister'
    );

    // Panggil dan tunggu (notifikasi mungkin menampilkan Alert sebagai fallback)
    await notifikasiregister({
      title: 'Login Berhasil',
      body: 'Selamat datang kembali! Anda telah berhasil login.',
    });
  } catch (e) {
    console.warn('[loginUser] notifikasiregister failed:', e);
  }

  return { user: data.user };
}
