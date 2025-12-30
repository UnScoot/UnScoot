import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DefaultDriverImg = require('../../../../assets/images/driver.png');

const FoodMendapatDriver = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const orderId = params?.orderId;
  const userId = params?.userId;
  const nama = params?.nama;
  const lokasiCustomer = params?.lokasiCustomer;
  const lokasiResto = params?.lokasiResto;
  const biaya = params?.biaya;
  const orderItems = params?.orderItems;
  const notes = params?.notes;
  const driverId = params?.driverId;
  const driverName = params?.driverName || 'Driver';
  const driverNim = params?.driverNim || 'N/A';
  const driverMotor = params?.driverMotor || 'Motor';
  const driverPlat = params?.driverPlat || 'XX XXXX XX';
  const driverPhoto = params?.driverPhoto;

  const handleHubungi = () => {
    router.push({
      pathname: '/screens/customer/ScootFoodCustomer/FoodChat',
      params: {
        orderId: orderId,
        userId: userId,
        nama: nama,
        lokasiCustomer: lokasiCustomer,
        lokasiAntar: lokasiCustomer, // Also pass as lokasiAntar for map view
        lokasiResto: lokasiResto,
        restaurant: lokasiResto, // Also pass as restaurant for geocoding compatibility
        biaya: biaya,
        orderItems: orderItems,
        notes: notes,
        driverId: driverId,
        driverName: driverName
      }
    } as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/screens/customer/HomeCustomer')}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Driver Photo */}
          {driverPhoto ? (
            <Image
              source={{ uri: driverPhoto as string }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={DefaultDriverImg}
              style={styles.avatar}
              resizeMode="cover"
            />
          )}

          {/* Driver Name */}
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>{driverName}</Text>
          </View>

          {/* Driver NIM */}
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>{driverNim}</Text>
          </View>

          {/* Motor Info */}
          <View style={styles.rowTwoColumns}>
            <View style={[styles.infoRow, styles.flexItem]}>
              <Text style={styles.infoText}>{driverMotor}</Text>
            </View>
            <View style={[styles.infoRow, styles.flexItem]}>
              <Text style={styles.infoText}>{driverPlat}</Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardText}>
              🍽️ Driver sedang menuju resto untuk mengambil pesananmu
            </Text>
          </View>

          {/* Hubungi Button */}
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleHubungi}
          >
            <Text style={styles.contactButtonText}>Hubungi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24
  },
  backButton: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#33cc66',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700'
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: 48,
    marginBottom: 28,
    borderWidth: 3,
    borderColor: '#33cc66',
  },
  infoRow: {
    width: '80%',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#33cc66',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  infoText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  rowTwoColumns: {
    width: '80%',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  flexItem: {
    width: '48%'
  },
  infoCard: {
    width: '80%',
    backgroundColor: 'rgba(51, 204, 102, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 204, 102, 0.3)',
  },
  infoCardText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  contactButton: {
    marginTop: 12,
    width: '80%',
    borderRadius: 28,
    backgroundColor: '#33cc66',
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
});

export default FoodMendapatDriver;
