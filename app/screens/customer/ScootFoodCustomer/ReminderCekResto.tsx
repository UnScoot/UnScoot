import { useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ReminderCekResto = () => {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrapper}>
        <View style={styles.mainCard}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            {/* ...existing code... */}
            <Image
              style={styles.icon}
              source={require('../../../../assets/images/toko-buka.png')}
              resizeMode="contain"
            />
          </View>

          {/* Main Text */}
          <Text style={styles.mainTitle}>Halo, Sobat UnScoot!</Text>

          {/* Description */}
          <Text style={styles.description}>
            Sebelum pesan, pastiin dulu restonya buka yaa😊
          </Text>

          {/* Info Text */}
          <Text style={styles.infoText}>
            Pesanan yang udah diterima driver gak bisa dibatalkan, jadi pastiin dulu sebelum pesan ya!
          </Text>

          {/* Button */}
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/screens/customer/ScootFoodCustomer/FoodPilihLokasi')}
          >
            <Text style={styles.buttonText}>Sudah Cek, Lanjut Pesan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  contentWrapper: {
    width: "100%",
    paddingHorizontal: 20,
  },
  mainCard: {
    backgroundColor: "rgba(51, 204, 102, 0.12)",
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    elevation: 8,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    marginBottom: 29,
  },
  icon: {
    width: 80,
    height: 80,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#145f15ff",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Montserrat-SemiBold",
    color: "#145f15ff",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  infoText: {
    fontSize: 11,
    fontWeight: "500",
    fontFamily: "Montserrat-Regular",
    color: "#ff0000ff",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#33cc66",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#fff",
    textAlign: "center",
  },
});

export default ReminderCekResto;