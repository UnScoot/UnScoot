import { useRouter } from 'expo-router';
import * as React from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Use concrete image imports. The original imports pointed to a directory
// Use static require(...) so Metro resolves assets reliably. Paths are
// relative to this file and point into the project's `assets/images`.
// correct relative path to project root assets (this file is 4 levels deep)
const DriverImg = require("../../../../assets/images/driver.png");
const LogoImg = require("../../../../assets/images/logo.jpg");
const MapsImg = require("../../../../assets/images/maps.png");
const PassengerImg = require("../../../../assets/images/Passenger.png");

const IPhone16Scootride = () => {
	const router = useRouter();

	const [currentLocation, setCurrentLocation] = React.useState('');
	const [destinationLocation, setDestinationLocation] = React.useState('');
	const currentRef = React.useRef<any>(null);
	const destRef = React.useRef<any>(null);

	const handlePesanRide = () => router.push('/screens/customer/ScootRideCustomer/MenungguDriver');

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.headerRow}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Text style={styles.backArrow}>←</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.content}>
				<View style={styles.inputRow}>
					<View style={styles.circle} />
					<Pressable style={styles.inputBox} onPress={() => currentRef.current?.focus?.()} android_ripple={{ color: 'rgba(0,0,0,0.03)' }}>
						<TextInput
							ref={currentRef}
							style={styles.inputText}
							placeholder="Lokasi saat ini..."
							placeholderTextColor="#999"
							value={currentLocation}
							onChangeText={setCurrentLocation}
							autoFocus={true}
							returnKeyType="next"
							onSubmitEditing={() => destRef.current?.focus?.()}
						/>
					</Pressable>
				</View>

				<View style={styles.inputRow}>
					<View style={styles.circle} />
					<Pressable style={styles.inputBox} onPress={() => destRef.current?.focus?.()} android_ripple={{ color: 'rgba(0,0,0,0.03)' }}>
						<TextInput
							ref={destRef}
							style={styles.inputText}
							placeholder="Lokasi tujuan..."
							placeholderTextColor="#999"
							value={destinationLocation}
							onChangeText={setDestinationLocation}
							returnKeyType="done"
						/>
					</Pressable>
				</View>

				<View style={styles.mapCard}>
					<View style={styles.mapInner}>
						<Image source={MapsImg} style={styles.mapImage} resizeMode="cover" />
					</View>
				</View>

				<View style={styles.tarifRow}>
					<View style={styles.tarifPill}>
						<Text style={styles.tarifLabel}>Tarif</Text>
						<Text style={styles.tarifValue}>Rp9.000</Text>
					</View>
				</View>

				<TouchableOpacity style={styles.pesanButton} onPress={handlePesanRide}>
					<Text style={styles.pesanText}>Pesan</Text>
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
	headerRow: {
		paddingHorizontal: 20,
		paddingTop: 12,
		flexDirection: 'row',
		alignItems: 'center'
	},
	backButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#33cc66',
		justifyContent: 'center',
		alignItems: 'center'
	},
	backArrow: {
		color: '#fff',
		fontSize: 20,
		fontWeight: '700'
	},
	content: {
		paddingHorizontal: 24,
		paddingTop: 18,
		alignItems: 'center'
	},
	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		marginBottom: 12
	},
	circle: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 2,
		borderColor: '#4ab100',
		marginRight: 12
	},
	inputBox: {
		flex: 1,
		height: 46,
		borderRadius: 34,
		borderWidth: 1,
		borderColor: '#4ab100',
		justifyContent: 'center',
		paddingHorizontal: 16,
		backgroundColor: '#fff'
	},
    inputText: {
        color: '#000',
        fontSize: 16,
        paddingVertical: 0,
        flex: 1
    },
	mapCard: {
		width: '100%',
		height: 220,
		borderRadius: 16,
		backgroundColor: '#e6f8ea',
		marginTop: 8,
		marginBottom: 18,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.12,
		shadowRadius: 12,
		elevation: 8,
		alignItems: 'center',
		justifyContent: 'center'
	},
	mapInner: {
		width: '88%',
		height: '72%',
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: '#fff'
	},
	mapImage: {
		width: '100%',
		height: '100%'
	},
	tarifRow: {
		width: '100%',
		alignItems: 'center',
		marginBottom: 12
	},
	tarifPill: {
		width: '88%',
		height: 48,
		borderRadius: 24,
		backgroundColor: '#ffd14a',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18
	},
	tarifLabel: {
		color: '#000',
		fontSize: 16
	},
	tarifValue: {
		color: '#000',
		fontSize: 16,
		fontWeight: '600'
	},
	pesanButton: {
		width: '88%',
		height: 48,
		borderRadius: 24,
		backgroundColor: '#33cc66',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 24
	},
	pesanText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700'
	},
		/* Status bar styles removed: time, battery, wifi, cellular — not needed for this screen */
	/* removed legacy absolute-position styles */
});

export default IPhone16Scootride;


