// Helper untuk registrasi via Edge Function
// Menggantikan registerUser.js yang akses langsung ke Supabase

import { supabase } from './supabase';

const EDGE_FUNCTION_URL = 'https://fghygbrmjatgmopywmlb.supabase.co/functions/v1/register-user';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaHlnYnJtamF0Z21vcHl3bWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTc3MDUsImV4cCI6MjA3NTQ5MzcwNX0.UBi3B7sWWqv7DVlRhbhI8PrJBDSlLDfehJy_R8v5I7Y';

/**
 * Register user (customer atau driver) via Edge Function
 * @param {Object} params - Parameter registrasi
 * @param {string} params.nim - NIM mahasiswa UNS
 * @param {string} params.email - Email mahasiswa
 * @param {string} params.password - Password untuk login
 * @param {string} params.nama - Nama lengkap
 * @param {string} params.role - 'customer' atau 'driver'
 * @param {string} [params.jenisMotor] - Jenis motor (wajib untuk driver)
 * @param {string} [params.plat] - Plat nomor (wajib untuk driver)
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export async function registerUserViaEdge({ 
  nim, 
  email, 
  password, 
  nama, 
  role, 
  jenisMotor = null, 
  plat = null 
}) {
  try {
    console.log('[registerUserViaEdge] Calling Edge Function...', { nim, email, role });

    // Get current session token (anon key dari supabase client)
    const { data: { session } } = await supabase.auth.getSession();
    
    // Call Edge Function
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        nim,
        email,
        password,
        nama,
        role,
        jenisMotor,
        plat
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[registerUserViaEdge] Error response:', data);
      return { 
        success: false, 
        error: data.error || 'Terjadi kesalahan pada server.' 
      };
    }

    console.log('[registerUserViaEdge] Success:', data);
    
    // Tampilkan notifikasi lokal bahwa registrasi sukses
    try {
      // Muat modul notifikasi secara dinamis agar tidak menginisialisasi
      // modul native saat app bundle sedang dimuat. Ini mengurangi risiko
      // error "Cannot find native module 'ExpoPushTokenManager'" pada
      // environment tanpa module native (mis. Expo Go).
      const { default: notifikasiregister } = await import(
        /* webpackChunkName: "notifikasiregister" */ "../notifications/notifikasiregister"
      );

      // Panggil dan tunggu (notifikasi mungkin menampilkan Alert sebagai fallback)
      await notifikasiregister({
        title: 'Registrasi Berhasil',
        body: 'Akun Anda berhasil dibuat. Silakan cek email untuk verifikasi.'
      });
    } catch (e) {
      console.warn('[registerUserViaEdge] notifikasiregister failed:', e);
    }
    
    return {
      success: true,
      user: data.user,
      message: data.message,
      needsEmailConfirmation: data.needsEmailConfirmation
    };

  } catch (error) {
    console.error('[registerUserViaEdge] Unexpected error:', error);
    return { 
      success: false, 
      error: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' 
    };
  }
}
