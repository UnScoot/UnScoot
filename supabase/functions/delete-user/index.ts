// Edge Function untuk delete user dari auth.users dan profile
// Hanya bisa dipanggil dengan service_role key

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { email } = await req.json()
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[delete-user] Attempting to delete user with email:', email)

    // Create Supabase client dengan service_role key untuk admin access
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

    // 1. Cari user berdasarkan email di auth.users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('[delete-user] Error listing users:', listError)
      return new Response(
        JSON.stringify({ error: 'Failed to list users: ' + listError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userToDelete = users.find(u => u.email === email)
    
    if (!userToDelete) {
      console.log('[delete-user] User not found with email:', email)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userId = userToDelete.id
    console.log('[delete-user] Found user ID:', userId)

    // 2. Delete dari profile table
    const { error: profileError } = await supabaseAdmin
      .from('profile')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('[delete-user] Error deleting profile:', profileError)
      // Continue anyway, karena yang penting adalah delete dari auth
    } else {
      console.log('[delete-user] Profile deleted successfully')
    }

    // 3. Delete dari auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteAuthError) {
      console.error('[delete-user] Error deleting auth user:', deleteAuthError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user from auth: ' + deleteAuthError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[delete-user] User deleted successfully from auth')

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully',
        userId: userId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[delete-user] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
