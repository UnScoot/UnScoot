import { useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// status-bar assets removed; keep file focused on screen content

const IPhone16BackToHome = () => {
  const router = useRouter();
  const handleKembaliHome = () => router.push('/screens/customer/HomeCustomer');

  return (
    <SafeAreaView style={mstyles.container}>
      <View style={mstyles.card}>
        <Image source={require('../../../../assets/images/KonfirmasiKalauSudah.png')} style={mstyles.image} resizeMode="contain" />
        <Text style={mstyles.title}>Rating Kamu sudah terkirim!🥳</Text>
        <Text style={mstyles.subtitle}>Semoga Harimu Menyenangkan ✨</Text>

        <TouchableOpacity style={mstyles.button} onPress={handleKembaliHome} activeOpacity={0.85}>
          <Text style={mstyles.buttonText}>Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const mstyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  card: { width: '86%', backgroundColor: '#eaf9ef', borderRadius: 20, paddingVertical: 36, paddingHorizontal: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12 },
  image: { width: 96, height: 96, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#00633f', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#2b2b2b', textAlign: 'center', marginBottom: 18 },
  button: { backgroundColor: '#33cc66', paddingVertical: 12, paddingHorizontal: 36, borderRadius: 26 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});

export default IPhone16BackToHome;

