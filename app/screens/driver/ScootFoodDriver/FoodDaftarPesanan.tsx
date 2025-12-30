import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../../../src/database/supabase";
import {
  getPendingOrders,
  subscribeToPendingOrders,
  unsubscribe,
  getActiveOrderForDriver
} from "../../../../src/scootFoodDriver/scootFoodTrimaPesanan";

const FoodDaftarPesanan = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userId: userIdParam, nama, nim, email, jenisMotor, plat } = params;

  const [orders, setOrders] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [hasActiveOrder, setHasActiveOrder] = React.useState(false);
  const [activeOrder, setActiveOrder] = React.useState<any>(null);
  const [resolvedUserId, setResolvedUserId] = React.useState<string>('');
  const channelRef = React.useRef<any>(null);
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null);

  // Resolve userId
  React.useEffect(() => {
    const resolveUserId = async () => {
      let finalUserId = userIdParam as string;

      if (finalUserId) {
        console.log('[Daftar_Pesanan_ScootFood_On] Using userId from params:', finalUserId);
        setResolvedUserId(finalUserId);
        return;
      }

      try {
        const userSession = await AsyncStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          finalUserId = session.params?.userId;
          if (finalUserId) {
            console.log('[Daftar_Pesanan_ScootFood_On] Using userId from AsyncStorage:', finalUserId);
            setResolvedUserId(finalUserId);
            return;
          }
        }
      } catch (e) {
        console.warn('[Daftar_Pesanan_ScootFood_On] Error reading AsyncStorage:', e);
      }

      try {
        const { data } = await supabase.auth.getUser();
        finalUserId = data?.user?.id || '';
        if (finalUserId) {
          console.log('[Daftar_Pesanan_ScootFood_On] Using userId from Supabase Auth:', finalUserId);
          setResolvedUserId(finalUserId);
          return;
        }
      } catch (e) {
        console.warn('[Daftar_Pesanan_ScootFood_On] Error getting user from Supabase:', e);
      }

      console.error('[Daftar_Pesanan_ScootFood_On] ❌ Could not resolve userId!');
    };

    resolveUserId();
  }, [userIdParam]);

  // Check if driver has active order
  React.useEffect(() => {
    const checkActiveOrder = async () => {
      if (!resolvedUserId) return;

      try {
        console.log('[Daftar_Pesanan_ScootFood_On] Checking active order for driver:', resolvedUserId);
        const result = await getActiveOrderForDriver(resolvedUserId);

        if (result.success && result.data) {
          console.log('[Daftar_Pesanan_ScootFood_On] ⚠️ Driver has active order:', result.data.id);
          setHasActiveOrder(true);
          setActiveOrder(result.data);
        } else {
          console.log('[Daftar_Pesanan_ScootFood_On] ✅ No active order for driver');
          setHasActiveOrder(false);
          setActiveOrder(null);
        }
      } catch (error) {
        console.error('[Daftar_Pesanan_ScootFood_On] Error checking active order:', error);
      }
    };

    checkActiveOrder();
  }, [resolvedUserId]);

  // Load orders on mount
  React.useEffect(() => {
    loadOrders();
  }, []);

  // Setup real-time subscription + polling fallback
  React.useEffect(() => {
    console.log('[Daftar_Pesanan_ScootFood_On] Setting up real-time subscription');

    channelRef.current = subscribeToPendingOrders((payload: any) => {
      console.log('[Daftar_Pesanan_ScootFood_On] Real-time update:', payload.eventType);
      loadOrders();
    });

    // Polling fallback every 5 seconds
    pollingRef.current = setInterval(() => {
      console.log('[Daftar_Pesanan_ScootFood_On] Polling for updates...');
      loadOrders();
    }, 5000) as any;

    return () => {
      if (channelRef.current) {
        console.log('[Daftar_Pesanan_ScootFood_On] Cleaning up subscription');
        unsubscribe(channelRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const loadOrders = async () => {
    console.log('[Daftar_Pesanan_ScootFood_On] Loading pending orders...');

    const result = await getPendingOrders();

    if (result.success) {
      console.log(`[Daftar_Pesanan_ScootFood_On] Loaded ${result.data.length} orders`);
      setOrders(result.data || []);
    } else {
      console.error('[Daftar_Pesanan_ScootFood_On] Failed to load orders:', result.error);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadOrders();
  };

  const handleToggle = () => {
    router.push({
      pathname: '/screens/driver/ScootFoodDriver/FoodDaftarPesananOff',
      params: { userId: resolvedUserId, nama, nim, email, jenisMotor, plat }
    });
  };

  // Format price
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseInt(price, 10) : price;
    return `Rp ${numPrice.toLocaleString('id-ID')}`;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/screens/driver/HomeDriver' as any)}
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
                Resto: {activeOrder.lokasi_resto}
              </Text>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => {
                  router.push({
                    pathname: '/screens/driver/ScootFoodDriver/FoodDriverChat',
                    params: {
                      orderId: activeOrder.id,
                      userId: resolvedUserId,
                      customerName: activeOrder.customer?.nama || 'Customer',
                      // Add critical address params for map
                      restaurant: activeOrder.lokasi_resto,
                      lokasiAntar: activeOrder.lokasi_tujuan,
                      lokasi_tujuan: activeOrder.lokasi_tujuan, // redundant backup
                    }
                  });
                }}
              >
                <Text style={styles.continueButtonText}>Lanjutkan Pesanan</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading indicator */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#016837" />
              <Text style={styles.loadingText}>Memuat pesanan...</Text>
            </View>
          ) : (
            /* Order List */
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  colors={['#016837']}
                  tintColor="#016837"
                />
              }
            >
              {orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Belum ada pesanan</Text>
                  <Text style={styles.emptySubText}>Tarik ke bawah untuk refresh</Text>
                </View>
              ) : (
                orders.map((order) => (
                  <View
                    key={order.id}
                    style={styles.orderCard}
                  >
                    {/* Restaurant and Item Info */}
                    <View style={styles.orderInfo}>
                      <View style={styles.locationRow}>
                        <View style={styles.dot} />
                        <Text style={styles.restaurantText}>{order.lokasi_resto || 'Restaurant'}</Text>
                      </View>

                      <View style={styles.locationRow}>
                        <View style={styles.dot} />
                        <Text style={styles.itemText} numberOfLines={2}>{order.detail_pesanan || 'Pesanan'}</Text>
                      </View>

                      {/* Customer name */}
                      <Text style={styles.customerText}>
                        📍 Antar ke: {order.lokasi_tujuan}
                      </Text>
                    </View>

                    {/* Price and Action Buttons */}
                    <View style={styles.rightSection}>
                      {/* Button Ambil - Disabled if has active order */}
                      <TouchableOpacity
                        style={[styles.buttonAmbil, hasActiveOrder && styles.buttonDisabled]}
                        onPress={() => {
                          if (hasActiveOrder) return;
                          router.push({
                            pathname: '/screens/driver/ScootFoodDriver/FoodAmbilPesanan',
                            params: {
                              orderId: order.id,
                              restaurant: order.lokasi_resto,
                              destination: order.lokasi_tujuan,
                              item: order.detail_pesanan,
                              price: order.biaya,
                              customerId: order.id_customer,
                              customerName: order.customer?.nama || 'Customer',
                              userId: resolvedUserId,
                              nama, nim, email, jenisMotor, plat,
                              orderItems: order.order_items || '[]',
                              notes: order.catatan || ''
                            }
                          });
                        }}
                        activeOpacity={0.8}
                        disabled={hasActiveOrder}
                      >
                        <Text style={styles.buttonText}>Ambil</Text>
                      </TouchableOpacity>

                      <Text style={styles.priceText}>
                        Ongkir: {formatPrice(order.biaya || 0)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
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
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  warningSubText: {
    color: '#856404',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: '#33cc66',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 10,
    alignSelf: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: "#33cc66",
    borderRadius: 21,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderInfo: {
    flex: 1,
    gap: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#fff",
    marginRight: 8,
  },
  restaurantText: {
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 18,
    flex: 1,
  },
  itemText: {
    fontSize: 11,
    fontFamily: "Montserrat-Regular",
    color: "#fff",
    lineHeight: 16,
    flex: 1,
  },
  customerText: {
    fontSize: 10,
    color: '#fff',
    marginTop: 4,
    fontStyle: 'italic',
  },
  rightSection: {
    alignItems: "flex-end",
    gap: 6,
  },
  buttonAmbil: {
    backgroundColor: "#fe95a3",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 5,
    minWidth: 70,
  },
  buttonPreview: {
    backgroundColor: "#ffd14a",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 5,
    minWidth: 70,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 14,
  },
  priceText: {
    fontSize: 10,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 14,
    marginTop: 4,
    textAlign: "right",
  },
});

export default FoodDaftarPesanan;