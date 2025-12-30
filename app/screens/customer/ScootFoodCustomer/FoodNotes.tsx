import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../../../src/database/supabase";
import { createFoodOrder } from '../../../../src/scootFoodCustomer/scootFoodMemesan';
import { kirimNotifikasi } from '../../../../src/notifications/notifikasiregister';
import { hasActiveOrderCustomer } from '../../../../src/utils/activeOrderChecker';

interface OrderItem {
  id: string;
  name: string;
  quantity: string;
}

const IPhone16Chat = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const userIdParam = params?.userId as string;
  const nama = params?.nama;
  const currentLocation = params?.currentLocation || 'Lokasi saat ini';
  const restaurantLocation = params?.restaurantLocation || 'Lokasi resto';
  const fare = params?.fare ? parseInt(params.fare as string) : 5000;
  // const distance = params?.distance || '0'; // Unused

  const [isLoading, setIsLoading] = React.useState(false);
  const [resolvedUserId, setResolvedUserId] = React.useState<string>('');

  // Resolve userId dari params, AsyncStorage, atau Supabase Auth
  React.useEffect(() => {
    const resolveUserId = async () => {
      let finalUserId = userIdParam;

      if (finalUserId) {
        console.log('[FoodNotes] Using userId from params:', finalUserId);
        setResolvedUserId(finalUserId);
        return;
      }

      // Coba dari AsyncStorage
      try {
        const userSession = await AsyncStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          finalUserId = session.params?.userId;
          if (finalUserId) {
            console.log('[FoodNotes] Using userId from AsyncStorage:', finalUserId);
            setResolvedUserId(finalUserId);
            return;
          }
        }
      } catch (e) {
        console.warn('[FoodNotes] Error reading AsyncStorage:', e);
      }

      // Coba dari Supabase Auth
      try {
        const { data } = await supabase.auth.getUser();
        finalUserId = data?.user?.id || '';
        if (finalUserId) {
          console.log('[FoodNotes] Using userId from Supabase Auth:', finalUserId);
          setResolvedUserId(finalUserId);
          return;
        }
      } catch (e) {
        console.warn('[FoodNotes] Error getting user from Supabase:', e);
      }

      console.error('[FoodNotes] ❌ Could not resolve userId!');
    };

    resolveUserId();
  }, [userIdParam]);

  const [orderItems, setOrderItems] = React.useState<OrderItem[]>([
    { id: '1', name: 'Ayam Geprek', quantity: '1' },
    { id: '2', name: 'Nila Bakar', quantity: '1' },
    { id: '3', name: 'Es Teh Manis', quantity: '2' },
  ]);

  const [notes, setNotes] = React.useState('(ayam gepreknya pedas sedang, gak pakai kol)');

  const updateOrderItem = (id: string, field: 'name' | 'quantity', value: string) => {
    setOrderItems(items =>
      items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addOrderItem = () => {
    const newId = (Math.max(...orderItems.map(i => parseInt(i.id)), 0) + 1).toString();
    setOrderItems([...orderItems, { id: newId, name: '', quantity: '1' }]);
  };

  const removeOrderItem = (id: string) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Main Card */}
          <View style={styles.mainCard}>
            {/* Title */}
            <Text style={styles.mainTitle}>🍱  Mau makan apa dari resto ini?</Text>

            {/* Restaurant & Delivery Info */}
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>📍  {restaurantLocation}</Text>
              <Text style={styles.infoText}>🏠  Antar ke: {currentLocation}</Text>
            </View>

            {/* Order Details Card */}
            <View style={styles.orderCard}>
              {orderItems.map((item, index) => (
                <View key={item.id} style={styles.orderItemRow}>
                  <TextInput
                    style={styles.orderItemInput}
                    placeholder="Nama item..."
                    placeholderTextColor="#ccc"
                    value={item.name}
                    onChangeText={(text) => updateOrderItem(item.id, 'name', text)}
                  />
                  <TextInput
                    style={styles.orderQtyInput}
                    placeholder="Qty"
                    placeholderTextColor="#ccc"
                    value={item.quantity}
                    onChangeText={(text) => updateOrderItem(item.id, 'quantity', text)}
                    keyboardType="numeric"
                  />
                  {orderItems.length > 1 && (
                    <TouchableOpacity onPress={() => removeOrderItem(item.id)}>
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity style={styles.addItemButton} onPress={addOrderItem}>
                <Text style={styles.addItemText}>+ Tambah Item</Text>
              </TouchableOpacity>

              <View style={styles.notesInputContainer}>
                <Text style={styles.notesLabel}>Catatan:</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="(contoh: gak pakai kol, pedas sedang)"
                  placeholderTextColor="#ccc"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, isLoading && { opacity: 0.6 }]}
            disabled={isLoading}
            onPress={async () => {
              // Validasi order items
              const validItems = orderItems.filter(item => item.name.trim().length > 0);
              if (validItems.length === 0) {
                Alert.alert('Error', 'Mohon tambahkan minimal 1 item pesanan');
                return;
              }

              if (!resolvedUserId) {
                Alert.alert('Error', 'User ID tidak ditemukan. Silakan login ulang.');
                return;
              }

              setIsLoading(true);

              try {
                // Check for active orders first
                const activeCheck = await hasActiveOrderCustomer(resolvedUserId) as any;
                if (activeCheck.hasActive) {
                  setIsLoading(false);
                  Alert.alert(
                    'Pesanan Aktif',
                    `Kamu masih punya pesanan ${activeCheck.service} yang belum selesai. Selesaikan dulu sebelum pesan baru.`,
                    [{ text: 'OK' }]
                  );
                  return;
                }

                console.log('[FoodNotes] Creating order for customer:', resolvedUserId);

                // Create order di database
                const result = await createFoodOrder({
                  customerId: resolvedUserId,
                  lokasiCustomer: currentLocation as string,
                  lokasiResto: restaurantLocation as string,
                  biaya: fare,
                  orderItems: validItems,
                  notes: notes
                });

                if (result.success) {
                  console.log('[FoodNotes] Order created:', result.data);

                  // Kirim notifikasi
                  await kirimNotifikasi({
                    title: 'Pesanan Dikirim',
                    body: 'Pesanan ScootFood kamu sedang dicari driver. Tunggu sebentar ya!'
                  });

                  // Navigate ke halaman menunggu driver (replace to clean history)
                  router.replace({
                    pathname: '/screens/customer/ScootFoodCustomer/FoodMenungguDriver',
                    params: {
                      orderId: result.data.id,
                      userId: resolvedUserId,
                      nama: nama,
                      lokasiCustomer: currentLocation,
                      lokasiResto: restaurantLocation,
                      biaya: fare,
                      orderItems: JSON.stringify(validItems),
                      notes: notes
                    }
                  } as any);
                } else {
                  console.error('[FoodNotes] Failed to create order:', result.error);
                  Alert.alert('Error', 'Gagal membuat pesanan: ' + result.error);
                }
              } catch (error: unknown) {
                console.error('[FoodNotes] Exception:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                Alert.alert('Error', 'Terjadi kesalahan: ' + errorMessage);
              } finally {
                setIsLoading(false);
              }
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueButtonText}>Lanjutkan Pesanan</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#33cc66",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: -20,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  mainCard: {
    backgroundColor: "rgba(51, 204, 102, 0.12)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#000",
    marginBottom: 16,
    textAlign: "left",
  },
  infoSection: {
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
    color: "#333",
    marginBottom: 6,
    lineHeight: 18,
  },
  orderCard: {
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.2)",
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  orderText: {
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    color: "#000",
    marginBottom: 6,
    lineHeight: 18,
  },
  notesText: {
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    color: "#666",
    marginBottom: 0,
    lineHeight: 18,
    fontStyle: "italic",
  },
  continueButton: {
    backgroundColor: "#33cc66",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#fff",
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  orderItemInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    color: '#000',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  orderQtyInput: {
    width: 50,
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    color: '#000',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  removeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff4444',
    paddingHorizontal: 4,
  },
  addItemButton: {
    marginVertical: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#33cc66',
    alignItems: 'center',
  },
  addItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#33cc66',
    fontFamily: 'Montserrat-Regular',
  },
  notesInputContainer: {
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
    fontFamily: 'Montserrat-Regular',
  },
  notesInput: {
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    color: '#000',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
  },
});

export default IPhone16Chat;


