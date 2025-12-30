import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, PanResponder, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';
import { sendMessage, getMessages, subscribeToMessages, unsubscribeFromMessages, getUserProfile, subscribeToOrderStatus, updateOrderStatus } from "../../../../src/database/chatScootRide";
import { uploadChatImage } from '../../../../src/database/uploadChatImage';
import { supabase } from "../../../../src/database/supabase";
import MapWithRoute from "../../../../components/MapWithRoute";
import { geocodeAddress } from "../../../../src/utils/routingService";

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

const RideDriverChat = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const channelRef = React.useRef<any>(null);
  const orderStatusChannelRef = React.useRef<any>(null);
  const sentMessageIdsRef = React.useRef<Set<string>>(new Set());

  // Slider state - 0 = Chat, 1 = Maps
  const [activeView, setActiveView] = React.useState(0);

  // Swipe gesture handler
  const panResponderRef = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState;
        // Swipe kanan (dx > 0) -> Chat, Swipe kiri (dx < 0) -> Maps
        if (dx > 50 && activeView === 1) {
          setActiveView(0); // Dari Maps ke Chat
        } else if (dx < -50 && activeView === 0) {
          setActiveView(1); // Dari Chat ke Maps
        }
      },
    })
  ).current;

  // Get params
  const orderId = params.orderId as string;
  const userIdParam = params.userId as string;
  const customerId = params.customerId as string;
  const customerName = params.customerName as string || 'Customer';
  const pickup = params.pickup as string || '';
  const destination = params.destination as string || '';

  // State for resolved userId
  const [userId, setUserId] = React.useState<string>('');

  // Map coordinates state
  const [pickupCoords, setPickupCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [destCoords, setDestCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [mapLoading, setMapLoading] = React.useState(false);
  const [routeDistance, setRouteDistance] = React.useState<number | null>(null);
  const [routeDuration, setRouteDuration] = React.useState<number | null>(null);

  // Chat state
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [customerProfile, setCustomerProfile] = React.useState<UserProfile>({ nama: customerName, profile_image_url: null });
  const [orderStatus, setOrderStatus] = React.useState<string>('accepted');
  const [canClickSelesai, setCanClickSelesai] = React.useState(true);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);

  // Resolve userId dari params, AsyncStorage, atau Supabase Auth
  React.useEffect(() => {
    const resolveUserId = async () => {
      let finalUserId = userIdParam;

      if (finalUserId) {
        console.log('[HalamanChat_WithMaps] Using userId from params:', finalUserId);
        setUserId(finalUserId);
        return;
      }

      try {
        const userSession = await AsyncStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          finalUserId = session.params?.userId;
          if (finalUserId) {
            console.log('[HalamanChat_WithMaps] Using userId from AsyncStorage:', finalUserId);
            setUserId(finalUserId);
            return;
          }
        }
      } catch (e) {
        console.warn('[HalamanChat_WithMaps] Error reading AsyncStorage:', e);
      }

      try {
        const { data } = await supabase.auth.getUser();
        finalUserId = data?.user?.id || '';
        if (finalUserId) {
          console.log('[HalamanChat_WithMaps] Using userId from Supabase Auth:', finalUserId);
          setUserId(finalUserId);
          return;
        }
      } catch (e) {
        console.warn('[HalamanChat_WithMaps] Error getting user from Supabase:', e);
      }

      console.error('[HalamanChat_WithMaps] ❌ Could not resolve userId!');
    };

    resolveUserId();
  }, [userIdParam]);

  // Geocode pickup and destination addresses for real maps
  React.useEffect(() => {
    const loadCoordinates = async () => {
      if (!pickup || !destination) {
        console.log('[HalamanChat_WithMaps] No pickup or destination provided');
        setMapLoading(false);
        return;
      }

      setMapLoading(true);
      console.log('[HalamanChat_WithMaps] Geocoding addresses:', { pickup, destination });

      try {
        // Geocode both addresses in parallel
        const [pickupResult, destResult] = await Promise.all([
          geocodeAddress(pickup),
          geocodeAddress(destination)
        ]);

        console.log('[HalamanChat_WithMaps] Geocoding results:', { pickupResult, destResult });

        if (pickupResult) {
          setPickupCoords(pickupResult);
        }
        if (destResult) {
          setDestCoords(destResult);
        }
      } catch (error) {
        console.error('[HalamanChat_WithMaps] Error geocoding addresses:', error);
      } finally {
        setMapLoading(false);
      }
    };

    loadCoordinates();
  }, [pickup, destination]);

  const loadCustomerProfile = React.useCallback(async () => {
    try {
      const result = await getUserProfile(customerId, 'customer');
      if (result.success && result.data) {
        setCustomerProfile({
          nama: result.data.nama,
          profile_image_url: result.data.profile_image_url
        });
      }
    } catch (error) {
      console.log('[HalamanChat_WithMaps] Error loading customer profile:', error);
    }
  }, [customerId]);

  const loadMessages = React.useCallback(async () => {
    if (!orderId) return;

    console.log('[HalamanChat_WithMaps] Loading messages for order:', orderId);
    setIsLoading(true);

    const result = await getMessages(orderId, 'driver');

    if (result.success && result.data) {
      sentMessageIdsRef.current.clear();
      const formattedMessages: ChatMessage[] = result.data.map((msg: any) => ({
        id: msg.id,
        sender: 'customer',
        text: msg.text || '',
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: msg.imageUrl || null,
      }));
      setMessages(formattedMessages);
    }

    setIsLoading(false);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [orderId]);

  // Load customer profile dan messages saat pertama kali
  React.useEffect(() => {
    loadCustomerProfile();
    loadMessages();
  }, [orderId, customerId, loadCustomerProfile, loadMessages]);

  // Create initial welcome message for driver (persistent)
  React.useEffect(() => {
    const hasWelcome = messages.some(m => m.id === 'initial-welcome');

    if (!hasWelcome && (pickup || destination)) {
      const biayaParam = params.biaya as string || params.price as string;
      const orderPrice = biayaParam ? parseInt(biayaParam, 10) : undefined;

      let initialMessage = `🚗 Pesanan ScootRide Baru!\n\n`;
      if (pickup) {
        initialMessage += `📍 Jemput: ${pickup}\n`;
      }
      if (destination) {
        initialMessage += `🎯 Tujuan: ${destination}\n`;
      }
      if (orderPrice) {
        initialMessage += `💰 Biaya: Rp ${orderPrice.toLocaleString('id-ID')}\n`;
      }
      initialMessage += `\nSelesaikan pesanan ini segera! 💪`;

      setMessages(prev => [
        {
          id: 'initial-welcome',
          sender: 'customer' as const,
          text: initialMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.filter(m => m.id !== 'initial-1')
      ]);
    }
  }, [pickup, destination, params, messages]);

  // Setup real-time subscription
  React.useEffect(() => {
    if (!orderId) return;

    console.log('[HalamanChat_WithMaps] Setting up real-time subscription for order:', orderId);

    channelRef.current = subscribeToMessages(orderId, (payload: any) => {
      console.log('[HalamanChat_WithMaps] New message received:', payload);

      const newRow = payload.new;
      const newMessage = {
        id: newRow.id,
        sender: 'customer' as const,
        text: newRow.text || newRow.chat || '',
        time: new Date(newRow.timestamp || newRow.tanggal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: newRow.imageUrl || newRow.image_url || null,
      };

      setMessages(prev => {
        if (prev.some(m => m.id === newRow.id)) {
          console.log('[HalamanChat_WithMaps] Message ID already exists:', newRow.id);
          return prev;
        }

        const tempMessageIndex = prev.findIndex(m => m.text === newRow.text && m.sender === 'driver' && m.id.startsWith('temp-'));
        if (tempMessageIndex !== -1) {
          console.log('[HalamanChat_WithMaps] Replacing temp message with real ID:', prev[tempMessageIndex].id, '→', newRow.id);
          const updated = [...prev];
          updated[tempMessageIndex] = { ...newMessage, sender: 'driver' as const };
          sentMessageIdsRef.current.delete(prev[tempMessageIndex].id);
          sentMessageIdsRef.current.add(newRow.id);
          return updated;
        }

        return [...prev, newMessage];
      });

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      if (channelRef.current) {
        console.log('[HalamanChat_WithMaps] Cleaning up subscription');
        unsubscribeFromMessages(channelRef.current);
      }
    };
  }, [orderId]);

  // Subscribe to order status changes + polling fallback
  React.useEffect(() => {
    if (!orderId) return;

    let isNavigating = false;
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    const handleStatusChange = (newStatus: string) => {
      if (isNavigating) return;

      setOrderStatus(newStatus);

      // Jika customer sudah konfirmasi (waiting_payment), pindah ke QR screen
      if (newStatus === 'waiting_payment') {
        isNavigating = true;
        console.log('[HalamanChat_WithMaps] Customer confirmed! Navigating to QR screen...');

        // Clear polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }

        if (orderStatusChannelRef.current) {
          orderStatusChannelRef.current.unsubscribe();
        }

        router.push({
          pathname: '/screens/driver/ScootRideDriver/RideQrPayment',
          params: { orderId }
        } as any);
      }
    };

    console.log('[HalamanChat_WithMaps] Setting up order status subscription for order:', orderId);

    // Realtime subscription
    const subscription = subscribeToOrderStatus(orderId, (payload: any) => {
      console.log('[HalamanChat_WithMaps] Order status changed via realtime:', payload.new.status);
      handleStatusChange(payload.new.status);
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
          console.log('[HalamanChat_WithMaps] Polling check - current status:', data.status);
          handleStatusChange(data.status);
        }
      } catch (err) {
        console.error('[HalamanChat_WithMaps] Polling error:', err);
      }
    };

    // Start polling as fallback
    pollingInterval = setInterval(checkOrderStatus, 3000);

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (orderStatusChannelRef.current) {
        console.log('[HalamanChat_WithMaps] Cleaning up order status subscription');
        orderStatusChannelRef.current.unsubscribe();
      }
    };
  }, [orderId, router]);

  // Show options: Camera or Gallery
  const handlePickImage = () => {
    if (!orderId || !userId) {
      Alert.alert('Error', 'Order ID atau User ID tidak tersedia');
      return;
    }
    Alert.alert('Pilih Sumber Gambar', 'Ambil foto atau pilih dari galeri?', [
      { text: 'Kamera', onPress: () => launchCamera() },
      { text: 'Galeri', onPress: () => launchGallery() },
      { text: 'Batal', style: 'cancel' },
    ]);
  };

  const launchCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Izin Diperlukan', 'Anda perlu mengizinkan akses ke kamera');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      await uploadAndSendImage(result.assets[0].uri);
    } catch (error: any) {
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
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      await uploadAndSendImage(result.assets[0].uri);
    } catch (error: any) {
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
        sender: 'driver',
        text: '',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: uploadResult.imageUrl,
      };
      setMessages(prev => [...prev, tempMessage]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

      const sendResult = await sendMessage({ orderId, message: '', imageUrl: uploadResult.imageUrl });
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
      Alert.alert('Error', 'Gagal mengunggah gambar');
      setIsUploadingImage(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !orderId || !userId) return;

    const messageText = inputText.trim();
    setInputText('');

    console.log('[HalamanChat_WithMaps] Sending message:', messageText);

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    sentMessageIdsRef.current.add(tempId);
    const tempMessage: ChatMessage = {
      id: tempId,
      sender: 'driver',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, tempMessage]);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    const result = await sendMessage({
      orderId,
      senderId: userId,
      senderType: 'driver',
      message: messageText,
    });

    if (!result.success) {
      console.error('[HalamanChat_WithMaps] Failed to send message:', result.error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      sentMessageIdsRef.current.delete(tempId);
    }
  };

  const handleSelesaiClick = async () => {
    if (orderStatus !== 'accepted' && orderStatus !== 'ongoing') {
      Alert.alert('Tunggu', 'Pesanan belum berstatus accepted untuk diselesaikan');
      return;
    }

    try {
      console.log('[HalamanChat_WithMaps] Driver clicking Selesai button, updating status to waiting_confirmation');
      setCanClickSelesai(false);

      // Update status ke waiting_confirmation - tunggu customer konfirmasi
      const result = await updateOrderStatus(orderId, 'waiting_confirmation');

      if (!result.success) {
        Alert.alert('Error', 'Gagal mengupdate status pesanan');
        setCanClickSelesai(true);
        return;
      }

      console.log('[HalamanChat_WithMaps] Status updated to waiting_confirmation, waiting for customer to confirm...');
      Alert.alert(
        'Menunggu Konfirmasi',
        'Menunggu customer mengkonfirmasi bahwa sudah sampai...',
        [{ text: 'OK' }]
      );
      // Driver akan otomatis pindah ke QR screen saat customer konfirmasi
      // (handled by subscribeToOrderStatus yang sudah ada)
    } catch (error) {
      console.error('[HalamanChat_WithMaps] Error:', error);
      Alert.alert('Error', 'Terjadi kesalahan');
      setCanClickSelesai(true);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.halamanChat}>
        <View style={styles.view}>

          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <Image
              style={styles.customerIcon}
              source={customerProfile.profile_image_url ? { uri: customerProfile.profile_image_url } : require('../../../../assets/images/Passenger.png')}
              resizeMode="cover"
            />
            <Text style={styles.customerName}>{customerProfile.nama || customerName}</Text>
            <TouchableOpacity
              style={[
                styles.statusBadge,
                (!canClickSelesai || (orderStatus !== 'accepted' && orderStatus !== 'ongoing')) && styles.statusBadgeDisabled
              ]}
              activeOpacity={0.8}
              onPress={handleSelesaiClick}
              disabled={!canClickSelesai || (orderStatus !== 'accepted' && orderStatus !== 'ongoing')}
            >
              <Text style={styles.statusText}>
                {canClickSelesai && (orderStatus === 'accepted' || orderStatus === 'ongoing') ? 'Selesai' : 'Menunggu...'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Slider Buttons */}
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
            <View style={styles.chatViewContainer} {...panResponderRef.panHandlers}>
              {/* Chat Messages Container */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatContainer}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {isLoading ? (
                  <Text style={styles.loadingText}>Memuat pesan...</Text>
                ) : messages.length === 0 ? (
                  <Text style={styles.emptyText}>Belum ada pesan. Mulai chat dengan customer!</Text>
                ) : (
                  messages.map((msg) => (
                    <View key={msg.id} style={msg.sender === 'customer' ? styles.messageBoxUser : styles.messageBoxDriver}>
                      {msg.imageUrl && (
                        <Image source={{ uri: msg.imageUrl }} style={styles.chatImage} resizeMode="cover" />
                      )}
                      {msg.text ? (
                        <Text style={msg.sender === 'customer' ? styles.messageTextUser : styles.messageTextDriver}>
                          {msg.text}
                        </Text>
                      ) : null}
                      <Text style={styles.timeStamp}>{msg.time}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Message Input Section */}
              <View style={styles.inputBar}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ketik pesan..."
                    placeholderTextColor="#999"
                    value={inputText}
                    onChangeText={setInputText}
                    editable={!isLoading}
                    maxLength={500}
                    multiline
                  />
                  <TouchableOpacity style={styles.cameraButton} onPress={handlePickImage} disabled={isUploadingImage}>
                    {isUploadingImage ? <ActivityIndicator size="small" color="#33cc66" /> : <Text style={styles.cameraIconText}>📷</Text>}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendMessage}
                  activeOpacity={0.8}
                >
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
                  originLabel={pickup || 'Jemput'}
                  destinationLabel={destination || 'Tujuan'}
                  hidePrice={true}
                  onRouteCalculated={(distanceKm, durationMinutes, _price) => {
                    setRouteDistance(distanceKm);
                    setRouteDuration(durationMinutes);
                    console.log('[HalamanChat_WithMaps] Route calculated:', { distanceKm, durationMinutes });
                  }}
                />
              ) : (
                <View style={styles.mapErrorContainer}>
                  <Text style={styles.mapErrorText}>Tidak dapat memuat peta</Text>
                  <Text style={styles.mapErrorSubtext}>
                    {pickup && destination
                      ? 'Alamat tidak ditemukan'
                      : 'Alamat pickup/tujuan tidak tersedia'}
                  </Text>
                  <View style={styles.locationInfoContainer}>
                    <Text style={styles.locationLabel}>Pickup:</Text>
                    <Text style={styles.locationValue}>{pickup || '-'}</Text>
                    <Text style={styles.locationLabel}>Tujuan:</Text>
                    <Text style={styles.locationValue}>{destination || '-'}</Text>
                  </View>
                </View>
              )}

              {/* Route Info Overlay - Driver hanya lihat jarak dan durasi, tidak harga */}
              {routeDistance !== null && (
                <View style={styles.routeInfoOverlay}>
                  <Text style={styles.routeInfoText}>
                    Jarak: {routeDistance.toFixed(1)} km • Estimasi: {routeDuration ?? Math.round(routeDistance * 4)} menit
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  halamanChat: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  view: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 10,
  },
  backButton: {
    padding: 8,
  },
  backArrow: {
    fontSize: 24,
    color: '#000',
  },
  customerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  customerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeDisabled: {
    backgroundColor: '#ccc',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  sliderButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  sliderButtonActive: {
    backgroundColor: '#4CAF50',
  },
  sliderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sliderButtonTextActive: {
    color: '#fff',
  },
  chatViewContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
    fontSize: 14,
  },
  messageBoxUser: {
    alignSelf: 'flex-start',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 5,
    maxWidth: '80%',
  },
  messageBoxDriver: {
    alignSelf: 'flex-end',
    backgroundColor: '#c8e6c9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 5,
    maxWidth: '80%',
  },
  messageTextUser: {
    color: '#333',
    fontSize: 14,
  },
  messageTextDriver: {
    color: '#333',
    fontSize: 14,
  },
  timeStamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
  },
  chatImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 6,
  },
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
  input: {
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
  sendIcon: { width: 28, height: 28 },
  mapsViewContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapImage: {
    width: '100%',
    height: '100%',
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
    marginBottom: 15,
  },
  locationInfoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  locationValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
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

export default RideDriverChat;
