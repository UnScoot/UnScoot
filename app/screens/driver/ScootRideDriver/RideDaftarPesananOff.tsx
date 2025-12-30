import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RideDaftarPesananOff = () => {
  const offImage = require('../../../../assets/images/Off.png');
  const router = useRouter();
  const { userId, nama, nim, email, jenisMotor, plat } = useLocalSearchParams();
  const [resolvedUserId, setResolvedUserId] = React.useState<string>('');

  // Resolve userId from params, AsyncStorage, or Supabase Auth
  React.useEffect(() => {
    const resolveUserId = async () => {
      let finalUserId = userId as string;

      if (finalUserId) {
        console.log('[Daftar_Pesanan_ScootRide_Off] Using userId from params:', finalUserId);
        setResolvedUserId(finalUserId);
        return;
      }

      try {
        const userSession = await AsyncStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          finalUserId = session.params?.userId;
          if (finalUserId) {
            console.log('[Daftar_Pesanan_ScootRide_Off] Using userId from AsyncStorage:', finalUserId);
            setResolvedUserId(finalUserId);
            return;
          }
        }
      } catch (e) {
        console.warn('[Daftar_Pesanan_ScootRide_Off] Error reading AsyncStorage:', e);
      }

      console.error('[Daftar_Pesanan_ScootRide_Off] ❌ Could not resolve userId!');
    };

    resolveUserId();
  }, [userId]);

  // Debug: Log params yang diterima
  React.useEffect(() => {
    console.log('[RideDaftarPesananOff] ===== RECEIVED PARAMS =====');
    console.log('[RideDaftarPesananOff] userId:', userId);
    console.log('[RideDaftarPesananOff] nama:', nama);
    console.log('[RideDaftarPesananOff] nim:', nim);
    console.log('[RideDaftarPesananOff] email:', email);
    console.log('[RideDaftarPesananOff] jenisMotor:', jenisMotor);
    console.log('[RideDaftarPesananOff] plat:', plat);
    console.log('[RideDaftarPesananOff] ============================');
  }, []);

  const handleToggle = () => {
    console.log('[Daftar_Pesanan_ScootRide_Off] Toggling ON with params:', { resolvedUserId, nama, nim });
    router.push({
      pathname: '/screens/driver/ScootRideDriver/RideDaftarPesanan',
      params: {
        userId: resolvedUserId,
        nama,
        nim,
        email,
        jenisMotor,
        plat
      }
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
            <View style={styles.toggleCircle} />
            <Text style={styles.toggleText}>Off</Text>
          </TouchableOpacity>

          {/* Message */}
          <Text style={styles.message}>
            Hidupin dulu biar bisa{'\n'}menerima pesanan
          </Text>

          {/* Image */}
          <View style={styles.imageContainer}>
            <Image
              source={offImage}
              style={styles.offImage}
              resizeMode="contain"
            />
          </View>
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
    backgroundColor: "#e8e8e8",
    borderRadius: 50,
    paddingVertical: 5,
    paddingRight: 15,
    paddingLeft: 5,
    gap: 8,
    marginBottom: 20,
  },
  toggleCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#016837",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#016837",
  },
  message: {
    fontSize: 16,
    fontFamily: "Montserrat-Regular",
    color: "#c4bfbf",
    textAlign: "center",
    lineHeight: 24,
    marginTop: 80,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
  },
  offImage: {
    width: 280,
    height: 280,
  },
});

export default RideDaftarPesananOff;