/**
 * COMPREHENSIVE SUPABASE DATABASE CHECK
 * Script untuk memeriksa semua data di Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://fghygbrmjatgmopywmlb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaHlnYnJtamF0Z21vcHl3bWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTc3MDUsImV4cCI6MjA3NTQ5MzcwNX0.UBi3B7sWWqv7DVlRhbhI8PrJBDSlLDfehJy_R8v5I7Y'
);

async function checkAll() {
  const report = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  console.log('========================================');
  console.log('   SUPABASE DATABASE AUDIT REPORT');
  console.log('========================================\n');

  // 1. CHECK SCOOT_RIDE
  console.log('1. SCOOT_RIDE ORDERS');
  console.log('-------------------');
  const { data: rides, error: e1 } = await supabase
    .from('scoot_ride')
    .select('*')
    .order('tanggal', { ascending: false });
  
  if (e1) {
    console.log('   ❌ Error:', e1.message);
  } else {
    const statusCount = {};
    rides.forEach(r => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
    console.log(`   Total records: ${rides.length}`);
    console.log('   By status:', JSON.stringify(statusCount));
    report.tables.scoot_ride = { total: rides.length, byStatus: statusCount };
  }

  // 2. CHECK SCOOT_FOOD
  console.log('\n2. SCOOT_FOOD ORDERS');
  console.log('--------------------');
  const { data: foods, error: e2 } = await supabase
    .from('scoot_food')
    .select('*')
    .order('tanggal', { ascending: false });
  
  if (e2) {
    console.log('   ❌ Error:', e2.message);
  } else {
    const statusCount = {};
    foods.forEach(r => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
    console.log(`   Total records: ${foods.length}`);
    console.log('   By status:', JSON.stringify(statusCount));
    report.tables.scoot_food = { total: foods.length, byStatus: statusCount };
  }

  // 3. CHECK SCOOT_SEND
  console.log('\n3. SCOOT_SEND ORDERS');
  console.log('--------------------');
  const { data: sends, error: e3 } = await supabase
    .from('scoot_send')
    .select('*')
    .order('tanggal', { ascending: false });
  
  if (e3) {
    console.log('   ❌ Error:', e3.message);
  } else {
    const statusCount = {};
    sends.forEach(r => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
    console.log(`   Total records: ${sends.length}`);
    console.log('   By status:', JSON.stringify(statusCount));
    report.tables.scoot_send = { total: sends.length, byStatus: statusCount };
  }

  // 4. CHECK CHAT_RIDE
  console.log('\n4. CHAT_RIDE (MESSAGES)');
  console.log('-----------------------');
  const { data: chatRide, error: e4 } = await supabase
    .from('chat_ride')
    .select('*');
  
  if (e4) {
    console.log('   ❌ Error:', e4.message);
  } else {
    console.log(`   Total messages: ${chatRide.length}`);
    report.tables.chat_ride = { total: chatRide.length };
  }

  // 5. CHECK CHAT_FOOD
  console.log('\n5. CHAT_FOOD (MESSAGES)');
  console.log('-----------------------');
  const { data: chatFood, error: e5 } = await supabase
    .from('chat_food')
    .select('*');
  
  if (e5) {
    console.log('   ❌ Error:', e5.message);
  } else {
    console.log(`   Total messages: ${chatFood.length}`);
    report.tables.chat_food = { total: chatFood.length };
  }

  // 6. CHECK CHAT_SEND
  console.log('\n6. CHAT_SEND (MESSAGES)');
  console.log('-----------------------');
  const { data: chatSend, error: e6 } = await supabase
    .from('chat_send')
    .select('*');
  
  if (e6) {
    console.log('   ❌ Error:', e6.message);
  } else {
    console.log(`   Total messages: ${chatSend.length}`);
    report.tables.chat_send = { total: chatSend.length };
  }

  // 7. CHECK CUSTOMERS
  console.log('\n7. CUSTOMERS');
  console.log('------------');
  const { data: customers, error: e7 } = await supabase
    .from('customer')
    .select('id, nama, email');
  
  if (e7) {
    console.log('   ❌ Error:', e7.message);
  } else {
    console.log(`   Total customers: ${customers.length}`);
    customers.forEach(c => console.log(`   - ${c.nama} (${c.email})`));
    report.tables.customer = { total: customers.length, list: customers };
  }

  // 8. CHECK DRIVERS
  console.log('\n8. DRIVERS');
  console.log('----------');
  const { data: drivers, error: e8 } = await supabase
    .from('driver')
    .select('id, nama, email');
  
  if (e8) {
    console.log('   ❌ Error:', e8.message);
  } else {
    console.log(`   Total drivers: ${drivers.length}`);
    drivers.forEach(d => console.log(`   - ${d.nama} (${d.email})`));
    report.tables.driver = { total: drivers.length, list: drivers };
  }

  // 9. CHECK HISTORY TABLES (if used)
  console.log('\n9. HISTORY TABLES');
  console.log('-----------------');
  const { data: histRide, error: e9 } = await supabase.from('history_scootride').select('id').limit(1);
  const { data: histFood, error: e10 } = await supabase.from('history_scootfood').select('id').limit(1);
  const { data: histSend, error: e11 } = await supabase.from('history_scootsend').select('id').limit(1);
  
  console.log(`   history_scootride: ${e9 ? 'Error: ' + e9.message : (histRide?.length || 0) + ' rows'}`);
  console.log(`   history_scootfood: ${e10 ? 'Error: ' + e10.message : (histFood?.length || 0) + ' rows'}`);
  console.log(`   history_scootsend: ${e11 ? 'Error: ' + e11.message : (histSend?.length || 0) + ' rows'}`);

  // SUMMARY
  console.log('\n========================================');
  console.log('   SUMMARY');
  console.log('========================================');
  console.log(`   Orders (Ride):  ${rides?.length || 0} (${report.tables.scoot_ride?.byStatus?.completed || 0} completed)`);
  console.log(`   Orders (Food):  ${foods?.length || 0} (${report.tables.scoot_food?.byStatus?.completed || 0} completed)`);
  console.log(`   Orders (Send):  ${sends?.length || 0} (${report.tables.scoot_send?.byStatus?.completed || 0} completed)`);
  console.log(`   Chat Ride:      ${chatRide?.length || 0} messages`);
  console.log(`   Chat Food:      ${chatFood?.length || 0} messages`);
  console.log(`   Chat Send:      ${chatSend?.length || 0} messages`);
  console.log(`   Customers:      ${customers?.length || 0}`);
  console.log(`   Drivers:        ${drivers?.length || 0}`);
  console.log('========================================\n');

  // Save report to JSON
  fs.writeFileSync('supabase_audit_report.json', JSON.stringify(report, null, 2));
  console.log('✅ Full report saved to supabase_audit_report.json\n');
}

checkAll().catch(console.error);
