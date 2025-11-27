import { useNavigation } from "@react-navigation/native";
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

const Qr_Send = () => {
  const navigation = useNavigation<any>();
  const router = useRouter();

  const onSudahBayar = () => {
    // Use expo-router to push the Selesai_Send page (file-based route)
    // cast to any to avoid type errors if the route isn't in generated types
    router.push("/screens/driver/ScootSendDriver/Selesai_Send" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Nicholas Saputra</Text>

        <Image
          source={require("../../../../assets/images/qr.png")}
          style={styles.qr}
          resizeMode="contain"
        />

        <Text style={styles.amount}>Rp 25.000</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={onSudahBayar}
      >
        <Text style={styles.buttonText}>Sudah Bayar</Text>
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

export default Qr_Send;
