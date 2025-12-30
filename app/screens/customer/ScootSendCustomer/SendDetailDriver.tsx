import * as React from "react";
import { Text, StyleSheet, View, TouchableOpacity, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../../src/database/supabase";

interface DriverInfo {
	nama: string;
	nim?: string;
	jenis_motor?: string;
	plat_motor?: string;
	profile_image_url?: string;
}

const DetailDriver = () => {
	const router = useRouter();
	const params = useLocalSearchParams();

	const orderId = params.orderId as string;
	const driverId = params.driverId as string;
	const userId = params.userId as string;
	const driverNameParam = params.driverName as string;
	const driverPhotoParam = params.driverPhoto as string;

	const [driverInfo, setDriverInfo] = React.useState<DriverInfo>({
		nama: driverNameParam || 'Driver',
		profile_image_url: driverPhotoParam || undefined,
	});
	const [orderInfo, setOrderInfo] = React.useState<any>(null);

	// Load driver details
	React.useEffect(() => {
		const loadDriverDetails = async () => {
			if (!driverId) return;

			try {
				const { data, error } = await supabase
					.from('driver')
					.select('nama, nim, jenis_motor, plat_motor, profile_image_url')
					.eq('id', driverId)
					.single();

				if (!error && data) {
					setDriverInfo({
						nama: data.nama || driverNameParam || 'Driver',
						nim: data.nim,
						jenis_motor: data.jenis_motor,
						plat_motor: data.plat_motor,
						profile_image_url: data.profile_image_url || driverPhotoParam,
					});
				}
			} catch (err) {
				console.error('[DetailDriver] Error loading driver:', err);
			}
		};

		const loadOrderDetails = async () => {
			if (!orderId) return;

			try {
				const { data, error } = await supabase
					.from('scoot_send')
					.select('lokasi_jemput_barang, lokasi_tujuan, biaya')
					.eq('id', orderId)
					.single();

				if (!error && data) {
					setOrderInfo(data);
				}
			} catch (err) {
				console.error('[DetailDriver] Error loading order:', err);
			}
		};

		loadDriverDetails();
		loadOrderDetails();
	}, [driverId, orderId, driverNameParam, driverPhotoParam]);

	const handleHubungi = () => {
		router.push({
			pathname: '/screens/customer/ScootSendCustomer/SendChat',
			params: {
				orderId,
				userId,
				driverId,
				driverName: driverInfo.nama,
				lokasiJemput: orderInfo?.lokasi_jemput_barang || '',
				lokasiTujuan: orderInfo?.lokasi_tujuan || '',
				biaya: orderInfo?.biaya || '',
			}
		} as any);
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<SafeAreaView style={styles.viewBg}>
				{/* Back Button */}
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
					accessibilityLabel="Back"
				>
					<Text style={styles.backText}>&lt;</Text>
				</TouchableOpacity>

				<ScrollView contentContainerStyle={styles.scrollContent}>
					<View style={styles.container}>
						{/* Driver Image */}
						<Image
							source={driverInfo.profile_image_url
								? { uri: driverInfo.profile_image_url }
								: require("../../../../assets/images/driver.png")}
							style={styles.driverImage}
							resizeMode="cover"
						/>

						{/* Driver Name */}
						<View style={styles.driverNameBox}>
							<Text style={styles.driverNameText}>{driverInfo.nama}</Text>
						</View>

						{/* NIM */}
						{driverInfo.nim && (
							<View style={styles.nimBox}>
								<Text style={styles.nimText}>{driverInfo.nim}</Text>
							</View>
						)}

						{/* Vehicle Info Box */}
						{(driverInfo.jenis_motor || driverInfo.plat_motor) && (
							<View style={styles.vehicleInfoBox}>
								<View style={styles.vehicleInfoRow}>
									<Text style={styles.vehicleLabel}>{driverInfo.jenis_motor || '-'}</Text>
									<Text style={styles.vehiclePlate}>{driverInfo.plat_motor || '-'}</Text>
								</View>
							</View>
						)}

						{/* Hubungi Button */}
						<TouchableOpacity
							style={styles.hubungiButton}
							onPress={handleHubungi}
						>
							<Text style={styles.hubungiText}>Hubungi</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</SafeAreaView>
		</>
	);
};

const styles = StyleSheet.create({
	viewBg: {
		backgroundColor: "#fff",
		flex: 1
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: 40
	},
	backButton: {
		position: "absolute",
		top: 30,
		left: 24,
		width: 80,
		height: 80,
		borderRadius: 40,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 10
	},
	backIcon: {
		width: 60,
		height: 60
	},
	container: {
		flex: 1,
		backgroundColor: "#fff",
		paddingHorizontal: 24,
		paddingTop: 120,
		alignItems: "center"
	},
	driverImage: {
		width: 120,
		height: 120,
		borderRadius: 60,
		marginBottom: 20,
		alignSelf: "center"
	},
	driverNameBox: {
		width: 300,
		height: 50,
		borderRadius: 34,
		borderWidth: 1,
		borderColor: "#4ab100",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
		backgroundColor: "#fff"
	},
	driverNameText: {
		fontSize: 16,
		color: "#000",
		fontFamily: "Inter-Regular"
	},
	nimBox: {
		width: 300,
		height: 50,
		borderRadius: 34,
		borderWidth: 1,
		borderColor: "#4ab100",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
		backgroundColor: "#fff"
	},
	nimText: {
		fontSize: 16,
		color: "#000",
		fontFamily: "Inter-Regular"
	},
	vehicleInfoBox: {
		width: 300,
		height: 50,
		borderRadius: 34,
		borderWidth: 1,
		borderColor: "#4ab100",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 24,
		backgroundColor: "#fff"
	},
	vehicleInfoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
		paddingHorizontal: 24
	},
	vehicleLabel: {
		fontSize: 16,
		color: "#000",
		fontFamily: "Inter-Regular"
	},
	vehiclePlate: {
		fontSize: 16,
		color: "#000",
		fontFamily: "Inter-Regular"
	},
	hubungiButton: {
		width: 300,
		height: 50,
		borderRadius: 34,
		backgroundColor: "#33cc66",
		justifyContent: "center",
		alignItems: "center",
		alignSelf: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 2
	},
	hubungiText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#000",
		fontFamily: "Inter-Regular"
	},
	backText: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#000",
		fontFamily: "Inter-Regular"
	}
});

export default DetailDriver;
