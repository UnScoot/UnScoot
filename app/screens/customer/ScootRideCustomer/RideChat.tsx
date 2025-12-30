import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';
import { sendMessage, getMessages, subscribeToMessages, unsubscribeFromMessages, getUserProfile, subscribeToOrderStatus } from '../../../../src/database/chatScootRide';
import { uploadChatImage } from '../../../../src/database/uploadChatImage';
import { supabase } from "../../../../src/database/supabase";
import MapWithRoute from "../../../../components/MapWithRoute";
import { geocodeAddress } from "../../../../src/utils/routingService";

// assets
const DriverImg = require('../../../../assets/images/driver.png');
// const CustomerImg = require('../../../../assets/images/Passenger.png'); // Unused

interface ChatMessage {
	id: string;
	sender: 'driver' | 'customer';
	text: string;
	time: string;
	imageUrl?: string | null;
}

interface UserProfile {
	nama: string;
	profile_image_url: string | null;
}

const ChatScootRide = () => {
	const router = useRouter();
	const params = useLocalSearchParams();
	const scrollViewRef = React.useRef<ScrollView>(null);
	const channelRef = React.useRef<any>(null);
	const orderStatusChannelRef = React.useRef<any>(null);
	const sentMessageIdsRef = React.useRef<Set<string>>(new Set()); // Track messages we sent

	// Slider state - 0 = Chat, 1 = Maps
	const [activeView, setActiveView] = React.useState(0);

	// Get params
	const orderId = params.orderId as string;
	const userIdParam = params.userId as string; // Customer ID from params
	const driverId = params.driverId as string;
	const driverName = params.driverName as string || 'Driver';
	const lokasiJemput = params.lokasiJemput as string;
	const lokasiTujuan = params.lokasiTujuan as string;
	const biayaParam = params.biaya as string; // Harga dari order - tetap konsisten
	const orderPrice = biayaParam ? parseInt(biayaParam, 10) : undefined;

	// State for resolved userId
	const [userId, setUserId] = React.useState<string>('');

	// Chat state
	const [messages, setMessages] = React.useState<ChatMessage[]>([]);
	const [inputText, setInputText] = React.useState('');
	const [isLoading, setIsLoading] = React.useState(true);
	const [driverProfile, setDriverProfile] = React.useState<UserProfile>({ nama: driverName, profile_image_url: null });

	// Map coordinates state
	const [pickupCoords, setPickupCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
	const [destCoords, setDestCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
	const [mapLoading, setMapLoading] = React.useState(false);
	const [routeDistance, setRouteDistance] = React.useState<number | null>(null);
	const [routeDuration, setRouteDuration] = React.useState<number | null>(null);
	const [isUploadingImage, setIsUploadingImage] = React.useState(false);

	// Resolve userId dari params, AsyncStorage, atau Supabase Auth
	React.useEffect(() => {
		const resolveUserId = async () => {
			let finalUserId = userIdParam;

			// 1️⃣ Coba ambil dari params
			if (finalUserId) {
				console.log('[ChatScootRide] Using userId from params:', finalUserId);
				setUserId(finalUserId);
				return;
			}

			// 2️⃣ Coba ambil dari AsyncStorage
			try {
				const userSession = await AsyncStorage.getItem('userSession');
				if (userSession) {
					const session = JSON.parse(userSession);
					finalUserId = session.params?.userId;
					if (finalUserId) {
						console.log('[ChatScootRide] Using userId from AsyncStorage:', finalUserId);
						setUserId(finalUserId);
						return;
					}
				}
			} catch (e) {
				console.warn('[ChatScootRide] Error reading AsyncStorage:', e);
			}

			// 3️⃣ Coba ambil dari Supabase Auth
			try {
				const { data } = await supabase.auth.getUser();
				finalUserId = data?.user?.id || '';
				if (finalUserId) {
					console.log('[ChatScootRide] Using userId from Supabase Auth:', finalUserId);
					setUserId(finalUserId);
					return;
				}
			} catch (e) {
				console.warn('[ChatScootRide] Error getting user from Supabase:', e);
			}

			console.error('[ChatScootRide] ❌ Could not resolve userId!');
		};

		resolveUserId();
	}, [userIdParam]);

	// Geocode pickup and destination addresses for real maps
	React.useEffect(() => {
		const loadCoordinates = async () => {
			if (!lokasiJemput || !lokasiTujuan) {
				console.log('[ChatScootRide] No pickup or destination provided');
				setMapLoading(false);
				return;
			}

			setMapLoading(true);
			console.log('[ChatScootRide] Geocoding addresses:', { lokasiJemput, lokasiTujuan });

			try {
				// Geocode both addresses in parallel
				const [pickupResult, destResult] = await Promise.all([
					geocodeAddress(lokasiJemput),
					geocodeAddress(lokasiTujuan)
				]);

				console.log('[ChatScootRide] Geocoding results:', { pickupResult, destResult });

				if (pickupResult) {
					setPickupCoords(pickupResult);
				}
				if (destResult) {
					setDestCoords(destResult);
				}
			} catch (error) {
				console.error('[ChatScootRide] Error geocoding addresses:', error);
			} finally {
				setMapLoading(false);
			}
		};

		loadCoordinates();
	}, [lokasiJemput, lokasiTujuan]);

	// Setup real-time subscription for messages
	React.useEffect(() => {
		if (!orderId) return;

		console.log('[ChatScootRide] Setting up real-time subscription for order:', orderId);

		channelRef.current = subscribeToMessages(orderId, (payload: any) => {
			console.log('[ChatScootRide] New message received:', payload);

			const newRow = payload.new;
			const newMessage = {
				id: newRow.id,
				sender: 'driver' as const,
				text: newRow.text || newRow.chat || '',
				time: new Date(newRow.timestamp || newRow.tanggal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
				imageUrl: newRow.imageUrl || newRow.image_url || null,
			};

			setMessages(prev => {
				// Skip if this exact ID already exists
				if (prev.some(m => m.id === newRow.id)) {
					console.log('[ChatScootRide] Message ID already exists:', newRow.id);
					return prev;
				}

				// Check if we have a temp message with same text (our sent message confirmation)
				const tempMessageIndex = prev.findIndex(m => m.text === newRow.text && m.sender === 'customer' && m.id.startsWith('temp-'));
				if (tempMessageIndex !== -1) {
					// Replace temp message with real one
					console.log('[ChatScootRide] Replacing temp message with real ID:', prev[tempMessageIndex].id, '→', newRow.id);
					const updated = [...prev];
					updated[tempMessageIndex] = { ...newMessage, sender: 'customer' as const };
					sentMessageIdsRef.current.delete(prev[tempMessageIndex].id);
					sentMessageIdsRef.current.add(newRow.id);
					return updated;
				}

				// New message from driver
				return [...prev, newMessage];
			});

			// Auto scroll to bottom
			setTimeout(() => {
				scrollViewRef.current?.scrollToEnd({ animated: true });
			}, 100);
		});

		return () => {
			if (channelRef.current) {
				console.log('[ChatScootRide] Cleaning up subscription');
				unsubscribeFromMessages(channelRef.current);
			}
		};
	}, [orderId]);

	// Auto-Chat: Initial Welcome Message Logic (Persistent)
	React.useEffect(() => {
		// Check if we already have the welcome message
		const hasWelcome = messages.some(m => m.id === 'initial-welcome');

		if (!hasWelcome && (lokasiJemput || lokasiTujuan)) {
			let initialMessage = `🚗 Pesanan ScootRide Diterima!\n\n`;
			if (lokasiJemput) initialMessage += `📍 Jemput: ${lokasiJemput}\n`;
			if (lokasiTujuan) initialMessage += `🎯 Tujuan: ${lokasiTujuan}\n`;
			if (orderPrice) initialMessage += `💰 Biaya: Rp ${orderPrice.toLocaleString('id-ID')}\n`;
			initialMessage += `\nDriver sedang menuju lokasi. Mohon ditunggu ya! 😊`;

			setMessages(prev => [
				{
					id: 'initial-welcome',
					sender: 'driver',
					text: initialMessage,
					time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
				},
				...prev.filter(m => m.id !== 'initial-1') // remove old initial if any
			]);
		}
	}, [lokasiJemput, lokasiTujuan, orderPrice, messages]);

	// Setup real-time subscription for order status changes + polling fallback
	React.useEffect(() => {
		if (!orderId) {
			console.log('[ChatScootRide] No orderId for order status subscription');
			return;
		}

		let isNavigating = false;
		let pollingInterval: NodeJS.Timeout | null = null;

		const handleStatusChange = (newStatus: string) => {
			if (isNavigating) return;

			// Jika driver click Selesai (waiting_confirmation), redirect ke konfirmasi sampai
			if (newStatus === 'waiting_confirmation') {
				isNavigating = true;
				console.log('[ChatScootRide] Driver marked complete! Redirecting to confirmation...');

				// Clear polling
				if (pollingInterval) {
					clearInterval(pollingInterval);
				}

				// Cleanup subscriptions before navigate
				if (orderStatusChannelRef.current) {
					console.log('[ChatScootRide] Unsubscribing from order status');
					orderStatusChannelRef.current.unsubscribe();
				}
				if (channelRef.current) {
					console.log('[ChatScootRide] Unsubscribing from message channel');
					unsubscribeFromMessages(channelRef.current);
				}

				// Navigate to confirmation screen
				console.log('[ChatScootRide] Navigating to KonfirmasiSudahSampai');
				router.replace({
					pathname: '/screens/customer/ScootRideCustomer/RideKonfirmasi',
					params: { orderId, userId }
				} as any);
			}
		};

		console.log('[ChatScootRide] Setting up order status subscription for order:', orderId);

		// Realtime subscription
		const subscription = subscribeToOrderStatus(orderId, (payload: any) => {
			console.log('[ChatScootRide] Order status changed via realtime:', payload);
			console.log('[ChatScootRide] New status:', payload.new?.status);
			handleStatusChange(payload.new?.status);
		});

		orderStatusChannelRef.current = subscription;

		// Polling fallback - check every 3 seconds in case realtime fails
		const checkOrderStatus = async () => {
			if (isNavigating) return;

			try {
				const { data, error } = await supabase
					.from('scoot_ride')
					.select('status')
					.eq('id', orderId)
					.single();

				if (!error && data) {
					console.log('[ChatScootRide] Polling check - current status:', data.status);
					handleStatusChange(data.status);
				}
			} catch (err) {
				console.error('[ChatScootRide] Polling error:', err);
			}
		};

		// Start polling as fallback
		pollingInterval = setInterval(checkOrderStatus, 3000) as any;
		// Also check immediately
		checkOrderStatus();

		return () => {
			if (pollingInterval) {
				clearInterval(pollingInterval);
			}
			if (orderStatusChannelRef.current) {
				console.log('[ChatScootRide] Cleaning up order status subscription on unmount');
				orderStatusChannelRef.current.unsubscribe();
				orderStatusChannelRef.current = null;
			}
		};
	}, [orderId, userId, router]);

	const loadDriverProfile = React.useCallback(async () => {
		try {
			const result = await getUserProfile(driverId, 'driver');
			if (result.success && result.data) {
				setDriverProfile({
					nama: result.data.nama,
					profile_image_url: result.data.profile_image_url
				});
			}
		} catch (error) {
			console.log('Error loading driver profile:', error);
		}
	}, [driverId]);

	const loadMessages = React.useCallback(async () => {
		if (!orderId) return;

		console.log('[ChatScootRide] Loading messages for order:', orderId);
		setIsLoading(true);

		const result = await getMessages(orderId, userId);

		if (result.success && result.data) {
			// Clear sent message IDs first
			sentMessageIdsRef.current.clear();
			const formattedMessages: ChatMessage[] = result.data.map((msg: any) => ({
				id: msg.id,
				sender: 'driver', // Load messages dari history dianggap dari driver
				text: msg.text,
				time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			}));
			setMessages(formattedMessages);
		}

		setIsLoading(false);

		// Auto scroll to bottom after loading
		setTimeout(() => {
			scrollViewRef.current?.scrollToEnd({ animated: true });
		}, 200);
	}, [orderId, userId]);

	// Load messages saat pertama kali
	React.useEffect(() => {
		loadMessages();
	}, [orderId, loadMessages]);

	// Load driver profile on mount
	React.useEffect(() => {
		loadDriverProfile();
	}, [loadDriverProfile]);

	// Show options: Camera or Gallery
	const handlePickImage = () => {
		if (!orderId || !userId) {
			Alert.alert('Error', 'Order ID atau User ID tidak tersedia');
			return;
		}

		Alert.alert(
			'Pilih Sumber Gambar',
			'Ambil foto atau pilih dari galeri?',
			[
				{ text: 'Kamera', onPress: () => launchCamera() },
				{ text: 'Galeri', onPress: () => launchGallery() },
				{ text: 'Batal', style: 'cancel' },
			]
		);
	};

	const launchCamera = async () => {
		try {
			const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
			if (!permissionResult.granted) {
				Alert.alert('Izin Diperlukan', 'Anda perlu mengizinkan akses ke kamera');
				return;
			}

			const result = await ImagePicker.launchCameraAsync({
				allowsEditing: true,
				quality: 0.8,
			});

			if (result.canceled || !result.assets || result.assets.length === 0) return;
			await uploadAndSendImage(result.assets[0].uri);
		} catch (error: any) {
			console.error('[ChatScootRide] Error launching camera:', error);
			Alert.alert('Error', 'Gagal membuka kamera');
		}
	};

	const launchGallery = async () => {
		try {
			const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permissionResult.granted) {
				Alert.alert('Izin Diperlukan', 'Anda perlu mengizinkan akses ke galeri foto');
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				quality: 0.8,
			});

			if (result.canceled || !result.assets || result.assets.length === 0) return;
			await uploadAndSendImage(result.assets[0].uri);
		} catch (error: any) {
			console.error('[ChatScootRide] Error picking image:', error);
			Alert.alert('Error', 'Gagal memilih gambar');
		}
	};

	const uploadAndSendImage = async (imageUri: string) => {
		try {
			setIsUploadingImage(true);
			const uploadResult = await uploadChatImage(orderId, imageUri, 'ride');

			if (!uploadResult.success || !uploadResult.imageUrl) {
				Alert.alert('Upload Gagal', uploadResult.error || 'Gagal mengunggah gambar');
				setIsUploadingImage(false);
				return;
			}

			const tempId = `temp-img-${Date.now()}`;
			sentMessageIdsRef.current.add(tempId);
			const tempMessage: ChatMessage = {
				id: tempId,
				sender: 'customer',
				text: '',
				time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
				imageUrl: uploadResult.imageUrl,
			};
			setMessages(prev => [...prev, tempMessage]);

			setTimeout(() => {
				scrollViewRef.current?.scrollToEnd({ animated: true });
			}, 100);

			const sendResult = await sendMessage({
				orderId,
				message: '',
				imageUrl: uploadResult.imageUrl,
			});

			if (sendResult.success && sendResult.data && Array.isArray(sendResult.data) && sendResult.data[0]) {
				const inserted = sendResult.data[0];
				setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: inserted.id } : m));
				sentMessageIdsRef.current.delete(tempId);
				sentMessageIdsRef.current.add(inserted.id);
			} else {
				setMessages(prev => prev.filter(m => m.id !== tempId));
				sentMessageIdsRef.current.delete(tempId);
			}

			setIsUploadingImage(false);
		} catch (error: any) {
			console.error('[ChatScootRide] Error uploading image:', error);
			Alert.alert('Error', 'Gagal mengunggah gambar');
			setIsUploadingImage(false);
		}
	};

	const handleSendMessage = async () => {
		if (inputText.trim() === '' || !orderId || !userId) return;

		const messageText = inputText.trim();
		setInputText('');

		const tempId = `temp-${Date.now()}-${Math.random()}`;
		sentMessageIdsRef.current.add(tempId);
		const tempMessage: ChatMessage = {
			id: tempId,
			sender: 'customer',
			text: messageText,
			time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
		};
		setMessages(prev => [...prev, tempMessage]);

		setTimeout(() => {
			scrollViewRef.current?.scrollToEnd({ animated: true });
		}, 100);

		const result = await sendMessage({
			orderId,
			message: messageText,
		});

		if (!result.success) {
			setMessages(prev => prev.filter(m => m.id !== tempId));
			sentMessageIdsRef.current.delete(tempId);
		}
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<SafeAreaView style={styles.container}>
				{/* Driver Profile Header (clickable to go back) */}
				<TouchableOpacity style={styles.driverHeader} onPress={() => router.back()} activeOpacity={0.7}>
					<Image
						source={driverProfile.profile_image_url ? { uri: driverProfile.profile_image_url } : DriverImg}
						style={styles.driverAvatar}
					/>
					<View style={styles.driverInfo}>
						<Text style={styles.driverName}>{driverProfile.nama || driverName}</Text>
						<Text style={styles.driverDetails}>{lokasiJemput} → {lokasiTujuan}</Text>
					</View>
				</TouchableOpacity>

				{/* Slider Buttons - Chat / Maps */}
				<View style={styles.sliderContainer}>
					<TouchableOpacity
						style={[styles.sliderButton, activeView === 0 && styles.sliderButtonActive]}
						onPress={() => setActiveView(0)}
					>
						<Text style={[styles.sliderButtonText, activeView === 0 && styles.sliderButtonTextActive]}>
							Chat
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.sliderButton, activeView === 1 && styles.sliderButtonActive]}
						onPress={() => setActiveView(1)}
					>
						<Text style={[styles.sliderButtonText, activeView === 1 && styles.sliderButtonTextActive]}>
							Maps
						</Text>
					</TouchableOpacity>
				</View>

				{/* Conditional Rendering: Chat View or Maps View */}
				{activeView === 0 ? (
					// CHAT VIEW
					<View style={styles.chatViewContainer}>
						{/* Chat Messages */}
						<ScrollView
							ref={scrollViewRef}
							style={styles.messagesContainer}
							showsVerticalScrollIndicator={false}
							onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
						>
							{isLoading ? (
								<Text style={styles.loadingText}>Memuat pesan...</Text>
							) : messages.length === 0 ? (
								<Text style={styles.emptyText}>Belum ada pesan. Mulai chat dengan driver!</Text>
							) : (
								messages.map((msg) => (
									<View key={msg.id} style={msg.sender === 'driver' ? styles.messageBubbleLeft : styles.messageBubbleRight}>
										{msg.imageUrl && (
											<Image
												source={{ uri: msg.imageUrl }}
												style={styles.chatImage}
												resizeMode="cover"
											/>
										)}
										{msg.text ? (
											<Text style={msg.sender === 'driver' ? styles.messageText : styles.messageTextWhite}>
												{msg.text}
											</Text>
										) : null}
										<Text style={msg.sender === 'driver' ? styles.timeLeft : styles.timeRight}>
											{msg.time}
										</Text>
									</View>
								))
							)}
						</ScrollView>

						{/* Input Bar */}
						<View style={styles.inputBar}>
							<View style={styles.inputWrapper}>
								<TextInput
									placeholder="Ketik pesan..."
									placeholderTextColor="#999"
									style={styles.textInput}
									value={inputText}
									onChangeText={setInputText}
									onSubmitEditing={handleSendMessage}
									returnKeyType="send"
									multiline
								/>
								<TouchableOpacity
									style={styles.cameraButton}
									onPress={handlePickImage}
									disabled={isUploadingImage}
								>
									{isUploadingImage ? (
										<ActivityIndicator size="small" color="#33cc66" />
									) : (
										<Text style={styles.cameraIconText}>📷</Text>
									)}
								</TouchableOpacity>
							</View>
							<TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
								<Image
									source={require('../../../../assets/images/KirimChat.png')}
									style={styles.sendIcon}
									resizeMode="contain"
								/>
							</TouchableOpacity>
						</View>
					</View>
				) : (
					// MAPS VIEW - Real Maps dengan Route
					<View style={styles.mapsViewContainer}>
						{mapLoading ? (
							<View style={styles.mapLoadingContainer}>
								<ActivityIndicator size="large" color="#27AE60" />
								<Text style={styles.mapLoadingText}>Memuat peta...</Text>
							</View>
						) : pickupCoords && destCoords ? (
							<MapWithRoute
								origin={pickupCoords}
								destination={destCoords}
								originLabel={lokasiJemput || 'Jemput'}
								destinationLabel={lokasiTujuan || 'Tujuan'}
								fixedPrice={orderPrice}
								onRouteCalculated={(distanceKm, durationMinutes, _price) => {
									setRouteDistance(distanceKm);
									setRouteDuration(durationMinutes);
									console.log('[ChatScootRide] Route calculated:', { distanceKm, durationMinutes, orderPrice });
								}}
							/>
						) : (
							<View style={styles.mapErrorContainer}>
								<Text style={styles.mapErrorText}>Tidak dapat memuat peta</Text>
								<Text style={styles.mapErrorSubtext}>
									{lokasiJemput && lokasiTujuan
										? 'Alamat tidak ditemukan'
										: 'Alamat pickup/tujuan tidak tersedia'}
								</Text>
							</View>
						)}

						{/* Route Info Overlay - Tampilkan jarak, durasi, dan harga dari order */}
						{routeDistance !== null && (
							<View style={styles.routeInfoOverlay}>
								<Text style={styles.routeInfoText}>
									{routeDistance.toFixed(1)} km • {routeDuration ?? Math.round(routeDistance * 4)} menit
									{orderPrice !== undefined && ` • Rp ${orderPrice.toLocaleString('id-ID')}`}
								</Text>
							</View>
						)}
					</View>
				)}
			</SafeAreaView>
		</>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },

	/* Driver Header */
	driverHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	driverAvatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
	driverInfo: { flexDirection: 'column', flex: 1 },
	driverName: { fontSize: 16, fontWeight: '600', color: '#000' },
	driverDetails: { fontSize: 12, color: '#666', marginTop: 2 },

	/* Slider */
	sliderContainer: {
		flexDirection: 'row',
		paddingHorizontal: 15,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
		gap: 10,
	},
	sliderButton: {
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 20,
		backgroundColor: '#f0f0f0',
		alignItems: 'center',
	},
	sliderButtonActive: {
		backgroundColor: '#27AE60',
	},
	sliderButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#666',
	},
	sliderButtonTextActive: {
		color: '#fff',
	},

	/* Chat View Container */
	chatViewContainer: {
		flex: 1,
	},

	/* Messages */
	messagesContainer: { flex: 1, padding: 16 },
	loadingText: { textAlign: 'center', color: '#999', marginTop: 20 },
	emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
	messageBubbleLeft: {
		alignSelf: 'flex-start',
		backgroundColor: '#eef0ef',
		borderRadius: 14,
		padding: 12,
		marginBottom: 12,
		maxWidth: '78%',
	},
	messageBubbleRight: {
		alignSelf: 'flex-end',
		backgroundColor: '#33cc66',
		borderRadius: 14,
		paddingVertical: 10,
		paddingHorizontal: 14,
		marginBottom: 12,
		maxWidth: '68%',
	},
	messageText: { color: '#000', lineHeight: 20 },
	messageTextWhite: { color: '#fff', lineHeight: 20 },
	timeLeft: { alignSelf: 'flex-end', color: '#666', fontSize: 11, marginTop: 6 },
	timeRight: { alignSelf: 'flex-end', color: '#fff', fontSize: 11, marginTop: 6 },

	/* Chat Image */
	chatImage: {
		width: 200,
		height: 150,
		borderRadius: 10,
		marginBottom: 6,
	},

	/* Input */
	inputBar: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderTopWidth: 1,
		borderTopColor: '#eee',
		backgroundColor: '#fff',
	},
	inputWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f0f0f0',
		borderRadius: 25,
		borderWidth: 1,
		borderColor: '#ddd',
		paddingLeft: 15,
		paddingRight: 5,
		marginRight: 8,
	},
	textInput: {
		flex: 1,
		fontSize: 14,
		paddingVertical: 10,
		color: '#000',
		maxHeight: 100,
		backgroundColor: 'transparent',
	},
	cameraButton: {
		width: 36,
		height: 36,
		justifyContent: 'center',
		alignItems: 'center',
	},
	cameraIconText: {
		fontSize: 22,
	},
	sendButton: {
		paddingHorizontal: 8,
		paddingVertical: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sendIcon: {
		width: 28,
		height: 28,
	},

	/* Maps View */
	mapsViewContainer: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	mapLoadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f5f5f5',
	},
	mapLoadingText: {
		marginTop: 10,
		fontSize: 14,
		color: '#666',
	},
	mapErrorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		backgroundColor: '#f5f5f5',
	},
	mapErrorText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#e74c3c',
		marginBottom: 5,
	},
	mapErrorSubtext: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
	},
	routeInfoOverlay: {
		position: 'absolute',
		bottom: 20,
		left: 20,
		right: 20,
		backgroundColor: 'rgba(39, 174, 96, 0.95)',
		paddingVertical: 12,
		paddingHorizontal: 15,
		borderRadius: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
		elevation: 5,
	},
	routeInfoText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#fff',
		textAlign: 'center',
	},
});

export default ChatScootRide;

