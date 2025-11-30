import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function TestNotification() {
  const handleTestNotification = async () => {
    try {
      // Muat modul notifikasi secara dinamis
      const { default: notifikasiregister } = await import('../src/notifications/notifikasiregister');
      await notifikasiregister({
        title: 'Tes Notifikasi',
        body: 'Ini adalah notifikasi tes untuk memeriksa apakah notifikasi berfungsi.'
      });
    } catch (error) {
      console.warn('TestNotification: error', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tes Notifikasi</Text>
      <TouchableOpacity style={styles.button} onPress={handleTestNotification}>
        <Text style={styles.buttonText}>Kirim Notifikasi Tes</Text>
      </TouchableOpacity>
      <Text style={styles.instruction}>
        Tekan tombol di atas untuk menguji notifikasi. Periksa console dan device untuk melihat hasilnya.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
});