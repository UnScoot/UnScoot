import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapWithRoute from "../../../components/MapWithRoute";
import { geocodeAddress } from "../../../src/utils/routingService";
import { supabase } from "../../../src/database/supabase";

interface ChatMessage {
  id: string;
  sender: 'driver' | 'customer';
  text: string;
  time: string;
  imageUrl?: string | null;
}

const OrderDetailHistory = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const {
    orderId,
    orderType,
    pickup,
    destination,
    customerName,
    price,
    date,
    status,
    // Additional details
    detailPesanan,
    namaPenerima,
    berat,
    kategoriBarang,
  } = params;

  // Map state
  const [pickupCoords, setPickupCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [destCoords, setDestCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoadingMap, setIsLoadingMap] = React.useState(false);

  // Chat state - fetched from Supabase
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = React.useState(true);

  // Fetch chat history from Supabase
  React.useEffect(() => {
    const fetchChatHistory = async () => {
      if (!orderId) {
        setIsLoadingChat(false);
        return;
      }

      setIsLoadingChat(true);
      try {
        // Determine chat table based on order type
        let chatTable = 'chat_ride';
        let orderIdColumn = 'id_scoot_ride';

        if (orderType === 'ScootFood') {
          chatTable = 'chat_food';
          orderIdColumn = 'id_scoot_food';
        } else if (orderType === 'ScootSend') {
          chatTable = 'chat_send';
          orderIdColumn = 'id_scoot_send';
        }

        console.log(`[OrderDetailHistory-Driver] Fetching chat from ${chatTable} for order ${orderId}`);

        const { data, error } = await supabase
          .from(chatTable)
          .select('*')
          .eq(orderIdColumn, orderId)
          .order('tanggal', { ascending: true });

        if (error) {
          console.error('[OrderDetailHistory-Driver] Error fetching chat:', error);
        } else if (data) {
          console.log(`[OrderDetailHistory-Driver] Found ${data.length} chat messages`);
          const formattedMessages: ChatMessage[] = data.map((msg: any, index: number) => ({
            id: msg.id || `msg-${index}`,
            sender: index % 2 === 0 ? 'customer' : 'driver', // Alternate - driver sees customer first
            text: msg.chat || msg.text || '',
            time: msg.tanggal ? new Date(msg.tanggal).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Jakarta'
            }) : '',
            imageUrl: msg.image_url || null,
          }));
          setChatMessages(formattedMessages);
        }
      } catch (err) {
        console.error('[OrderDetailHistory-Driver] Exception fetching chat:', err);
      } finally {
        setIsLoadingChat(false);
      }
    };

    fetchChatHistory();
  }, [orderId, orderType]);

  // Geocode locations
  React.useEffect(() => {
    const loadCoordinates = async () => {
      setIsLoadingMap(true);
      try {
        const [pickupResult, destResult] = await Promise.all([
          geocodeAddress(pickup as string),
          geocodeAddress(destination as string),
        ]);
        if (pickupResult) setPickupCoords(pickupResult);
        if (destResult) setDestCoords(destResult);
      } catch (error) {
        console.error("Error geocoding:", error);
      } finally {
        setIsLoadingMap(false);
      }
    };

    if (pickup && destination) {
      loadCoordinates();
    }
  }, [pickup, destination]);

  const getServiceColor = () => {
    switch (orderType) {
      case 'ScootFood': return '#FFB84D';
      case 'ScootRide': return '#33cc66';
      case 'ScootSend': return '#6C63FF';
      default: return '#999';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'Selesai': return '#33cc66';
      case 'Dibatalkan': return '#FF6B6B';
      case 'Pending': return '#FFA500';
      default: return '#999';
    }
  };

  const formatPrice = (priceStr: any) => {
    if (!priceStr) return 'Rp 0';
    if (typeof priceStr === 'string') {
      if (priceStr.startsWith('Rp')) return priceStr;
      const num = parseInt(priceStr, 10);
      return `Rp ${num.toLocaleString('id-ID')}`;
    }
    return `Rp ${priceStr.toLocaleString('id-ID')}`;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Detail Pesanan</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: getServiceColor() }]}>
                <Text style={styles.badgeText}>{orderType}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.badgeText}>{status}</Text>
              </View>
            </View>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Customer Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>C</Text>
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardLabel}>Customer</Text>
                <Text style={styles.cardValue}>{customerName}</Text>
              </View>
            </View>
          </View>

          {/* Route Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rute Pengiriman</Text>
            <View style={styles.routeContainer}>
              {/* Pickup */}
              <View style={styles.routePoint}>
                <View style={styles.routeIndicator}>
                  <View style={[styles.routeDot, styles.routeDotGreen]} />
                  <View style={styles.routeLine} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>Jemput</Text>
                  <Text style={styles.routeAddress}>{pickup}</Text>
                </View>
              </View>
              {/* Destination */}
              <View style={styles.routePoint}>
                <View style={styles.routeIndicator}>
                  <View style={[styles.routeDot, styles.routeDotRed]} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>Antar</Text>
                  <Text style={styles.routeAddress}>{destination}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Order Details - ScootFood */}
          {orderType === 'ScootFood' && detailPesanan && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Detail Pesanan</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{detailPesanan}</Text>
              </View>
            </View>
          )}

          {/* Order Details - ScootSend */}
          {orderType === 'ScootSend' && (namaPenerima || berat || kategoriBarang) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Detail Pengiriman</Text>
              <View style={styles.itemsList}>
                {namaPenerima && (
                  <View style={styles.itemRow}>
                    <Text style={styles.itemName}>Nama Penerima</Text>
                    <Text style={styles.itemQty}>{namaPenerima}</Text>
                  </View>
                )}
                {berat && (
                  <View style={styles.itemRow}>
                    <Text style={styles.itemName}>Berat</Text>
                    <Text style={styles.itemQty}>{berat} kg</Text>
                  </View>
                )}
                {kategoriBarang && (
                  <View style={[styles.itemRow, styles.itemRowLast]}>
                    <Text style={styles.itemName}>Kategori</Text>
                    <Text style={styles.itemQty}>{kategoriBarang}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Price Card */}
          <View style={styles.priceCard}>
            <View style={styles.priceLeft}>
              <Text style={styles.priceLabel}>Total Biaya</Text>
              <Text style={styles.priceDate}>{date}</Text>
            </View>
            <Text style={styles.priceAmount}>{formatPrice(price)}</Text>
          </View>

          {/* Map Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Peta Rute</Text>
            {!isLoadingMap && pickupCoords && destCoords ? (
              <View style={styles.mapContainer}>
                <MapWithRoute
                  origin={pickupCoords}
                  destination={destCoords}
                  originLabel="Jemput"
                  destinationLabel="Antar"
                  hidePrice={true}
                />
              </View>
            ) : (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="small" color="#33cc66" />
                <Text style={styles.mapLoadingText}>Memuat peta...</Text>
              </View>
            )}
          </View>

          {/* Chat History - Fetched from Supabase */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Riwayat Chat</Text>
            {isLoadingChat ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="small" color="#33cc66" />
                <Text style={styles.mapLoadingText}>Memuat chat...</Text>
              </View>
            ) : chatMessages.length > 0 ? (
              <View style={styles.chatContainer}>
                {chatMessages.map((msg, idx) => (
                  <View key={msg.id || idx} style={[
                    styles.chatBubble,
                    msg.sender === 'driver' ? styles.chatDriver : styles.chatCustomer
                  ]}>
                    {msg.imageUrl && (
                      <Image source={{ uri: msg.imageUrl }} style={styles.chatImage} resizeMode="cover" />
                    )}
                    {msg.text ? (
                      <Text style={[
                        styles.chatText,
                        msg.sender === 'driver' ? styles.chatTextWhite : styles.chatTextDark
                      ]}>{msg.text}</Text>
                    ) : null}
                    <Text style={[
                      styles.chatTime,
                      msg.sender === 'driver' ? styles.chatTimeWhite : styles.chatTimeDark
                    ]}>{msg.time}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.mapLoadingText}>Tidak ada riwayat chat</Text>
            )}
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  scrollView: {
    flex: 1,
    paddingTop: 12,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  backIcon: {
    fontSize: 28,
    color: "#333",
    marginTop: -2,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Montserrat-SemiBold",
    fontWeight: "600",
    color: "#fff",
  },

  // Card Base
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 14,
  },

  // Customer Card
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#33cc66",
    justifyContent: "center",
    alignItems: "center",
  },
  cardIconText: {
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
  },
  cardHeaderText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    fontWeight: "500",
    color: "#999",
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
    fontWeight: "600",
    color: "#1a1a1a",
  },

  // Route
  routeContainer: {
    paddingLeft: 4,
  },
  routePoint: {
    flexDirection: "row",
    gap: 14,
  },
  routeIndicator: {
    alignItems: "center",
    width: 20,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeDotGreen: {
    backgroundColor: "#33cc66",
  },
  routeDotRed: {
    backgroundColor: "#FF6B6B",
  },
  routeLine: {
    width: 2,
    height: 40,
    backgroundColor: "#e0e0e0",
    marginVertical: 4,
  },
  routeInfo: {
    flex: 1,
    paddingBottom: 16,
  },
  routeLabel: {
    fontSize: 11,
    fontFamily: "Montserrat-SemiBold",
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  routeAddress: {
    fontSize: 14,
    fontFamily: "Montserrat-SemiBold",
    fontWeight: "600",
    color: "#1a1a1a",
    lineHeight: 20,
  },

  // Items
  itemsList: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemRowLast: {
    borderBottomWidth: 0,
  },
  itemName: {
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  itemQtyBadge: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemQty: {
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#33cc66",
  },

  // Notes
  notesBox: {
    backgroundColor: "#fff9e6",
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#ffb84d",
  },
  notesText: {
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
    fontWeight: "500",
    color: "#666",
    lineHeight: 20,
    fontStyle: "italic",
  },

  // Price Card
  priceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#33cc66",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
  },
  priceLeft: {},
  priceLabel: {
    fontSize: 12,
    fontFamily: "Montserrat-SemiBold",
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 2,
  },
  priceDate: {
    fontSize: 11,
    fontFamily: "Montserrat-Regular",
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
  priceAmount: {
    fontSize: 22,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
  },

  // Map
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  mapLoading: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    gap: 8,
  },
  mapLoadingText: {
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    fontWeight: "500",
    color: "#999",
  },

  // Chat
  chatContainer: {
    gap: 10,
  },
  chatBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: "80%",
  },
  chatDriver: {
    alignSelf: "flex-end",
    backgroundColor: "#33cc66",
    borderBottomRightRadius: 6,
  },
  chatCustomer: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 6,
  },
  chatText: {
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
    fontWeight: "500",
    lineHeight: 18,
  },
  chatTextWhite: {
    color: "#fff",
  },
  chatTextDark: {
    color: "#333",
  },
  chatTime: {
    fontSize: 10,
    fontFamily: "Montserrat-Regular",
    fontWeight: "500",
    marginTop: 4,
    textAlign: "right",
  },
  chatTimeWhite: {
    color: "rgba(255,255,255,0.7)",
  },
  chatTimeDark: {
    color: "#999",
  },
  chatImage: {
    width: 180,
    height: 135,
    borderRadius: 10,
    marginBottom: 6,
  },
});

export default OrderDetailHistory;