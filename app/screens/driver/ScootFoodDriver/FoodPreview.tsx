import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapWithRoute from "../../../../components/MapWithRoute";
import { geocodeAddress } from "../../../../src/utils/routingService";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const Preview_Food = () => {
  const params = useLocalSearchParams();
  const router = useRouter();

  // Ambil parameter dari Daftar_Pesanan
  const {
    orderId,
    restaurant,
    destination,
    item,
    price,
    customerId,
    customerName,
    userId, nama, nim, email, jenisMotor, plat
  } = params;

  // State untuk maps
  const [restoCoords, setRestoCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [destCoords, setDestCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoadingMap, setIsLoadingMap] = React.useState(true);

  // Geocode lokasi resto dan tujuan
  React.useEffect(() => {
    const geocodeLocations = async () => {
      setIsLoadingMap(true);
      try {
        const restoStr = restaurant as string;
        const destStr = destination as string;

        if (restoStr && destStr) {
          console.log('[Preview_Food] Geocoding restaurant:', restoStr);
          console.log('[Preview_Food] Geocoding destination:', destStr);

          const [restoResult, destResult] = await Promise.all([
            geocodeAddress(restoStr),
            geocodeAddress(destStr)
          ]);

          if (restoResult) {
            console.log('[Preview_Food] Restaurant coords:', restoResult);
            setRestoCoords(restoResult);
          }
          if (destResult) {
            console.log('[Preview_Food] Destination coords:', destResult);
            setDestCoords(destResult);
          }
        }
      } catch (error) {
        console.error('[Preview_Food] Geocoding error:', error);
      } finally {
        setIsLoadingMap(false);
      }
    };

    geocodeLocations();
  }, [restaurant, destination]);

  // Format price
  const formatPrice = (priceVal: string | number | string[]) => {
    const numPrice = typeof priceVal === 'string' ? parseInt(priceVal, 10) :
      Array.isArray(priceVal) ? parseInt(priceVal[0], 10) : priceVal;
    if (isNaN(numPrice)) return 'Rp 0';
    return `Rp ${numPrice.toLocaleString('id-ID')}`;
  };

  const handleAmbil = () => {
    // Navigate ke FoodAmbilPesanan dengan parameter
    router.push({
      pathname: '/screens/driver/ScootFoodDriver/FoodAmbilPesanan',
      params: {
        orderId,
        restaurant,
        destination,
        item,
        catatan: item,
        price,
        customerId,
        customerName,
        userId, nama, nim, email, jenisMotor, plat
      }
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.view}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/screens/driver/HomeDriver')}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.detailPesanan}>Detail Pesanan</Text>

            {/* Detail Card */}
            <View style={styles.child}>
              {/* Restaurant Name */}
              <View style={styles.restaurantRow}>
                <View style={styles.item} />
                <Text style={styles.warungJepun}>{restaurant || 'Restaurant'}</Text>
              </View>

              {/* Lokasi Antar */}
              <View style={styles.restaurantRow}>
                <View style={[styles.item, { backgroundColor: '#ff6b6b' }]} />
                <Text style={styles.warungJepun}>📍 {destination || 'Lokasi Antar'}</Text>
              </View>

              {/* Pesanan Makanan */}
              <Text style={styles.pesananMakanan}>Detail Pesanan :</Text>
              <Text style={styles.ayamBakar1x}>
                {item || 'Tidak ada pesanan'}
              </Text>

              {/* Customer */}
              <Text style={styles.pesananMakanan}>Customer :</Text>
              <Text style={styles.ayamBakar1x}>{customerName || 'Customer'}</Text>

              {/* Estimasi Tarif */}
              <Text style={styles.estimasiTarif}>
                Ongkir: {formatPrice(price || 0)}
              </Text>
            </View>

            {/* Maps */}
            <View style={styles.mapContainer}>
              <Text style={styles.mapTitle}>Rute Pengantaran</Text>
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

            {/* Ambil Button */}
            <TouchableOpacity style={styles.roundedRectangle} onPress={handleAmbil}>
              <Text style={styles.ambil}>Ambil Pesanan</Text>
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
    flex: 1
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  view: {
    width: "100%",
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20
  },
  backButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  backArrow: {
    fontSize: 32,
    color: '#016837',
    fontWeight: 'bold',
  },
  detailPesanan: {
    fontSize: 18,
    textAlign: "center",
    color: "#217b50",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 20
  },
  child: {
    backgroundColor: "rgba(51, 204, 102, 0.12)",
    borderRadius: 21,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    elevation: 8,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    marginBottom: 20
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  item: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#016837",
    marginRight: 12
  },
  warungJepun: {
    color: "#217b50",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 22,
    flex: 1
  },
  pesananMakanan: {
    color: "#217b50",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    fontSize: 11,
    marginBottom: 6,
    marginTop: 8,
    lineHeight: 22
  },
  ayamBakar1x: {
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    color: "#217b50",
    lineHeight: 20,
    marginBottom: 8
  },
  estimasiTarif: {
    color: "#016837",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12
  },
  mapContainer: {
    marginBottom: 20,
    height: 200,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#217b50',
    marginBottom: 10,
    textAlign: 'center',
  },
  mapLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
  },
  mapLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  roundedRectangle: {
    backgroundColor: "#33cc66",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    elevation: 8,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 40
  },
  ambil: {
    fontSize: 16,
    color: "#fff",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22
  }
});

export default Preview_Food;