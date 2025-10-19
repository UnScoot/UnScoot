import { Stack, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Daftar_Pesanan_ScootSend_On = () => {
  const router = useRouter();

  const handleToggle = () => {
    router.push('/screens/driver/ScootSendDriver/Daftar_Pesanan_ScootSend_Off');
  };

  const orders = [
    {
      id: 1,
      time: "13 menit yang lalu",
      pickup: "Kos kembang indah jaya",
      destination: "UPT TIK Fatisda",
      price: "Rp 10.000",
    },
    {
      id: 2,
      time: "13 menit yang lalu",
      pickup: "Univesitas Sebelas Maret",
      destination: "Solo Grand Mall",
      price: "Rp 10.000",
    },
    {
      id: 3,
      time: "13 menit yang lalu",
      pickup: "Univesitas Sebelas Maret",
      destination: "Solo Grand Mall",
      price: "Rp 10.000",
    },
    {
      id: 4,
      time: "13 menit yang lalu",
      pickup: "Univesitas Sebelas Maret",
      destination: "Solo Grand Mall",
      price: "Rp 10.000",
    },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.title}>DAFTAR PESANAN</Text>
        
        <TouchableOpacity 
          style={styles.toggleContainer}
          onPress={handleToggle}
          activeOpacity={0.8}
        >
          <Text style={styles.toggleText}>On</Text>
          <View style={styles.toggleCircle} />
        </TouchableOpacity>

        {/* Order List */}
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {orders.map((order) => (
            <View
              key={order.id}
              style={styles.orderCard}
            >
              {/* Time Badge */}
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{order.time}</Text>
              </View>

              {/* Order Details */}
              <View style={styles.orderDetails}>
                {/* Pickup Location */}
                <View style={styles.locationRow}>
                  <View style={styles.dotGreen} />
                  <Text style={styles.locationText}>{order.pickup}</Text>
                </View>

                {/* Divider Line */}
                <View style={styles.dividerLine} />

                {/* Destination Location */}
                <View style={styles.locationRow}>
                  <View style={styles.dotWhite} />
                  <Text style={styles.locationText}>{order.destination}</Text>
                </View>

                {/* Price */}
                <Text style={styles.priceText}>
                  Estimasi Tarif : {order.price}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                {/* Button Ambil - Clickable */}
                <TouchableOpacity 
                  style={styles.buttonAmbil}
                  onPress={() => {
                    router.push({
                      pathname: '/screens/driver/ScootSendDriver/Ambil_ScootSend',
                      params: {
                        orderId: order.id,
                        time: order.time,
                        pickup: order.pickup,
                        destination: order.destination,
                        price: order.price,
                      }
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Ambil</Text>
                </TouchableOpacity>

                {/* Button Preview - Clickable */}
                <TouchableOpacity 
                  style={styles.buttonPreview}
                  onPress={() => {
                    router.push({
                      pathname: '/screens/driver/ScootSendDriver/Preview_Send',
                      params: {
                        orderId: order.id,
                        time: order.time,
                        pickup: order.pickup,
                        destination: order.destination,
                        price: order.price,
                      }
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Preview</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
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
    backgroundColor: "#016837",
    borderRadius: 50,
    paddingVertical: 5,
    paddingLeft: 15,
    paddingRight: 5,
    gap: 8,
    marginBottom: 20,
  },
  toggleCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ffffff",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: "#33cc66",
    borderRadius: 21,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  timeBadge: {
    backgroundColor: "#fe95a3",
    borderRadius: 39,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  timeText: {
    fontSize: 6,
    fontFamily: "Montserrat-Regular",
    color: "#fff",
    lineHeight: 10,
  },
  orderDetails: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dotGreen: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#fff",
    marginRight: 8,
  },
  dotWhite: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#fff",
    marginRight: 8,
  },
  locationText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 16,
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#fff",
    marginLeft: 15,
    marginVertical: 6,
    width: "85%",
  },
  priceText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 16,
    marginTop: 8,
    textAlign: "right",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  buttonAmbil: {
    backgroundColor: "#fe95a3",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  buttonPreview: {
    backgroundColor: "#ffd14a",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  buttonText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 16,
  },
});

export default Daftar_Pesanan_ScootSend_On;