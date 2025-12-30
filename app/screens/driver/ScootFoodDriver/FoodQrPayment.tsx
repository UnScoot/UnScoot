import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import * as React from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getOrderById, updateOrderStatus } from "../../../../src/database/chatScootFood";

const Qr_Food = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;

  const [isLoading, setIsLoading] = React.useState(true);
  const [orderData, setOrderData] = React.useState<any>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Load order data
  React.useEffect(() => {
    const loadOrderData = async () => {
      if (!orderId) {
        console.log('[Qr_Food] No orderId provided, using demo data');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      console.log('[Qr_Food] Loading order data for:', orderId);

      const result = await getOrderById(orderId);

      if (result.success && result.data) {
        console.log('[Qr_Food] Order loaded:', result.data);
        setOrderData(result.data);
      } else {
        console.error('[Qr_Food] Failed to load order:', result.error);
      }

      setIsLoading(false);
    };

    loadOrderData();
  }, [orderId]);

  const onSudahBayar = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (orderId) {
      console.log('[Qr_Food] Marking order as completed:', orderId);

      const result = await updateOrderStatus(orderId, 'completed');

      if (result.success) {
        console.log('[Qr_Food] ✅ Order completed successfully');
        Alert.alert('Berhasil', 'Pembayaran berhasil!', [
          {
            text: 'OK',
            onPress: () => {
              router.push("/screens/driver/ScootFoodDriver/FoodSelesai" as any);
            }
          }
        ]);
      } else {
        console.error('[Qr_Food] Failed to update status:', result.error);
        Alert.alert('Error', 'Gagal mengupdate status. Coba lagi.');
        setIsProcessing(false);
      }
    } else {
      // No orderId - just navigate (demo mode)
      router.push("/screens/driver/ScootFoodDriver/FoodSelesai" as any);
    }
  };

  // Get customer name and price from order data or params
  const customerName = orderData?.customer?.nama || params.customerName || 'Customer';
  const orderPrice = orderData?.biaya || params.biaya || 25000;

  // Format price
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseInt(price, 10) : price;
    return `Rp ${numPrice.toLocaleString('id-ID')}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#33cc66" />
        <Text style={styles.loadingText}>Memuat data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{customerName}</Text>

          <Image
            source={require("../../../../assets/images/qr.png")}
            style={styles.qr}
            resizeMode="contain"
          />

          <Text style={styles.amount}>{formatPrice(orderPrice)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isProcessing && styles.buttonDisabled]}
          activeOpacity={0.8}
          onPress={onSudahBayar}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sudah Bayar</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: 340,
    backgroundColor: "rgba(51,204,102,0.12)",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    color: "#217b50",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    lineHeight: 24,
  },
  qr: {
    width: 220,
    height: 220,
    marginVertical: 6,
  },
  amount: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "700",
    color: "#090000",
  },
  button: {
    marginTop: 22,
    backgroundColor: "#33cc66",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 150,
    ...(Platform.OS === "ios"
      ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
      }
      : { elevation: 6 }),
  },
  buttonDisabled: {
    backgroundColor: "#aaa",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
});

export default Qr_Food;
