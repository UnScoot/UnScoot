import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { sendMessage, getMessages, subscribeToMessages, unsubscribeFromMessages, getUserProfile, subscribeToOrderStatus } from '../../../../src/database/chatScootFood';
import { uploadChatImage } from '../../../../src/database/uploadChatImage';
import { supabase } from '../../../../src/database/supabase';
import MapWithRoute from '../../../../components/MapWithRoute';
import { geocodeAddress } from '../../../../src/utils/routingService';

// assets
const DriverImg = require('../../../../assets/images/driver.png');

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

const ChatScootFood: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const channelRef = useRef<any>(null);
  const orderStatusChannelRef = useRef<any>(null);
  const sentMessageIdsRef = useRef<Set<string>>(new Set());

  // Slider state - 0 = Chat, 1 = Maps
  const [activeView, setActiveView] = useState(0);

  // Get params
  const orderId = params.orderId as string;
  const userIdParam = params.userId as string;
  const driverId = params.driverId as string;
  const driverName = params.driverName as string || 'Driver';
  const lokasiResto = params.lokasiResto as string || params.restaurant as string || '';
  const lokasiAntar = params.lokasiAntar as string || params.lokasiCustomer as string || params.destination as string || '';
  const biayaParam = params.biaya as string;
  const orderPrice = biayaParam ? parseInt(biayaParam, 10) : undefined;

  // Notes and order items from params (if available)
  const notes = params?.notes as string || '';
  const orderItemsRaw = params?.orderItems as string || '[]';

  // State for resolved userId
  const [userId, setUserId] = useState<string>('');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState<UserProfile>({ nama: driverName, profile_image_url: null });

  // Map coordinates state
  const [restoCoords, setRestoCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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

  // Resolve userId dari params, AsyncStorage, atau Supabase Auth
  useEffect(() => {
    const resolveUserId = async () => {
      let finalUserId = userIdParam;

      if (finalUserId) {
        console.log('[ChatScootFood] Using userId from params:', finalUserId);
        setUserId(finalUserId);
        return;
      }

      try {
        const userSession = await AsyncStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          finalUserId = session.params?.userId;
          if (finalUserId) {
            console.log('[ChatScootFood] Using userId from AsyncStorage:', finalUserId);
            setUserId(finalUserId);
            return;
          }
        }
      } catch (e) {
        console.warn('[ChatScootFood] Error reading AsyncStorage:', e);
      }

      try {
        const { data } = await supabase.auth.getUser();
        finalUserId = data?.user?.id || '';
        if (finalUserId) {
          console.log('[ChatScootFood] Using userId from Supabase Auth:', finalUserId);
          setUserId(finalUserId);
          return;
        }
      } catch (e) {
        console.warn('[ChatScootFood] Error getting user from Supabase:', e);
      }

      console.error('[ChatScootFood] ❌ Could not resolve userId!');
    };

    resolveUserId();
  }, [userIdParam]);

  // Debug params untuk troubleshooting
  useEffect(() => {
    console.log('[ChatScootFood] ===== ALL PARAMS =====');
    console.log('[ChatScootFood] lokasiResto:', lokasiResto);
    console.log('[ChatScootFood] lokasiAntar:', lokasiAntar);
    console.log('[ChatScootFood] params.lokasiCustomer:', params.lokasiCustomer);
    console.log('[ChatScootFood] params.restaurant:', params.restaurant);
    console.log('[ChatScootFood] params.destination:', params.destination);
    console.log('[ChatScootFood] =========================');
  }, [lokasiResto, lokasiAntar, params]);

  // Geocode resto and destination addresses for real maps
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadCoordinates = async () => {
      let resto = lokasiResto;
      let antar = lokasiAntar;

      console.log('[ChatScootFood] loadCoordinates called with:', { lokasiResto, lokasiAntar, orderId });

      // If addresses are missing, try to fetch from database
      if ((!resto || !antar) && orderId) {
        console.log('[ChatScootFood] Missing addresses, fetching from database for orderId:', orderId);
        try {
          const { data: orderData, error } = await supabase
            .from('scoot_food')
            .select('lokasi_resto, lokasi_customer')
            .eq('id', orderId)
            .single();

          if (!error && orderData) {
            resto = resto || orderData.lokasi_resto || '';
            antar = antar || orderData.lokasi_customer || '';
            console.log('[ChatScootFood] Got addresses from DB:', { resto, antar });
          } else {
            console.log('[ChatScootFood] DB fetch failed or no data:', error);
          }
        } catch (err) {
          console.error('[ChatScootFood] Error fetching order data:', err);
        }
      }

      if (!resto || !antar) {
        console.log('[ChatScootFood] ❌ No resto or destination provided - resto:', resto, 'antar:', antar);
        if (isMounted) setMapLoading(false);
        return;
      }

      if (isMounted) setMapLoading(true);
      console.log('[ChatScootFood] ✅ Geocoding addresses:', { resto, antar });

      // Set timeout to prevent infinite loading (10 seconds max)
      timeoutId = setTimeout(() => {
        console.log('[ChatScootFood] ⚠️ Geocoding timeout reached');
        if (isMounted) setMapLoading(false);
      }, 10000);

      try {
        const [restoResult, destResult] = await Promise.all([
          geocodeAddress(resto),
          geocodeAddress(antar)
        ]);

        if (timeoutId) clearTimeout(timeoutId);

        if (!isMounted) return;

        console.log('[ChatScootFood] Geocoding results:', { resto, antar, restoResult, destResult });

        if (restoResult) setRestoCoords(restoResult);
        if (destResult) setDestCoords(destResult);

        // Synthetic fallback if only resto found
        if (restoResult && !destResult) {
          const synthetic = { latitude: restoResult.latitude + 0.002, longitude: restoResult.longitude + 0.002 };
          console.log('[ChatScootFood] Using synthetic destination fallback', synthetic);
          setDestCoords(synthetic);
        }
      } catch (error) {
        console.error('[ChatScootFood] Error geocoding addresses:', error);
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

  // Create initial message from order items (persistent)
  useEffect(() => {
    const hasWelcome = messages.some(m => m.id === 'initial-welcome');

    // Run if no welcome message and we have at least items OR address info
    if (!hasWelcome && (orderItemsRaw || lokasiResto || lokasiAntar)) {
      const parsed = parseOrderItems(orderItemsRaw);
      let initialMessage = `🍔 Pesanan ScootFood Diterima!\n\n`;

      if (parsed.length > 0) {
        initialMessage += `📦 Item Pesanan:\n`;
        const itemsList = parsed.map((item: any) => `• ${item.name || item.nama_menu} (${item.quantity}x)`).join('\n');
        initialMessage += `${itemsList}\n`;
      }

      if (lokasiResto) {
        initialMessage += `\n🏪 Restoran: ${lokasiResto}`;
      }
      if (lokasiAntar) {
        initialMessage += `\n📍 Antar ke: ${lokasiAntar}`;
      }
      if (orderPrice) {
        initialMessage += `\n💰 Total: Rp ${orderPrice.toLocaleString('id-ID')}`;
      }
      if (notes) {
        initialMessage += `\n\n📝 Catatan: ${notes}`;
      }
      initialMessage += `\n\nDriver sedang menuju restoran. Harap menunggu yaa! 😊`;

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
  }, [orderItemsRaw, notes, lokasiResto, lokasiAntar, orderPrice, messages]);

  // Load driver profile
  const loadDriverProfile = useCallback(async () => {
    if (!driverId) return;
    try {
      const result = await getUserProfile(driverId, 'driver');
      if (result.success && result.data) {
        setDriverProfile({
          nama: result.data.nama,
          profile_image_url: result.data.profile_image_url
        });
      }
    } catch (error) {
      console.log('[ChatScootFood] Error loading driver profile:', error);
    }
  }, [driverId]);

  // Load messages from database
  const loadMessages = useCallback(async () => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    console.log('[ChatScootFood] Loading messages for order:', orderId);
    setIsLoading(true);

    const result = await getMessages(orderId, userId);

    if (result.success && result.data && result.data.length > 0) {
      sentMessageIdsRef.current.clear();
      const formattedMessages: ChatMessage[] = result.data.map((msg: any) => ({
        id: msg.id,
        sender: 'driver' as const,
        text: msg.text,
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: msg.imageUrl || null,
      }));
      setMessages(formattedMessages);
    }

    setIsLoading(false);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [orderId, userId]);

  // Load profile dan messages
  useEffect(() => {
    loadDriverProfile();
    if (orderId) {
      loadMessages();
    }
  }, [orderId, driverId, loadDriverProfile, loadMessages]);

  // Setup real-time subscription for messages + polling fallback
  useEffect(() => {
    if (!orderId) return;

    console.log('[ChatScootFood] Setting up real-time subscription for order:', orderId);

    channelRef.current = subscribeToMessages(orderId, (payload: any) => {
      console.log('[ChatScootFood] New message received via realtime:', payload);

      const newRow = payload.new;
      if (!newRow || !newRow.id) {
        console.log('[ChatScootFood] Invalid message payload, skipping');
        return;
      }

      const newMessage = {
        id: newRow.id,
        sender: 'driver' as const,
        text: newRow.text || newRow.chat || '',
        time: new Date(newRow.timestamp || newRow.tanggal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: newRow.imageUrl || newRow.image_url || null,
      };

      setMessages(prev => {
        if (prev.some(m => m.id === newRow.id)) {
          return prev;
        }

        const tempMessageIndex = prev.findIndex(m => m.text === newRow.text && m.sender === 'customer' && m.id.startsWith('temp-'));
        if (tempMessageIndex !== -1) {
          const updated = [...prev];
          updated[tempMessageIndex] = { ...newMessage, sender: 'customer' as const };
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
          .select('id, chat, tanggal, image_url')
          .eq('id_scoot_food', orderId)
          .order('tanggal', { ascending: true });

        if (error) {
          console.error('[ChatScootFood] Polling error:', error);
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

              // New message from driver
              updated.push({
                id: row.id,
                sender: 'driver' as const,
                text: row.chat || '',
                time: new Date(row.tanggal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                imageUrl: row.image_url || null,
              });
              hasNewMessages = true;
            });

            if (hasNewMessages) {
              console.log('[ChatScootFood] Polling found new messages');
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }

            return hasNewMessages ? updated : prev;
          });
        }
      } catch (err) {
        console.error('[ChatScootFood] Polling exception:', err);
      }
    };

    const pollingInterval = setInterval(pollMessages, 3000);

    return () => {
      clearInterval(pollingInterval);
      if (channelRef.current) {
        console.log('[ChatScootFood] Cleaning up subscription');
        unsubscribeFromMessages(channelRef.current);
      }
    };
  }, [orderId]);

  // Setup real-time subscription for order status changes + polling fallback
  useEffect(() => {
    if (!orderId) {
      console.log('[ChatScootFood] No orderId for order status subscription');
      return;
    }

    let isNavigating = false;
    let pollingInterval: NodeJS.Timeout | null = null;

    const handleStatusChange = (newStatus: string) => {
      if (isNavigating) return;

      // Jika driver click Selesai (waiting_confirmation), redirect ke konfirmasi sampai
      if (newStatus === 'waiting_confirmation') {
        isNavigating = true;
        console.log('[ChatScootFood] Driver marked complete! Redirecting to confirmation...');

        // Clear polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }

        // Cleanup subscriptions before navigate
        if (orderStatusChannelRef.current) {
          console.log('[ChatScootFood] Unsubscribing from order status');
          orderStatusChannelRef.current.unsubscribe();
        }
        if (channelRef.current) {
          console.log('[ChatScootFood] Unsubscribing from message channel');
          unsubscribeFromMessages(channelRef.current);
        }

        // Navigate to confirmation screen
        console.log('[ChatScootFood] Navigating to FoodValidasi');
        router.replace({
          pathname: '/screens/customer/ScootFoodCustomer/FoodValidasi',
          params: { orderId, userId }
        } as any);
      }
    };

    console.log('[ChatScootFood] Setting up order status subscription for order:', orderId);

    // Realtime subscription
    const subscription = subscribeToOrderStatus(orderId, (payload: any) => {
      console.log('[ChatScootFood] Order status changed via realtime:', payload);
      handleStatusChange(payload.new?.status);
    });

    orderStatusChannelRef.current = subscription;

    // Polling fallback - check every 3 seconds in case realtime fails
    const checkOrderStatus = async () => {
      if (isNavigating) return;

      try {
        const { data, error } = await supabase
          .from('scoot_food')
          .select('status')
          .eq('id', orderId)
          .single();

        if (!error && data) {
          console.log('[ChatScootFood] Polling check - current status:', data.status);
          handleStatusChange(data.status);
        }
      } catch (err) {
        console.error('[ChatScootFood] Polling error:', err);
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
        console.log('[ChatScootFood] Cleaning up order status subscription on unmount');
        orderStatusChannelRef.current.unsubscribe();
        orderStatusChannelRef.current = null;
      }
    };
  }, [orderId, userId, router]);

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
        {
          text: 'Kamera',
          onPress: () => launchCamera(),
        },
        {
          text: 'Galeri',
          onPress: () => launchGallery(),
        },
        {
          text: 'Batal',
          style: 'cancel',
        },
      ]
    );
  };

  // Launch camera to take photo
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

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      await uploadAndSendImage(result.assets[0].uri);
    } catch (error: any) {
      console.error('[ChatScootFood] Error launching camera:', error);
      Alert.alert('Error', 'Gagal membuka kamera');
    }
  };

  // Launch gallery to pick image
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

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      await uploadAndSendImage(result.assets[0].uri);
    } catch (error: any) {
      console.error('[ChatScootFood] Error picking image:', error);
      Alert.alert('Error', 'Gagal memilih gambar');
    }
  };

  // Upload image and send as chat message
  const uploadAndSendImage = async (imageUri: string) => {
    try {
      console.log('[ChatScootFood] Image selected:', imageUri);
      setIsUploadingImage(true);

      // Upload image to Supabase Storage
      const uploadResult = await uploadChatImage(orderId, imageUri, 'food');

      if (!uploadResult.success || !uploadResult.imageUrl) {
        Alert.alert('Upload Gagal', uploadResult.error || 'Gagal mengunggah gambar');
        setIsUploadingImage(false);
        return;
      }

      console.log('[ChatScootFood] Image uploaded:', uploadResult.imageUrl);

      // Add image message to UI immediately (optimistic)
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

      // Send to database with image URL
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
        console.error('[ChatScootFood] Failed to send image message:', sendResult.error);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        sentMessageIdsRef.current.delete(tempId);
      }

      setIsUploadingImage(false);
    } catch (error: any) {
      console.error('[ChatScootFood] Error uploading image:', error);
      Alert.alert('Error', 'Gagal mengunggah gambar');
      setIsUploadingImage(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !orderId || !userId) return;

    const messageText = inputText.trim();
    setInputText('');

    console.log('[ChatScootFood] Sending message:', messageText);

    // Add message to UI immediately (optimistic update)
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

    // Send to database
    const result = await sendMessage({
      orderId,
      message: messageText,
    });

    if (result.success && result.data && Array.isArray(result.data) && result.data[0]) {
      const inserted = result.data[0];
      // replace temp message id with real id returned from DB
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: inserted.id } : m));
      sentMessageIdsRef.current.delete(tempId);
      sentMessageIdsRef.current.add(inserted.id);
    } else {
      console.error('[ChatScootFood] Failed to send message:', result.error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      sentMessageIdsRef.current.delete(tempId);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        {/* Driver Profile Header - Tap untuk kembali ke Home */}
        <TouchableOpacity style={styles.driverHeader} onPress={() => router.replace('/screens/customer/HomeCustomer' as any)} activeOpacity={0.7}>
          <Image
            source={driverProfile.profile_image_url ? { uri: driverProfile.profile_image_url } : DriverImg}
            style={styles.driverAvatar}
          />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driverProfile.nama || driverName}</Text>
            <Text style={styles.driverDetails} numberOfLines={1}>
              {lokasiResto ? `Resto: ${lokasiResto}` : 'Driver ScootFood'}
            </Text>
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
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#33cc66" />
                  <Text style={styles.loadingText}>Memuat pesan...</Text>
                </View>
              ) : messages.length === 0 ? (
                <Text style={styles.emptyText}>Belum ada pesan. Mulai chat dengan driver!</Text>
              ) : (
                messages.map((msg) => (
                  <View key={msg.id} style={msg.sender === 'driver' ? styles.messageBubbleLeft : styles.messageBubbleRight}>
                    {/* Display image if exists */}
                    {msg.imageUrl && (
                      <Image
                        source={{ uri: msg.imageUrl }}
                        style={styles.chatImage}
                        resizeMode="cover"
                      />
                    )}
                    {/* Display text if exists */}
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
                  placeholder="Ketikkan pesan..."
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                />
                {/* Camera Button inside input */}
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
                fixedPrice={orderPrice}
                onRouteCalculated={(dist, dur, price) => {
                  // Route calculated (distance, duration available but not currently used)
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
  container: { flex: 1, backgroundColor: '#fff' },

  // Header styles
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  driverAvatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#000' },
  driverDetails: { fontSize: 12, color: '#666', marginTop: 2 },

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
    backgroundColor: '#fff',
  },
  messagesContainer: { flex: 1, padding: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: { color: '#666', textAlign: 'center', marginTop: 10 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 30 },

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
  timeRight: { alignSelf: 'flex-end', color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 6 },

  // Chat Image style
  chatImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 6,
  },

  // Input Bar styles
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

export default ChatScootFood;


