import * as React from "react";
import {Text, StyleSheet, View, TouchableOpacity, Image, ScrollView} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const DetailDriver = () => {
	const router = useRouter();

	return (
		<SafeAreaView style={styles.viewBg}>
			{/* Back Button */}
			<TouchableOpacity 
				style={styles.backButton}
				onPress={() => router.push('/screens/customer/ScootSendCustomer/MenungguDriver')}
				accessibilityLabel="Back"
			>
				<Image 
					source={require("../../../../assets/images/back.svg")}
					style={styles.backIcon} 
					resizeMode="contain" 
				/>
			</TouchableOpacity>

			<ScrollView contentContainerStyle={styles.scrollContent}>
				<View style={styles.container}>
					{/* Driver Image */}
					<Image 
						source={require("../../../../assets/images/driver.png")}
						style={styles.driverImage}
						resizeMode="contain"
					/>

					{/* Driver Name */}
					<View style={styles.driverNameBox}>
						<Text style={styles.driverNameText}>Nicholas Saputra</Text>
					</View>

					{/* NIM */}
					<View style={styles.nimBox}>
						<Text style={styles.nimText}>L0223053</Text>
					</View>

					{/* Vehicle Info Box */}
					<View style={styles.vehicleInfoBox}>
						<View style={styles.vehicleInfoRow}>
							<Text style={styles.vehicleLabel}>Vario</Text>
							<Text style={styles.vehiclePlate}>AD 7513 BK</Text>
						</View>
					</View>

					{/* Hubungi Button */}
					<TouchableOpacity 
						style={styles.hubungiButton}
						onPress={() => router.push('/screens/customer/ScootSendCustomer/ChatScootSend')}
					>
						<Text style={styles.hubungiText}>Hubungi</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
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
	}
});

export default DetailDriver;
