// Fungsi register user (driver/customer) dengan validasi NIM mahasiswa_uns
import { supabase } from './supabase';

/**
 * Register user (driver/customer) dengan validasi NIM mahasiswa_uns
 * @param {Object} param0
 * @param {string} param0.nim
 * @param {string} param0.email
 * @param {string} param0.password
 * @param {string} param0.nama
 * @param {string} [param0.jenisMotor] - hanya untuk driver
 * @param {string} [param0.plat] - hanya untuk driver
 * @param {string} param0.role - "driver" atau "customer"
 * @returns {Promise<{error?: string, user?: any, needsEmailConfirmation?: boolean}>}
 */
export async function registerUser({
  nim,
  email,
  password,
  nama,
  jenisMotor,
  plat,
  role,
}) {
  // 1. Validasi NIM di mahasiswa_uns
  try {
    const { data: mhs, error: mhsError } = await supabase
      .from('mahasiswa_uns')
      .select('*')
      .eq('nim', String(nim))
      .maybeSingle();

    if (mhsError) {
      console.error('Error checking mahasiswa_uns:', mhsError);
      // Coba fallback dengan count
      const { count } = await supabase
        .from('mahasiswa_uns')
        .select('*', { count: 'exact', head: true })
        .eq('nim', String(nim));

      if (!count || count === 0) {
        return { error: 'NIM tidak terdaftar sebagai mahasiswa UNS.' };
      }
    } else if (!mhs) {
      return { error: 'NIM tidak terdaftar sebagai mahasiswa UNS.' };
    }
  } catch (e) {
    console.error('Exception validating NIM:', e);
    return { error: 'Terjadi kesalahan saat validasi NIM. Silakan coba lagi.' };
  }

  // 2. Validasi NIM belum dipakai di kedua role (customer & driver)
  console.log('[registerUser] Checking NIM duplication...');

  // Cek NIM di customer
  const { data: customerByNim } = await supabase
    .from('customer')
    .select('nim')
    .eq('nim', nim)
    .maybeSingle();

  // Cek NIM di driver
  const { data: driverByNim } = await supabase
    .from('driver')
    .select('nim')
    .eq('nim', nim)
    .maybeSingle();

  if (customerByNim || driverByNim) {
    console.log('[registerUser] NIM already used!');
    return { error: 'NIM sudah digunakan untuk registrasi di aplikasi.' };
  }

  // 3. Validasi EMAIL belum dipakai di kedua role (customer & driver)
  console.log('[registerUser] Checking email duplication...');

  // Cek EMAIL di customer
  const { data: customerByEmail } = await supabase
    .from('customer')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  // Cek EMAIL di driver
  const { data: driverByEmail } = await supabase
    .from('driver')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (customerByEmail || driverByEmail) {
    console.log('[registerUser] Email already used!');
    return { error: 'Email sudah digunakan untuk registrasi di aplikasi.' };
  }

  // 4. Register user di auth Supabase
  console.log('[registerUser] Registering to Supabase Auth...');
  console.log('[registerUser] Input data:', {
    nim,
    email,
    nama,
    role,
    jenisMotor,
    plat,
  });

  const userMetadata = {
    nim,
    nama,
    role,
    ...(role === 'driver' ? { jenisMotor, plat } : {}),
  };

  console.log(
    '[registerUser] User metadata to save:',
    JSON.stringify(userMetadata, null, 2)
  );

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userMetadata,
    },
  });

  if (error) {
    console.error('[registerUser] Supabase Auth error:', error);
    // Cek apakah error karena email sudah digunakan
    if (
      error.message.includes('already registered') ||
      error.message.includes('already been registered')
    ) {
      return { error: 'Email sudah digunakan untuk registrasi di aplikasi.' };
    }
    return { error: error.message };
  }

  console.log('[registerUser] Registration successful!');
  console.log(
    '[registerUser] User created with metadata:',
    JSON.stringify(data?.user?.user_metadata, null, 2)
  );

  // 5. Insert data ke tabel customer/driver LANGSUNG setelah registrasi
  // Karena user_metadata di Supabase kadang tidak reliable
  if (data?.user) {
    console.log('[registerUser] Inserting profile to database...');
    const table = role === 'driver' ? 'driver' : 'customer';
    const profileData = {
      id: data.user.id,
      nim,
      nama,
      email,
      ...(role === 'driver'
        ? { jenis_motor: jenisMotor, plat_motor: plat }
        : {}),
    };

    console.log(`[registerUser] Inserting to ${table}:`, profileData);

    const { error: insertError } = await supabase
      .from(table)
      .insert([profileData]);

    if (insertError) {
      console.warn(
        `[registerUser] Warning: Could not insert to ${table} immediately:`,
        insertError.message
      );
      console.log(
        '[registerUser] Data will be inserted when user logs in after email verification'
      );
      // Jangan return error, biarkan proses lanjut
      // Data akan di-insert saat login pertama kali via insertProfile
    } else {
      console.log(`[registerUser] Successfully inserted to ${table}`);
    }

    // Tampilkan notifikasi lokal bahwa registrasi sukses
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
        title: 'Registrasi Berhasil',
        body: 'Akun Anda berhasil dibuat. Silakan cek email untuk verifikasi.',
      });
    } catch (e) {
      console.warn('[registerUser] notifikasiregister failed:', e);
    }

    return { user: data.user, needsEmailConfirmation: true };
  }

  return { error: 'Gagal membuat akun. Silakan coba lagi.' };
}
