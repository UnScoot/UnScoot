import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../../src/database/supabase";

interface HistoryItem {
  id: string;
  type: 'ScootFood' | 'ScootRide' | 'ScootSend';
  pickup: string;
  destination: string;
  date: string;
  rawDate: string; // Original ISO date for proper timezone handling
  price: string;
  status: string;
  driverName?: string;
  // Additional details
  detailPesanan?: string; // For ScootFood
  namaPenerima?: string;  // For ScootSend
  berat?: string;         // For ScootSend
  kategoriBarang?: string; // For ScootSend
}

const Riwayat_Customer = () => {
  const router = useRouter();
  const { nama, nim, email, userId: userIdParam } = useLocalSearchParams();

  const [filterType, setFilterType] = React.useState<'All' | 'ScootFood' | 'ScootRide' | 'ScootSend'>('All');
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [historyData, setHistoryData] = React.useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string>('');

  // Buat object params untuk pass ke semua screen
  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    userId: userId || ''
  };

  // Resolve userId
  React.useEffect(() => {
    const resolveUserId = async () => {
      let finalUserId = userIdParam as string;
      console.log('[Riwayat_Customer] Starting userId resolution...');
      console.log('[Riwayat_Customer] userIdParam:', userIdParam);

      if (!finalUserId) {
        try {
          const userSession = await AsyncStorage.getItem('userSession');
          console.log('[Riwayat_Customer] AsyncStorage userSession:', userSession ? 'found' : 'null');
          if (userSession) {
            const session = JSON.parse(userSession);
            console.log('[Riwayat_Customer] Session params:', JSON.stringify(session.params));
            finalUserId = session.params?.userId;
          }
        } catch (e) {
          console.warn('[Riwayat_Customer] Error reading AsyncStorage:', e);
        }
      }

      if (!finalUserId) {
        try {
          console.log('[Riwayat_Customer] Trying Supabase auth...');
          const { data } = await supabase.auth.getUser();
          finalUserId = data?.user?.id || '';
          console.log('[Riwayat_Customer] Supabase auth userId:', finalUserId);
        } catch (e) {
          console.warn('[Riwayat_Customer] Error getting supabase user:', e);
        }
      }

      console.log('[Riwayat_Customer] ✅ Final userId:', finalUserId);
      setUserId(finalUserId || '');
    };

    resolveUserId();
  }, [userIdParam]);

  // Load history data from Supabase
  React.useEffect(() => {
    const loadHistory = async () => {
      if (!userId) {
        console.log('[Riwayat_Customer] No userId, skipping load');
        return;
      }

      console.log('[Riwayat_Customer] Loading history for userId:', userId);
      setIsLoading(true);
      const allHistory: HistoryItem[] = [];

      try {
        // Helper function to format date with correct timezone (WIB/UTC+7)
        // Supabase returns timestamp without 'Z', so JS parses as local time
        // We need to append 'Z' to force UTC interpretation, then add WIB offset
        const formatDate = (isoDate: string) => {
          if (!isoDate) return '-';
          // Ensure the date is parsed as UTC by appending 'Z' if not present
          const utcDateStr = isoDate.endsWith('Z') ? isoDate : isoDate + 'Z';
          const date = new Date(utcDateStr);
          // Add 7 hours for WIB (UTC+7)
          const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
          const day = wibDate.getUTCDate();
          const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          const month = months[wibDate.getUTCMonth()];
          const year = wibDate.getUTCFullYear();
          return `${day} ${month} ${year}`;
        };

        // Load ScootFood orders - include detail_pesanan
        const { data: foodOrders, error: foodError } = await supabase
          .from('scoot_food')
          .select('id, lokasi_resto, lokasi_tujuan, tanggal, biaya, status, detail_pesanan, driver:id_driver(nama)')
          .eq('id_customer', userId)
          .in('status', ['completed', 'cancelled'])
          .order('tanggal', { ascending: false })
          .limit(20);

        console.log('[Riwayat_Customer] ScootFood query result:', { count: foodOrders?.length, error: foodError?.message });

        if (!foodError && foodOrders) {
          foodOrders.forEach((order: any) => {
            allHistory.push({
              id: order.id,
              type: 'ScootFood',
              pickup: order.lokasi_resto || 'Restaurant',
              destination: order.lokasi_tujuan || 'Lokasi Customer',
              date: formatDate(order.tanggal),
              rawDate: order.tanggal || '',
              price: order.biaya ? `Rp${Number(order.biaya).toLocaleString('id-ID')}` : '-',
              status: order.status === 'completed' ? 'Selesai' : 'Dibatalkan',
              driverName: order.driver?.nama || 'Driver',
              detailPesanan: order.detail_pesanan || ''
            });
          });
        }

        // ScootRide - columns: lokasi_jemput, lokasi_tujuan
        const { data: rideOrders, error: rideError } = await supabase
          .from('scoot_ride')
          .select('id, lokasi_jemput, lokasi_tujuan, tanggal, biaya, status, driver:id_driver(nama)')
          .eq('id_customer', userId)
          .in('status', ['completed', 'cancelled'])
          .order('tanggal', { ascending: false })
          .limit(20);

        console.log('[Riwayat_Customer] ScootRide query result:', { count: rideOrders?.length, error: rideError?.message });

        if (!rideError && rideOrders) {
          rideOrders.forEach((order: any) => {
            allHistory.push({
              id: order.id,
              type: 'ScootRide',
              pickup: order.lokasi_jemput || 'Lokasi Jemput',
              destination: order.lokasi_tujuan || 'Lokasi Tujuan',
              date: formatDate(order.tanggal),
              rawDate: order.tanggal || '',
              price: order.biaya ? `Rp${Number(order.biaya).toLocaleString('id-ID')}` : '-',
              status: order.status === 'completed' ? 'Selesai' : 'Dibatalkan',
              driverName: order.driver?.nama || 'Driver'
            });
          });
        }

        // ScootSend - include nama_penerima, berat, kategori_barang for details
        const { data: sendOrders, error: sendError } = await supabase
          .from('scoot_send')
          .select('id, lokasi_jemput_barang, lokasi_tujuan, tanggal, biaya, status, nama_penerima, berat, kategori_barang, driver:id_driver(nama)')
          .eq('id_customer', userId)
          .in('status', ['completed', 'cancelled'])
          .order('tanggal', { ascending: false })
          .limit(20);

        console.log('[Riwayat_Customer] ScootSend query result:', { count: sendOrders?.length, error: sendError?.message });

        if (!sendError && sendOrders) {
          sendOrders.forEach((order: any) => {
            allHistory.push({
              id: order.id,
              type: 'ScootSend',
              pickup: order.lokasi_jemput_barang || 'Lokasi Jemput',
              destination: order.lokasi_tujuan || 'Lokasi Tujuan',
              date: formatDate(order.tanggal),
              rawDate: order.tanggal || '',
              price: order.biaya ? `Rp${Number(order.biaya).toLocaleString('id-ID')}` : '-',
              status: order.status === 'completed' ? 'Selesai' : 'Dibatalkan',
              driverName: order.driver?.nama || 'Driver',
              namaPenerima: order.nama_penerima || '',
              berat: order.berat || '',
              kategoriBarang: order.kategori_barang || ''
            });
          });
        }

        // Sort by rawDate (most recent first)
        allHistory.sort((a, b) => {
          return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
        });

        console.log('[Riwayat_Customer] Total history items:', allHistory.length);
        setHistoryData(allHistory);
      } catch (error) {
        console.error('[Riwayat_Customer] Error loading history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [userId]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        {/* Filter Button */}
        <View style={styles.filterButtonContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={styles.filterButtonText}>{filterType}</Text>
            <Text style={styles.filterDropdownIcon}>▼</Text>
          </TouchableOpacity>

          {/* Dropdown Menu */}
          {showDropdown && (
            <View style={styles.dropdownMenu}>
              {['All', 'ScootFood', 'ScootRide', 'ScootSend'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dropdownItem,
                    filterType === option && styles.dropdownItemActive
                  ]}
                  onPress={() => {
                    setFilterType(option as any);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    filterType === option && styles.dropdownItemTextActive
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#33cc66" />
              <Text style={styles.loadingText}>Memuat riwayat...</Text>
            </View>
          ) : historyData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Belum ada riwayat pesanan</Text>
              <Text style={styles.emptySubtext}>Pesanan yang sudah selesai akan muncul di sini</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {historyData
                .filter((item) => filterType === 'All' || item.type === filterType)
                .map((item) => (
                  <TouchableOpacity
                    key={`${item.type}-${item.id}`}
                    style={styles.historyCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      router.push({
                        pathname: '/screens/customer/OrderDetailHistoryCustomer',
                        params: {
                          orderId: item.id,
                          orderType: item.type,
                          pickup: item.pickup,
                          destination: item.destination,
                          driverName: item.driverName || 'Driver',
                          price: item.price,
                          date: item.date,
                          status: item.status,
                          // Additional details based on order type
                          detailPesanan: item.detailPesanan || '',
                          namaPenerima: item.namaPenerima || '',
                          berat: item.berat || '',
                          kategoriBarang: item.kategoriBarang || ''
                        }
                      });
                    }}
                  >
                    {/* Left Section - Image */}
                    <View style={styles.imageContainer}>
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderText}>
                          {item.type === 'ScootFood' ? '🍔' : item.type === 'ScootRide' ? '🛵' : '📦'}
                        </Text>
                      </View>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{item.type}</Text>
                      </View>
                    </View>

                    {/* Middle Section - Details */}
                    <View style={styles.detailsContainer}>
                      <View style={styles.locationRow}>
                        <View style={styles.dot} />
                        <Text style={styles.locationText}>{item.pickup}</Text>
                      </View>

                      <View style={styles.dividerLine} />

                      <View style={styles.locationRow}>
                        <View style={styles.dot} />
                        <Text style={styles.locationText}>{item.destination}</Text>
                      </View>

                      <Text style={styles.dateText}>{item.date}</Text>
                    </View>

                    {/* Right Section - Price & Status */}
                    <View style={styles.rightSection}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{item.status}</Text>
                      </View>
                      <Text style={styles.priceText}>{item.price}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.replace({
              pathname: '/screens/customer/HomeCustomer',
              params: userParams
            })}
            activeOpacity={0.7}
          >
            <View style={styles.navIconContainer}>
              <View style={styles.homeIcon}>
                <View style={styles.homeIconBase} />
                <View style={styles.homeIconRoof} />
              </View>
            </View>
            <Text style={styles.navText}>Beranda</Text>
          </TouchableOpacity>

          <View style={[styles.navItem, styles.navItemActive]}>
            <View style={styles.navIconContainerActive}>
              <View style={styles.historyIcon}>
                <View style={styles.historyIconCircle} />
                <View style={styles.historyIconHand} />
              </View>
            </View>
            <Text style={styles.navTextActive}>Riwayat</Text>
          </View>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.replace({
              pathname: '/screens/customer/TermsAndConditionCustomer',
              params: userParams
            })}
            activeOpacity={0.7}
          >
            <View style={styles.navIconContainer}>
              <View style={styles.termsIcon}>
                <View style={styles.termsIconPaper} />
                <View style={styles.termsIconLines} />
              </View>
            </View>
            <Text style={styles.navText}>Terms n Cond</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  filterButtonContainer: {
    position: "relative",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#33cc66",
    borderRadius: 21,
    paddingVertical: 12,
    paddingHorizontal: 25,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
    alignSelf: "flex-start",
    gap: 8,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  filterButtonText: {
    fontSize: 15,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
  },
  filterDropdownIcon: {
    fontSize: 12,
    color: "#fff",
    marginLeft: 8,
  },
  dropdownMenu: {
    position: "absolute",
    top: 58,
    left: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    minWidth: 140,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownItemActive: {
    backgroundColor: "#f0f8f5",
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: "Montserrat-SemiBold",
    fontWeight: "600",
    color: "#666",
  },
  dropdownItemTextActive: {
    color: "#33cc66",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
    fontFamily: "Montserrat-Regular",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
  },
  historyList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  historyCard: {
    backgroundColor: "#33cc66",
    borderRadius: 21,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
  },
  imageContainer: {
    alignItems: "center",
    gap: 6,
  },
  imagePlaceholder: {
    width: 92,
    height: 92,
    backgroundColor: "#fff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: 40,
  },
  typeBadge: {
    backgroundColor: "#fff",
    borderRadius: 33,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 9,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fe95a3",
    textAlign: "center",
  },
  detailsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#fff",
  },
  locationText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    flexShrink: 1,
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#fff",
    marginLeft: 15,
    width: "85%",
  },
  dateText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
  },
  rightSection: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  statusBadge: {
    backgroundColor: "#fe95a3",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  priceText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "right",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  navItem: {
    alignItems: "center",
    flex: 1,
  },
  navItemActive: {
    backgroundColor: "#d2ffde",
    borderRadius: 18,
    paddingVertical: 8,
  },
  navIconContainer: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  navIconContainerActive: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  homeIcon: {
    width: 28,
    height: 28,
    position: "relative",
  },
  homeIconBase: {
    width: 22,
    height: 18,
    borderWidth: 2.5,
    borderColor: "#016837",
    borderTopWidth: 0,
    position: "absolute",
    bottom: 0,
    left: 3,
  },
  homeIconRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#016837",
    position: "absolute",
    top: 0,
  },
  historyIcon: {
    width: 28,
    height: 28,
    position: "relative",
  },
  historyIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: "#016837",
  },
  historyIconHand: {
    width: 2,
    height: 9,
    backgroundColor: "#016837",
    position: "absolute",
    top: 7,
    left: 12,
  },
  termsIcon: {
    width: 24,
    height: 28,
    position: "relative",
  },
  termsIconPaper: {
    width: 22,
    height: 28,
    borderWidth: 2.5,
    borderColor: "#016837",
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  termsIconLines: {
    position: "absolute",
    top: 7,
    left: 4,
    width: 14,
    height: 12,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#016837",
  },
  navText: {
    fontSize: 10,
    color: "#016837",
    marginTop: 4,
    fontFamily: "Montserrat-Regular",
  },
  navTextActive: {
    fontSize: 10,
    color: "#016837",
    marginTop: 4,
    fontFamily: "Montserrat-Regular",
  },
});

export default Riwayat_Customer;
