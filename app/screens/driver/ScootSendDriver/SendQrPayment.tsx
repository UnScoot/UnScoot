import { useRouter, Stack, useLocalSearchParams } from "expo-router";
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
import { updateOrderStatus, getOrderById, subscribeToOrderStatus } from "../../../../src/database/chatScootSend";
import { supabase } from "../../../../src/database/supabase";

const Qr_Send = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [customerName, setCustomerName] = React.useState<string>('Customer');
  const [orderAmount, setOrderAmount] = React.useState<number>(0);
  const orderStatusChannelRef = React.useRef<any>(null);

  // Load order details
  React.useEffect(() => {
    const loadOrderDetails = async () => {
      if (!orderId) return;

      const result = await getOrderById(orderId);
      if (result.success && result.data) {
        const orderData = result.data as any;
        if (orderData.customer?.nama) {
          setCustomerName(orderData.customer.nama);
        }
        if (orderData.biaya) {
          setOrderAmount(orderData.biaya);
        }
      }
    };

    loadOrderDetails();
  }, [orderId]);

  // Subscribe to order status - auto redirect when status becomes waiting_payment
  React.useEffect(() => {
    if (!orderId) return;

    let isNavigating = false;
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    const handleStatusChange = (newStatus: string) => {
      if (isNavigating) return;

      // When customer confirms -> payment is done, move to completed
      // Actually the QR screen waits for driver to mark as paid, not status change
      // But we can also listen if status became completed (edge case)
      if (newStatus === 'completed') {
        isNavigating = true;
        console.log('[Qr_Send] Order already completed, redirecting...');

        if (pollingInterval) clearInterval(pollingInterval);
        if (orderStatusChannelRef.current) orderStatusChannelRef.current.unsubscribe();

        router.replace({
          pathname: '/screens/driver/ScootSendDriver/SendSelesai',
          params: { orderId }
        } as any);
      }
    };

    const subscription = subscribeToOrderStatus(orderId, (payload: any) => {
      console.log('[Qr_Send] Order status changed:', payload.new?.status);
      handleStatusChange(payload.new?.status);
    });

    orderStatusChannelRef.current = subscription;

    // Polling fallback
    const checkOrderStatus = async () => {
      if (isNavigating) return;
      try {
        const { data, error } = await supabase.from('scoot_send').select('status').eq('id', orderId).single();
        if (!error && data) handleStatusChange(data.status);
      } catch (err) {
        console.error('[Qr_Send] Polling error:', err);
      }
    };

    pollingInterval = setInterval(checkOrderStatus, 3000);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      if (orderStatusChannelRef.current) orderStatusChannelRef.current.unsubscribe();
    };
  }, [orderId, router]);

  const onSudahBayar = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (orderId) {
      console.log('[Qr_Send] Marking order as completed:', orderId);

      const result = await updateOrderStatus(orderId, 'completed');

      if (result.success) {
        console.log('[Qr_Send] ✅ Order status updated to completed');
        router.replace({
          pathname: '/screens/driver/ScootSendDriver/SendSelesai',
          params: { orderId }
        } as any);
      } else {
        console.error('[Qr_Send] Failed to update status:', result.error);
        Alert.alert('Error', 'Gagal mengupdate status. Coba lagi.');
        setIsProcessing(false);
      }
    } else {
      // No orderId - just navigate (demo mode)
      router.push("/screens/driver/ScootSendDriver/SendSelesai" as any);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

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

          <Text style={styles.amount}>{orderAmount > 0 ? formatCurrency(orderAmount) : 'Rp 12.000'}</Text>
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
    // shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    // elevation for Android
    elevation: 6,
  },
  title: {
    color: "#217b50",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    // keep lineHeight similar to original
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
    // shadow
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
});

export default Qr_Send;
