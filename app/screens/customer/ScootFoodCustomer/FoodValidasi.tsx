import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateOrderStatus, subscribeToOrderStatus } from '../../../../src/database/chatScootFood';
import { supabase } from '../../../../src/database/supabase';

const ValidasiPesananSudahSampai: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;
  const userId = params.userId as string;
  
  const [isConfirming, setIsConfirming] = useState(false);
  const orderStatusChannelRef = useRef<any>(null);

  // Polling + realtime untuk mendeteksi status completed
  useEffect(() => {
    if (!orderId) return;

    let isNavigating = false;
    let pollingInterval: NodeJS.Timeout | null = null;

    const handleStatusChange = (newStatus: string) => {
      if (isNavigating) return;
      
      // Jika status sudah completed, redirect ke rating
      if (newStatus === 'completed') {
        isNavigating = true;
        console.log('[FoodValidasi] Order completed! Redirecting to rating...');
        
        // Clear polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
        
        // Cleanup subscription
        if (orderStatusChannelRef.current) {
          orderStatusChannelRef.current.unsubscribe();
        }
        
        // Navigate to rating screen
        router.replace({
          pathname: '/screens/customer/ScootFoodCustomer/FoodRating',
          params: { orderId, userId }
        } as any);
      }
    };

    console.log('[FoodValidasi] Setting up order status subscription for order:', orderId);

    // Realtime subscription
    const subscription = subscribeToOrderStatus(orderId, (payload: any) => {
      console.log('[FoodValidasi] Order status changed via realtime:', payload.new?.status);
      handleStatusChange(payload.new?.status);
    });

    orderStatusChannelRef.current = subscription;

    // Polling fallback - check every 3 seconds
    const checkOrderStatus = async () => {
      if (isNavigating) return;
      
      try {
        const { data, error } = await supabase
          .from('scoot_food')
          .select('status')
          .eq('id', orderId)
          .single();
        
        if (!error && data) {
          console.log('[FoodValidasi] Polling check - current status:', data.status);
          handleStatusChange(data.status);
        }
      } catch (err) {
        console.error('[FoodValidasi] Polling error:', err);
      }
    };

    // Start polling
    pollingInterval = setInterval(checkOrderStatus, 3000) as any;
    // Check immediately
    checkOrderStatus();

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (orderStatusChannelRef.current) {
        orderStatusChannelRef.current.unsubscribe();
      }
    };
  }, [orderId, userId, router]);

  // Handle konfirmasi sudah sampai -> update status ke waiting_payment
  const handleKonfirmasiSampai = async () => {
    if (isConfirming) return;
    setIsConfirming(true);

    if (orderId) {
      console.log('[FoodValidasi] Confirming order arrival:', orderId);
      
      const result = await updateOrderStatus(orderId, 'waiting_payment');
      
      if (result.success) {
        console.log('[FoodValidasi] ✅ Order status updated to waiting_payment');
        Alert.alert('Berhasil', 'Menunggu pembayaran...');
        // Status akan di-poll oleh driver, tapi jika completed langsung, akan auto-navigate
      } else {
        console.error('[FoodValidasi] Failed to update status:', result.error);
        Alert.alert('Error', 'Gagal mengupdate status. Coba lagi.');
        setIsConfirming(false);
      }
    } else {
      // No orderId - just navigate (demo mode)
      router.push('/screens/customer/ScootFoodCustomer/FoodRating');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>

        <Text style={styles.title}>Apakah pesanan kamu sudah sampai?</Text>

        <Text style={styles.subtitle}>Klik tombol di bawah kalau makananmu{"\n"}udah kamu terima ya ☺️</Text>

        <TouchableOpacity 
          style={[styles.button, isConfirming && styles.buttonDisabled]} 
          onPress={handleKonfirmasiSampai}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sudah</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '86%',
    backgroundColor: '#eaf9ef',
    borderRadius: 18,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00b74a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  checkMark: { color: '#fff', fontSize: 34, fontWeight: '700' },
  title: { color: '#00633f', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#2b2b2b', fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  button: {
    backgroundColor: '#00b74a',
    paddingVertical: 12,
    paddingHorizontal: 34,
    borderRadius: 26,
    elevation: 3,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#aaa',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default ValidasiPesananSudahSampai;
        				

