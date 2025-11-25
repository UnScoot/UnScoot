import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FoodMendapatDriver = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const handleHubungi = () => {
    router.push({
      pathname: '/screens/customer/ScootFoodCustomer/FoodChat',
      params: {
        orderItems: params?.orderItems || '[]',
        notes: params?.notes || ''
      }
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Image
          source={require('../../../../assets/images/driver.png')}
          style={styles.avatar}
          resizeMode="cover"
        />

        <TouchableOpacity style={styles.infoRow} activeOpacity={0.8}>
          <Text style={styles.infoText}>Nicholas Saputra</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.infoRow} activeOpacity={0.8}>
          <Text style={styles.infoText}>L0223053</Text>
        </TouchableOpacity>

        <View style={styles.rowTwoColumns}>
          <View style={[styles.infoRow, styles.flexItem]}>
            <Text style={styles.infoText}>Vario</Text>
          </View>
          <View style={[styles.infoRow, styles.flexItem]}>
            <Text style={styles.infoText}>AD 7513 BK</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleHubungi}
        >
          <Text style={styles.contactButtonText}>Hubungi</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 },
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
  backButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  avatar: { width: 120, height: 120, borderRadius: 60, marginTop: 48, marginBottom: 28 },
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
  infoText: { fontSize: 16, color: '#000' },
  rowTwoColumns: { width: '80%', flexDirection: 'row', justifyContent: 'space-between' },
  flexItem: { width: '48%' },
  contactButton: {
    marginTop: 12,
    width: '80%',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#33cc66',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  contactButtonText: { color: '#016340', fontSize: 16, fontWeight: '600' },
});

export default FoodMendapatDriver;


