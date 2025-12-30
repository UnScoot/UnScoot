import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { sendMessage, getMessages, subscribeToMessages, unsubscribeFromMessages, getUserProfile, subscribeToOrderStatus } from '../../../../src/database/chatScootSend';
import { uploadChatImage } from '../../../../src/database/uploadChatImage';
import { supabase } from '../../../../src/database/supabase';
import MapWithRoute from '../../../../components/MapWithRoute';
import { geocodeAddress } from '../../../../src/utils/routingService';

const DriverImg = require('../../../../assets/images/driver.png');

const ChatScootSend = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const channelRef = useRef<any>(null);
  const orderStatusChannelRef = useRef<any>(null);
  const sentMessageIdsRef = useRef<Set<string>>(new Set());

  // Slider state - 0 = Chat, 1 = Maps
  const [activeView, setActiveView] = useState(0);

  const orderId = params.orderId as string;
  const userIdParam = params.userId as string;
  const driverId = params.driverId as string;
  const driverName = (params.driverName as string) || 'Driver';
  const lokasiResto = (params.lokasiResto as string) || (params.restaurant as string) || (params.lokasiJemput as string) || (params.lokasi_jemput as string) || '';
  const lokasiAntar = (params.lokasiAntar as string) || (params.destination as string) || (params.lokasiTujuan as string) || (params.lokasi_tujuan as string) || '';
  const biayaParam = params.biaya as string;
  const orderPrice = biayaParam ? parseInt(biayaParam, 10) : undefined;
  const notes = (params as any)?.notes as string || '';
  const orderItemsRaw = (params as any)?.orderItems as string || '[]';

  const [userId, setUserId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState<{ nama: string; profile_image_url: string | null }>({ nama: driverName, profile_image_url: null });

  const [restoCoords, setRestoCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const tryParseCoords = (text: string | undefined | null) => {
    if (!text) return null;
    const trimmed = String(text).trim();
    const latlonMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
    if (latlonMatch) {
      const lat = parseFloat(latlonMatch[1]);
      const lon = parseFloat(latlonMatch[2]);
      if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
    }
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') {
        const lat = obj.latitude ?? obj.lat ?? obj.latitiude ?? obj.latlng?.lat ?? obj.latLng?.lat;
        const lon = obj.longitude ?? obj.lng ?? obj.lon ?? obj.long ?? obj.latlng?.lng ?? obj.latLng?.lng;
        if (typeof lat === 'number' && typeof lon === 'number') return { latitude: lat, longitude: lon };
        const latN = parseFloat(lat);
        const lonN = parseFloat(lon);
        if (!isNaN(latN) && !isNaN(lonN)) return { latitude: latN, longitude: lonN };
      }
    } catch (e) { }
    return null;
  };

  const parseOrderItems = (raw: any) => {
    try {
      if (!raw) return [];
      if (typeof raw === 'string') return JSON.parse(raw as string);
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'object') return raw as any[];
      return [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
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
        console.warn('[ChatScootSend] Error reading AsyncStorage:', e);
      }

      try {
        const { data } = await supabase.auth.getUser();
        finalUserId = data?.user?.id || '';
        if (finalUserId) {
          setUserId(finalUserId);
          return;
        }
      } catch (e) {
        console.warn('[ChatScootSend] Error getting user from Supabase:', e);
      }

      console.error('[ChatScootSend] ❌ Could not resolve userId!');
    };

    resolveUserId();
  }, [userIdParam]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadCoordinates = async () => {
      let pickupAddress = lokasiResto;
      let destAddress = lokasiAntar;

      console.log('[ChatScootSend] loadCoordinates called with:', { lokasiResto, lokasiAntar, orderId });

      // Fallback: load from Supabase if params are empty
      if ((!pickupAddress || !destAddress) && orderId) {
        console.log('[ChatScootSend] Location params empty, loading from Supabase...');
        try {
          const { data, error } = await supabase
            .from('scoot_send')
            .select('lokasi_jemput_barang, lokasi_tujuan')
            .eq('id', orderId)
            .single();

          if (!error && data) {
            if (!pickupAddress && data.lokasi_jemput_barang) {
              pickupAddress = data.lokasi_jemput_barang;
              console.log('[ChatScootSend] Loaded pickup from DB:', pickupAddress);
            }
            if (!destAddress && data.lokasi_tujuan) {
              destAddress = data.lokasi_tujuan;
              console.log('[ChatScootSend] Loaded destination from DB:', destAddress);
            }
          }
        } catch (err) {
          console.error('[ChatScootSend] Error loading order from Supabase:', err);
        }
      }

      if (!pickupAddress || !destAddress) {
        console.log('[ChatScootSend] Still missing locations after fallback:', { pickupAddress, destAddress });
        if (isMounted) setMapLoading(false);
        return;
      }

      if (isMounted) setMapLoading(true);
      console.log('[ChatScootSend] Geocoding addresses:', { pickupAddress, destAddress });

      // Set timeout to prevent infinite loading (10 seconds max)
      timeoutId = setTimeout(() => {
        console.log('[ChatScootSend] ⚠️ Geocoding timeout reached');
        if (isMounted) setMapLoading(false);
      }, 10000);

      try {
        let [restoResult, destResult] = await Promise.all([
          geocodeAddress(pickupAddress),
          geocodeAddress(destAddress)
        ]);

        if (timeoutId) clearTimeout(timeoutId);
        if (!isMounted) return;

        // fallback: try parsing direct coordinates if geocoding failed
        if (!restoResult) {
          const parsed = tryParseCoords(pickupAddress);
          if (parsed) restoResult = parsed;
        }
        if (!destResult) {
          const parsed = tryParseCoords(destAddress);
          if (parsed) destResult = parsed;
        }

        console.log('[ChatScootSend] Geocoding results:', { restoResult, destResult });

        if (restoResult) setRestoCoords(restoResult);
        if (destResult) setDestCoords(destResult);

        // Synthetic fallback if only pickup found
        if (restoResult && !destResult) {
          const synthetic = { latitude: restoResult.latitude + 0.002, longitude: restoResult.longitude + 0.002 };
          console.log('[ChatScootSend] Using synthetic destination fallback', synthetic);
          setDestCoords(synthetic);
        }
      } catch (error) {
        console.error('[ChatScootSend] Error geocoding addresses:', error);
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
  }, [lokasiResto, lokasiAntar, orderId]);

  // Create initial welcome message for customer with order details (persistent)
  useEffect(() => {
    const hasWelcome = messages.some(m => m.id === 'initial-welcome');

    if (!hasWelcome && (lokasiResto || lokasiAntar)) {
      // Get detail barang from params
      const detailBarang = (params as any)?.detailBarang as string || (params as any)?.detail_barang as string || '';
      const namaPenerima = (params as any)?.namaPenerima as string || (params as any)?.nama_penerima as string || '';

      let initialMessage = `📦 Pesanan ScootSend Diterima!\n\n`;
      if (detailBarang) {
        initialMessage += `📋 Detail Barang: ${detailBarang}\n`;
      }
      if (lokasiResto) {
        initialMessage += `📍 Jemput: ${lokasiResto}\n`;
      }
      if (lokasiAntar) {
        initialMessage += `🎯 Tujuan: ${lokasiAntar}\n`;
      }
      if (namaPenerima) {
        initialMessage += `👤 Penerima: ${namaPenerima}\n`;
      }
      if (orderPrice) {
        initialMessage += `💰 Biaya: Rp ${orderPrice.toLocaleString('id-ID')}\n`;
      }
      if (notes) {
        initialMessage += `\n📝 Catatan: ${notes}\n`;
      }
      initialMessage += `\nDriver sedang menuju lokasi. Harap menunggu yaa! 😊`;

      setMessages(prev => [
        {
          id: 'initial-welcome',
          sender: 'driver',
          text: initialMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.filter(m => m.id !== 'initial-1')
      ]);
    }
  }, [lokasiResto, lokasiAntar, orderPrice, notes, messages, params]);

  const loadDriverProfile = useCallback(async () => {
    if (!driverId) return;
    try {
      const result = await getUserProfile(driverId, 'driver');
      if (result.success && result.data) {
        setDriverProfile({ nama: result.data.nama, profile_image_url: result.data.profile_image_url });
      }
    } catch (error) {
      console.log('[ChatScootSend] Error loading driver profile:', error);
    }
  }, [driverId]);

  const loadMessages = useCallback(async () => {
    if (!orderId) { setIsLoading(false); return; }
    setIsLoading(true);
    const result = await getMessages(orderId, userId);
    if (result.success && result.data && result.data.length > 0) {
      sentMessageIdsRef.current.clear();
      const formatted = result.data.map((msg: any) => ({
        id: msg.id,
        sender: 'driver',
        text: msg.text,
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: msg.imageUrl || null
      }));
      setMessages(formatted);
    }
    setIsLoading(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
  }, [orderId, userId]);

  useEffect(() => { loadDriverProfile(); if (orderId) loadMessages(); }, [orderId, driverId, loadDriverProfile, loadMessages]);

  useEffect(() => {
    if (!orderId) return;

    channelRef.current = subscribeToMessages(orderId, (payload: any) => {
      const newRow = payload.new;
      const newMessage = {
        id: newRow.id,
        sender: 'driver',
        text: newRow.text,
        time: new Date(newRow.timestamp || newRow.tanggal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: newRow.imageUrl || null
      };
      setMessages(prev => {
        if (prev.some(m => m.id === newRow.id)) return prev;
        const tempIndex = prev.findIndex(m => m.text === newRow.text && m.sender === 'customer' && String(m.id).startsWith('temp-'));
        if (tempIndex !== -1) {
          const updated = [...prev];
          updated[tempIndex] = { ...newMessage, sender: 'customer' };
          sentMessageIdsRef.current.delete(prev[tempIndex].id as string);
          sentMessageIdsRef.current.add(newRow.id);
          return updated;
        }
        return [...prev, newMessage];
      });
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });

    const pollMessages = async () => {
      const result = await getMessages(orderId, userId);
      if (result.success && result.data) {
        setMessages(prev => {
          const newMessages: any[] = [];
          result.data.forEach((msg: any) => {
            if (prev.some(m => m.id === msg.id)) return;
            if (sentMessageIdsRef.current.has(msg.id)) return;
            newMessages.push({
              id: msg.id,
              sender: 'driver',
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

    const pollingInterval = setInterval(pollMessages, 2000);

    return () => {
      clearInterval(pollingInterval);
      if (channelRef.current) { unsubscribeFromMessages(channelRef.current); }
    };
  }, [orderId, userId]);

  useEffect(() => {
    if (!orderId) return;
    let isNavigating = false;
    let pollingInterval: NodeJS.Timeout | null = null;

    const handleStatusChange = (newStatus: string) => {
      if (isNavigating) return;
      if (newStatus === 'waiting_confirmation') {
        isNavigating = true;
        // cleanup
        if (orderStatusChannelRef.current) {
          orderStatusChannelRef.current.unsubscribe();
        }
        if (channelRef.current) {
          unsubscribeFromMessages(channelRef.current);
        }
        router.replace({ pathname: '/screens/customer/ScootSendCustomer/SendValidasi', params: { orderId, userId } } as any);
      }
    };

    const subscription = subscribeToOrderStatus(orderId, (payload: any) => { handleStatusChange(payload.new?.status); });
    orderStatusChannelRef.current = subscription;

    const checkOrderStatus = async () => {
      try {
        const { data, error } = await supabase.from('scoot_send').select('status').eq('id', orderId).single();
        if (!error && data) handleStatusChange(data.status);
      } catch (err) { console.error('[ChatScootSend] Polling error:', err); }
    };

    pollingInterval = setInterval(checkOrderStatus, 3000) as any;
    checkOrderStatus();

    return () => { if (pollingInterval) clearInterval(pollingInterval); if (orderStatusChannelRef.current) { orderStatusChannelRef.current.unsubscribe(); orderStatusChannelRef.current = null; } };
  }, [orderId, userId, router]);

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
      const tempMessage = { id: tempId, sender: 'customer', text: '', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), imageUrl: uploadResult.imageUrl };
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

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    sentMessageIdsRef.current.add(tempId);
    const tempMessage = { id: tempId, sender: 'customer', text: messageText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, tempMessage]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

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
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.driverHeader} onPress={() => router.replace('/screens/customer/HomeCustomer' as any)} activeOpacity={0.7}>
          <Image source={driverProfile.profile_image_url ? { uri: driverProfile.profile_image_url } : DriverImg} style={styles.driverAvatar} />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driverProfile.nama || driverName}</Text>
            <Text style={styles.driverDetails} numberOfLines={1}>{lokasiResto ? `Resto: ${lokasiResto}` : 'Driver ScootSend'}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.sliderContainer}>
          <TouchableOpacity
            style={[styles.sliderButton, activeView === 0 && styles.sliderButtonActive]}
            onPress={() => setActiveView(0)}
          >
            <Text style={[styles.sliderButtonText, activeView === 0 && styles.sliderButtonTextActive]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sliderButton, activeView === 1 && styles.sliderButtonActive]}
            onPress={() => setActiveView(1)}
          >
            <Text style={[styles.sliderButtonText, activeView === 1 && styles.sliderButtonTextActive]}>Maps</Text>
          </TouchableOpacity>
        </View>

        {activeView === 0 ? (
          <View style={styles.chatViewContainer}>
            <ScrollView ref={scrollViewRef} style={styles.messagesContainer} showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
              {isLoading ? (
                <View style={styles.loadingContainer}><ActivityIndicator size="small" color="#33cc66" /><Text style={styles.loadingText}>Memuat pesan...</Text></View>
              ) : messages.length === 0 ? (
                <Text style={styles.emptyText}>Belum ada pesan. Mulai chat dengan driver!</Text>
              ) : (
                messages.map(msg => (
                  <View key={msg.id} style={msg.sender === 'driver' ? styles.messageBubbleLeft : styles.messageBubbleRight}>
                    {msg.imageUrl && <Image source={{ uri: msg.imageUrl }} style={styles.chatImage} resizeMode="cover" />}
                    {msg.text ? <Text style={msg.sender === 'driver' ? styles.messageText : styles.messageTextWhite}>{msg.text}</Text> : null}
                    <Text style={msg.sender === 'driver' ? styles.timeLeft : styles.timeRight}>{msg.time}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.inputBar}>
              <View style={styles.inputWrapper}>
                <TextInput placeholder="Ketikkan pesan..." placeholderTextColor="#999" style={styles.input} value={inputText} onChangeText={setInputText} multiline />
                <TouchableOpacity style={styles.cameraButton} onPress={handlePickImage} disabled={isUploadingImage}>
                  {isUploadingImage ? <ActivityIndicator size="small" color="#33cc66" /> : <Text style={styles.cameraIconText}>📷</Text>}
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}><Image source={require('../../../../assets/images/KirimChat.png')} style={styles.sendIcon} resizeMode="contain" /></TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.mapsViewContainer}>
            {mapLoading ? (
              <View style={styles.mapLoadingContainer}><ActivityIndicator size="large" color="#33cc66" /><Text style={styles.mapLoadingText}>Memuat peta...</Text></View>
            ) : restoCoords && destCoords ? (
              <MapWithRoute origin={restoCoords} destination={destCoords} originLabel="Restoran" destinationLabel="Lokasi Antar" fixedPrice={orderPrice} onRouteCalculated={() => { }} />
            ) : (
              <View style={styles.mapErrorContainer}><Text style={styles.mapErrorText}>Tidak dapat memuat peta.\nAlamat belum tersedia atau tidak valid.</Text></View>
            )}
          </View>
        )}

      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  driverHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  driverAvatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#000' },
  driverDetails: { fontSize: 12, color: '#666', marginTop: 2 },
  sliderContainer: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, borderRadius: 25, backgroundColor: '#f0f0f0', padding: 4 },
  sliderButton: { flex: 1, paddingVertical: 10, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sliderButtonActive: { backgroundColor: '#33cc66' },
  sliderButtonText: { fontSize: 14, fontWeight: '600', color: '#666' },
  sliderButtonTextActive: { color: '#fff' },
  chatViewContainer: { flex: 1, backgroundColor: '#fff' },
  messagesContainer: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  loadingText: { color: '#666', textAlign: 'center', marginTop: 10 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 30 },
  messageBubbleLeft: { alignSelf: 'flex-start', backgroundColor: '#eef0ef', borderRadius: 14, padding: 12, marginBottom: 12, maxWidth: '78%' },
  messageBubbleRight: { alignSelf: 'flex-end', backgroundColor: '#33cc66', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12, maxWidth: '68%' },
  messageText: { color: '#000', lineHeight: 20 },
  messageTextWhite: { color: '#fff', lineHeight: 20 },
  timeLeft: { alignSelf: 'flex-end', color: '#666', fontSize: 11, marginTop: 6 },
  timeRight: { alignSelf: 'flex-end', color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 6 },
  chatImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 6 },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 25, borderWidth: 1, borderColor: '#ddd', paddingLeft: 15, paddingRight: 5, marginRight: 8 },
  input: { flex: 1, fontSize: 14, paddingVertical: 10, color: '#000', maxHeight: 100, backgroundColor: 'transparent' },
  cameraButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  cameraIconText: { fontSize: 22 },
  sendButton: { paddingHorizontal: 8, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { width: 28, height: 28 },
  mapsViewContainer: { flex: 1, backgroundColor: '#f0f0f0' },
  mapLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' },
  mapLoadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  mapErrorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#f8f8f8' },
  mapErrorText: { textAlign: 'center', color: '#666', fontSize: 14, lineHeight: 22 },
});

export default ChatScootSend;
