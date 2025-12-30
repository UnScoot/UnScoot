import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPendingSendOrders, subscribeToPendingSendOrders, unsubscribe } from '../../../../src/scootSendCustomer/scootSendMemesan';
import { hasActiveOrderDriver } from '../../../../src/utils/activeOrderChecker';

const SendDaftarPesanan = () => {
  const router = useRouter();
  const { userId, nama, nim, email, jenisMotor, plat } = useLocalSearchParams();
  const [resolvedUserId, setResolvedUserId] = React.useState<string>('');
  const [hasActiveOrder, setHasActiveOrder] = React.useState(false);
  const [activeOrder, setActiveOrder] = React.useState<any>(null);

  const handleToggle = () => {
    router.push('/screens/driver/ScootSendDriver/SendDaftarPesananOff');
  };

  const [orders, setOrders] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const channelRef = React.useRef<any>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    const res = await getPendingSendOrders();
    if (res.success) setOrders(res.data);
    setIsLoading(false);
  };

  // Check if driver already has active order
  const checkActive = async (driverId?: string) => {
    const did = driverId || resolvedUserId;
    if (!did) return;
    const r = await hasActiveOrderDriver(did) as any;
    if (r.hasActive) {
      setHasActiveOrder(true);
      setActiveOrder({ id: r.orderId, status: r.status, service: r.service });
    } else {
      setHasActiveOrder(false);
      setActiveOrder(null);
    }
  };

  React.useEffect(() => {
    const init = async () => {
      // Resolve userId similar to Ride flow
      let finalUserId = userId as string;
      if (!finalUserId) {
        try {
          const userSession = await AsyncStorage.getItem('userSession');
          if (userSession) {
            const session = JSON.parse(userSession);
            finalUserId = session.params?.userId;
          }
        } catch (e) {
          console.warn('[Daftar_Pesanan_ScootSend_On] Error reading AsyncStorage:', e);
        }
      }
      setResolvedUserId(finalUserId || '');

      await loadOrders();
      await checkActive(finalUserId || '');

      channelRef.current = subscribeToPendingSendOrders((payload: any) => {
        console.log('[Daftar_Pesanan_ScootSend_On] realtime event', payload.eventType);
        loadOrders();
        checkActive(finalUserId || '');
      });
    };

    init();

    return () => {
      if (channelRef.current) unsubscribe(channelRef.current);
    };
  }, []);

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

          {/* Order List */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {isLoading ? (
              <View style={{ padding: 20 }}>
                <ActivityIndicator size="large" color="#016837" />
              </View>
            ) : orders.length === 0 ? (
              <View style={{ padding: 20 }}>
                <Text style={{ textAlign: 'center', color: '#666' }}>Belum ada pesanan</Text>
              </View>
            ) : orders.map((order: any) => (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCard, hasActiveOrder && styles.orderCardDisabled]}
                onPress={() => {
                  if (hasActiveOrder) {
                    console.log('[Daftar_Pesanan_ScootSend_On] Driver has active order, blocking ambil');
                    return;
                  }
                  router.push({
                    pathname: '/screens/driver/ScootSendDriver/SendAmbilPesanan',
                    params: {
                      orderId: order.id,
                      time: order.time,
                      pickup: order.pickup,
                      destination: order.destination,
                      price: order.price,
                      customerId: order.id_customer,
                      customerName: order.customer?.nama || 'Customer',
                      userId: resolvedUserId,
                      itemDescription: order.detail_barang || order.item_description || 'Barang',
                      itemWeight: order.berat_barang || order.item_weight || ''
                    }
                  });
                }}
                activeOpacity={hasActiveOrder ? 1 : 0.8}
                disabled={hasActiveOrder}
              >
                {/* Top Section - Locations + Ambil Button */}
                <View style={styles.topSection}>
                  {/* Locations */}
                  <View style={styles.locationsContainer}>
                    <View style={styles.locationRow}>
                      <View style={styles.dot} />
                      <Text style={styles.locationText}>{order.pickup}</Text>
                    </View>

                    <View style={styles.locationRow}>
                      <View style={styles.dot} />
                      <Text style={styles.locationText}>{order.destination}</Text>
                    </View>
                  </View>

                  {/* Ambil Button */}
                  <View style={styles.ambilButton}>
                    <Text style={styles.ambilText}>Ambil</Text>
                  </View>
                </View>

                {/* Bottom Section - Customer + Price */}
                <View style={styles.bottomSection}>
                  <Text style={styles.customerText}>
                    {order.customer?.nama || 'Customer'}
                  </Text>
                  <Text style={styles.priceText}>
                    Estimasi Tarif : Rp {order.biaya ? Number(order.biaya).toLocaleString('id-ID') : '0'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
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
  priceText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 14,
  },
});

export default SendDaftarPesanan;