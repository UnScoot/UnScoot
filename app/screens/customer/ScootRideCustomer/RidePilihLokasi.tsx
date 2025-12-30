import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createRideOrder } from '../../../../src/scootRideCustomer/scootRideMemesan';
import { kirimNotifikasi } from '../../../../src/notifications/notifikasiregister';
import MapWithRoute from '../../../../components/MapWithRoute';
import { geocodeAddress } from '../../../../src/utils/routingService';
import { hasActiveOrderCustomer } from '../../../../src/utils/activeOrderChecker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../../src/database/supabase';

// Use static require(...) so Metro resolves assets reliably.
const MapsImg = require("../../../../assets/images/maps.png");

const IPhone16Scootride = () => {
	const router = useRouter();
	const params = useLocalSearchParams();
	const userIdParam = params.userId as string | undefined;
	const nama = params.nama as string | undefined;

	const [userId, setUserId] = React.useState<string | null>(userIdParam ?? null);

	const [currentLocation, setCurrentLocation] = React.useState('');
	const [destinationLocation, setDestinationLocation] = React.useState('');
	const [isLoading, setIsLoading] = React.useState(false);
	const currentRef = React.useRef<any>(null);
	const destRef = React.useRef<any>(null);

	// State untuk maps dan harga
	const [pickupCoords, setPickupCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
	const [destCoords, setDestCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
	const [calculatedPrice, setCalculatedPrice] = React.useState<number>(5000); // Default minimum
	const [routeDistance, setRouteDistance] = React.useState<number | null>(null);
	const [isGeocodingPickup, setIsGeocodingPickup] = React.useState(false);
	const [isGeocodingDest, setIsGeocodingDest] = React.useState(false);

	// Debounce timer refs
	const pickupTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const destTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	// State untuk error geocoding
	const [pickupError, setPickupError] = React.useState<string | null>(null);
	const [destError, setDestError] = React.useState<string | null>(null);

	// Resolve userId fallback: params -> AsyncStorage -> Supabase Auth
	React.useEffect(() => {
		const resolveUserId = async () => {
			if (userIdParam) {
				console.log('[PilihLokasi] Using userId from params:', userIdParam);
				setUserId(userIdParam);
				return;
			}

			try {
				const session = await AsyncStorage.getItem('userSession');
				if (session) {
					const parsed = JSON.parse(session);
					const maybe = parsed.params?.userId;
					if (maybe) {
						console.log('[PilihLokasi] Using userId from AsyncStorage:', maybe);
						setUserId(maybe);
						return;
					}
				}
			} catch (e) {
				console.warn('[PilihLokasi] Error reading AsyncStorage for userSession', e);
			}

			try {
				const { data } = await supabase.auth.getUser();
				const supUserId = data?.user?.id;
				if (supUserId) {
					console.log('[PilihLokasi] Using userId from Supabase auth:', supUserId);
					setUserId(supUserId);
					return;
				}
			} catch (e) {
				console.warn('[PilihLokasi] Error getting user from Supabase auth', e);
			}

			console.error('[PilihLokasi] ❌ Could not resolve userId');
		};

		resolveUserId();
	}, [userIdParam]);

	// Geocode pickup location dengan debounce
	React.useEffect(() => {
		if (pickupTimerRef.current) {
			clearTimeout(pickupTimerRef.current);
		}

		if (!currentLocation.trim()) {
			setPickupCoords(null);
			setPickupError(null);
			return;
		}

		pickupTimerRef.current = setTimeout(async () => {
			setIsGeocodingPickup(true);
			setPickupError(null);
			console.log('[PilihLokasi] Geocoding pickup:', currentLocation);
			const result = await geocodeAddress(currentLocation);
			if (result) {
				console.log('[PilihLokasi] Pickup coords:', result);
				setPickupCoords(result);
				setPickupError(null);
			} else {
				setPickupCoords(null);
				setPickupError('Lokasi tidak ditemukan');
			}
			setIsGeocodingPickup(false);
		}, 1000); // 1 detik debounce

		return () => {
			if (pickupTimerRef.current) {
				clearTimeout(pickupTimerRef.current);
			}
		};
	}, [currentLocation]);

	// Geocode destination location dengan debounce
	React.useEffect(() => {
		if (destTimerRef.current) {
			clearTimeout(destTimerRef.current);
		}

		if (!destinationLocation.trim()) {
			setDestCoords(null);
			setDestError(null);
			return;
		}

		destTimerRef.current = setTimeout(async () => {
			setIsGeocodingDest(true);
			setDestError(null);
			console.log('[PilihLokasi] Geocoding destination:', destinationLocation);
			const result = await geocodeAddress(destinationLocation);
			if (result) {
				console.log('[PilihLokasi] Destination coords:', result);
				setDestCoords(result);
				setDestError(null);
			} else {
				setDestCoords(null);
				setDestError('Lokasi tidak ditemukan');
			}
			setIsGeocodingDest(false);
		}, 1000); // 1 detik debounce

		return () => {
			if (destTimerRef.current) {
				clearTimeout(destTimerRef.current);
			}
		};
	}, [destinationLocation]);

	// Handle route calculated callback dari MapWithRoute
	const handleRouteCalculated = React.useCallback((distanceKm: number, _durationMinutes: number, price: number) => {
		console.log('[PilihLokasi] Route calculated:', { distanceKm, price });
		setRouteDistance(distanceKm);
		setCalculatedPrice(price);
	}, []);

	const handlePesanRide = async () => {
		// Validasi input
		if (!currentLocation.trim()) {
			Alert.alert('Error', 'Masukkan lokasi saat ini');
			return;
		}
		if (!destinationLocation.trim()) {
			Alert.alert('Error', 'Masukkan lokasi tujuan');
			return;
		}
		if (!userId) {
			Alert.alert('Error', 'User ID tidak ditemukan');
			return;
		}

		setIsLoading(true);

		try {
			// Check for active orders first
			const activeCheck = await hasActiveOrderCustomer(userId);
			if (activeCheck.hasActive) {
				setIsLoading(false);
				Alert.alert(
					'Pesanan Aktif',
					`Kamu masih punya pesanan ${activeCheck.service} yang belum selesai. Selesaikan dulu sebelum pesan baru.`,
					[{ text: 'OK' }]
				);
				return;
			}

			console.log('[PilihLokasi] Creating order for customer:', userId);

			// Insert order ke database dengan harga yang sudah dihitung
			const result = await createRideOrder({
				customerId: userId,
				lokasiJemput: currentLocation,
				lokasiTujuan: destinationLocation,
				tanggal: new Date().toISOString(),
				biaya: calculatedPrice
			});

			if (result.success) {
				console.log('[PilihLokasi] Order created successfully:', result.data);

				// Kirim notifikasi sukses
				await kirimNotifikasi({
					title: 'Pesanan Dikirim',
					body: 'Pesanan ScootRide kamu sedang dicari driver. Tunggu sebentar ya!'
				});

				// Navigate ke halaman menunggu driver (replace to clean history)
				router.replace({
					pathname: '/screens/customer/ScootRideCustomer/RideMenungguDriver',
					params: {
						orderId: result.data.id,
						lokasiJemput: currentLocation,
						lokasiTujuan: destinationLocation,
						biaya: calculatedPrice,
						userId: userId,
						nama: nama
					}
				});
			} else {
				console.error('[PilihLokasi] Failed to create order:', result.error);
				Alert.alert('Error', 'Gagal membuat pesanan: ' + result.error);
			}
		} catch (error: unknown) {
			console.error('[PilihLokasi] Exception:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			Alert.alert('Error', 'Terjadi kesalahan: ' + errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
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
							{isGeocodingPickup && (
								<ActivityIndicator size="small" color="#27AE60" style={{ marginLeft: 8 }} />
							)}
						</Pressable>
						{pickupError && <Text style={styles.errorText}>{pickupError}</Text>}
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
							{isGeocodingDest && (
								<ActivityIndicator size="small" color="#27AE60" style={{ marginLeft: 8 }} />
							)}
						</Pressable>
						{destError && <Text style={styles.errorText}>{destError}</Text>}
					</View>

					{/* Maps Container - Real Maps atau Gambar */}
					<View style={styles.mapCard}>
						{pickupCoords && destCoords ? (
							<MapWithRoute
								origin={pickupCoords}
								destination={destCoords}
								originLabel={currentLocation || 'Jemput'}
								destinationLabel={destinationLocation || 'Tujuan'}
								onRouteCalculated={handleRouteCalculated}
							/>
						) : (
							<View style={styles.mapInner}>
								{isGeocodingPickup || isGeocodingDest ? (
									<View style={styles.mapLoadingContainer}>
										<ActivityIndicator size="small" color="#27AE60" />
										<Text style={styles.mapLoadingText}>Mencari lokasi...</Text>
									</View>
								) : (
									<>
										<Image source={MapsImg} style={styles.mapImage} resizeMode="cover" />
										<View style={styles.mapOverlay}>
											<Text style={styles.mapOverlayText}>
												Masukkan lokasi untuk melihat rute
											</Text>
										</View>
									</>
								)}
							</View>
						)}
					</View>

					<View style={styles.tarifRow}>
						<View style={styles.tarifPill}>
							<Text style={styles.tarifLabel}>Tarif</Text>
							<Text style={styles.tarifValue}>
								{routeDistance !== null
									? `Rp${calculatedPrice.toLocaleString('id-ID')} (${routeDistance.toFixed(1)} km)`
									: `Rp${calculatedPrice.toLocaleString('id-ID')}`
								}
							</Text>
						</View>
					</View>

					<TouchableOpacity
						style={[styles.pesanButton, isLoading && styles.pesanButtonDisabled]}
						onPress={handlePesanRide}
						disabled={isLoading}
					>
						{isLoading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.pesanText}>Pesan</Text>
						)}
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		</>
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
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		backgroundColor: '#fff'
	},
	inputText: {
		color: '#000',
		fontSize: 16,
		paddingVertical: 0,
		flex: 1
	},
	errorText: {
		color: '#e74c3c',
		fontSize: 12,
		marginTop: 4,
		marginLeft: 34,
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
		overflow: 'hidden',
	},
	mapInner: {
		width: '100%',
		height: '100%',
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: '#fff',
		justifyContent: 'center',
		alignItems: 'center',
	},
	mapImage: {
		width: '100%',
		height: '100%'
	},
	mapOverlay: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: 'rgba(0,0,0,0.5)',
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	mapOverlayText: {
		color: '#fff',
		fontSize: 12,
		textAlign: 'center',
	},
	mapLoadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	mapLoadingText: {
		marginTop: 8,
		fontSize: 12,
		color: '#666',
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
	pesanButtonDisabled: {
		backgroundColor: '#99e6b3'
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


