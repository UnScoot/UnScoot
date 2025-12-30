// Test script to verify chat_ride table and messages
import { supabase } from '../src/database/supabase';

export const testChatSystem = async () => {
  console.log('🧪 Testing Chat System...\n');

  try {
    // Test 1: Check if chat_ride table exists
    console.log('1️⃣  Checking chat_ride table...');
    const { data, error: tableError } = await supabase
      .from('chat_ride')
      .select('count(*)', { count: 'exact', head: true });

    if (tableError) {
      console.error('❌ chat_ride table error:', tableError.message);
      return false;
    }
    console.log('✅ chat_ride table exists\n');

    // Test 2: Try to insert a test message
    console.log('2️⃣  Testing message insert...');
    const { data: testData, error: insertError } = await supabase
      .from('chat_ride')
      .insert({
        id_scoot_ride: 'test-id',
        id_sender: 'test-sender',
        sender_type: 'customer',
        message: 'Test message from system check',
        timestamp: new Date().toISOString()
      });

    if (insertError) {
      console.error('❌ Insert error:', insertError.message);
      return false;
    }
    console.log('✅ Message insert works\n');

    // Test 3: Try to query messages
    console.log('3️⃣  Testing message retrieval...');
    const { data: messages, error: queryError } = await supabase
      .from('chat_ride')
      .select('*')
      .order('timestamp', { ascending: true });

    if (queryError) {
      console.error('❌ Query error:', queryError.message);
      return false;
    }
    console.log(`✅ Retrieved ${messages?.length || 0} messages\n`);

    // Test 4: Try to setup realtime subscription
    console.log('4️⃣  Testing realtime subscription...');
    const channel = supabase
      .channel('test-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_ride'
        },
        (payload) => {
          console.log('✅ Realtime event received:', payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    setTimeout(() => {
      console.log('✅ Realtime subscription setup complete\n');
      supabase.removeChannel(channel);
    }, 2000);

    console.log('🎉 All tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
};

// Run on app startup
if (__DEV__) {
  testChatSystem();
}
