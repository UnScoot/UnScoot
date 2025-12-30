import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { subscribeToCustomerFoodOrders, unsubscribeFood, updateFoodOrderStatus } from '../../../../src/scootFoodCustomer/scootFoodMemesan';
import { kirimNotifikasi } from '../../../../src/notifications/notifikasiregister';
import { supabase } from '../../../../src/database/supabase';

const MenungguImg = require("../../../../assets/images/menunggu.png");

const FoodMenungguDriver = () => {
  const router = useRouter();
  const { orderId, userId, lokasiCustomer, lokasiResto, biaya, nama, orderItems, notes } = useLocalSearchParams();
  const [orderStatus, setOrderStatus] = React.useState('pending');
  const channelRef = React.useRef<any>(null);
  const pollingRef = React.useRef<any>(null);
  const hasNavigatedRef = React.useRef(false);

  // Real-time subscription untuk status order
  React.useEffect(() => {
    if (!userId || !orderId) {
      console.warn('[FoodMenungguDriver] Missing userId or orderId');
      return;
    }

    console.log('[FoodMenungguDriver] Setting up subscription for userId:', userId, 'orderId:', orderId);

    // Subscribe ke perubahan order
    channelRef.current = subscribeToCustomerFoodOrders(userId, (payload: any) => {
      console.log('[FoodMenungguDriver] ===== REAL-TIME UPDATE =====');
      console.log('[FoodMenungguDriver] Event:', payload.eventType);
      console.log('[FoodMenungguDriver] Payload New ID:', payload.new?.id);
      console.log('[FoodMenungguDriver] Expected orderId:', orderId);
      console.log('[FoodMenungguDriver] New Status:', payload.new?.status);

      // Cek kalau ini order yang kita tunggu
      if (String(payload.new?.id) === String(orderId)) {
        const newStatus = payload.new.status;
        console.log('[FoodMenungguDriver] ✅ MATCH! Status changed to:', newStatus);
        setOrderStatus(newStatus);

        if (newStatus === 'accepted' && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          console.log('[FoodMenungguDriver] 🎉 Driver accepted!');
          
          // Fetch driver info
          (async () => {
            const { data: orderData } = await supabase
              .from('scoot_food')
              .select('*, driver:id_driver(nama, nim, jenis_motor, plat_motor, profile_image_url)')
              .eq('id', orderId)
              .single();
            
            const driverData = orderData?.driver;
            const driverName = driverData?.nama || 'Driver';
            
            kirimNotifikasi({
              title: 'Driver Ditemukan!',
              body: `Driver ${driverName} sedang menuju resto untuk mengambil pesananmu!`
            });

            // Navigate ke halaman mendapat driver lalu chat
            router.replace({
              pathname: '/screens/customer/ScootFoodCustomer/FoodMendapatDriver',
              params: {
                orderId: orderId,
                userId: userId,
                nama: nama,
                lokasiCustomer: lokasiCustomer,
                lokasiResto: lokasiResto,
                biaya: biaya,
                orderItems: orderItems,
                notes: notes,
                driverId: payload.new.id_driver,
                driverName: driverName,
                driverNim: driverData?.nim || '',
                driverMotor: driverData?.jenis_motor || '',
                driverPlat: driverData?.plat_motor || '',
                driverPhoto: driverData?.profile_image_url || ''
              }
            });
          })();
        } else if (newStatus === 'rejected' && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          Alert.alert(
            'Pesanan Ditolak',
            'Maaf, driver menolak pesanan ini. Silakan coba lagi.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      }
    });

    // FALLBACK: Polling setiap 3 detik
    pollingRef.current = setInterval(async () => {
      if (hasNavigatedRef.current) return;

      console.log('[FoodMenungguDriver] 🔄 Polling order status...');
      
      try {
        const { data, error } = await supabase
          .from('scoot_food')
          .select('*, driver:id_driver(nama, nim, jenis_motor, plat_motor, profile_image_url)')
          .eq('id', orderId)
          .single();

        if (error) {
          console.error('[FoodMenungguDriver] Polling error:', error);
          return;
        }

        console.log('[FoodMenungguDriver] Polling result - Status:', data?.status);

        if (data?.status === 'accepted' && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          console.log('[FoodMenungguDriver] 🔄 ✅ DETECTED VIA POLLING!');

          const driverData = data.driver;
          const driverName = driverData?.nama || 'Driver';

          kirimNotifikasi({
            title: 'Driver Ditemukan!',
            body: `Driver ${driverName} menuju resto!`
          });

          router.replace({
            pathname: '/screens/customer/ScootFoodCustomer/FoodMendapatDriver',
            params: {
              orderId: orderId,
              userId: userId,
              nama: nama,
              lokasiCustomer: lokasiCustomer,
              lokasiResto: lokasiResto,
              biaya: biaya,
              orderItems: orderItems,
              notes: notes,
              driverId: data.id_driver,
              driverName: driverName,
              driverNim: driverData?.nim || '',
              driverMotor: driverData?.jenis_motor || '',
              driverPlat: driverData?.plat_motor || '',
              driverPhoto: driverData?.profile_image_url || ''
            }
          });
        }
      } catch (err) {
        console.error('[FoodMenungguDriver] Polling exception:', err);
      }
    }, 3000);

    // Cleanup
    return () => {
      if (channelRef.current) {
        console.log('[FoodMenungguDriver] Cleaning up subscription');
        unsubscribeFood(channelRef.current);
      }
      if (pollingRef.current) {
        console.log('[FoodMenungguDriver] Stopping polling');
        clearInterval(pollingRef.current);
      }
    };
}, [orderId, userId, biaya, lokasiCustomer, lokasiResto, nama, notes, orderItems, router]);

  const handleCancel = async () => {
    if (!orderId) {
      router.replace('/screens/customer/HomeCustomer');
      return;
    }

    Alert.alert(
      'Batalkan Pesanan',
      'Yakin mau batalkan pesanan ini?',
      [
        { text: 'Tidak', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            console.log('[FoodMenungguDriver] Cancelling order:', orderId);
            
            const result = await updateFoodOrderStatus(orderId, 'cancelled');
            
            if (result.success) {
              kirimNotifikasi({
                title: 'Pesanan Dibatalkan',
                body: 'Pesanan ScootFood kamu sudah dibatalkan'
              });
              router.replace('/screens/customer/HomeCustomer');
            } else {
              Alert.alert('Error', 'Gagal membatalkan pesanan');
            }
          }
        }
      ]
    );
  };

  const handleBack = () => {
    Alert.alert(
      'Keluar',
      'Pesanan masih dalam proses. Yakin mau keluar?',
      [
        { text: 'Tidak', style: 'cancel' },
        { text: 'Ya', onPress: () => router.replace('/screens/customer/HomeCustomer') }
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.centerContent}>
        <Text style={styles.title}>Menunggu Driver</Text>
        <Text style={styles.subtitle}>
          {orderStatus === 'pending' ? 'Mencari driver terdekat...' : 'Memproses...'}
        </Text>
        
        <Image source={MenungguImg} style={styles.image} resizeMode="contain" />
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Resto:</Text>
            <Text style={styles.infoValue}>{lokasiResto}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Antar ke:</Text>
            <Text style={styles.infoValue}>{lokasiCustomer}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ongkir:</Text>
            <Text style={styles.infoValue}>Rp {biaya}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>Batalkan Pesanan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#33cc66',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00633f',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(51, 204, 102, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 204, 102, 0.3)',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fe95a3',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default FoodMenungguDriver;
