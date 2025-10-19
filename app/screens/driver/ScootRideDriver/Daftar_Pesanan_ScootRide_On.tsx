import { Stack, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Daftar_Pesanan_ScootRide_On = () => {
  const router = useRouter();

  const handleToggle = () => {
    router.push('/screens/driver/ScootRideDriver/Daftar_Pesanan_ScootRide_Off');
  };

  const orders = [
    {
      id: 1,
      pickup: "Univesitas Sebelas Maret",
      destination: "Solo Grand Mall",
      price: "Rp 10.000",
    },
    {
      id: 2,
      pickup: "Univesitas Sebelas Maret",
      destination: "Solo Grand Mall",
      price: "Rp 10.000",
    },
    {
      id: 3,
      pickup: "Univesitas Sebelas Maret",
      destination: "Solo Grand Mall",
      price: "Rp 10.000",
    },
    {
      id: 4,
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
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => {
                router.push({
                  pathname: '/screens/driver/ScootRideDriver/Ambil_ScootRide',
                  params: {
                    orderId: order.id,
                    pickup: order.pickup,
                    destination: order.destination,
                    price: order.price,
                  }
                });
              }}
              activeOpacity={0.8}
            >
              {/* Top Section */}
              <View style={styles.topSection}>
                {/* Locations */}
                <View style={styles.locationsContainer}>
                  <View style={styles.locationRow}>
                    <View style={styles.dot} />
                    <Text style={styles.locationText}>{order.pickup}</Text>
                  </View>
                  
                  <View style={styles.locationRow}>
                    <View style={styles.dot} />
                    <Text style={styles.locationText}>{order.destination}</Text>
                  </View>
                </View>

                {/* Ambil Button */}
                <View style={styles.ambilButton}>
                  <Text style={styles.ambilText}>Ambil</Text>
                </View>
              </View>

              {/* Bottom Section */}
              <View style={styles.bottomSection}>
                {/* Preview Button */}
                <View style={styles.previewButton}>
                  <Text style={styles.previewText}>Preview</Text>
                </View>

                {/* Price */}
                <Text style={styles.priceText}>
                  Estimasi Tarif : {order.price}
                </Text>
              </View>
            </TouchableOpacity>
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
    borderRadius: 25,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  locationsContainer: {
    flex: 1,
    gap: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginRight: 10,
  },
  locationText: {
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 18,
    flexShrink: 1,
  },
  ambilButton: {
    backgroundColor: "#ff93a5",
    borderRadius: 33,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  ambilText: {
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewButton: {
    backgroundColor: "#ff93a5",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  previewText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  priceText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 14,
  },
});

export default Daftar_Pesanan_ScootRide_On;