import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../src/database/supabase';

// correct relative path to project root assets (this file is 4 levels deep)
const DriverImg = require('../../../../assets/images/driver.png');

const RideMendapatDriver = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { orderId, driverId } = params;

  const [driverData, setDriverData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load driver data saat screen dibuka
  React.useEffect(() => {
    if (driverId) {
      loadDriverData();
    }
  }, [driverId]);

  const loadDriverData = async () => {
    try {
      console.log('[RideMendapatkanDriver] Loading driver data:', driverId);

      const { data, error } = await supabase
        .from('driver')
        .select('*')
        .eq('id', driverId)
        .single();

      if (error) {
        console.error('[RideMendapatkanDriver] Error loading driver:', error);
      } else {
        console.log('[RideMendapatkanDriver] Driver data loaded:', data);
        setDriverData(data);
      }
    } catch (error) {
      console.error('[RideMendapatkanDriver] Exception:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const name = driverData?.nama || 'Driver';
  const nim = driverData?.nim || '-';
  const motor = driverData?.jenis_motor || '-';
  const plate = driverData?.plat_motor || '-';
  const profileImage = driverData?.profile_image_url;

  const handleBack = () => router.back();
  const handleHubungi = () => {
    // Navigate to chat and pass driver data as params
    router.push({
      pathname: '/screens/customer/ScootRideCustomer/RideChat',
      params: {
        orderId: orderId,
        userId: params.userId,
        driverId: driverId,
        driverName: name,
        driverRating: '4.8',
        nim: nim,
        motor: motor,
        plate: plate,
        lokasiJemput: params.lokasiJemput,
        lokasiTujuan: params.lokasiTujuan,
        biaya: params.biaya,
        nama: params.nama
      }
    } as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.center}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#33cc66" style={{ marginTop: 60 }} />
          ) : (
            <>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <Image source={DriverImg} style={styles.avatar} resizeMode="cover" />
              )}

              <View style={styles.infoList}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>{name}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>{nim}</Text>
                </View>

                <View style={styles.infoRowSplit}>
                  <View style={[styles.infoRow, styles.half]}>
                    <Text style={styles.infoText}>{motor}</Text>
                  </View>
                  <View style={[styles.infoRow, styles.half]}>
                    <Text style={styles.infoText}>{plate}</Text>
                  </View>
                </View>

                <TouchableOpacity style={[styles.infoRow, styles.contactButton]} onPress={handleHubungi}>
                  <Text style={styles.contactText}>Hubungi</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 12, paddingHorizontal: 16 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#33cc66',
    alignItems: 'center',
    justifyContent: 'center'
  },
  backArrow: { color: '#fff', fontSize: 18, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', paddingTop: 8 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginTop: 20, marginBottom: 24 },
  infoList: { width: '85%', alignItems: 'center' },
  infoRow: {
    width: '100%',
    height: 50,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: '#4ab100',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#fff'
  },
  infoRowSplit: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  half: { width: '48%' },
  infoText: { fontSize: 16, color: '#000' },
  contactButton: { borderColor: '#4ab100', backgroundColor: '#fff' },
  contactText: { color: '#016340', fontSize: 16, fontWeight: '600' }
});

export default RideMendapatDriver;


