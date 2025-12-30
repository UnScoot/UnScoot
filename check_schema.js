const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://fghygbrmjatgmopywmlb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaHlnYnJtamF0Z21vcHl3bWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTc3MDUsImV4cCI6MjA3NTQ5MzcwNX0.UBi3B7sWWqv7DVlRhbhI8PrJBDSlLDfehJy_R8v5I7Y'
);

async function checkSchema() {
  // Get one ride order to see all columns
  console.log('=== SCOOT_RIDE COLUMNS ===');
  const { data: ride } = await supabase.from('scoot_ride').select('*').limit(1).single();
  console.log('Keys:', Object.keys(ride || {}));
  console.log('Sample:', JSON.stringify(ride, null, 2));

  // Get one food order
  console.log('\n=== SCOOT_FOOD COLUMNS ===');
  const { data: food } = await supabase.from('scoot_food').select('*').limit(1).single();
  console.log('Keys:', Object.keys(food || {}));
  console.log('Sample:', JSON.stringify(food, null, 2));

  // Get one send order
  console.log('\n=== SCOOT_SEND COLUMNS ===');
  const { data: send } = await supabase.from('scoot_send').select('*').limit(1).single();
  console.log('Keys:', Object.keys(send || {}));
  console.log('Sample:', JSON.stringify(send, null, 2));

  // Write to file
  fs.writeFileSync('schema_check.json', JSON.stringify({ ride, food, send }, null, 2));
  console.log('\n✅ Saved to schema_check.json');
}

checkSchema();
