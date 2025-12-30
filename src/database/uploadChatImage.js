import { createClient } from '@supabase/supabase-js';

// Service Role Client - untuk upload Storage (bypass RLS)
const SUPABASE_URL = "https://fghygbrmjatgmopywmlb.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaHlnYnJtamF0Z21vcHl3bWxiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkxNzcwNSwiZXhwIjoyMDc1NDkzNzA1fQ.5zjmNkJTRluC3h_T7j7dsPelmms7JMecvceM33GD8K0";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Upload gambar chat ke Supabase Storage bucket "chat-images"
 * @param {string} orderId - ID order (untuk penamaan file)
 * @param {string} uri - URI gambar dari device
 * @param {string} orderType - 'ride', 'food', atau 'send'
 * @returns {Promise<{success: boolean, imageUrl?: string, error?: string}>}
 */
export const uploadChatImage = async (orderId, uri, orderType) => {
  try {
    console.log('[uploadChatImage] Starting upload for order:', orderId, 'type:', orderType);

    // Validasi input
    if (!orderId || !uri || !orderType) {
      return { success: false, error: 'Parameter tidak lengkap' };
    }

    // Ambil file extension dari URI
    const uriParts = uri.split('.');
    let fileExt = uriParts[uriParts.length - 1].toLowerCase();
    
    // Handle case where URI doesn't have extension (some image pickers)
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
      fileExt = 'jpg'; // Default to jpg
    }

    // Generate nama file unik: orderType_orderId_timestamp.ext
    const timestamp = Date.now();
    const fileName = `${orderType}_${orderId}_${timestamp}.${fileExt}`;
    const filePath = `${orderType}/${fileName}`;

    console.log('[uploadChatImage] Preparing file:', fileName);

    // React Native: Convert URI ke ArrayBuffer untuk upload
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    
    console.log('[uploadChatImage] File converted, size:', arrayBuffer.byteLength);

    // Upload ke Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('chat-images')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: false
      });

    if (error) {
      console.error('[uploadChatImage] Upload error:', error);
      return { success: false, error: error.message };
    }

    // Dapatkan public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('chat-images')
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;
    console.log('[uploadChatImage] Upload success, URL:', imageUrl);

    return { success: true, imageUrl };

  } catch (error) {
    console.error('[uploadChatImage] Exception:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Hapus gambar chat dari storage
 * @param {string} imageUrl - URL gambar yang akan dihapus
 * @returns {Promise<boolean>}
 */
export const deleteChatImage = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('chat-images/')) {
      return false;
    }

    // Extract file path dari URL
    const urlParts = imageUrl.split('chat-images/');
    if (urlParts.length < 2) return false;
    
    const filePath = urlParts[1];

    const { error } = await supabaseAdmin.storage
      .from('chat-images')
      .remove([filePath]);

    if (error) {
      console.error('[deleteChatImage] Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[deleteChatImage] Exception:', error);
    return false;
  }
};
