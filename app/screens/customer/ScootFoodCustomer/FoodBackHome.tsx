import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FoodBackHome = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>

        {/* ✔ Ceklist Bulat */}
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>

        <Text style={styles.title}>Rating kamu sudah terkirim!🥳</Text>

        <Text style={styles.subtitle}>Semoga harimu menyenangkan✨</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/screens/customer/HomeCustomer")}
        >
          <Text style={styles.buttonText}>Home</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

export default FoodBackHome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "82%",
    backgroundColor: "#e8f9ef",
    paddingVertical: 40,
    paddingHorizontal: 25,
    borderRadius: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },

  /* Lingkaran Hijau */
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "#00b74a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },

  /* Tanda Centang */
  checkMark: {
    fontSize: 48,
    color: "white",
    fontWeight: "bold",
    marginTop: -4,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#006633",
    textAlign: "center",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#2f2f2f",
    textAlign: "center",
    marginBottom: 30,
  },

  button: {
    backgroundColor: "#00b74a",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 24,
    elevation: 4,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
