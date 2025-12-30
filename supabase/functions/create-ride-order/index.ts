import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create Supabase client with SERVICE ROLE (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { customerId, lokasiJemput, lokasiTujuan, biaya } = await req.json()

    console.log('[create-ride-order] Creating order for customer:', customerId)

    // Validasi input
    if (!customerId || !lokasiJemput || !lokasiTujuan) {
      throw new Error('Missing required fields')
    }

    // Insert order TANPA id_driver (akan NULL)
    const { data: order, error: insertError } = await supabase
      .from('scoot_ride')
      .insert({
        id_customer: customerId,
        lokasi_jemput: lokasiJemput,
        lokasi_tujuan: lokasiTujuan,
        tanggal: new Date().toISOString(),
        status: 'pending',
        biaya: biaya || 9000
        // id_driver sengaja TIDAK diisi, biarkan NULL
      })
      .select()
      .single()

    if (insertError) {
      console.error('[create-ride-order] Insert error:', insertError)
      throw insertError
    }

    console.log('[create-ride-order] Order created successfully:', order.id)

    return new Response(
      JSON.stringify({
        success: true,
        data: order,
        message: 'Pesanan berhasil dibuat, menunggu driver...'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[create-ride-order] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
