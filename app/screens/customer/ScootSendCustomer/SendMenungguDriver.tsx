import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { subscribeToCustomerSendOrders, unsubscribe, updateSendOrderStatus } from '../../../../src/scootSendCustomer/scootSendMemesan';
import { kirimNotifikasi } from '../../../../src/notifications/notifikasiregister';
import { supabase } from '../../../../src/database/supabase';

const MenungguImg = require("../../../../assets/images/menunggu.png");

const SendMenungguDriver = () => {
  const router = useRouter();
  const { orderId, userId, lokasiJemput, lokasiTujuan, biaya, nama } = useLocalSearchParams();
  const [orderStatus, setOrderStatus] = React.useState('pending');
  const channelRef = React.useRef<any>(null);
  const pollingRef = React.useRef<any>(null);
  const hasNavigatedRef = React.useRef(false);

  React.useEffect(() => {
    if (!userId || !orderId) {
      console.warn('[SendMenungguDriver] Missing userId or orderId');
      return;
    }

    console.log('[SendMenungguDriver] Setting up subscription for userId:', userId, 'orderId:', orderId);

    channelRef.current = subscribeToCustomerSendOrders(userId as string, (payload: any) => {
      console.log('[SendMenungguDriver] ===== REAL-TIME UPDATE =====');
      console.log('[SendMenungguDriver] Event:', payload.eventType);
      console.log('[SendMenungguDriver] Payload New ID:', payload.new?.id);
      console.log('[SendMenungguDriver] Expected orderId:', orderId);
      console.log('[SendMenungguDriver] New Status:', payload.new?.status);

      if (String(payload.new?.id) === String(orderId)) {
        const newStatus = payload.new.status;
        console.log('[SendMenungguDriver] ✅ MATCH! Status changed to:', newStatus);
        setOrderStatus(newStatus);

        if (newStatus === 'accepted' && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          console.log('[SendMenungguDriver] 🎉 Driver accepted!');

          (async () => {
            const { data: orderData } = await supabase
              .from('scoot_send')
              .select('*, driver:id_driver(nama, profile_image_url, jenis_motor, plat_motor)')
              .eq('id', orderId)
              .single();

            const driverData = orderData?.driver;
            const driverName = driverData?.nama || 'Driver';

            kirimNotifikasi({
              title: 'Driver Ditemukan!',
              body: `Driver ${driverName} sedang menuju lokasi Anda.`
            });

            router.replace({
              pathname: '/screens/customer/ScootSendCustomer/SendMendapatDriver',
              params: {
                orderId: orderId,
                userId: userId,
                nama: nama,
                lokasiJemput: orderData?.lokasi_jemput_barang || lokasiJemput,
                lokasiTujuan: orderData?.lokasi_tujuan || lokasiTujuan,
                biaya: orderData?.biaya || biaya,
                driverId: payload.new.id_driver,
                driverName,
                driverPhoto: driverData?.profile_image_url || '',
                detailBarang: orderData?.detail_barang || ''
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

    pollingRef.current = setInterval(async () => {
      if (hasNavigatedRef.current) return;
      try {
        const { data, error } = await supabase
          .from('scoot_send')
          .select('*, driver:id_driver(nama, profile_image_url, jenis_motor, plat_motor)')
          .eq('id', orderId)
          .single();

        if (error) {
          console.error('[SendMenungguDriver] Polling error:', error);
          return;
        }

        if (data?.status === 'accepted' && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          const driverData = data.driver;
          const driverName = driverData?.nama || 'Driver';
          kirimNotifikasi({ title: 'Driver Ditemukan!', body: `Driver ${driverName} sedang menuju lokasi Anda.` });
          router.replace({
            pathname: '/screens/customer/ScootSendCustomer/SendMendapatDriver',
            params: {
              orderId,
              userId,
              nama,
              lokasiJemput: data.lokasi_jemput_barang || lokasiJemput,
              lokasiTujuan: data.lokasi_tujuan || lokasiTujuan,
              biaya: data.biaya || biaya,
              driverId: data.id_driver,
              driverName,
              driverPhoto: driverData?.profile_image_url || ''
            }
          });
        }
      } catch (err) {
        console.error('[SendMenungguDriver] Polling exception:', err);
      }
    }, 3000);

    return () => {
      if (channelRef.current) {
        console.log('[SendMenungguDriver] Cleaning up subscription');
        unsubscribe(channelRef.current);
      }
      if (pollingRef.current) {
        console.log('[SendMenungguDriver] Stopping polling');
        clearInterval(pollingRef.current);
      }
    };
  }, [orderId, userId, router]);

  const handleCancel = async () => {
    if (!orderId) { router.replace('/screens/customer/HomeCustomer'); return; }
    Alert.alert('Batalkan Pesanan', 'Yakin mau batalkan pesanan ini?', [{ text: 'Tidak', style: 'cancel' }, { text: 'Ya, Batalkan', style: 'destructive', onPress: async () => { const result = await updateSendOrderStatus(orderId as string, 'cancelled'); if (result.success) { kirimNotifikasi({ title: 'Pesanan Dibatalkan', body: 'Pesanan ScootSend kamu sudah dibatalkan' }); router.replace('/screens/customer/HomeCustomer'); } else { Alert.alert('Error', 'Gagal membatalkan pesanan'); } } }]);
  };

  const handleBack = () => {
    Alert.alert('Keluar', 'Pesanan masih dalam proses. Yakin mau keluar?', [{ text: 'Tidak', style: 'cancel' }, { text: 'Ya', onPress: () => router.replace('/screens/customer/HomeCustomer') }]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}><Text style={styles.backButtonText}>←</Text></TouchableOpacity>
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.title}>Menunggu Driver</Text>
          <Text style={styles.subtitle}>{orderStatus === 'pending' ? 'Mencari driver terdekat...' : 'Memproses...'}</Text>
          <Image source={MenungguImg} style={styles.image} resizeMode="contain" />
          <View style={styles.infoCard}>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Jemput:</Text><Text style={styles.infoValue}>{lokasiJemput}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Tujuan:</Text><Text style={styles.infoValue}>{lokasiTujuan}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Biaya:</Text><Text style={styles.infoValue}>Rp {biaya}</Text></View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}><Text style={styles.cancelText}>Batalkan Pesanan</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 12, paddingHorizontal: 16 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#33cc66', alignItems: 'center', justifyContent: 'center' },
  backButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, color: '#00633f', fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 18 },
  image: { width: 220, height: 220, marginBottom: 20 },
  infoCard: { width: '85%', backgroundColor: '#f0f9f4', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#33cc66' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#00633f', fontWeight: '600', flex: 1, textAlign: 'right' },
  footer: { paddingHorizontal: 24, paddingBottom: 30, alignItems: 'center' },
  cancelButton: { marginTop: 20, width: 300, height: 50, borderRadius: 34, backgroundColor: '#fe95a3', justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '600', color: '#000' }
});

export default SendMenungguDriver;
