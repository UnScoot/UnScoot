import { useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// status-bar placeholder imports removed
// correct relative path to project root assets (this file is 4 levels deep)
const KonfirmasiImg = require("../../../../assets/images/KonfirmasiKalauSudah.png");

const IPhone1613 = () => {
  	const router = useRouter();
	const handleKonfirmasi = () => {
		router.push('/screens/customer/ScootRideCustomer/BeriRatingDriverRide');
	};

	  return (
	    <SafeAreaView style={styles.container}>
	      <View style={styles.card}>
	        <Image source={KonfirmasiImg} style={styles.image} resizeMode="contain" />
	        <Text style={styles.title}>Apakah kamu sudah sampai?</Text>
	        <Text style={styles.subtitle}>Klik tombol di bawah kalau kamu{ '\n' }udah sampai ya ☺️</Text>

	        <TouchableOpacity style={styles.button} onPress={handleKonfirmasi} activeOpacity={0.85}>
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
	    backgroundColor: 'rgba(234,249,239,1)',
	    borderRadius: 20,
	    paddingVertical: 36,
	    paddingHorizontal: 20,
	    alignItems: 'center',
	    shadowColor: '#000',
	    shadowOpacity: 0.06,
	    shadowOffset: { width: 0, height: 6 },
	    shadowRadius: 12,
	  },
	  image: { width: 96, height: 96, marginBottom: 12 },
	  title: { color: '#00633f', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
	  subtitle: { color: '#2b2b2b', fontSize: 13, textAlign: 'center', marginBottom: 18, lineHeight: 20 },
	  button: { backgroundColor: '#00b74a', paddingVertical: 12, paddingHorizontal: 36, borderRadius: 26 },
	  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
	});

	export default IPhone1613;
        				

