import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Order {
  id: string;
  status: 'on progress' | 'waiting' | 'completed';
  fromLocation: string;
  toLocation: string;
  fare: string;
  driverName: string;
  timestamp: string;
}

const PesananAktifCustomer: React.FC = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'ScootRide #20',
      status: 'on progress',
      fromLocation: 'Masjid Zayed',
      toLocation: 'UNS',
      fare: 'Rp 1.000',
      driverName: 'Nadia',
      timestamp: '11/19/2025, 6:38:48 AM',
    },
    {
      id: 'ScootFood #15',
      status: 'on progress',
      fromLocation: 'Restoran Ayam Geprek',
      toLocation: 'Rumah',
      fare: 'Rp 15.000',
      driverName: 'Budi',
      timestamp: '11/19/2025, 7:10:00 AM',
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on progress':
        return '#00b74a';
      case 'waiting':
        return '#ffc107';
      case 'completed':
        return '#28a745';
      default:
        return '#666';
    }
  };

  const renderOrderCard = (order: Order) => (
    <View key={order.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>{order.id}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) },
          ]}
        >
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.locationRow}>
          <Text style={styles.label}>Lokasi Jemput:</Text>
          <Text style={styles.value}>{order.fromLocation}</Text>
        </View>

        <View style={styles.locationRow}>
          <Text style={styles.label}>Lokasi Tujuan:</Text>
          <Text style={styles.value}>{order.toLocation}</Text>
        </View>

        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Tarif:</Text>
          <Text style={styles.fareValue}>{order.fare}</Text>
        </View>

        <View style={styles.driverRow}>
          <Text style={styles.label}>Driver:</Text>
          <Text style={styles.value}>{order.driverName}</Text>
        </View>

        <View style={styles.timestampRow}>
          <Text style={styles.timestampText}>{order.timestamp}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.chatButton}
        onPress={() =>
          router.push(`/screens/customer/ScootFood/FoodChat`)
        }
      >
        <Text style={styles.chatButtonText}>Chat Drivermu</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pesanan Aktif</Text>
      </View>

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {orders.length > 0 ? (
          orders.map((order) => renderOrderCard(order))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Tidak ada pesanan aktif</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { color: '#00b74a', fontSize: 14, fontWeight: '600', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000', flex: 1 },
  listContainer: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: { fontSize: 16, fontWeight: '700', color: '#000' },
  statusBadge: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardBody: { marginBottom: 12 },
  locationRow: { marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 12, color: '#666', fontWeight: '500' },
  value: { fontSize: 12, color: '#000', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 8 },
  fareRow: { marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  fareLabel: { fontSize: 14, fontWeight: '700', color: '#00b74a' },
  fareValue: { fontSize: 14, fontWeight: '700', color: '#00b74a' },
  driverRow: { marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  timestampRow: { marginTop: 6 },
  timestampText: { fontSize: 11, color: '#999' },
  chatButton: {
    backgroundColor: '#00b74a',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chatButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
});

export default PesananAktifCustomer;
