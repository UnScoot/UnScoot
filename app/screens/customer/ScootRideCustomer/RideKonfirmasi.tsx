import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { updateOrderStatus, subscribeToOrderStatus } from "../../../../src/database/chatScootRide";
import { supabase } from "../../../../src/database/supabase";

const KonfirmasiImg = require("../../../../assets/images/KonfirmasiKalauSudah.png");

const RideKonfirmasi = () => {
	const router = useRouter();
	const params = useLocalSearchParams();
	const orderId = params.orderId as string;
	const userId = params.userId as string;
	const [isConfirming, setIsConfirming] = React.useState(false);
	const orderStatusChannelRef = React.useRef<any>(null);

	// Subscribe to order status changes + polling fallback
	React.useEffect(() => {
		if (!orderId) return;

		let isNavigating = false;
		let pollingInterval: ReturnType<typeof setInterval> | null = null;

		const handleStatusChange = (newStatus: string) => {
			if (isNavigating) return;

			// Jika driver sudah konfirmasi pembayaran (completed), pindah ke rating
			if (newStatus === 'completed') {
				isNavigating = true;
				console.log('[KonfirmasiSudahSampai] Payment confirmed! Going to rating...');

				if (pollingInterval) {
					clearInterval(pollingInterval);
				}
				if (orderStatusChannelRef.current) {
					orderStatusChannelRef.current.unsubscribe();
				}

				router.replace({
					pathname: '/screens/customer/ScootRideCustomer/RideRating',
					params: { orderId, userId }
				} as any);
			}
		};

		console.log('[KonfirmasiSudahSampai] Setting up order status subscription');

		// Realtime subscription
		const subscription = subscribeToOrderStatus(orderId, (payload: any) => {
			console.log('[KonfirmasiSudahSampai] Order status changed via realtime:', payload.new?.status);
			handleStatusChange(payload.new?.status);
		});

		orderStatusChannelRef.current = subscription;

		// Polling fallback - check every 3 seconds
		const checkOrderStatus = async () => {
			if (isNavigating) return;

			try {
				const { data, error } = await supabase
					.from('scoot_ride')
					.select('status')
					.eq('id', orderId)
					.single();

				if (!error && data) {
					console.log('[KonfirmasiSudahSampai] Polling check - current status:', data.status);
					handleStatusChange(data.status);
				}
			} catch (err) {
				console.error('[KonfirmasiSudahSampai] Polling error:', err);
			}
		};

		// Start polling as fallback
		pollingInterval = setInterval(checkOrderStatus, 3000);

		return () => {
			if (pollingInterval) {
				clearInterval(pollingInterval);
			}
			if (orderStatusChannelRef.current) {
				orderStatusChannelRef.current.unsubscribe();
			}
		};
	}, [orderId, userId, router]);

	const handleKonfirmasi = async () => {
		if (isConfirming) return;

		setIsConfirming(true);
		try {
			console.log('[KonfirmasiSudahSampai] Customer confirming arrival, updating status to waiting_payment');

			// Update status ke waiting_payment - driver bisa tampilkan QR
			const result = await updateOrderStatus(orderId, 'waiting_payment');

			if (!result.success) {
				Alert.alert('Error', 'Gagal mengkonfirmasi. Coba lagi.');
				setIsConfirming(false);
				return;
			}

			console.log('[KonfirmasiSudahSampai] Status updated to waiting_payment');
			Alert.alert(
				'Menunggu Pembayaran',
				'Silakan bayar ke driver. Setelah driver konfirmasi pembayaran, kamu bisa kasih rating.',
				[{ text: 'OK' }]
			);
			// Tetap di halaman ini, tunggu driver click "Sudah Bayar"
			// Akan otomatis redirect ke rating saat status berubah ke 'completed'
		} catch (error) {
			console.error('[KonfirmasiSudahSampai] Error:', error);
			Alert.alert('Error', 'Terjadi kesalahan');
			setIsConfirming(false);
		}
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<SafeAreaView style={styles.container}>
				<View style={styles.card}>
					<Image source={KonfirmasiImg} style={styles.image} resizeMode="contain" />
					<Text style={styles.title}>Apakah kamu sudah sampai?</Text>
					<Text style={styles.subtitle}>Klik tombol di bawah kalau kamu{'\n'}udah sampai ya ☺️</Text>

					<TouchableOpacity
						style={[styles.button, isConfirming && styles.buttonDisabled]}
						onPress={handleKonfirmasi}
						activeOpacity={0.85}
						disabled={isConfirming}
					>
						{isConfirming ? (
							<ActivityIndicator color="#fff" size="small" />
						) : (
							<Text style={styles.buttonText}>Sudah</Text>
						)}
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		</>
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
	buttonDisabled: { backgroundColor: '#88d4a0' },
	buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default RideKonfirmasi;
