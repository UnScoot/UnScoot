import { useRouter } from "expo-router";
import * as React from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Selesai_Food = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Image
          style={styles.image}
          source={require("../../../../assets/images/Selesai.png")}
          resizeMode="contain"
        />

        <Text style={styles.title}>Selamat, kamu sudah menyelesaikan pesanan!</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => router.push('/screens/driver/HomeDriver' as any)}
      >
        <Text style={styles.buttonText}>Kembali</Text>
      </TouchableOpacity>
    </SafeAreaView>
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
    backgroundColor: "transparent",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: 220,
    height: 220,
    marginBottom: 18,
  },
  title: {
    color: "#217b50",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  button: {
    marginTop: 22,
    backgroundColor: "#33cc66",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
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

export default Selesai_Food;
