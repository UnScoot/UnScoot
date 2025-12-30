import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapWithRoute from '../../../../components/MapWithRoute';
import { geocodeAddress } from '../../../../src/utils/routingService';

const MapsImg = require("../../../../assets/images/maps.png");

const ScootFoodCustMemilihLokasi = () => {
  const router = useRouter();
  const { userId, nama } = useLocalSearchParams();

  const [currentLocation, setCurrentLocation] = React.useState('');
  const [restaurantLocation, setRestaurantLocation] = React.useState('');
  // const [isLoading, setIsLoading] = React.useState(false); // Unused
  const currentRef = React.useRef<any>(null);
  const restoRef = React.useRef<any>(null);

  // State untuk maps dan harga
  const [customerCoords, setCustomerCoords] = React.useState<{latitude: number; longitude: number} | null>(null);
  const [restoCoords, setRestoCoords] = React.useState<{latitude: number; longitude: number} | null>(null);
  const [calculatedPrice, setCalculatedPrice] = React.useState<number>(5000); // Default minimum
  const [routeDistance, setRouteDistance] = React.useState<number | null>(null);
  const [isGeocodingCustomer, setIsGeocodingCustomer] = React.useState(false);
  const [isGeocodingResto, setIsGeocodingResto] = React.useState(false);

  // Debounce timer refs
  const customerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // State untuk error geocoding
  const [customerError, setCustomerError] = React.useState<string | null>(null);
  const [restoError, setRestoError] = React.useState<string | null>(null);

  // Geocode customer location dengan debounce
  React.useEffect(() => {
    if (customerTimerRef.current) {
      clearTimeout(customerTimerRef.current);
    }

    if (!currentLocation.trim()) {
      setCustomerCoords(null);
      setCustomerError(null);
      return;
    }

    customerTimerRef.current = setTimeout(async () => {
      setIsGeocodingCustomer(true);
      setCustomerError(null);
      console.log('[FoodPilihLokasi] Geocoding customer location:', currentLocation);
      const result = await geocodeAddress(currentLocation);
      if (result) {
        console.log('[FoodPilihLokasi] Customer coords:', result);
        setCustomerCoords(result);
        setCustomerError(null);
      } else {
        setCustomerCoords(null);
        setCustomerError('Lokasi tidak ditemukan');
      }
      setIsGeocodingCustomer(false);
    }, 1000);

    return () => {
      if (customerTimerRef.current) {
        clearTimeout(customerTimerRef.current);
      }
    };
  }, [currentLocation]);

  // Geocode restaurant location dengan debounce
  React.useEffect(() => {
    if (restoTimerRef.current) {
      clearTimeout(restoTimerRef.current);
    }

    if (!restaurantLocation.trim()) {
      setRestoCoords(null);
      setRestoError(null);
      return;
    }

    restoTimerRef.current = setTimeout(async () => {
      setIsGeocodingResto(true);
      setRestoError(null);
      console.log('[FoodPilihLokasi] Geocoding resto location:', restaurantLocation);
      const result = await geocodeAddress(restaurantLocation);
      if (result) {
        console.log('[FoodPilihLokasi] Resto coords:', result);
        setRestoCoords(result);
        setRestoError(null);
      } else {
        setRestoCoords(null);
        setRestoError('Lokasi tidak ditemukan');
      }
      setIsGeocodingResto(false);
    }, 1000);

    return () => {
      if (restoTimerRef.current) {
        clearTimeout(restoTimerRef.current);
      }
    };
  }, [restaurantLocation]);

  // Handle route calculated callback dari MapWithRoute
  const handleRouteCalculated = React.useCallback((distanceKm: number, _durationMinutes: number, price: number) => {
    console.log('[FoodPilihLokasi] Route calculated:', { distanceKm, price });
    setRouteDistance(distanceKm);
    setCalculatedPrice(price);
  }, []);

  const handleDetailPesanan = () => {
    if (!currentLocation.trim()) {
      Alert.alert('Error', 'Masukkan lokasi pengantaran');
      return;
    }
    if (!restaurantLocation.trim()) {
      Alert.alert('Error', 'Masukkan lokasi resto');
      return;
    }
    
    // Navigate ke FoodNotes untuk menambah detail pesanan
    router.push({
      pathname: '/screens/customer/ScootFoodCustomer/FoodNotes',
      params: {
        userId: userId,
        nama: nama,
        currentLocation: currentLocation,
        restaurantLocation: restaurantLocation,
        fare: calculatedPrice.toString(),
        distance: routeDistance?.toFixed(2) || '0'
      }
    } as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header with Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Lokasi Pengantaran (Customer) Input */}
          <View style={styles.inputRow}>
            <View style={styles.circle} />
            <Pressable style={styles.inputBox} onPress={() => currentRef.current?.focus?.()}>
              <TextInput
                ref={currentRef}
                style={styles.inputText}
                placeholder="Lokasi pengantaran..."
                placeholderTextColor="#999"
                value={currentLocation}
                onChangeText={setCurrentLocation}
                autoFocus={true}
                returnKeyType="next"
                onSubmitEditing={() => restoRef.current?.focus?.()}
              />
              {isGeocodingCustomer && (
                <ActivityIndicator size="small" color="#33cc66" style={{ marginLeft: 8 }} />
              )}
            </Pressable>
            {customerError && <Text style={styles.errorText}>{customerError}</Text>}
          </View>

          {/* Lokasi Resto Input */}
          <View style={styles.inputRow}>
            <View style={[styles.circle, { borderColor: '#fe95a3' }]} />
            <Pressable style={[styles.inputBox, { borderColor: '#fe95a3' }]} onPress={() => restoRef.current?.focus?.()}>
              <TextInput
                ref={restoRef}
                style={styles.inputText}
                placeholder="Lokasi resto..."
                placeholderTextColor="#999"
                value={restaurantLocation}
                onChangeText={setRestaurantLocation}
                returnKeyType="done"
              />
              {isGeocodingResto && (
                <ActivityIndicator size="small" color="#33cc66" style={{ marginLeft: 8 }} />
              )}
            </Pressable>
            {restoError && <Text style={styles.errorText}>{restoError}</Text>}
          </View>

          {/* Map Container */}
          <View style={styles.mapCard}>
            {restoCoords && customerCoords ? (
              <MapWithRoute
                origin={restoCoords}
                destination={customerCoords}
                originLabel={restaurantLocation || 'Resto'}
                destinationLabel={currentLocation || 'Tujuan'}
                onRouteCalculated={handleRouteCalculated}
              />
            ) : (
              <View style={styles.mapInner}>
                {isGeocodingCustomer || isGeocodingResto ? (
                  <View style={styles.mapLoadingContainer}>
                    <ActivityIndicator size="small" color="#33cc66" />
                    <Text style={styles.mapLoadingText}>Mencari lokasi...</Text>
                  </View>
                ) : (
                  <>
                    <Image
                      style={styles.mapImage}
                      source={MapsImg}
                      resizeMode="cover"
                    />
                    <View style={styles.mapOverlay}>
                      <Text style={styles.mapOverlayText}>
                        Masukkan lokasi untuk melihat rute
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Tarif Row */}
          <View style={styles.tarifRow}>
            <View style={styles.tarifPill}>
              <Text style={styles.tarifLabel}>Ongkir</Text>
              <Text style={styles.tarifValue}>
                {routeDistance !== null 
                  ? `Rp${calculatedPrice.toLocaleString('id-ID')} (${routeDistance.toFixed(1)} km)`
                  : `Rp${calculatedPrice.toLocaleString('id-ID')}`
                }
              </Text>
            </View>
          </View>

          {/* Detail Pesanan Button */}
          <TouchableOpacity 
            style={[styles.detailButton, false && styles.detailButtonDisabled]}
            onPress={handleDetailPesanan}
            disabled={false}
          >
            {false ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.detailButtonText}>Detail Pesanan</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#33cc66',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backArrow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700'
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 0,
    alignItems: 'center'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#33cc66',
    marginRight: 12
  },
  inputBox: {
    flex: 1,
    height: 46,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: '#33cc66',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff'
  },
  inputText: {
    color: '#000',
    fontSize: 16,
    paddingVertical: 0,
    flex: 1
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 34,
  },
  mapCard: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#e6f8ea',
    marginTop: 8,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  mapInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: {
    width: '100%',
    height: '100%'
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  mapOverlayText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  tarifRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12
  },
  tarifPill: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffd14a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18
  },
  tarifLabel: {
    color: '#000',
    fontSize: 16
  },
  tarifValue: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600'
  },
  detailButton: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#33cc66',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  detailButtonDisabled: {
    backgroundColor: '#99e6b3'
  },
  detailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
});

export default ScootFoodCustMemilihLokasi;


