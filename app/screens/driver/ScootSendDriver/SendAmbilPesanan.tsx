import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { acceptSendOrder } from "../../../../src/scootSendDriver/scootSendTerimaPesanan";
import { supabase } from "../../../../src/database/supabase";
import { hasActiveOrderDriver } from "../../../../src/utils/activeOrderChecker";

const AmbilScootSend = () => {
  const router = useRouter();
  const { orderId, time, pickup, destination, price, customerId, customerName, itemDescription, itemWeight } = useLocalSearchParams();
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [resolvedUserId, setResolvedUserId] = React.useState<string>('');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <View style={[styles.view, styles.viewBg]}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.detailTitle}>Detail Pesanan</Text>

          {/* Order Details Card */}
          <View style={styles.detailCard}>
            {/* Time Badge */}
            {time && (
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{time}</Text>
              </View>
            )}

            {/* Pengirim */}
            <Text style={styles.labelText}>Pengirim :</Text>
            <View style={styles.locationRow}>
              <View style={styles.dotGreen} />
              <Text style={styles.valueText}>{pickup || "Lokasi pengirim"}</Text>
            </View>

            {/* Penerima */}
            <Text style={styles.labelText}>Penerima :</Text>
            <View style={styles.locationRow}>
              <View style={styles.dotGreen} />
              <Text style={styles.valueText}>{destination || "Lokasi penerima"}</Text>
            </View>

            {/* Detail Barang */}
            <Text style={styles.labelText}>Barang yang dikirim :</Text>
            <Text style={styles.valueText}>
              {itemDescription || 'Barang'}{itemWeight ? ` (${itemWeight})` : ''}
            </Text>

            {/* Estimasi Tarif */}
            <Text style={styles.priceLabel}>
              Estimasi Tarif : {typeof price === 'string' && price.includes('Rp') ? price : `Rp ${Number(price).toLocaleString('id-ID')}`}
            </Text>
          </View>

          {/* Maps Container */}
          <View style={styles.mapsContainer}>
            <Image
              style={styles.mapsImage}
              source={require('../../../../assets/images/maps.png')}
              resizeMode="cover"
            />
          </View>

          {/* Ambil Pesanan Button */}
          <TouchableOpacity
            style={[styles.button, styles.ambilButton]}
            activeOpacity={0.8}
            onPress={async () => {
              // Resolve driver id like in Ride flow
              let finalUserId = resolvedUserId;
              if (!finalUserId) {
                try {
                  const session = await AsyncStorage.getItem('userSession');
                  if (session) {
                    const s = JSON.parse(session);
                    finalUserId = s.params?.userId;
                  }
                } catch (e) {
                  console.warn('[AmbilScootSend] Error reading AsyncStorage:', e);
                }
              }

              if (!finalUserId) {
                try {
                  const { data } = await supabase.auth.getUser();
                  finalUserId = data?.user?.id;
                } catch (e) {
                  console.warn('[AmbilScootSend] Error getting supabase user:', e);
                }
              }

              if (!orderId || !finalUserId) {
                Alert.alert('Error', 'Data pesanan tidak lengkap');
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
                        const activeCheck = await hasActiveOrderDriver(finalUserId as string) as any;
                        if (activeCheck.hasActive) {
                          setIsAccepting(false);
                          Alert.alert(
                            'Pesanan Aktif',
                            `Kamu masih punya pesanan ${activeCheck.service} yang belum selesai. Selesaikan dulu sebelum ambil pesanan baru.`,
                            [{ text: 'OK' }]
                          );
                          return;
                        }
                      } catch (e) {
                        console.warn('[AmbilScootSend] Active order check error:', e);
                      }

                      const result = await acceptSendOrder(orderId as string, finalUserId as string);
                      console.log('[AmbilScootSend] acceptSendOrder result:', result);
                      if (result.success) {
                        // small delay for realtime
                        await new Promise(res => setTimeout(res, 400));
                        router.replace({
                          pathname: '/screens/driver/ScootSendDriver/SendDriverChat',
                          params: {
                            orderId,
                            customerId: customerId || null,
                            customerName: customerName || 'Customer',
                            pickup,
                            destination,
                            price,
                            userId: finalUserId
                          }
                        });
                      } else {
                        Alert.alert('Gagal', result.error || 'Pesanan mungkin sudah diambil driver lain');
                      }
                      setIsAccepting(false);
                    }
                  }
                ]
              );
            }}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ambil Pesanan</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};


const styles = StyleSheet.create({
  viewBg: {
    backgroundColor: "#fff",
    flex: 1,
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
    marginBottom: 10,
  },
  backArrow: {
    fontSize: 32,
    color: '#016837',
    fontWeight: 'bold',
  },
  detailTitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#217b50',
    fontFamily: 'Montserrat-Bold',
    fontWeight: '700',
    marginBottom: 16,
  },
  detailCard: {
    backgroundColor: 'rgba(51, 204, 102, 0.12)',
    borderRadius: 21,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(1, 104, 55, 0.4)',
    marginBottom: 16,
    shadowColor: '#c4bfbf',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  timeBadge: {
    backgroundColor: '#fe95a3',
    borderRadius: 39,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 8,
    fontFamily: 'Montserrat-Regular',
    color: '#fff',
    lineHeight: 12,
  },
  labelText: {
    fontFamily: 'Montserrat-Bold',
    fontWeight: '700',
    fontSize: 12,
    color: '#217b50',
    marginBottom: 4,
    marginTop: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dotGreen: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#016837',
    marginRight: 10,
    marginTop: 5,
  },
  valueText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 12,
    color: '#217b50',
    flex: 1,
    lineHeight: 18,
  },
  priceLabel: {
    fontFamily: 'Montserrat-Bold',
    fontWeight: '700',
    fontSize: 12,
    color: '#016837',
    marginTop: 12,
    textAlign: 'right',
  },
  mapsContainer: {
    backgroundColor: 'rgba(91, 211, 131, 0.5)',
    borderRadius: 15,
    padding: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  mapsImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#33cc66',
    borderRadius: 34,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  ambilButton: {
    backgroundColor: '#33cc66',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default AmbilScootSend;