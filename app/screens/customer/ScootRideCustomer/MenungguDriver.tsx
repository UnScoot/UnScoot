import { useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// status-bar assets removed; keep file focused on screen content
// correct relative path to project root assets (this file is 4 levels deep)
const LogoImg = require("../../../../assets/images/logo.jpg");
const MenungguImg = require("../../../../assets/images/menunggu.png");

const IPhone1610 = () => {
	const router = useRouter();
	const timeoutRef = React.useRef<number | null>(null);

	// navigate to RideMendapatkanDriver automatically after a delay
	React.useEffect(() => {
		// simulate driver found after 8 seconds
		timeoutRef.current = setTimeout(() => {
			router.push('/screens/customer/ScootRideCustomer/RideMendapatkanDriver');
		}, 8000) as unknown as number;

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current as unknown as number);
			}
		};
	}, []);

	const handleCancel = () => {
		// cancel waiting and go home
		if (timeoutRef.current) clearTimeout(timeoutRef.current as unknown as number);
		router.push('/screens/customer/HomeCustomer');
	};

	const handleBack = () => router.back();

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={handleBack}>
					<Text style={styles.backArrow}>←</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.centerContent}>
				<Text style={styles.title}>Menunggu Driver</Text>
				<Image source={MenungguImg} style={styles.image} resizeMode="contain" />
			</View>

			<View style={styles.footer}>
				<TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
					<Text style={styles.cancelText}>Batalkan Pesanan</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff'
	},
	header: {
		paddingTop: 12,
		paddingHorizontal: 16
	},
	backButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#33cc66',
		alignItems: 'center',
		justifyContent: 'center'
	},
	backArrow: {
		color: '#fff',
		fontSize: 20,
		fontWeight: '700'
	},
	centerContent: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	title: {
		fontSize: 20,
		color: '#00633f',
		marginBottom: 18
	},
	image: {
		width: 220,
		height: 220
	},
	footer: {
		paddingHorizontal: 24,
		paddingBottom: 30,
		alignItems: 'center'
	},
	cancelButton: {
		width: '100%',
		height: 50,
		borderRadius: 24,
		backgroundColor: '#fe95a3',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.12,
		shadowRadius: 12,
		elevation: 8
	},
	cancelText: {
		color: '#000',
		fontSize: 16,
		fontWeight: '600'
	}
});

export default IPhone1610;


