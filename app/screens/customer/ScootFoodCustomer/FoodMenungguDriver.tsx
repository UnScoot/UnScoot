import { useFocusEffect, useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FoodMenungguDriver = () => {
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        router.push('/screens/customer/ScootFoodCustomer/FoodMendapatDriver');
      }, 2000);
      return () => clearTimeout(timer);
    }, [router])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Back button (optional) */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Menunggu Driver</Text>

        <Image
          source={require('../../../../assets/images/waiting.png')}
          style={styles.image}
          resizeMode="contain"
        />

        

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.push('/screens/customer/ScootFoodCustomer/FoodPilihLokasi')}
        >
          <Text style={styles.cancelButtonText}>Batalkan Pesanan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    color: '#00633f',
    marginBottom: 24,
    textAlign: 'center',
  },
  image: {
    width: 260,
    height: 260,
    marginBottom: 40,
  },
  tryButton: {
    backgroundColor: '#33cc66',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#fe95a3',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    position: 'absolute',
    bottom: 40,
  },
  cancelButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default FoodMenungguDriver;

