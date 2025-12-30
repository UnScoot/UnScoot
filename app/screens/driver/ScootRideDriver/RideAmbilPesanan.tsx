import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { acceptOrder } from "../../../../src/scootRideDriver/scootRideTrimaPesanan";
import { kirimNotifikasi } from "../../../../src/notifications/notifikasiregister";
import { supabase } from "../../../../src/database/supabase";
import MapWithRoute from "../../../../components/MapWithRoute";
import { geocodeAddress, calculatePrice } from "../../../../src/utils/routingService";
import { hasActiveOrderDriver } from "../../../../src/utils/activeOrderChecker";

const AmbilScootRide = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { orderId, pickup, destination, price, customerId, customerName, userId: userIdParam, nama, nim, email, jenisMotor, plat } = params;
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [resolvedUserId, setResolvedUserId] = React.useState<string>('');

  // Resolve userId dari params, AsyncStorage, atau Supabase Auth
  React.useEffect(() => {
    const resolveUserId = async () => {
      let finalUserId = userIdParam as string;

      // 1️⃣ Coba ambil dari params
      if (finalUserId) {
        console.log('[AmbilScootRide] Using userId from params:', finalUserId);
        setResolvedUserId(finalUserId);
        return;
      }

      // 2️⃣ Coba ambil dari AsyncStorage
      try {
        const userSession = await AsyncStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          finalUserId = session.params?.userId;
          if (finalUserId) {
            console.log('[AmbilScootRide] Using userId from AsyncStorage:', finalUserId);
            setResolvedUserId(finalUserId);
            return;
          }
        }
      } catch (e) {
        console.warn('[AmbilScootRide] Error reading AsyncStorage:', e);
      }

      // 3️⃣ Coba ambil dari Supabase Auth
      try {
        const { data } = await supabase.auth.getUser();
        finalUserId = data?.user?.id;
        if (finalUserId) {
          console.log('[AmbilScootRide] Using userId from Supabase Auth:', finalUserId);
          setResolvedUserId(finalUserId);
          return;
        }
      } catch (e) {
        console.warn('[AmbilScootRide] Error getting user from Supabase:', e);
      }

      console.error('[AmbilScootRide] ❌ Could not resolve userId!');
    };

    resolveUserId();
  }, [userIdParam]);

  // State untuk koordinat maps
  const [pickupCoords, setPickupCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [destCoords, setDestCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoadingMap, setIsLoadingMap] = React.useState(true);

  // Geocode pickup dan destination saat screen dimuat
  React.useEffect(() => {
    const geocodeLocations = async () => {
      setIsLoadingMap(true);
      try {
        const pickupStr = pickup as string;
        const destStr = destination as string;

        if (pickupStr && destStr) {
          console.log('[AmbilScootRide] Geocoding pickup:', pickupStr);
          console.log('[AmbilScootRide] Geocoding destination:', destStr);

          const [pickupResult, destResult] = await Promise.all([
            geocodeAddress(pickupStr),
            geocodeAddress(destStr)
          ]);

          if (pickupResult) {
            console.log('[AmbilScootRide] Pickup coords:', pickupResult);
            setPickupCoords(pickupResult);
          }
          if (destResult) {
            console.log('[AmbilScootRide] Destination coords:', destResult);
            setDestCoords(destResult);
          }
        }
      } catch (error) {
        console.error('[AmbilScootRide] Geocoding error:', error);
      } finally {
        setIsLoadingMap(false);
      }
    };

    geocodeLocations();
  }, [pickup, destination]);

  // Debug: Log semua params saat screen dimuat
  React.useEffect(() => {
    console.log('[AmbilScootRide] ===== RECEIVED PARAMS =====');
    console.log('[AmbilScootRide] orderId:', orderId, typeof orderId);
    console.log('[AmbilScootRide] pickup:', pickup);
    console.log('[AmbilScootRide] destination:', destination);
    console.log('[AmbilScootRide] price:', price);
    console.log('[AmbilScootRide] customerId:', customerId);
    console.log('[AmbilScootRide] customerName:', customerName);
    console.log('[AmbilScootRide] userId (driver) from params:', userIdParam);
    console.log('[AmbilScootRide] userId (driver) resolved:', resolvedUserId);
    console.log('[AmbilScootRide] nama:', nama);
    console.log('[AmbilScootRide] nim:', nim);
    console.log('[AmbilScootRide] email:', email);
    console.log('[AmbilScootRide] jenisMotor:', jenisMotor);
    console.log('[AmbilScootRide] plat:', plat);
    console.log('[AmbilScootRide] ============================');

    // Check missing data
    const missingData = [];
    if (!orderId) missingData.push('orderId');
    if (!resolvedUserId) missingData.push('userId');
    if (!pickup) missingData.push('pickup');
    if (!destination) missingData.push('destination');
    if (!customerName) missingData.push('customerName');

    if (missingData.length > 0) {
      console.warn('[AmbilScootRide] ⚠️ MISSING DATA:', missingData.join(', '));
    }
  }, [orderId, pickup, destination, price, customerId, customerName, userIdParam, resolvedUserId, nama, nim, email, jenisMotor, plat]);

  const handleAmbilPesanan = async () => {
    if (!orderId || !resolvedUserId) {
      Alert.alert('Error', 'Data pesanan tidak lengkap');
      console.error('[AmbilScootRide] ❌ Missing required data - orderId:', orderId, 'userId:', resolvedUserId);
      return;
    }

    Alert.alert(
      'Ambil Pesanan',
      'Yakin mau ambil pesanan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Ambil',
          onPress: async () => {
            setIsAccepting(true);
            console.log('[AmbilScootRide] ===== ACCEPTING ORDER =====');
            console.log('[AmbilScootRide] Order ID:', orderId);
            console.log('[AmbilScootRide] Driver ID:', resolvedUserId);
            console.log('[AmbilScootRide] Customer ID:', customerId);

            try {
              // Check if driver already has active order
              const activeCheck = await hasActiveOrderDriver(resolvedUserId) as any;
              if (activeCheck.hasActive) {
                setIsAccepting(false);
                Alert.alert(
                  'Pesanan Aktif',
                  `Kamu masih punya pesanan ${activeCheck.service} yang belum selesai. Selesaikan dulu sebelum ambil pesanan baru.`,
                  [{ text: 'OK' }]
                );
                return;
              }
            } catch (e) {
              console.warn('[AmbilScootRide] Active order check error:', e);
            }

            const result = await acceptOrder(orderId, resolvedUserId);

            console.log('[AmbilScootRide] Accept result:', JSON.stringify(result, null, 2));

            if (result.success) {
              console.log('[AmbilScootRide] ✅ Order accepted successfully!');
              console.log('[AmbilScootRide] Updated data:', result.data);

              // Kirim notifikasi ke driver
              await kirimNotifikasi({
                title: 'Pesanan Diterima',
                body: `Kamu berhasil ambil pesanan dari ${customerName || 'customer'}`
              });

              // IMPORTANT: Tunggu sebentar agar realtime propagate
              await new Promise(resolve => setTimeout(resolve, 500));

              // Navigate ke halaman chat dengan maps slider dengan resolved userId
              router.replace({
                pathname: '/screens/driver/ScootRideDriver/RideDriverChat',
                params: {
                  orderId,
                  customerId,
                  customerName: customerName || 'Customer',
                  pickup,
                  destination,
                  price,
                  userId: resolvedUserId,
                  nama: nama || '',
                  nim: nim || '',
                  email: email || '',
                  jenisMotor: jenisMotor || '',
                  plat: plat || ''
                }
              });
            } else {
              console.error('[AmbilScootRide] ❌ Failed to accept order:', result.error);
              Alert.alert('Gagal', result.error || 'Pesanan mungkin sudah diambil driver lain');
            }

            setIsAccepting(false);
          }
        }
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <View style={[styles.view, styles.viewBg]}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Pickup Location */}
          <View style={styles.pickupContainer}>
            <View style={styles.dot} />
            <Text style={styles.locationText}>{pickup || "Universitas Sebelas Maret"}</Text>
          </View>

          {/* Destination Location */}
          <View style={styles.destinationContainer}>
            <View style={styles.dot} />
            <Text style={styles.locationText}>{destination || "Solo Grand Mall"}</Text>
          </View>

          {/* Maps Container */}
          <View style={styles.mapsContainer}>
            {isLoadingMap ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.mapLoadingText}>Memuat peta...</Text>
              </View>
            ) : pickupCoords && destCoords ? (
              <MapWithRoute
                origin={pickupCoords}
                destination={destCoords}
                hidePrice={true}
              />
            ) : (
              <Image
                style={styles.mapsImage}
                source={require('../../../../assets/images/maps.png')}
                resizeMode="cover"
              />
            )}
          </View>

          {/* On Maps Button */}
          <TouchableOpacity
            style={[styles.button, styles.onMapsButton]}
            activeOpacity={0.8}
            onPress={handleAmbilPesanan}
            disabled={isAccepting}
          >
            <Text style={styles.buttonText}>
              {isAccepting ? 'Mengambil...' : 'Ambil Pesanan'}
            </Text>
          </TouchableOpacity>

          {/* Hubungi Button */}
          {/* Dihapus - functionality dipindah ke HalamanChat_Ride_Driver dengan slider */}
        </View>
      </SafeAreaView>
    </>
  );
};


const styles = StyleSheet.create({
  viewBg: {
    backgroundColor: "#fff",
    flex: 1,
  },
  view: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  backArrow: {
    fontSize: 32,
    color: '#016837',
    fontWeight: 'bold',
  },
  pickupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4ab100',
  },
  destinationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4ab100',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ab100',
    marginRight: 12,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    color: '#000',
    flex: 1,
  },
  mapsContainer: {
    backgroundColor: 'rgba(91, 211, 131, 0.5)',
    borderRadius: 15,
    padding: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 40,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    height: 320, // Fixed height untuk MapWithRoute
    overflow: 'hidden',
  },
  mapsImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
  },
  mapLoading: {
    height: 300,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
  },
  button: {
    backgroundColor: '#33cc66',
    borderRadius: 34,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: "rgba(0, 0, 0, 0.25)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  onMapsButton: {
    backgroundColor: '#33cc66',
  },
  hubungiButton: {
    backgroundColor: '#fe95a3',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default AmbilScootRide;