import { useRouter } from "expo-router";
import * as React from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ScootFoodCustMemilihLokasi = () => {
  const router = useRouter();
  const [currentLocation, setCurrentLocation] = React.useState('');
  const [restaurantLocation, setRestaurantLocation] = React.useState('');
  
  // Generate dummy fare based on inputs
  const generateDummyFare = () => {
    if (currentLocation.length > 0 && restaurantLocation.length > 0) {
      return `Rp ${Math.floor(Math.random() * 50000) + 5000}`;
    }
    return 'Rp ...';
  };

  const handleDetailPesanan = () => {
    if (!currentLocation.trim() || !restaurantLocation.trim()) {
      alert('Mohon isi lokasi saat ini dan lokasi resto');
      return;
    }
    
    router.push({
      pathname: '/screens/customer/ScootFood/FoodNotes',
      params: {
        currentLocation: currentLocation,
        restaurantLocation: restaurantLocation,
        fare: generateDummyFare()
      }
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Lokasi Saat Ini Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <View style={styles.inputIcon} />
            <TextInput
              style={styles.inputText}
              placeholder="Lokasi saat ini..."
              placeholderTextColor="#999"
              value={currentLocation}
              onChangeText={setCurrentLocation}
            />
          </View>
        </View>

        {/* Lokasi Resto Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <View style={styles.inputIcon} />
            <TextInput
              style={styles.inputText}
              placeholder="Lokasi resto..."
              placeholderTextColor="#999"
              value={restaurantLocation}
              onChangeText={setRestaurantLocation}
            />
          </View>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <Image
            style={styles.mapImage}
            source={require('../../../../assets/images/maps.png')}
            resizeMode="cover"
          />
        </View>

        {/* Ongkir Section */}
        <View style={styles.ongkirContainer}>
          <Text style={styles.ongkirLabel}>Ongkir</Text>
          <Text style={styles.ongkirPrice}>{generateDummyFare()}</Text>
        </View>

        {/* Detail Pesanan Button */}
        <TouchableOpacity 
          style={styles.detailButton}
          onPress={handleDetailPesanan}
        >
          <Text style={styles.detailButtonText}>Detail Pesanan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#33cc66",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  inputIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#999",
    marginRight: 12,
  },
  inputText: {
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    color: "#333",
    flex: 1,
  },
  mapContainer: {
    width: "100%",
    height: 280,
    borderRadius: 20,
    backgroundColor: "rgba(51, 204, 102, 0.1)",
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(51, 204, 102, 0.3)",
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  ongkirContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#33cc66",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 12,
  },
  ongkirLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Montserrat-SemiBold",
    color: "#000",
  },
  ongkirPrice: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Montserrat-SemiBold",
    color: "#000",
  },
  detailButton: {
    backgroundColor: "#fe95a3",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#000",
  },
});

export default ScootFoodCustMemilihLokasi;


