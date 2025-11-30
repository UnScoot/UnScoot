import * as React from "react";
import {StyleSheet, View, Text, Image, TouchableOpacity, TextInput} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";

const PilihLokasi = () => {
	const router = useRouter();
	const [lokasiSaatIni, setLokasiSaatIni] = useState("");
	const [lokasiTujuan, setLokasiTujuan] = useState("");
    const mapsImage = require("../../../../assets/images/maps.png");

	const goNext = () => {
		// pass the values as query params to the next screen (frontend only)
		const from = encodeURIComponent(lokasiSaatIni);
		const to = encodeURIComponent(lokasiTujuan);
		router.push(`/screens/customer/ScootSendCustomer/IsiDetail?from=${from}&to=${to}`);
	};

	return (
		<SafeAreaView style={styles.viewBg}>
			<View style={styles.container}>
				{/* Back Button (larger for better proportion) */}
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.push('/screens/customer/HomeCustomer')}
                    accessibilityLabel="Back"
                >
					<Image 
						source={require("../../../../assets/images/back.svg")}
						style={styles.backIcon} 
						resizeMode="contain" 
					/>
				</TouchableOpacity>

				<View style={styles.form}>
					<TextInput
						value={lokasiSaatIni}
						onChangeText={setLokasiSaatIni}
						placeholder="Lokasi saat ini..."
						placeholderTextColor="#000"
						style={styles.input}
					/>

					<TextInput
						value={lokasiTujuan}
						onChangeText={setLokasiTujuan}
						placeholder="Lokasi tujuan..."
						placeholderTextColor="#000"
						style={[styles.input, styles.inputMargin]}
					/>

                    <View style={styles.mapContainer}>
                    <Image 
                        source={mapsImage}
                        style={styles.mapsImage}
                        resizeMode="cover"
                    />
                    </View>

					<TouchableOpacity 
						style={styles.nextButton}
						onPress={goNext}
					>
						<Text style={styles.nextButtonText}>Lanjut isi detail</Text>
					</TouchableOpacity>
				</View>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
    viewBg: {
        backgroundColor: "#fff",
        flex: 1
    },
    container: {
        flex: 1,
        backgroundColor: "#fff",
        paddingHorizontal: 24,
        paddingTop: 20
    },
    view: {
        width: "100%",
        height: 852,
        overflow: "hidden"
    },
    // --- BAGIAN YANG DIUBAH ---
    backButton: {
        position: "absolute",
        top: 30,           // Saya turunkan sedikit agar tidak terlalu mepet atas
        left: 24,          // Saya geser sedikit ke kanan agar sejajar dengan padding container
        width: 80,         // Diperbesar dari 64 ke 80 (Area klik lebih luas)
        height: 80,        // Diperbesar dari 64 ke 80
        borderRadius: 40,  // Setengah dari width/height
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
        // backgroundColor: 'transparent' // Opsional: pastikan background transparan
    },
    backIcon: {
        width: 60,         // Diperbesar dari 32 ke 60 (Gambar lingkaran jadi jauh lebih besar)
        height: 60         // Diperbesar dari 32 ke 60
    },
    // --------------------------
    form: {
        marginTop: 100,    // Ditambah sedikit karena tombol back makin besar
        alignItems: "center"
    },
    input: {
        width: 300,
        height: 50,        // Saya perbesar sedikit dari 43 agar lebih proporsional di Web
        borderRadius: 34,
        borderWidth: 1,
        borderColor: '#4ab100',
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        fontSize: 16,
        color: '#000',
        textAlign: 'center',
        alignSelf: 'center'
    },
    inputMargin: {
        marginTop: 20
    },
    mapContainer: {
        width: 300,
        height: 250,
        backgroundColor: "rgba(91, 211, 131, 0.3)",
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#4ab100',
        marginTop: 25,
        justifyContent: "center",
        alignItems: "center",
        padding: 10
    },
    mapsImage: {
        width: "100%",
        height: "100%",
        borderRadius: 16
    },
    nextButton: {
        marginTop: 28,
        width: 300,
        height: 50,       // Disamakan dengan input agar rapi
        borderRadius: 34,
        backgroundColor: 'rgba(91, 211, 131, 0.9)',
        borderWidth: 1,
        borderColor: '#4ab100',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center'
    },
    nextButtonText: {
        fontFamily: 'Inter-Regular',
        fontSize: 18,     // Font diperbesar sedikit agar terbaca jelas
        color: '#000'
    },
    groupIcon: {
            top: 90,
            left: 35,
            width: 31,
            height: 12,
            position: "absolute"
    }
});

export default PilihLokasi;

