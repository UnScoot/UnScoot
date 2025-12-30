const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fghygbrmjatgmopywmlb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaHlnYnJtamF0Z21vcHl3bWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTc3MDUsImV4cCI6MjA3NTQ5MzcwNX0.UBi3B7sWWqv7DVlRhbhI8PrJBDSlLDfehJy_R8v5I7Y'
);

async function checkDates() {
  console.log('Current local time:', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
  console.log('Current UTC time:', new Date().toISOString());
  console.log('');

  // Get latest orders
  const { data: rides } = await supabase.from('scoot_ride').select('id, tanggal').order('tanggal', { ascending: false }).limit(5);
  const { data: foods } = await supabase.from('scoot_food').select('id, tanggal').order('tanggal', { ascending: false }).limit(5);  
  const { data: sends } = await supabase.from('scoot_send').select('id, tanggal').order('tanggal', { ascending: false }).limit(5);

  console.log('=== SCOOT_RIDE (latest 5) ===');
  rides?.forEach(r => {
    const utc = r.tanggal;
    const local = new Date(utc).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    console.log(`  UTC: ${utc} → Local: ${local}`);
  });

  console.log('\n=== SCOOT_FOOD (latest 5) ===');
  foods?.forEach(r => {
    const utc = r.tanggal;
    const local = new Date(utc).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    console.log(`  UTC: ${utc} → Local: ${local}`);
  });

  console.log('\n=== SCOOT_SEND (latest 5) ===');
  sends?.forEach(r => {
    const utc = r.tanggal;
    const local = new Date(utc).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    console.log(`  UTC: ${utc} → Local: ${local}`);
  });
}

checkDates();
