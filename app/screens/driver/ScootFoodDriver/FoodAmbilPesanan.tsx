import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../../../src/database/supabase";
import { acceptOrder } from "../../../../src/scootFoodDriver/scootFoodTrimaPesanan";
import MapWithRoute from "../../../../components/MapWithRoute";
import { geocodeAddress } from "../../../../src/utils/routingService";
import { hasActiveOrderDriver } from "../../../../src/utils/activeOrderChecker";

const AmbilScootFood = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    orderId,
    restaurant,
    destination,
    item,
    price,
    customerId,
    customerName,
    userId: userIdParam, nama, nim, email, jenisMotor, plat,
    orderItems: orderItemsParam,
    notes: notesParam
  } = params;

  const [isAccepting, setIsAccepting] = React.useState(false);
  const [resolvedUserId, setResolvedUserId] = React.useState<string>('');

  // State untuk maps
  const [restoCoords, setRestoCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [destCoords, setDestCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoadingMap, setIsLoadingMap] = React.useState(true);

  // Resolve userId
  React.useEffect(() => {
    const resolveUserId = async () => {
      let finalUserId = userIdParam as string;

      if (finalUserId) {
        console.log('[AmbilScootFood] Using userId from params:', finalUserId);
        setResolvedUserId(finalUserId);
        return;
      }

      try {
        const userSession = await AsyncStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          finalUserId = session.params?.userId;
          if (finalUserId) {
            console.log('[AmbilScootFood] Using userId from AsyncStorage:', finalUserId);
            setResolvedUserId(finalUserId);
            return;
          }
        }
      } catch (e) {
        console.warn('[AmbilScootFood] Error reading AsyncStorage:', e);
      }

      try {
        const { data } = await supabase.auth.getUser();
        finalUserId = data?.user?.id || '';
        if (finalUserId) {
          console.log('[AmbilScootFood] Using userId from Supabase Auth:', finalUserId);
          setResolvedUserId(finalUserId);
          return;
        }
      } catch (e) {
        console.warn('[AmbilScootFood] Error getting user from Supabase:', e);
      }

      console.error('[AmbilScootFood] ❌ Could not resolve userId!');
    };

    resolveUserId();
  }, [userIdParam]);

  // Geocode locations
  React.useEffect(() => {
    const geocodeLocations = async () => {
      setIsLoadingMap(true);
      try {
        const restoStr = restaurant as string;
        const destStr = destination as string;

        if (restoStr && destStr) {
          console.log('[AmbilScootFood] Geocoding restaurant:', restoStr);
          console.log('[AmbilScootFood] Geocoding destination:', destStr);

          const [restoResult, destResult] = await Promise.all([
            geocodeAddress(restoStr),
            geocodeAddress(destStr)
          ]);

          if (restoResult) {
            console.log('[AmbilScootFood] Restaurant coords:', restoResult);
            setRestoCoords(restoResult);
          }
          if (destResult) {
            console.log('[AmbilScootFood] Destination coords:', destResult);
            setDestCoords(destResult);
          }
        }
      } catch (error) {
        console.error('[AmbilScootFood] Geocoding error:', error);
      } finally {
        setIsLoadingMap(false);
      }
    };

    geocodeLocations();
  }, [restaurant, destination]);

  // Debug log
  React.useEffect(() => {
    console.log('[AmbilScootFood] ===== RECEIVED PARAMS =====');
    console.log('[AmbilScootFood] orderId:', orderId);
    console.log('[AmbilScootFood] restaurant:', restaurant);
    console.log('[AmbilScootFood] destination:', destination);
    console.log('[AmbilScootFood] item:', item);
    console.log('[AmbilScootFood] price:', price);
    console.log('[AmbilScootFood] customerId:', customerId);
    console.log('[AmbilScootFood] customerName:', customerName);
    console.log('[AmbilScootFood] userId (driver):', resolvedUserId);
    console.log('[AmbilScootFood] ============================');
  }, [orderId, restaurant, destination, item, price, customerId, customerName, resolvedUserId]);

  const handleAmbilPesanan = async () => {
    if (!orderId || !resolvedUserId) {
      Alert.alert('Error', 'Data pesanan tidak lengkap');
      console.error('[AmbilScootFood] ❌ Missing data - orderId:', orderId, 'userId:', resolvedUserId);
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

              console.log('[AmbilScootFood] Accepting order:', orderId, 'by driver:', resolvedUserId);

              const result = await acceptOrder(orderId as string, resolvedUserId);

              if (result.success) {
                console.log('[AmbilScootFood] ✅ Order accepted successfully!');

                Alert.alert(
                  'Berhasil!',
                  'Pesanan berhasil diambil. Silakan hubungi customer.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Navigate to chat
                        router.replace({
                          pathname: '/screens/driver/ScootFoodDriver/FoodDriverChat',
                          params: {
                            orderId: orderId,
                            userId: resolvedUserId,
                            customerId: customerId,
                            customerName: customerName || 'Customer',
                            restaurant: restaurant,
                            lokasiResto: restaurant, // Also pass as lokasiResto for geocoding compatibility
                            destination: destination,
                            lokasiAntar: destination, // Also pass as lokasiAntar for chat screen
                            lokasiCustomer: destination, // Also pass as lokasiCustomer for geocoding compatibility
                            item: item,
                            biaya: price,
                            orderItems: orderItemsParam,
                            notes: notesParam,
                          }
                        });
                      }
                    }
                  ]
                );
              } else {
                console.error('[AmbilScootFood] ❌ Failed to accept:', result.error);
                Alert.alert('Gagal', result.error || 'Pesanan sudah diambil driver lain');
              }
            } catch (error: any) {
              console.error('[AmbilScootFood] ❌ Exception:', error);
              Alert.alert('Error', error.message || 'Terjadi kesalahan');
            } finally {
              setIsAccepting(false);
            }
          }
        }
      ]
    );
  };

  // Format price
  const formatPrice = (priceVal: string | number | string[]) => {
    const numPrice = typeof priceVal === 'string' ? parseInt(priceVal, 10) :
      Array.isArray(priceVal) ? parseInt(priceVal[0], 10) : priceVal;
    if (isNaN(numPrice)) return 'Rp 0';
    return `Rp ${numPrice.toLocaleString('id-ID')}`;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.view}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/screens/driver/HomeDriver')}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            {/* Restaurant Name */}
            <View style={styles.pickupContainer}>
              <View style={styles.dot} />
              <Text style={styles.locationText} numberOfLines={2}>🍽️ {restaurant || "Restaurant"}</Text>
            </View>

            {/* Destination */}
            <View style={styles.destinationContainer}>
              <View style={[styles.dot, { backgroundColor: '#ff6b6b' }]} />
              <Text style={styles.locationText} numberOfLines={2}>📍 {destination || "Lokasi Antar"}</Text>
            </View>

            {/* Order Info */}
            <View style={styles.orderInfoCard}>
              <Text style={styles.orderInfoTitle}>Detail Pesanan:</Text>
              <Text style={styles.orderInfoText}>{item || 'Tidak ada pesanan'}</Text>
              <Text style={styles.orderPriceText}>Ongkir: {formatPrice(price || 0)}</Text>
            </View>

            {/* Maps Container */}
            <View style={styles.mapsContainer}>
              {isLoadingMap ? (
                <View style={styles.mapLoading}>
                  <ActivityIndicator size="large" color="#33cc66" />
                  <Text style={styles.mapLoadingText}>Memuat peta...</Text>
                </View>
              ) : restoCoords && destCoords ? (
                <MapWithRoute
                  origin={restoCoords}
                  destination={destCoords}
                  originLabel="Restaurant"
                  destinationLabel="Tujuan"
                  hidePrice={true}
                />
              ) : (
                <View style={styles.mapLoading}>
                  <Text style={styles.mapLoadingText}>Peta tidak tersedia</Text>
                </View>
              )}
            </View>

            {/* Ambil Button - hanya button ini, setelah ambil akan redirect ke chat */}
            <TouchableOpacity
              style={[styles.button, styles.ambilButton, isAccepting && styles.buttonDisabled]}
              activeOpacity={0.8}
              onPress={handleAmbilPesanan}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Ambil Pesanan</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};


const styles = StyleSheet.create({
  viewBg: {
    backgroundColor: "#fff",
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
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
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ab100',
    marginRight: 12,
  },
  locationText: {
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
    color: '#000',
    flex: 1,
  },
  orderInfoCard: {
    backgroundColor: 'rgba(51, 204, 102, 0.12)',
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(1, 104, 55, 0.3)',
  },
  orderInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#217b50',
    marginBottom: 4,
  },
  orderInfoText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 8,
    lineHeight: 18,
  },
  orderPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#016837',
    marginTop: 8,
  },
  mapsContainer: {
    backgroundColor: 'rgba(91, 211, 131, 0.2)',
    borderRadius: 15,
    padding: 10,
    marginBottom: 20,
    height: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  mapLoading: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  mapLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  button: {
    borderRadius: 34,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: "rgba(0, 0, 0, 0.25)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  ambilButton: {
    backgroundColor: '#33cc66',
  },
  hubungiButton: {
    backgroundColor: '#fe95a3',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default AmbilScootFood;