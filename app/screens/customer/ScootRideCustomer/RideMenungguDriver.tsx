import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { subscribeToCustomerOrders, unsubscribe, updateOrderStatus } from '../../../../src/scootRideCustomer/scootRideMemesan';
import { kirimNotifikasi } from '../../../../src/notifications/notifikasiregister';
import { supabase } from '../../../../src/database/supabase';
// status-bar assets removed; keep file focused on screen content
// correct relative path to project root assets (this file is 4 levels deep)
const LogoImg = require("../../../../assets/images/logo.jpg");
const MenungguImg = require("../../../../assets/images/menunggu.png");

const RideMenungguDriver = () => {
	const router = useRouter();
	const { orderId, userId, lokasiJemput, lokasiTujuan, biaya, nama } = useLocalSearchParams();
	// ... custom params to preserve user identity ...
	const userParams = { userId, nama };

	// Order status state - default to 'pending' while waiting for driver
	const [orderStatus, setOrderStatus] = React.useState('pending');

	// Subscribe to order status changes
	React.useEffect(() => {
		if (!orderId || !userId) {
			console.log('[RideMenungguDriver] Missing orderId or userId, skipping subscription');
			return;
		}

		console.log('[RideMenungguDriver] Setting up subscription for order:', orderId);

		const subscription = subscribeToCustomerOrders(userId, (payload) => {
			console.log('[RideMenungguDriver] Received payload:', JSON.stringify(payload, null, 2));

			const order = payload.new;
			if (!order || order.id !== orderId) {
				console.log('[RideMenungguDriver] Order ID mismatch, ignoring');
				return;
			}

			console.log('[RideMenungguDriver] Order status changed to:', order.status);
			setOrderStatus(order.status);

			// If order is accepted by driver, navigate to RideMendapatDriver
			if (order.status === 'accepted') {
				console.log('[RideMenungguDriver] Order accepted! Fetching driver data...');

				// Fetch driver info before navigating
				(async () => {
					const { data: orderData } = await supabase
						.from('scoot_ride')
						.select('*, driver:id_driver(nama, nim, jenis_motor, plat_motor, profile_image_url)')
						.eq('id', orderId)
						.single();

					const driverData = orderData?.driver;
					const driverName = driverData?.nama || 'Driver';

					// Send notification to customer
					kirimNotifikasi({
						title: 'Driver Ditemukan!',
						body: `Driver ${driverName} menuju lokasi penjemputan`
					});

					console.log('[RideMenungguDriver] Navigating to RideMendapatDriver with driverId:', orderData?.id_driver);

					router.replace({
						pathname: '/screens/customer/ScootRideCustomer/RideMendapatDriver',
						params: {
							orderId: order.id,
							userId,
							nama,
							lokasiJemput,
							lokasiTujuan,
							biaya,
							driverId: orderData?.id_driver || order.id_driver,
							driverName: driverName,
							driverPhone: '',
							vehicleNumber: driverData?.plat_motor || ''
						}
					});
				})();
			} else if (order.status === 'cancelled') {
				console.log('[RideMenungguDriver] Order was cancelled');
				router.replace({ pathname: '/screens/customer/HomeCustomer', params: userParams });
			}
		});

		return () => {
			console.log('[RideMenungguDriver] Cleaning up subscription');
			if (subscription) {
				unsubscribe(subscription);
			}
		};
	}, [orderId, userId]);

	const handleCancel = async () => {
		if (!orderId) {
			router.replace({ pathname: '/screens/customer/HomeCustomer', params: userParams });
			return;
		}

		Alert.alert(
			'Batalkan Pesanan',
			'Yakin mau batalkan pesanan ini?',
			[
				{ text: 'Tidak', style: 'cancel' },
				{
					text: 'Ya, Batalkan',
					style: 'destructive',
					onPress: async () => {
						console.log('[RideMenungguDriver] Cancelling order:', orderId);

						// Update status ke cancelled
						const result = await updateOrderStatus(orderId, 'cancelled');

						if (result.success) {
							kirimNotifikasi({
								title: 'Pesanan Dibatalkan',
								body: 'Pesanan ScootRide kamu sudah dibatalkan'
							});
							router.replace({ pathname: '/screens/customer/HomeCustomer', params: userParams });
						} else {
							Alert.alert('Error', 'Gagal membatalkan pesanan');
						}
					}
				}
			]
		);
	};

	const handleBack = () => {
		Alert.alert(
			'Keluar',
			'Pesanan masih dalam proses. Yakin mau keluar?',
			[
				{ text: 'Tidak', style: 'cancel' },
				{ text: 'Ya', onPress: () => router.replace({ pathname: '/screens/customer/HomeCustomer', params: userParams }) }
			]
		);
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity style={styles.backButton} onPress={handleBack}>
						<Text style={styles.backArrow}>â†</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.centerContent}>
					<Text style={styles.title}>Menunggu Driver</Text>
					<Text style={styles.subtitle}>
						{orderStatus === 'pending' ? 'Mencari driver terdekat...' : 'Memproses...'}
					</Text>
					<Image source={MenungguImg} style={styles.image} resizeMode="contain" />

					<View style={styles.infoCard}>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Dari:</Text>
							<Text style={styles.infoValue}>{lokasiJemput}</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Ke:</Text>
							<Text style={styles.infoValue}>{lokasiTujuan}</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Biaya:</Text>
							<Text style={styles.infoValue}>Rp {biaya}</Text>
						</View>
					</View>
				</View>

				<View style={styles.footer}>
					<TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
						<Text style={styles.cancelText}>Batalkan Pesanan</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		</>
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
		fontWeight: '700',
		marginBottom: 8
	},
	subtitle: {
		fontSize: 14,
		color: '#666',
		marginBottom: 18
	},
	image: {
		width: 220,
		height: 220,
		marginBottom: 20
	},
	infoCard: {
		width: '85%',
		backgroundColor: '#f0f9f4',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#33cc66'
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8
	},
	infoLabel: {
		fontSize: 14,
		color: '#666',
		fontWeight: '500'
	},
	infoValue: {
		fontSize: 14,
		color: '#00633f',
		fontWeight: '600',
		flex: 1,
		textAlign: 'right'
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

export default RideMenungguDriver;


