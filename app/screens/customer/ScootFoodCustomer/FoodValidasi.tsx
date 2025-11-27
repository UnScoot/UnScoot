import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ValidasiPesananSudahSampai: React.FC = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>

        <Text style={styles.title}>Apakah pesanan kamu sudah sampai?</Text>

        <Text style={styles.subtitle}>Klik tombol di bawah kalau makananmu{"\n"}udah kamu terima ya ☺️</Text>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/screens/customer/ScootFoodCustomer/FoodRating')}>
          <Text style={styles.buttonText}>Sudah</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '86%',
    backgroundColor: '#eaf9ef',
    borderRadius: 18,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00b74a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  checkMark: { color: '#fff', fontSize: 34, fontWeight: '700' },
  title: { color: '#00633f', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#2b2b2b', fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  button: {
    backgroundColor: '#00b74a',
    paddingVertical: 12,
    paddingHorizontal: 34,
    borderRadius: 26,
    elevation: 3,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default ValidasiPesananSudahSampai;
        				

