#!/usr/bin/env node

/**
 * Script untuk delete semua test orders dari database
 * Run dengan: node delete-test-order.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fnswhgzrveaafvvykbqf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuc3doZ3pydmVhYWZ2dnlrYnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4MTIzMDAsImV4cCI6MjAyNTM4ODMwMH0.y6VfnvKzYAHY5CvMxdKVL9sRpMKrKBYJDxwOKs2gVU4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllOrders() {
  try {
    console.log('📋 Fetching all orders...');
    
    // Get all orders
    const { data: orders, error: fetchError } = await supabase
      .from('scoot_ride')
      .select('id, status');
    
    if (fetchError) {
      console.error('❌ Error fetching orders:', fetchError);
      return;
    }
    
    console.log(`Found ${orders.length} orders:`);
    orders.forEach(order => {
      console.log(`  - ID: ${order.id}, Status: ${order.status}`);
    });
    
    if (orders.length === 0) {
      console.log('✅ No orders to delete');
      return;
    }
    
    // Delete all chat messages for these orders
    console.log('\n🗑️ Deleting chat messages...');
    const orderIds = orders.map(o => o.id);
    
    const { error: chatDeleteError } = await supabase
      .from('chat_ride')
      .delete()
      .in('id_scoot_ride', orderIds);
    
    if (chatDeleteError) {
      console.error('❌ Error deleting messages:', chatDeleteError);
    } else {
      console.log('✅ Chat messages deleted');
    }
    
    // Delete all orders
    console.log('\n🗑️ Deleting orders...');
    const { error: orderDeleteError } = await supabase
      .from('scoot_ride')
      .delete()
      .neq('id', 'null'); // Delete all rows
    
    if (orderDeleteError) {
      console.error('❌ Error deleting orders:', orderDeleteError);
    } else {
      console.log('✅ All orders deleted');
    }
    
    // Verify deletion
    console.log('\n✅ Verifying deletion...');
    const { data: remainingOrders } = await supabase
      .from('scoot_ride')
      .select('id');
    
    console.log(`Remaining orders: ${remainingOrders?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

deleteAllOrders();
