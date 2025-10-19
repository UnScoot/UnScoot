// Edge Function untuk registrasi user (Customer/Driver)
// Menggunakan service_role key untuk bypass RLS dan logic kompleks

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Register User Edge Function Started")

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
    const { nim, email, password, nama, jenisMotor, plat, role } = await req.json()
    
    console.log('[register-user] Request received:', { nim, email, role })
    
    // Validasi input
    if (!nim || !email || !password || !nama || !role) {
      return new Response(
        JSON.stringify({ error: 'Semua field wajib diisi.' }),
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
        JSON.stringify({ error: 'Role harus customer atau driver.' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    // Validasi driver harus ada jenis motor dan plat
    if (role === 'driver' && (!jenisMotor || !plat)) {
      return new Response(
        JSON.stringify({ error: 'Driver harus mengisi jenis motor dan plat nomor.' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    // Buat Supabase Admin Client dengan SERVICE_ROLE key
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
    
    console.log('[register-user] Step 1: Validating NIM in mahasiswa_uns...')
    
    // 1. Validasi NIM di mahasiswa_uns
    const { data: mhs, error: mhsError } = await supabaseAdmin
      .from('mahasiswa_uns')
      .select('*')
      .eq('nim', nim)
      .maybeSingle()
    
    if (mhsError) {
      console.error('[register-user] Error checking mahasiswa_uns:', mhsError)
      return new Response(
        JSON.stringify({ error: 'Terjadi kesalahan saat validasi NIM.' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    if (!mhs) {
      console.log('[register-user] NIM not found in mahasiswa_uns')
      return new Response(
        JSON.stringify({ error: 'NIM tidak terdaftar sebagai mahasiswa UNS.' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    console.log('[register-user] Step 2: Checking NIM duplication...')
    
    // 2. Cek duplikat NIM di customer
    const { data: customerByNim } = await supabaseAdmin
      .from('customer')
      .select('nim')
      .eq('nim', nim)
      .maybeSingle()
    
    // Cek duplikat NIM di driver
    const { data: driverByNim } = await supabaseAdmin
      .from('driver')
      .select('nim')
      .eq('nim', nim)
      .maybeSingle()
    
    if (customerByNim || driverByNim) {
      console.log('[register-user] NIM already used')
      return new Response(
        JSON.stringify({ error: 'NIM sudah digunakan untuk registrasi di aplikasi.' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    console.log('[register-user] Step 3: Checking email duplication...')
    
    // 3. Cek duplikat email di customer
    const { data: customerByEmail } = await supabaseAdmin
      .from('customer')
      .select('email')
      .eq('email', email)
      .maybeSingle()
    
    // Cek duplikat email di driver
    const { data: driverByEmail } = await supabaseAdmin
      .from('driver')
      .select('email')
      .eq('email', email)
      .maybeSingle()
    
    if (customerByEmail || driverByEmail) {
      console.log('[register-user] Email already used')
      return new Response(
        JSON.stringify({ error: 'Email sudah digunakan untuk registrasi di aplikasi.' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    console.log('[register-user] Step 4: Creating user in Supabase Auth...')
    
    // 4. Create user di Supabase Auth dengan admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // false = butuh email confirmation (email akan dikirim ke spam/inbox)
      user_metadata: { 
        nim, 
        nama, 
        role,
        ...(role === 'driver' ? { jenisMotor, plat } : {})
      }
    })
    
    console.log('[register-user] User created in Auth, userId:', authData?.user?.id)
    
    if (authError) {
      console.error('[register-user] Auth error:', authError)
      
      // Check specific error messages
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'Email sudah digunakan untuk registrasi di aplikasi.' }),
          { 
            status: 400, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    console.log('[register-user] Step 5: Inserting profile to database...')
    
    // 5. Insert profile ke table customer/driver
    const table = role === 'driver' ? 'driver' : 'customer'
    const profileData = {
      id: authData.user.id,
      nim,
      nama,
      email,
      ...(role === 'driver' ? { jenis_motor: jenisMotor, plat_motor: plat } : {})
    }
    
    const { error: insertError } = await supabaseAdmin
      .from(table)
      .insert([profileData])
    
    if (insertError) {
      console.error('[register-user] Insert error:', insertError)
      console.error('[register-user] Insert error details:', JSON.stringify(insertError, null, 2))
      console.error('[register-user] Profile data attempted:', JSON.stringify(profileData, null, 2))
      
      // Rollback: delete user from auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return new Response(
        JSON.stringify({ 
          error: 'Database error creating new user',
          details: insertError.message || insertError.toString(),
          hint: insertError.hint || 'Check database constraints'
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    console.log('[register-user] Step 6: Sending email confirmation...')
    
    // 6. Send email confirmation using inviteUserByEmail (this ACTUALLY sends email)
    try {
      // inviteUserByEmail will trigger email via Brevo SMTP automatically
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
      
      if (inviteError) {
        console.error('[register-user] Invite email error:', inviteError)
        console.error('[register-user] Error details:', JSON.stringify(inviteError, null, 2))
      } else {
        console.log('[register-user] Email invitation sent successfully to:', email)
        console.log('[register-user] Check spam folder!')
      }
    } catch (emailErr) {
      console.error('[register-user] Failed to send email:', emailErr)
      console.error('[register-user] Email error stack:', emailErr instanceof Error ? emailErr.stack : emailErr)
    }
    
    console.log('[register-user] Registration successful!', { userId: authData.user.id })
    
    // 7. Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: role
        },
        needsEmailConfirmation: true,
        message: 'Registrasi berhasil! Silakan cek folder SPAM/Promosi untuk email verifikasi dari UnScoot. Tandai sebagai "Bukan Spam" agar email selanjutnya masuk ke inbox.'
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
    console.error('[register-user] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan pada server. Silakan coba lagi.' }),
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/register-user' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
