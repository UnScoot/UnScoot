import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../../src/database/supabase";

const SCREEN_WIDTH = Dimensions.get('window').width;

interface HistoryItem {
  id: string;
  type: 'ScootFood' | 'ScootRide' | 'ScootSend';
  pickup: string;
  destination: string;
  date: string;
  rawDate: string;
  price: string;
  priceNumber: number;
  status: string;
  customerName?: string;
  // Additional details
  detailPesanan?: string;
  namaPenerima?: string;
  berat?: string;
  kategoriBarang?: string;
}

interface DailyEarning {
  date: string;
  dayName: string;
  total: number;
  scootFood: number;
  scootRide: number;
  scootSend: number;
}

const Riwayat_Driver = () => {
  const router = useRouter();
  const { nama, nim, email, jenisMotor, plat, userId: userIdParam } = useLocalSearchParams();
  const [filterType, setFilterType] = React.useState<'All' | 'ScootFood' | 'ScootRide' | 'ScootSend'>('All');
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [historyData, setHistoryData] = React.useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string>('');

  // Chart modal state
  const [showChartModal, setShowChartModal] = React.useState(false);
  const [chartFilter, setChartFilter] = React.useState<'All' | 'ScootFood' | 'ScootRide' | 'ScootSend'>('All');
  const [dailyEarnings, setDailyEarnings] = React.useState<DailyEarning[]>([]);

  // Buat object params untuk pass ke semua screen
  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    jenisMotor: jenisMotor || '',
    plat: plat || '',
    userId: userId || ''
  };

  // Resolve userId
  React.useEffect(() => {
    const resolveUserId = async () => {
      let finalUserId = userIdParam as string;
      console.log('[Riwayat_Driver] Starting userId resolution...');
      console.log('[Riwayat_Driver] userIdParam:', userIdParam);

      if (!finalUserId) {
        try {
          const userSession = await AsyncStorage.getItem('userSession');
          console.log('[Riwayat_Driver] AsyncStorage userSession:', userSession ? 'found' : 'null');
          if (userSession) {
            const session = JSON.parse(userSession);
            console.log('[Riwayat_Driver] Session params:', JSON.stringify(session.params));
            finalUserId = session.params?.userId;
          }
        } catch (e) {
          console.warn('[Riwayat_Driver] Error reading AsyncStorage:', e);
        }
      }

      if (!finalUserId) {
        try {
          console.log('[Riwayat_Driver] Trying Supabase auth...');
          const { data } = await supabase.auth.getUser();
          finalUserId = data?.user?.id || '';
          console.log('[Riwayat_Driver] Supabase auth userId:', finalUserId);
        } catch (e) {
          console.warn('[Riwayat_Driver] Error getting supabase user:', e);
        }
      }

      console.log('[Riwayat_Driver] ✅ Final userId:', finalUserId);
      setUserId(finalUserId || '');
    };

    resolveUserId();
  }, [userIdParam]);

  // Load history data from Supabase
  React.useEffect(() => {
    const loadHistory = async () => {
      if (!userId) {
        console.log('[Riwayat_Driver] No userId, skipping load');
        return;
      }

      console.log('[Riwayat_Driver] Loading history for userId:', userId);
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

        // ScootFood - include detail_pesanan
        const { data: foodOrders, error: foodError } = await supabase
          .from('scoot_food')
          .select('id, lokasi_resto, lokasi_tujuan, tanggal, biaya, status, detail_pesanan, customer:id_customer(nama)')
          .eq('id_driver', userId)
          .in('status', ['completed', 'cancelled'])
          .order('tanggal', { ascending: false })
          .limit(50);

        console.log('[Riwayat_Driver] ScootFood query result:', { count: foodOrders?.length, error: foodError?.message });

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
              priceNumber: order.status === 'completed' ? (Number(order.biaya) || 0) : 0,
              status: order.status === 'completed' ? 'Selesai' : 'Dibatalkan',
              customerName: order.customer?.nama || 'Customer',
              detailPesanan: order.detail_pesanan || ''
            });
          });
        }

        // ScootRide
        const { data: rideOrders, error: rideError } = await supabase
          .from('scoot_ride')
          .select('id, lokasi_jemput, lokasi_tujuan, tanggal, biaya, status, customer:id_customer(nama)')
          .eq('id_driver', userId)
          .in('status', ['completed', 'cancelled'])
          .order('tanggal', { ascending: false })
          .limit(50);

        console.log('[Riwayat_Driver] ScootRide query result:', { count: rideOrders?.length, error: rideError?.message });

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
              priceNumber: order.status === 'completed' ? (Number(order.biaya) || 0) : 0,
              status: order.status === 'completed' ? 'Selesai' : 'Dibatalkan',
              customerName: order.customer?.nama || 'Customer'
            });
          });
        }

        // ScootSend - include nama_penerima, berat, kategori_barang
        const { data: sendOrders, error: sendError } = await supabase
          .from('scoot_send')
          .select('id, lokasi_jemput_barang, lokasi_tujuan, tanggal, biaya, status, nama_penerima, berat, kategori_barang, customer:id_customer(nama)')
          .eq('id_driver', userId)
          .in('status', ['completed', 'cancelled'])
          .order('tanggal', { ascending: false })
          .limit(50);

        console.log('[Riwayat_Driver] ScootSend query result:', { count: sendOrders?.length, error: sendError?.message });

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
              priceNumber: order.status === 'completed' ? (Number(order.biaya) || 0) : 0,
              status: order.status === 'completed' ? 'Selesai' : 'Dibatalkan',
              customerName: order.customer?.nama || 'Customer',
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

        console.log('[Riwayat_Driver] Total history items:', allHistory.length);
        setHistoryData(allHistory);

        // Calculate daily earnings for chart
        calculateDailyEarnings(allHistory);
      } catch (error) {
        console.error('[Riwayat_Driver] Error loading history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [userId]);

  // Calculate daily earnings for the last 7 days
  const calculateDailyEarnings = (data: HistoryItem[]) => {
    const today = new Date();
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const earnings: DailyEarning[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      earnings.push({
        date: dateStr,
        dayName: dayNames[date.getDay()],
        total: 0,
        scootFood: 0,
        scootRide: 0,
        scootSend: 0
      });
    }

    // Sum up earnings per day
    data.forEach(item => {
      if (item.priceNumber > 0 && item.rawDate) {
        const itemDate = new Date(item.rawDate).toISOString().split('T')[0];
        const earning = earnings.find(e => e.date === itemDate);
        if (earning) {
          earning.total += item.priceNumber;
          if (item.type === 'ScootFood') earning.scootFood += item.priceNumber;
          if (item.type === 'ScootRide') earning.scootRide += item.priceNumber;
          if (item.type === 'ScootSend') earning.scootSend += item.priceNumber;
        }
      }
    });

    setDailyEarnings(earnings);
  };

  // Get filtered earnings based on chart filter
  const getFilteredEarnings = () => {
    return dailyEarnings.map(day => {
      if (chartFilter === 'All') return day.total;
      if (chartFilter === 'ScootFood') return day.scootFood;
      if (chartFilter === 'ScootRide') return day.scootRide;
      if (chartFilter === 'ScootSend') return day.scootSend;
      return day.total;
    });
  };

  // Get max value for chart scaling
  const getMaxEarning = () => {
    const filtered = getFilteredEarnings();
    return Math.max(...filtered, 1);
  };

  // Get total weekly earnings
  const getTotalWeeklyEarnings = () => {
    const filtered = getFilteredEarnings();
    return filtered.reduce((sum, val) => sum + val, 0);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        {/* Filter and Chart Buttons */}
        <View style={styles.topButtonsContainer}>
          {/* Filter Button - Left */}
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

          {/* Chart Button - Right */}
          <TouchableOpacity
            style={styles.chartButton}
            onPress={() => setShowChartModal(true)}
          >
            <Text style={styles.chartButtonText}>Analyst</Text>
          </TouchableOpacity>
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
                        pathname: '/screens/driver/OrderDetailHistory',
                        params: {
                          orderId: item.id,
                          orderType: item.type,
                          pickup: item.pickup,
                          destination: item.destination,
                          customerName: item.customerName || 'Customer',
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

        {/* Chart Modal */}
        <Modal
          visible={showChartModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowChartModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📊 Pendapatan Mingguan</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowChartModal(false)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Chart Filter */}
              <View style={styles.chartFilterContainer}>
                {['All', 'ScootFood', 'ScootRide', 'ScootSend'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.chartFilterButton,
                      chartFilter === option && styles.chartFilterButtonActive
                    ]}
                    onPress={() => setChartFilter(option as any)}
                  >
                    <Text style={[
                      styles.chartFilterText,
                      chartFilter === option && styles.chartFilterTextActive
                    ]}>
                      {option === 'All' ? '🔄' : option === 'ScootFood' ? '🍔' : option === 'ScootRide' ? '🛵' : '📦'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Total Weekly */}
              <View style={styles.totalWeeklyContainer}>
                <Text style={styles.totalWeeklyLabel}>Total 7 Hari Terakhir</Text>
                <Text style={styles.totalWeeklyValue}>
                  Rp {getTotalWeeklyEarnings().toLocaleString('id-ID')}
                </Text>
              </View>

              {/* Line Chart */}
              <View style={styles.chartContainer}>
                {/* Y-axis labels */}
                <View style={styles.yAxisContainer}>
                  <Text style={styles.yAxisLabel}>{Math.round(getMaxEarning() / 1000)}k</Text>
                  <Text style={styles.yAxisLabel}>{Math.round(getMaxEarning() / 2000)}k</Text>
                  <Text style={styles.yAxisLabel}>0</Text>
                </View>

                {/* Chart area */}
                <View style={styles.lineChartArea}>
                  {/* Grid lines */}
                  <View style={styles.gridLine} />
                  <View style={[styles.gridLine, { top: '50%' }]} />
                  <View style={[styles.gridLine, { top: '100%' }]} />

                  {/* Line and points */}
                  <View style={styles.lineContainer}>
                    {dailyEarnings.map((day, index) => {
                      const filtered = getFilteredEarnings();
                      const value = filtered[index];
                      const maxVal = getMaxEarning();
                      const y = maxVal > 0 ? ((maxVal - value) / maxVal) * 140 : 140;
                      const nextValue = filtered[index + 1];
                      const nextY = nextValue !== undefined && maxVal > 0
                        ? ((maxVal - nextValue) / maxVal) * 140
                        : y;

                      // Calculate line geometry
                      const dx = (SCREEN_WIDTH - 120) / 7;
                      const dy = (nextY - y);
                      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                      const length = Math.sqrt(dx * dx + dy * dy);

                      return (
                        <View key={day.date} style={[styles.pointWrapper, { left: index * dx }]}>
                          {/* Connection line to next point */}
                          {index < dailyEarnings.length - 1 && (
                            <View
                              style={[
                                styles.connectionLine,
                                {
                                  top: y + 4,
                                  width: length,
                                  transform: [
                                    { translateX: (dx - length) / 2 },
                                    { translateY: dy / 2 },
                                    { rotate: `${angle}deg` },
                                  ]
                                }
                              ]}
                            />
                          )}
                          {/* Data point */}
                          <View
                            style={[
                              styles.dataPoint,
                              {
                                top: y,
                                backgroundColor: chartFilter === 'ScootFood' ? '#ff7b7b' :
                                  chartFilter === 'ScootRide' ? '#7bcdff' :
                                    chartFilter === 'ScootSend' ? '#ffcd7b' : '#33cc66'
                              }
                            ]}
                          >
                            <View style={styles.dataPointInner} />
                          </View>
                          {/* Value label */}
                          <Text style={[styles.valueLabel, { top: y - 20 }]}>
                            {value >= 1000 ? `${Math.round(value / 1000)}k` : value > 0 ? value : ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* X-axis labels with dates */}
                  <View style={styles.xAxisContainer}>
                    {dailyEarnings.map((day, index) => {
                      const dateParts = day.date.split('-');
                      const displayDate = `${dateParts[2]}/${dateParts[1]}`;
                      return (
                        <View key={day.date} style={styles.xAxisItem}>
                          <Text style={styles.xAxisDay}>{day.dayName}</Text>
                          <Text style={styles.xAxisDate}>{displayDate}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Legend */}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ff7b7b' }]} />
                  <Text style={styles.legendText}>Food</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#7bcdff' }]} />
                  <Text style={styles.legendText}>Ride</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ffcd7b' }]} />
                  <Text style={styles.legendText}>Send</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#33cc66' }]} />
                  <Text style={styles.legendText}>All</Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.replace({
              pathname: '/screens/driver/HomeDriver',
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
              pathname: '/screens/driver/TermsAndConditionDriver',
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
    paddingHorizontal: 20,
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
    top: 48,
    left: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    minWidth: 120,
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
  filterTabContainer: {
    flexDirection: "row",
    gap: 0,
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  filterTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "#e0e0e0",
  },
  filterTabActive: {
    borderBottomColor: "#33cc66",
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: "Montserrat-SemiBold",
    fontWeight: "600",
    color: "#999",
    textAlign: "center",
  },
  filterTabTextActive: {
    color: "#33cc66",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
  },
  filterText: {
    fontSize: 17,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
  },
  filterIcon: {
    fontSize: 12,
    color: "#fff",
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
  // Top buttons container
  topButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
    zIndex: 1000,
  },
  // Chart button
  chartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff7b7b",
    borderRadius: 21,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chartButtonIcon: {
    fontSize: 16,
  },
  chartButtonText: {
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "600",
  },
  // Chart filter
  chartFilterContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  chartFilterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  chartFilterButtonActive: {
    backgroundColor: "#e8f5e9",
    borderColor: "#33cc66",
  },
  chartFilterText: {
    fontSize: 22,
  },
  chartFilterTextActive: {
    fontSize: 24,
  },
  // Total weekly
  totalWeeklyContainer: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#f8f8f8",
    padding: 16,
    borderRadius: 16,
  },
  totalWeeklyLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  totalWeeklyValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#33cc66",
  },
  // Line Chart
  chartContainer: {
    marginBottom: 20,
    flexDirection: 'row',
    height: 200,
  },
  yAxisContainer: {
    width: 30,
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginRight: 10,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
  },
  lineChartArea: {
    flex: 1,
    position: 'relative',
    height: '100%',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  lineContainer: {
    position: 'absolute',
    top: 20, // Add padding for points
    bottom: 20,
    left: 0,
    right: 0,
    height: 160, // Fixed height for calculation
  },
  pointWrapper: {
    position: 'absolute',
    width: 20, // touch target size
    height: '100%',
    alignItems: 'center',
    zIndex: 2,
  },
  connectionLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#e0e0e0',
    left: 10, // center of point
  },
  dataPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#33cc66',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    marginLeft: 5, // half width to center in wrapper
  },
  dataPointInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  valueLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
    width: 40,
    textAlign: 'center',
    left: -10, // Center text relative to point
  },
  xAxisContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  xAxisItem: {
    flex: 1,
    alignItems: 'center',
  },
  xAxisDay: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  xAxisDate: {
    fontSize: 9,
    color: '#999',
  },
  // Legend
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: "#666",
  },
});

export default Riwayat_Driver;