import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Service Role Client - HANYA untuk upload Storage (bypass RLS)
// Service Role Client - HANYA untuk upload Storage (bypass RLS)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Upload foto profil ke Supabase Storage bucket "Gallery"
 * @param {string} userId - ID user
 * @param {string} uri - URI gambar dari device
 * @param {string} role - 'driver' atau 'customer'
 * @returns {Promise<{success: boolean, imageUrl?: string, error?: string}>}
 */
export const uploadProfileImage = async (userId, uri, role) => {
  try {
    // Validasi input
    if (!userId || !uri || !role) {
      return { success: false, error: 'Parameter tidak lengkap' };
    }

    // Ambil file extension dari URI
    const fileExt = uri.split('.').pop().toLowerCase();
    
    // Validasi format file
    if (!['jpg', 'jpeg', 'png'].includes(fileExt)) {
      return { success: false, error: 'Format file harus JPG atau PNG' };
    }

    // Generate nama file unik: role_userId_timestamp.ext
    const timestamp = Date.now();
    const fileName = `${role}_${userId}_${timestamp}.${fileExt}`;
    const filePath = `profile-photos/${fileName}`;

    console.log('📦 Preparing file for upload:', fileName);

    // React Native: Convert URI ke ArrayBuffer untuk upload
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    
    console.log('✅ File converted to ArrayBuffer, size:', arrayBuffer.byteLength);

    // Upload ke Supabase Storage PAKAI SERVICE_ROLE (bypass RLS 100%)
    const { data, error } = await supabaseAdmin.storage
      .from('Gallery')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Dapatkan public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('Gallery')
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    // Update database pakai ANON KEY (normal client)
    const tableName = role === 'customer' ? 'customer' : 'driver';
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ profile_image_url: imageUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      // Upload berhasil tapi update DB gagal
      return { 
        success: true, 
        imageUrl, 
        warning: 'Foto terupload tapi gagal update database' 
      };
    }

    return { success: true, imageUrl };

  } catch (error) {
    console.error('Upload profile image error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Hapus foto profil lama dari storage (opsional, untuk hemat storage)
 * @param {string} imageUrl - URL foto lama
 * @returns {Promise<boolean>}
 */
export const deleteOldProfileImage = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('Gallery/profile-photos/')) {
      return false;
    }

    // Extract file path dari URL
    const urlParts = imageUrl.split('Gallery/');
    if (urlParts.length < 2) return false;
    
    const filePath = urlParts[1];

    // Hapus dari storage pakai service_role
    const { error } = await supabaseAdmin.storage
      .from('Gallery')
      .remove([filePath]);

    if (error) {
      console.error('Delete old image error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete old profile image error:', error);
    return false;
  }
};

/**
 * Get URL foto profil user dari database
 * @param {string} userId - ID user
 * @param {string} role - 'driver' atau 'customer'
 * @returns {Promise<string|null>}
 */
export const getProfileImageUrl = async (userId, role) => {
  try {
    const tableName = role === 'customer' ? 'customer' : 'driver';
    const { data, error } = await supabase
      .from(tableName)
      .select('profile_image_url')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.profile_image_url;
  } catch (error) {
    console.error('Get profile image error:', error);
    return null;
  }
};
