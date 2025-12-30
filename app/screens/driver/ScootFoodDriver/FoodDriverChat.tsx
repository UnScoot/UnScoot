import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';
import { sendMessage, getMessages, subscribeToMessages, unsubscribeFromMessages, getUserProfile, subscribeToOrderStatus, updateOrderStatus } from "../../../../src/database/chatScootFood";
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

const HalamanChat_Food_Driver = () => {
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
  const restaurant = params.restaurant as string || params.lokasiResto as string || '';
  const item = params.item as string || '';
  const lokasiAntar = params.lokasiAntar as string || params.lokasiCustomer as string || params.lokasi_tujuan as string || params.destination as string || '';
  const biayaParam = params.biaya as string;
  const orderPrice = biayaParam ? parseInt(biayaParam, 10) : undefined;

  // Order items and notes from params (if available)
  const orderItemsRaw = params?.orderItems as string || '[]';
  const notes = params?.notes as string || '';

  // State for resolved userId
  const [userId, setUserId] = React.useState<string>('');

  // Map coordinates state
  const [restoCoords, setRestoCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [destCoords, setDestCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [mapLoading, setMapLoading] = React.useState(false); // Start with false like ScootRide
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
        console.log('[HalamanChat_Food_Driver] Using userId from params:', finalUserId);
        setUserId(finalUserId);
        return;
      }

      try {
        const userSession = await AsyncStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          finalUserId = session.params?.userId;
          if (finalUserId) {
            console.log('[HalamanChat_Food_Driver] Using userId from AsyncStorage:', finalUserId);
            setUserId(finalUserId);
            return;
          }
        }
      } catch (e) {
        console.warn('[HalamanChat_Food_Driver] Error reading AsyncStorage:', e);
      }

      try {
        const { data } = await supabase.auth.getUser();
        finalUserId = data?.user?.id || '';
        if (finalUserId) {
          console.log('[HalamanChat_Food_Driver] Using userId from Supabase Auth:', finalUserId);
          setUserId(finalUserId);
          return;
        }
      } catch (e) {
        console.warn('[HalamanChat_Food_Driver] Error getting user from Supabase:', e);
      }

      console.error('[HalamanChat_Food_Driver] ❌ Could not resolve userId!');
    };

    resolveUserId();
  }, [userIdParam]);

  // Robust parser: accept stringified JSON or already-parsed arrays/objects
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

  // Debug params (akan tampil di console untuk debugging)
  React.useEffect(() => {
    console.log('[HalamanChat_Food_Driver] ===== ALL PARAMS =====');
    console.log('[HalamanChat_Food_Driver] restaurant:', restaurant);
    console.log('[HalamanChat_Food_Driver] lokasiAntar:', lokasiAntar);
    console.log('[HalamanChat_Food_Driver] params.destination:', params.destination);
    console.log('[HalamanChat_Food_Driver] params.lokasiCustomer:', params.lokasiCustomer);
    console.log('[HalamanChat_Food_Driver] params.lokasiResto:', params.lokasiResto);
    console.log('[HalamanChat_Food_Driver] =========================');
  }, [restaurant, lokasiAntar, params]);

  // Geocode restaurant and destination addresses for real maps
  React.useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadCoordinates = async () => {
      let resto = restaurant;
      let antar = lokasiAntar;

      console.log('[HalamanChat_Food_Driver] loadCoordinates called with:', { restaurant, lokasiAntar, orderId });

      // If addresses are missing, try to fetch from database
      if ((!resto || !antar) && orderId) {
        console.log('[HalamanChat_Food_Driver] Missing addresses, fetching from database for orderId:', orderId);
        try {
          const { data: orderData, error } = await supabase
            .from('scoot_food')
            .select('lokasi_resto, lokasi_customer')
            .eq('id', orderId)
            .single();

          if (!error && orderData) {
            resto = resto || orderData.lokasi_resto || '';
            antar = antar || orderData.lokasi_customer || '';
            console.log('[HalamanChat_Food_Driver] Got addresses from DB:', { resto, antar });
          } else {
            console.log('[HalamanChat_Food_Driver] DB fetch failed or no data:', error);
          }
        } catch (err) {
          console.error('[HalamanChat_Food_Driver] Error fetching order data:', err);
        }
      }

      if (!resto || !antar) {
        console.log('[HalamanChat_Food_Driver] ❌ No restaurant or destination provided - resto:', resto, 'antar:', antar);
        if (isMounted) setMapLoading(false);
        return;
      }

      if (isMounted) setMapLoading(true);
      console.log('[HalamanChat_Food_Driver] ✅ Geocoding addresses:', { resto, antar });

      // Set timeout to prevent infinite loading (10 seconds max)
      timeoutId = setTimeout(() => {
        console.log('[HalamanChat_Food_Driver] ⚠️ Geocoding timeout reached');
        if (isMounted) setMapLoading(false);
      }, 10000);

      try {
        const [restoResult, destResult] = await Promise.all([
          geocodeAddress(resto),
          geocodeAddress(antar)
        ]);

        if (timeoutId) clearTimeout(timeoutId);

        if (!isMounted) return;

        console.log('[HalamanChat_Food_Driver] Geocoding results:', { restoResult, destResult });

        if (restoResult) {
          setRestoCoords(restoResult);
        }
        if (destResult) {
          setDestCoords(destResult);
        }

        // Synthetic fallback if only resto found
        if (restoResult && !destResult) {
          const synthetic = { latitude: restoResult.latitude + 0.002, longitude: restoResult.longitude + 0.002 };
          console.log('[HalamanChat_Food_Driver] Using synthetic destination fallback', synthetic);
          setDestCoords(synthetic);
        }
      } catch (error) {
        console.error('[HalamanChat_Food_Driver] Error geocoding addresses:', error);
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
  }, [restaurant, lokasiAntar, orderId]);
  // Auto-Chat: Initial Welcome Message Logic (persistent)
  React.useEffect(() => {
    const hasWelcome = messages.some(m => m.id === 'initial-welcome');

    // Only run if no welcome message and we have at least some address info
    if (!hasWelcome && (restaurant || lokasiAntar)) {
      let initialMessage = `🍔 Pesanan ScootFood Baru!\n\n`;

      if (restaurant) initialMessage += `🏪 Restoran: ${restaurant}\n`;
      if (lokasiAntar) initialMessage += `📍 Tujuan Antar: ${lokasiAntar}\n`;
      if (orderPrice) initialMessage += `💰 Biaya: Rp ${orderPrice.toLocaleString('id-ID')}\n`;

      // Parse items safely
      try {
        let items: any[] = [];
        const raw = orderItemsRaw;

        if (raw) {
          if (Array.isArray(raw)) items = raw;
          else if (typeof raw === 'string') items = JSON.parse(raw);
          else if (typeof raw === 'object') items = [raw]; // Handle single object case
        }

        if (items.length > 0) {
          initialMessage += `\n📦 Item Pesanan:\n` + items.map((i: any) => `• ${i.name || i.nama_menu} (${i.quantity}x)`).join('\n');
        }
      } catch (e) {
        console.warn('Error parsing items for welcome message:', e);
      }

      if (notes) initialMessage += `\n\n📝 Catatan: ${notes}`;
      initialMessage += `\n\nSelesaikan pesanan ini segera! 💪`;

      setMessages(prev => [
        {
          id: 'initial-welcome',
          sender: 'customer',
          text: initialMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.filter(m => m.id !== 'initial-1')
      ]);
    }
  }, [restaurant, lokasiAntar, orderPrice, orderItemsRaw, notes, messages]);

  const loadCustomerProfile = React.useCallback(async () => {
    if (!customerId) return;
    try {
      const result = await getUserProfile(customerId, 'customer');
      if (result.success && result.data) {
        setCustomerProfile({
          nama: result.data.nama,
          profile_image_url: result.data.profile_image_url
        });
      }
    } catch (error) {
      console.log('[HalamanChat_Food_Driver] Error loading customer profile:', error);
    }
  }, [customerId]);

  const loadMessages = React.useCallback(async () => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    console.log('[HalamanChat_Food_Driver] Loading messages for order:', orderId);
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

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
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

  // Setup real-time subscription for messages + polling fallback
  React.useEffect(() => {
    if (!orderId) return;

    console.log('[HalamanChat_Food_Driver] Setting up real-time subscription for order:', orderId);

    channelRef.current = subscribeToMessages(orderId, (payload: any) => {
      console.log('[HalamanChat_Food_Driver] New message received via realtime:', payload);

      const newRow = payload.new;
      if (!newRow || !newRow.id) {
        console.log('[HalamanChat_Food_Driver] Invalid message payload, skipping');
        return;
      }

      const newMessage = {
        id: newRow.id,
        sender: 'customer' as const,
        text: newRow.text || newRow.chat || '',
        time: new Date(newRow.timestamp || newRow.tanggal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: newRow.imageUrl || newRow.image_url || null,
      };

      setMessages(prev => {
        if (prev.some(m => m.id === newRow.id)) {
          console.log('[HalamanChat_Food_Driver] Message ID already exists:', newRow.id);
          return prev;
        }

        const tempMessageIndex = prev.findIndex(m => m.text === newRow.text && m.sender === 'driver' && m.id.startsWith('temp-'));
        if (tempMessageIndex !== -1) {
          console.log('[HalamanChat_Food_Driver] Replacing temp message with real ID');
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

    // Polling fallback untuk chat messages setiap 3 detik
    const pollMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_food')
          .select('id, chat, tanggal')
          .eq('id_scoot_food', orderId)
          .order('tanggal', { ascending: true });

        if (error) {
          console.error('[HalamanChat_Food_Driver] Polling error:', error);
          return;
        }

        if (data && data.length > 0) {
          setMessages(prev => {
            let updated = [...prev];
            let hasNewMessages = false;

            data.forEach((row: any) => {
              // Skip if message already exists
              if (prev.some(m => m.id === row.id)) return;
              // Skip temp messages we sent
              if (sentMessageIdsRef.current.has(row.id)) return;

              // Check for temp message to replace
              const tempIdx = prev.findIndex(m => m.text === row.chat && m.id.startsWith('temp-'));
              if (tempIdx !== -1) {
                updated[tempIdx] = {
                  ...updated[tempIdx],
                  id: row.id,
                };
                sentMessageIdsRef.current.delete(prev[tempIdx].id);
                sentMessageIdsRef.current.add(row.id);
                hasNewMessages = true;
                return;
              }

              // New message from customer
              updated.push({
                id: row.id,
                sender: 'customer' as const,
                text: row.chat,
                time: new Date(row.tanggal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
              hasNewMessages = true;
            });

            if (hasNewMessages) {
              console.log('[HalamanChat_Food_Driver] Polling found new messages');
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }

            return hasNewMessages ? updated : prev;
          });
        }
      } catch (err) {
        console.error('[HalamanChat_Food_Driver] Polling exception:', err);
      }
    };

    const chatPollingInterval = setInterval(pollMessages, 3000);

    return () => {
      clearInterval(chatPollingInterval);
      if (channelRef.current) {
        console.log('[HalamanChat_Food_Driver] Cleaning up subscription');
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
        console.log('[HalamanChat_Food_Driver] Customer confirmed! Navigating to QR screen...');

        // Clear polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }

        if (orderStatusChannelRef.current) {
          orderStatusChannelRef.current.unsubscribe();
        }

        router.push({
          pathname: '/screens/driver/ScootFoodDriver/FoodQrPayment',
          params: { orderId }
        } as any);
      }
    };

    console.log('[HalamanChat_Food_Driver] Setting up order status subscription for order:', orderId);

    // Realtime subscription
    const subscription = subscribeToOrderStatus(orderId, (payload: any) => {
      console.log('[HalamanChat_Food_Driver] Order status changed via realtime:', payload.new.status);
      handleStatusChange(payload.new.status);
    });

    orderStatusChannelRef.current = subscription;

    // Polling fallback - check every 3 seconds
    const checkOrderStatus = async () => {
      if (isNavigating) return;

      try {
        const { data, error } = await supabase
          .from('scoot_food')
          .select('status')
          .eq('id', orderId)
          .single();

        if (!error && data) {
          console.log('[HalamanChat_Food_Driver] Polling check - current status:', data.status);
          handleStatusChange(data.status);
        }
      } catch (err) {
        console.error('[HalamanChat_Food_Driver] Polling error:', err);
      }
    };

    // Start polling as fallback
    pollingInterval = setInterval(checkOrderStatus, 3000);

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (orderStatusChannelRef.current) {
        console.log('[HalamanChat_Food_Driver] Cleaning up order status subscription');
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
      const uploadResult = await uploadChatImage(orderId, imageUri, 'food');
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

    console.log('[HalamanChat_Food_Driver] Sending message:', messageText);

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

    if (orderId) {
      const result = await sendMessage({
        orderId,
        message: messageText,
      });

      if (result.success && result.data && Array.isArray(result.data) && result.data[0]) {
        const inserted = result.data[0];
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: inserted.id } : m));
        sentMessageIdsRef.current.delete(tempId);
        sentMessageIdsRef.current.add(inserted.id);
      } else {
        console.error('[HalamanChat_Food_Driver] Failed to send message:', result.error);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        sentMessageIdsRef.current.delete(tempId);
      }
    }
  };

  // Handle "Selesai" button - update order status to waiting_confirmation
  const handleSelesai = async () => {
    if (!canClickSelesai) return;

    setCanClickSelesai(false);

    // Jika ada orderId, update status di database
    if (orderId) {
      console.log('[HalamanChat_Food_Driver] Marking order as waiting_confirmation:', orderId);

      const result = await updateOrderStatus(orderId, 'waiting_confirmation');

      if (result.success) {
        console.log('[HalamanChat_Food_Driver] ✅ Order status updated to waiting_confirmation');
        Alert.alert('Berhasil', 'Menunggu konfirmasi dari customer...');
      } else {
        console.error('[HalamanChat_Food_Driver] Failed to update status:', result.error);
        Alert.alert('Error', 'Gagal mengupdate status. Coba lagi.');
        setCanClickSelesai(true);
        return;
      }
    } else {
      // No orderId - just navigate to QR (demo mode)
      router.push("/screens/driver/ScootFoodDriver/FoodQrPayment" as any);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/screens/driver/HomeDriver' as any)}
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
            style={[styles.statusBadge, !canClickSelesai && styles.statusBadgeDisabled]}
            onPress={handleSelesai}
            disabled={!canClickSelesai}
          >
            <Text style={styles.statusText}>Selesai</Text>
          </TouchableOpacity>
        </View>

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
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatContainer}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#33cc66" />
                  <Text style={styles.loadingText}>Memuat pesan...</Text>
                </View>
              ) : messages.length === 0 ? (
                <Text style={styles.emptyText}>Belum ada pesan.</Text>
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
                    <Text style={msg.sender === 'customer' ? styles.timeStampUser : styles.timeStampDriver}>
                      {msg.time}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Input Section */}
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
          // MAPS VIEW
          <View style={styles.mapsViewContainer}>
            {mapLoading ? (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color="#33cc66" />
                <Text style={styles.mapLoadingText}>Memuat peta...</Text>
              </View>
            ) : restoCoords && destCoords ? (
              <MapWithRoute
                origin={restoCoords}
                destination={destCoords}
                originLabel="Restoran"
                destinationLabel="Lokasi Antar"
                hidePrice={true}
                onRouteCalculated={(dist, dur, price) => {
                  setRouteDistance(dist);
                  setRouteDuration(dur);
                }}
              />
            ) : (
              <View style={styles.mapErrorContainer}>
                <Text style={styles.mapErrorText}>
                  Tidak dapat memuat peta.{'\n'}
                  Alamat belum tersedia atau tidak valid.
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

  // Slider styles
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

  // Chat View styles
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
    color: "#666",
    alignSelf: "flex-end",
    marginTop: 6
  },
  timeStampDriver: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    alignSelf: "flex-end",
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

  // Maps View styles
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

export default HalamanChat_Food_Driver;
