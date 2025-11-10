import { Stack, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Daftar_Pesanan_ScootFood_On = () => {
  const router = useRouter();

  const handleToggle = () => {
    router.push('/screens/driver/ScootFoodDriver/Daftar_Pesanan_ScootFood_Off');
  };

  const orders = [
    {
      id: 1,
      restaurant: "Samba Sambel",
      item: "Nasi Pecel Madiun",
      price: "Rp 8.000",
    },
    {
      id: 2,
      restaurant: "Niko Spict",
      item: "Nasi Sorca 2",
      price: "Rp 8.000",
    },
    {
      id: 3,
      restaurant: "Warung Napiri",
      item: "Pattotie",
      price: "Rp 7.500",
    },
    {
      id: 4,
      restaurant: "Dimsum Lima Yuan Cafe",
      item: "Kwe Bingga",
      price: "Rp 10.000",
    },
  ];

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
              {/* Restaurant and Item Info */}
              <View style={styles.orderInfo}>
                <View style={styles.locationRow}>
                  <View style={styles.dot} />
                  <Text style={styles.restaurantText}>{order.restaurant}</Text>
                </View>
                
                <View style={styles.locationRow}>
                  <View style={styles.dot} />
                  <Text style={styles.itemText}>{order.item}</Text>
                </View>
              </View>

              {/* Price and Action Buttons */}
              <View style={styles.rightSection}>
                {/* Button Ambil - Clickable */}
                <TouchableOpacity 
                  style={styles.buttonAmbil}
                  onPress={() => {
                    router.push({
                      pathname: '/screens/driver/ScootFoodDriver/Ambil_ScootFood',
                      params: {
                        orderId: order.id,
                        restaurant: order.restaurant,
                        item: order.item,
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
                      pathname: '/screens/driver/ScootFoodDriver/Preview_Food',
                      params: {
                        orderId: order.id,
                        restaurant: order.restaurant,
                        item: order.item,
                        price: order.price,
                      }
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Preview</Text>
                </TouchableOpacity>
                
                <Text style={styles.priceText}>
                  Estimasi Ongkir : {order.price}
                </Text>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderInfo: {
    flex: 1,
    gap: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#fff",
    marginRight: 8,
  },
  restaurantText: {
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 18,
  },
  itemText: {
    fontSize: 11,
    fontFamily: "Montserrat-Regular",
    color: "#fff",
    lineHeight: 16,
  },
  rightSection: {
    alignItems: "flex-end",
    gap: 6,
  },
  buttonAmbil: {
    backgroundColor: "#fe95a3",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 5,
    minWidth: 70,
  },
  buttonPreview: {
    backgroundColor: "#ffd14a",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 5,
    minWidth: 70,
  },
  buttonText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 14,
  },
  priceText: {
    fontSize: 10,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 14,
    marginTop: 4,
    textAlign: "right",
  },
});

export default Daftar_Pesanan_ScootFood_On;