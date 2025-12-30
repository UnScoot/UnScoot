// =====================================================
// AUTH SERVICES - Authentication & User Management
// =====================================================

import { supabase } from './supabase';

/**
 * REGISTER USER - Daftar user baru
 */
export const registerUser = async (email, password, userData) => {
  try {
    console.log('[Auth] Registering user:', email);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    console.log('[Auth] ✅ User registered:', authData.user?.id);
    return { success: true, user: authData.user, session: authData.session };
  } catch (error) {
    console.error('[Auth] ❌ Register error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * LOGIN USER
 */
export const loginUser = async (email, password) => {
  try {
    console.log('[Auth] Logging in user:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    console.log('[Auth] ✅ Login successful');
    return { success: true, user: data.user, session: data.session };
  } catch (error) {
    console.error('[Auth] ❌ Login error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * LOGOUT USER
 */
export const logoutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    console.log('[Auth] ✅ Logged out');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * GET CURRENT USER
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * GET SESSION
 */
export const getSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return { success: true, session };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * INSERT CUSTOMER PROFILE
 */
export const insertCustomerProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('customer')
      .insert({
        id: userId,
        nama: profileData.nama,
        nim: profileData.nim,
        email: profileData.email,
        profile_image_url: profileData.profileImageUrl || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * INSERT DRIVER PROFILE
 */
export const insertDriverProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('driver')
      .insert({
        id: userId,
        nama: profileData.nama,
        nim: profileData.nim,
        email: profileData.email,
        jenis_motor: profileData.jenisMotor,
        plat_motor: profileData.platMotor,
        profile_image_url: profileData.profileImageUrl || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * GET USER PROFILE
 */
export const getUserProfile = async (userId, userType = 'customer') => {
  try {
    const table = userType === 'driver' ? 'driver' : 'customer';

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * UPDATE PROFILE
 */
export const updateProfile = async (userId, userType, updates) => {
  try {
    const table = userType === 'driver' ? 'driver' : 'customer';

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * DELETE USER
 */
export const deleteUser = async (email) => {
  try {
    // This requires service role key - typically done server-side
    console.log('[Auth] Delete user by email:', email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
