// Edge Function untuk upload profile image
// Bypass RLS dengan service_role key

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Upload Profile Image Edge Function Started")

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    // Parse request body
    const { userId, imageBase64, fileExt, role } = await req.json()
    
    console.log('[upload-profile-image] Request received:', { userId, role, fileExt })
    
    // Validasi input
    if (!userId || !imageBase64 || !fileExt || !role) {
      return new Response(
        JSON.stringify({ error: 'Parameter tidak lengkap' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    // Validasi role
    if (role !== 'customer' && role !== 'driver') {
      return new Response(
        JSON.stringify({ error: 'Role harus customer atau driver' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    // Buat Supabase Admin Client dengan SERVICE_ROLE key (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('[upload-profile-image] Step 1: Decoding base64 image...')
    
    // Decode base64 ke binary
    const imageData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0))
    
    console.log('[upload-profile-image] Image size:', imageData.length)
    
    // Validasi ukuran (max 5MB)
    if (imageData.length > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Ukuran file maksimal 5 MB' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    console.log('[upload-profile-image] Step 2: Uploading to Storage...')
    
    // Generate nama file unik
    const timestamp = Date.now()
    const fileName = `${role}_${userId}_${timestamp}.${fileExt}`
    const filePath = `profile-photos/${fileName}`
    
    // Upload ke Supabase Storage (bypass RLS karena pakai service_role)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('Gallery')
      .upload(filePath, imageData, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: false
      })
    
    if (uploadError) {
      console.error('[upload-profile-image] Upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    console.log('[upload-profile-image] Step 3: Getting public URL...')
    
    // Dapatkan public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('Gallery')
      .getPublicUrl(filePath)
    
    const imageUrl = publicUrlData.publicUrl
    
    console.log('[upload-profile-image] Step 4: Updating database...')
    
    // Update database (bypass RLS karena pakai service_role)
    const tableName = role === 'customer' ? 'customer' : 'driver'
    const { error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({ profile_image_url: imageUrl })
      .eq('id', userId)
    
    if (updateError) {
      console.error('[upload-profile-image] Database update error:', updateError)
      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl, 
          warning: 'Foto terupload tapi gagal update database' 
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    console.log('[upload-profile-image] Success!', { imageUrl })
    
    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
    
  } catch (error) {
    console.error('[upload-profile-image] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan pada server' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})
