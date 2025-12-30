// import { useNavigation } from "@react-navigation/native"; // Unused
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { updateOrderStatus } from "../../../../src/database/chatScootRide";
import { supabase } from "../../../../src/database/supabase";

const RideQrPayment = () => {
  // const navigation = useNavigation<any>(); // Unused
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;

  // State untuk data order
  const [orderData, setOrderData] = React.useState<{
    customerName: string;
    biaya: number;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch order data untuk mendapatkan harga dan nama customer
  React.useEffect(() => {
    const fetchOrderData = async () => {
      if (!orderId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('scoot_ride')
          .select('biaya, customer:id_customer(nama)')
          .eq('id', orderId)
          .single();

        if (error) {
          console.error('[Qr_Ride] Error fetching order:', error);
        } else if (data) {
          console.log('[Qr_Ride] Order data:', data);
          setOrderData({
            customerName: (data.customer as any)?.nama || 'Customer',
            biaya: data.biaya || 0
          });
        }
      } catch (err) {
        console.error('[Qr_Ride] Exception:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderData();
  }, [orderId]);

  const onSudahBayar = async () => {
    try {
      // Update order status to 'completed' (payment confirmed)
      if (orderId) {
        console.log('[Qr_Ride] Payment confirmed, updating order status to completed:', orderId);
        const result = await updateOrderStatus(orderId, 'completed');

        if (!result.success) {
          console.error('[Qr_Ride] Failed to update order status:', result.error);
        }
      }

      // Navigate to Selesai_Ride
      router.push("/screens/driver/ScootRideDriver/RideSelesai" as any);
    } catch (error) {
      console.error('[Qr_Ride] Error:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#33cc66" />
        <Text style={{ marginTop: 10, color: '#666' }}>Memuat data pembayaran...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{orderData?.customerName || 'Customer'}</Text>

          <Image
            source={require("../../../../assets/images/qr.png")}
            style={styles.qr}
            resizeMode="contain"
          />

          <Text style={styles.amount}>
            Rp {(orderData?.biaya || 0).toLocaleString('id-ID')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={onSudahBayar}
        >
          <Text style={styles.buttonText}>Sudah Bayar</Text>
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
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default RideQrPayment;
