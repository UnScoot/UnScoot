import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';
import { sendMessage, getMessages, subscribeToMessages, unsubscribeFromMessages, getUserProfile, subscribeToOrderStatus, updateOrderStatus, getOrderById } from "../../../../src/database/chatScootSend";
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

const HalamanChat_Send_Driver = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const channelRef = React.useRef<any>(null);
  const orderStatusChannelRef = React.useRef<any>(null);
  const sentMessageIdsRef = React.useRef<Set<string>>(new Set());

  // Slider state - 0 = Chat, 1 = Maps
  const [activeView, setActiveView] = React.useState(0);

  // Get params
  const orderId = params.orderId as string;
  const userIdParam = params.userId as string;
  const customerId = params.customerId as string;
  const customerName = params.customerName as string || 'Customer';
  const customerPhoto = params.customerPhoto as string;
  const pickup = (params.pickup as string) || (params.lokasiJemput as string) || '';
  const destination = (params.destination as string) || (params.lokasiTujuan as string) || '';
  const [pickupAddr, setPickupAddr] = React.useState<string>(pickup);
  const [destAddr, setDestAddr] = React.useState<string>(destination);
  const priceParam = params.price as string;
  const orderPrice = priceParam ? parseInt(priceParam, 10) : undefined;

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
  const [customerProfile, setCustomerProfile] = React.useState<UserProfile>({ nama: customerName, profile_image_url: customerPhoto || null });
  const [orderStatus, setOrderStatus] = React.useState<string>('accepted');
  const [canClickSelesai, setCanClickSelesai] = React.useState(true);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);

  // Resolve userId dari params, AsyncStorage, atau Supabase Auth
  React.useEffect(() => {
    const resolveUserId = async () => {
      let finalUserId = userIdParam;

      if (finalUserId) {
        setUserId(finalUserId);
        return;
      }

      try {
        const userSession = await AsyncStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          finalUserId = session.params?.userId;
          if (finalUserId) {
            setUserId(finalUserId);
            return;
          }
        }
      } catch (e) {
        console.warn('[HalamanChat_Send_Driver] Error reading AsyncStorage:', e);
      }

      try {
        const { data } = await supabase.auth.getUser();
        finalUserId = data?.user?.id || '';
        if (finalUserId) {
          setUserId(finalUserId);
          return;
        }
      } catch (e) {
        console.warn('[HalamanChat_Send_Driver] Error getting user from Supabase:', e);
      }

      console.error('[HalamanChat_Send_Driver] ❌ Could not resolve userId!');
    };

    resolveUserId();
  }, [userIdParam]);

  // Geocode pickup and destination addresses for real maps
  React.useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadCoordinates = async () => {
      let pickupAddr = pickup;
      let destAddr = destination;

      console.log('[HalamanChat_Send_Driver] loadCoordinates called with:', { pickup, destination, orderId });

      // DB fallback if params are empty
      if ((!pickupAddr || !destAddr) && orderId) {
        console.log('[HalamanChat_Send_Driver] Missing addresses, fetching from database...');
        try {
          const { data, error } = await supabase
            .from('scoot_send')
            .select('lokasi_jemput_barang, lokasi_tujuan')
            .eq('id', orderId)
            .single();

          if (!error && data) {
            pickupAddr = pickupAddr || data.lokasi_jemput_barang || '';
            destAddr = destAddr || data.lokasi_tujuan || '';
            console.log('[HalamanChat_Send_Driver] Got addresses from DB:', { pickupAddr, destAddr });
            setPickupAddr(pickupAddr);
            setDestAddr(destAddr);
          }
        } catch (err) {
          console.error('[HalamanChat_Send_Driver] Error fetching order data:', err);
        }
      }

      if (!pickupAddr || !destAddr) {
        console.log('[HalamanChat_Send_Driver] ❌ No addresses available');
        if (isMounted) setMapLoading(false);
        return;
      }

      if (isMounted) setMapLoading(true);
      console.log('[HalamanChat_Send_Driver] ✅ Geocoding addresses:', { pickupAddr, destAddr });

      // Set timeout to prevent infinite loading (10 seconds max)
      timeoutId = setTimeout(() => {
        console.log('[HalamanChat_Send_Driver] ⚠️ Geocoding timeout reached');
        if (isMounted) setMapLoading(false);
      }, 10000);

      const tryParseCoords = (val: any) => {
        if (!val || typeof val !== 'string') return null;
        const coordMatch = val.trim().match(/^([-+]?\d+(?:\.\d+)?),\s*([-+]?\d+(?:\.\d+)?)$/);
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lon = parseFloat(coordMatch[2]);
          if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
        }
        try {
          const parsed = JSON.parse(val);
          if (parsed && typeof parsed === 'object') {
            const lat = parsed.latitude ?? parsed.lat ?? parsed.latitiude;
            const lon = parsed.longitude ?? parsed.lng ?? parsed.lon;
            if (typeof lat === 'number' && typeof lon === 'number') return { latitude: lat, longitude: lon };
          }
        } catch (e) { }
        return null;
      };

      try {
        const parsedPickup = tryParseCoords(pickupAddr);
        const parsedDest = tryParseCoords(destAddr);

        const toGeocode: Promise<any>[] = [];
        toGeocode.push(parsedPickup ? Promise.resolve(parsedPickup) : geocodeAddress(pickupAddr));
        toGeocode.push(parsedDest ? Promise.resolve(parsedDest) : geocodeAddress(destAddr));

        const [pickupResult, destResult] = await Promise.all(toGeocode);

        if (timeoutId) clearTimeout(timeoutId);
        if (!isMounted) return;

        console.log('[HalamanChat_Send_Driver] Geocode results:', { pickupResult, destResult });

        if (pickupResult) setPickupCoords(pickupResult);
        if (destResult) setDestCoords(destResult);

        // Synthetic fallback if only pickup found
        if (pickupResult && !destResult) {
          const synthetic = { latitude: pickupResult.latitude + 0.002, longitude: pickupResult.longitude + 0.002 };
          console.log('[HalamanChat_Send_Driver] Using synthetic destination fallback', synthetic);
          setDestCoords(synthetic);
        }
      } catch (error) {
        console.error('[HalamanChat_Send_Driver] Error geocoding addresses:', error);
        if (timeoutId) clearTimeout(timeoutId);
      } finally {
        if (isMounted) setMapLoading(false);
      }
    };

    loadCoordinates();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pickup, destination, orderId]);

  const loadCustomerProfile = React.useCallback(async () => {
    if (!customerId) return;
    try {
      const result = await getUserProfile(customerId, 'customer');
      if (result.success && result.data) {
        setCustomerProfile({ nama: result.data.nama, profile_image_url: result.data.profile_image_url });
      }
    } catch (error) {
      console.log('[HalamanChat_Send_Driver] Error loading customer profile:', error);
    }
  }, [customerId]);

  const loadMessages = React.useCallback(async () => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await getMessages(orderId, 'driver');

    if (result.success && result.data) {
      sentMessageIdsRef.current.clear();
      const formattedMessages: ChatMessage[] = result.data.map((msg: any) => ({
        id: msg.id,
        sender: 'customer' as const,
        text: msg.text || '',
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: msg.imageUrl || null,
      }));
      setMessages(formattedMessages);
    }

    setIsLoading(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
  }, [orderId]);

  // Load customer profile dan messages saat pertama kali
  React.useEffect(() => {
    loadCustomerProfile();
    if (orderId) {
      loadMessages();
    } else {
      setIsLoading(false);
    }
  }, [orderId, customerId, loadCustomerProfile, loadMessages]);

  // Create initial welcome message for driver (persistent)
  React.useEffect(() => {
    const hasWelcome = messages.some(m => m.id === 'initial-welcome');

    if (!hasWelcome && (pickupAddr || destAddr)) {
      // Get detail barang from params
      const detailBarang = (params as any)?.detailBarang as string || (params as any)?.detail_barang as string || (params as any)?.itemDescription as string || '';
      const namaPenerima = (params as any)?.namaPenerima as string || (params as any)?.nama_penerima as string || '';

      let initialMessage = `📦 Pesanan ScootSend Baru!\n\n`;
      if (detailBarang) {
        initialMessage += `📋 Detail Barang: ${detailBarang}\n`;
      }
      if (pickupAddr) {
        initialMessage += `📍 Jemput: ${pickupAddr}\n`;
      }
      if (destAddr) {
        initialMessage += `🎯 Tujuan: ${destAddr}\n`;
      }
      if (namaPenerima) {
        initialMessage += `👤 Penerima: ${namaPenerima}\n`;
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
  }, [pickupAddr, destAddr, orderPrice, params, messages]);

  // Setup real-time subscription for messages + polling fallback
  React.useEffect(() => {
    if (!orderId) return;

    channelRef.current = subscribeToMessages(orderId, (payload: any) => {
      const newRow = payload.new;
      const newMessage = {
        id: newRow.id,
        sender: 'customer' as const,
        text: newRow.text || newRow.chat || '',
        time: new Date(newRow.timestamp || newRow.tanggal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: newRow.imageUrl || newRow.image_url || null,
      };

      setMessages(prev => {
        if (prev.some(m => m.id === newRow.id)) return prev;

        const tempIndex = prev.findIndex(m => m.text === newRow.text && m.sender === 'driver' && m.id.startsWith('temp-'));
        if (tempIndex !== -1) {
          const updated = [...prev];
          updated[tempIndex] = { ...newMessage, sender: 'driver' as const };
          sentMessageIdsRef.current.delete(prev[tempIndex].id);
          sentMessageIdsRef.current.add(newRow.id);
          return updated;
        }

        return [...prev, newMessage];
      });

      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });

    // Polling fallback
    const pollMessages = async () => {
      const result = await getMessages(orderId, userId);
      if (result.success && result.data) {
        setMessages(prev => {
          const newMessages: ChatMessage[] = [];
          result.data.forEach((msg: any) => {
            if (prev.some(m => m.id === msg.id)) return;
            if (sentMessageIdsRef.current.has(msg.id)) return;

            newMessages.push({
              id: msg.id,
              sender: 'customer' as const,
              text: msg.text,
              time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              imageUrl: msg.imageUrl || null
            });
          });

          if (newMessages.length > 0) return [...prev, ...newMessages];
          return prev;
        });
      }
    };

    const chatPollingInterval = setInterval(pollMessages, 2000);

    return () => {
      clearInterval(chatPollingInterval);
      if (channelRef.current) unsubscribeFromMessages(channelRef.current);
    };
  }, [orderId, userId]);

  // Subscribe to order status changes + polling fallback
  React.useEffect(() => {
    if (!orderId) return;

    let isNavigating = false;
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    const handleStatusChange = (newStatus: string) => {
      if (isNavigating) return;
      setOrderStatus(newStatus);

      if (newStatus === 'waiting_confirmation') {
        isNavigating = true;
        if (pollingInterval) clearInterval(pollingInterval);
        if (orderStatusChannelRef.current && orderStatusChannelRef.current.unsubscribe) {
          orderStatusChannelRef.current.unsubscribe();
        }

        router.push({ pathname: '/screens/driver/ScootSendDriver/SendQrPayment', params: { orderId } } as any);
      }
    };

    const subscription = subscribeToOrderStatus(orderId, (payload: any) => {
      handleStatusChange(payload.new.status);
    });

    orderStatusChannelRef.current = subscription;

    const checkOrderStatus = async () => {
      if (isNavigating) return;
      try {
        const { data, error } = await supabase.from('scoot_send').select('status').eq('id', orderId).single();
        if (!error && data) handleStatusChange(data.status);
      } catch (err) {
        console.error('[HalamanChat_Send_Driver] Polling error:', err);
      }
    };

    pollingInterval = setInterval(checkOrderStatus, 3000);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      if (orderStatusChannelRef.current && orderStatusChannelRef.current.unsubscribe) {
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
      const uploadResult = await uploadChatImage(orderId, imageUri, 'send');
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
    if (inputText.trim() === '' || !userId) return;

    const messageText = inputText.trim();
    setInputText('');

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    sentMessageIdsRef.current.add(tempId);
    const tempMessage: ChatMessage = { id: tempId, sender: 'driver', text: messageText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, tempMessage]);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    if (orderId) {
      const result = await sendMessage({ orderId, message: messageText });
      if (result.success && result.data && Array.isArray(result.data) && result.data[0]) {
        const inserted = result.data[0];
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: inserted.id } : m));
        sentMessageIdsRef.current.delete(tempId);
        sentMessageIdsRef.current.add(inserted.id);
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        sentMessageIdsRef.current.delete(tempId);
      }
    }
  };

  const handleSelesai = async () => {
    if (!canClickSelesai) return;
    setCanClickSelesai(false);

    if (orderId) {
      const result = await updateOrderStatus(orderId, 'waiting_confirmation');
      if (result.success) {
        Alert.alert('Berhasil', 'Menunggu konfirmasi dari customer...');
      } else {
        Alert.alert('Error', 'Gagal mengupdate status. Coba lagi.');
        setCanClickSelesai(true);
      }
    } else {
      router.push('/screens/driver/ScootSendDriver/SendQrPayment' as any);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/screens/driver/HomeDriver' as any)} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <Image style={styles.customerIcon} source={customerProfile.profile_image_url ? { uri: customerProfile.profile_image_url } : require('../../../../assets/images/Passenger.png')} resizeMode="cover" />
          <Text style={styles.customerName}>{customerProfile.nama || customerName}</Text>
          <TouchableOpacity style={[styles.statusBadge, !canClickSelesai && styles.statusBadgeDisabled]} onPress={handleSelesai} disabled={!canClickSelesai}>
            <Text style={styles.statusText}>Selesai</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sliderContainer}>
          <TouchableOpacity style={[styles.sliderButton, activeView === 0 && styles.sliderButtonActive]} onPress={() => setActiveView(0)}>
            <Text style={[styles.sliderButtonText, activeView === 0 && styles.sliderButtonTextActive]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sliderButton, activeView === 1 && styles.sliderButtonActive]} onPress={() => setActiveView(1)}>
            <Text style={[styles.sliderButtonText, activeView === 1 && styles.sliderButtonTextActive]}>Maps</Text>
          </TouchableOpacity>
        </View>

        {activeView === 0 ? (
          <View style={styles.chatViewContainer}>
            <ScrollView ref={scrollViewRef} style={styles.chatContainer} showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
              {isLoading ? (
                <View style={styles.loadingContainer}><ActivityIndicator size="small" color="#33cc66" /><Text style={styles.loadingText}>Memuat pesan...</Text></View>
              ) : messages.length === 0 ? (
                <Text style={styles.emptyText}>Belum ada pesan.</Text>
              ) : (
                messages.map((msg) => (
                  <View key={msg.id} style={msg.sender === 'customer' ? styles.messageBoxUser : styles.messageBoxDriver}>
                    {msg.imageUrl && (
                      <Image source={{ uri: msg.imageUrl }} style={styles.chatImage} resizeMode="cover" />
                    )}
                    {msg.text ? (
                      <Text style={msg.sender === 'customer' ? styles.messageTextUser : styles.messageTextDriver}>{msg.text}</Text>
                    ) : null}
                    <Text style={msg.sender === 'customer' ? styles.timeStampUser : styles.timeStampDriver}>{msg.time}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.inputBar}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ketikkan pesan..."
                  placeholderTextColor="#999"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                />
                <TouchableOpacity style={styles.cameraButton} onPress={handlePickImage} disabled={isUploadingImage}>
                  {isUploadingImage ? <ActivityIndicator size="small" color="#33cc66" /> : <Text style={styles.cameraIconText}>📷</Text>}
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
          <View style={styles.mapsViewContainer}>
            {mapLoading ? (
              <View style={styles.mapLoadingContainer}><ActivityIndicator size="large" color="#33cc66" /><Text style={styles.mapLoadingText}>Memuat peta...</Text></View>
            ) : pickupCoords && destCoords ? (
              <MapWithRoute origin={pickupCoords} destination={destCoords} originLabel="Lokasi Jemput" destinationLabel="Lokasi Tujuan" hidePrice={true} onRouteCalculated={(dist, dur, price) => { setRouteDistance(dist); setRouteDuration(dur); }} />
            ) : (
              <View style={styles.mapErrorContainer}><Text style={styles.mapErrorText}>Tidak dapat memuat peta.{"\n"}Alamat belum tersedia atau tidak valid.</Text></View>
            )}
          </View>
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    flex: 1
  },
  header: {
    backgroundColor: "#fff",
    width: "100%",
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backArrow: {
    fontSize: 28,
    color: '#016837',
    fontWeight: 'bold',
  },
  customerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  customerName: {
    fontSize: 16,
    color: "#000",
    fontWeight: "700",
    marginLeft: 15,
    flex: 1
  },
  statusBadge: {
    backgroundColor: "#fe95a3",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusBadgeDisabled: {
    backgroundColor: "#ccc",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  sliderContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    padding: 4,
  },
  sliderButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonActive: {
    backgroundColor: '#33cc66',
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
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 19,
    paddingTop: 10,
    paddingBottom: 10
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    color: '#666',
    marginTop: 10,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 30,
  },
  messageBoxUser: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    padding: 15,
    marginBottom: 12,
    maxWidth: "85%",
    alignSelf: "flex-start",
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  messageBoxDriver: {
    backgroundColor: "#33cc66",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 12,
    maxWidth: "75%",
    alignSelf: "flex-end",
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  messageTextUser: {
    fontSize: 13,
    color: "#000",
    lineHeight: 20,
  },
  messageTextDriver: {
    fontSize: 13,
    color: "#fff",
    lineHeight: 20,
  },
  timeStampUser: {
    fontSize: 11,
    color: '#666',
    alignSelf: 'flex-end',
    marginTop: 6
  },
  timeStampDriver: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    alignSelf: 'flex-end',
    marginTop: 6
  },
  chatImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 6,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff"
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
    color: "#000",
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
    backgroundColor: '#f0f0f0',
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  mapErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f8f8',
  },
  mapErrorText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    lineHeight: 22,
  },
});

export default HalamanChat_Send_Driver;