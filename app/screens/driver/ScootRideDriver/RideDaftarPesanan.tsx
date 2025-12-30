import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPendingOrders, subscribeToPendingOrders, unsubscribe } from "../../../../src/scootRideDriver/scootRideTrimaPesanan";
import { getActiveOrderForDriver } from "../../../../src/database/chatScootRide";

const RideDaftarPesanan = () => {
  const router = useRouter();
  const { userId, nama, nim, email, jenisMotor, plat } = useLocalSearchParams();
  const [resolvedUserId, setResolvedUserId] = React.useState<string>('');

  const [orders, setOrders] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasActiveOrder, setHasActiveOrder] = React.useState(false);
  const [activeOrder, setActiveOrder] = React.useState<any>(null);
  const channelRef = React.useRef<any>(null);

  // Resolve userId from params, AsyncStorage, or Supabase Auth
  React.useEffect(() => {
    const resolveUserId = async () => {
      let finalUserId = userId as string;

      if (finalUserId) {
        console.log('[Daftar_Pesanan_ScootRide_On] Using userId from params:', finalUserId);
        setResolvedUserId(finalUserId);
        return;
      }

      try {
        const userSession = await AsyncStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          finalUserId = session.params?.userId;
          if (finalUserId) {
            console.log('[Daftar_Pesanan_ScootRide_On] Using userId from AsyncStorage:', finalUserId);
            setResolvedUserId(finalUserId);
            return;
          }
        }
      } catch (e) {
        console.warn('[Daftar_Pesanan_ScootRide_On] Error reading AsyncStorage:', e);
      }

      console.error('[Daftar_Pesanan_ScootRide_On] ❌ Could not resolve userId!');
    };

    resolveUserId();
  }, [userId]);

  // Check if driver has active order
  React.useEffect(() => {
    const checkActiveOrder = async () => {
      if (!resolvedUserId) return;

      try {
        console.log('[Daftar_Pesanan_ScootRide_On] Checking active order for driver:', resolvedUserId);
        const result = await getActiveOrderForDriver(resolvedUserId);

        if (result.success && result.data) {
          console.log('[Daftar_Pesanan_ScootRide_On] ⚠️ Driver has active order:', result.data.id);
          setHasActiveOrder(true);
          setActiveOrder(result.data);
        } else {
          console.log('[Daftar_Pesanan_ScootRide_On] ✅ No active order for driver');
          setHasActiveOrder(false);
          setActiveOrder(null);
        }
      } catch (error) {
        console.error('[Daftar_Pesanan_ScootRide_On] Error checking active order:', error);
      }
    };

    checkActiveOrder();
  }, [resolvedUserId]);

  // Load pesanan saat pertama kali
  React.useEffect(() => {
    loadOrders();
  }, []);

  // Setup real-time subscription untuk pesanan baru
  React.useEffect(() => {
    console.log('[Daftar_Pesanan_ScootRide_On] Setting up real-time subscription');

    channelRef.current = subscribeToPendingOrders((payload) => {
      console.log('[Daftar_Pesanan_ScootRide_On] Real-time update:', payload.eventType);

      // Refresh list saat ada perubahan
      loadOrders();
    });

    return () => {
      if (channelRef.current) {
        console.log('[Daftar_Pesanan_ScootRide_On] Cleaning up subscription');
        unsubscribe(channelRef.current);
      }
    };
  }, []);

  const loadOrders = async () => {
    console.log('[Daftar_Pesanan_ScootRide_On] Loading pending orders...');
    setIsLoading(true);

    const result = await getPendingOrders();

    if (result.success) {
      console.log(`[Daftar_Pesanan_ScootRide_On] Loaded ${result.data.length} orders`);
      setOrders(result.data);
    } else {
      console.error('[Daftar_Pesanan_ScootRide_On] Failed to load orders:', result.error);
    }

    setIsLoading(false);
  };

  const handleToggle = () => {
    router.push({
      pathname: '/screens/driver/ScootRideDriver/RideDaftarPesananOff',
      params: { userId, nama, nim, email, jenisMotor, plat }
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>DAFTAR PESANAN</Text>

          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={handleToggle}
            activeOpacity={0.8}
          >
            <Text style={styles.toggleText}>On</Text>
            <View style={styles.toggleCircle} />
          </TouchableOpacity>

          {/* Warning: Driver has active order */}
          {hasActiveOrder && activeOrder && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠️ Kamu masih punya pesanan aktif. Selesaikan pesanan sebelum ambil pesanan baru!
              </Text>
              <Text style={styles.warningSubText}>
                Pesanan: {activeOrder.lokasi_jemput} → {activeOrder.lokasi_tujuan}
              </Text>
            </View>
          )}

          {/* Order List */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#016837" />
                <Text style={styles.loadingText}>Memuat pesanan...</Text>
              </View>
            ) : orders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Belum ada pesanan</Text>
                <Text style={styles.emptySubText}>Pesanan baru akan muncul di sini secara otomatis</Text>
              </View>
            ) : (
              orders.map((order: any) => (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderCard, hasActiveOrder && styles.orderCardDisabled]}
                  onPress={() => {
                    if (hasActiveOrder) {
                      console.log('[Daftar_Pesanan_ScootRide_On] Driver has active order, blocking ambil');
                      return;
                    }
                    router.push({
                      pathname: '/screens/driver/ScootRideDriver/RideAmbilPesanan',
                      params: {
                        orderId: order.id,
                        pickup: order.lokasi_jemput,
                        destination: order.lokasi_tujuan,
                        price: order.biaya,
                        customerId: order.id_customer,
                        customerName: order.customer?.nama || 'Customer',
                        userId: resolvedUserId, nama, nim, email, jenisMotor, plat
                      }
                    });
                  }}
                  activeOpacity={hasActiveOrder ? 1 : 0.8}
                  disabled={hasActiveOrder}
                >
                  {/* Top Section */}
                  <View style={styles.topSection}>
                    {/* Locations */}
                    <View style={styles.locationsContainer}>
                      <View style={styles.locationRow}>
                        <View style={styles.dot} />
                        <Text style={styles.locationText}>{order.lokasi_jemput}</Text>
                      </View>

                      <View style={styles.locationRow}>
                        <View style={styles.dot} />
                        <Text style={styles.locationText}>{order.lokasi_tujuan}</Text>
                      </View>
                    </View>

                    {/* Ambil Button */}
                    <View style={styles.ambilButton}>
                      <Text style={styles.ambilText}>Ambil</Text>
                    </View>
                  </View>

                  {/* Bottom Section */}
                  <View style={styles.bottomSection}>
                    {/* Customer Info */}
                    <Text style={styles.customerText}>
                      {order.customer?.nama || 'Customer'}
                    </Text>

                    {/* Price */}
                    <Text style={styles.priceText}>
                      Estimasi Tarif : Rp {order.biaya?.toLocaleString('id-ID') || '0'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    fontSize: 30,
    color: "#016837",
    fontWeight: "bold",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#016837",
    lineHeight: 28,
    textAlign: "center",
    marginBottom: 15,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#016837",
    borderRadius: 50,
    paddingVertical: 5,
    paddingLeft: 15,
    paddingRight: 5,
    gap: 8,
    marginBottom: 20,
  },
  toggleCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ffffff",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#ffffff",
  },
  warningContainer: {
    backgroundColor: "#fff3cd",
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    borderRadius: 6,
  },
  warningText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ff6f00",
    marginBottom: 5,
  },
  warningSubText: {
    fontSize: 11,
    color: "#ff9800",
    fontStyle: "italic",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: "#33cc66",
    borderRadius: 25,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  orderCardDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  locationsContainer: {
    flex: 1,
    gap: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginRight: 10,
  },
  locationText: {
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 18,
    flexShrink: 1,
  },
  ambilButton: {
    backgroundColor: "#ff93a5",
    borderRadius: 33,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  ambilText: {
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 14,
  },
  previewButton: {
    backgroundColor: "#ff93a5",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  previewText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  priceText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#016837",
    fontFamily: "Montserrat-Regular",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#016837",
    fontFamily: "Montserrat-Bold",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 12,
    color: "#666",
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
  },
});

export default RideDaftarPesanan;