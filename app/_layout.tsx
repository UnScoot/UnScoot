import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
// Muat setupNotifications secara dinamis di useEffect supaya modul native
// tidak dipaksa di-load saat bundle entry dijalankan.
import 'react-native-reanimated';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Inisialisasi notifikasi (permission + handler) saat app start
  useEffect(() => {
    let mounted = true;

    async function initNotifs() {
      try {
        console.log('app/_layout: Memuat setupNotifications...');
        const mod = await import('../src/notifications/notifikasiregister');
        if (!mounted) return;
        if (mod?.setupNotifications) {
          console.log('app/_layout: setupNotifications ditemukan, menjalankan...');
          await mod.setupNotifications();
          console.log('app/_layout: setupNotifications selesai');
        } else {
          console.log('app/_layout: setupNotifications tidak ditemukan');
        }
      } catch (e) {
        // Jangan biarkan inisialisasi notifikasi crash app
        // Log saja untuk debugging
        // eslint-disable-next-line no-console
        console.warn('app/_layout: setupNotifications import failed:', e);
      }
    }

    initNotifs();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Auth Screens */}
        <Stack.Screen name="screens/auth/Login" options={{ headerShown: false }} />
        <Stack.Screen name="screens/auth/Role" options={{ headerShown: false }} />
        <Stack.Screen name="screens/auth/RegisterCustomer" options={{ headerShown: false }} />
        <Stack.Screen name="screens/auth/RegisterDriver" options={{ headerShown: false }} />
        <Stack.Screen name="screens/auth/StatusRegisterCustomer" options={{ headerShown: false }} />
        <Stack.Screen name="screens/auth/StatusRegisterDriver" options={{ headerShown: false }} />
        
        {/* Driver Screens */}
        <Stack.Screen name="screens/driver/HomeDriver" options={{ headerShown: false }} />
        
        {/* Customer Screens */}
        <Stack.Screen name="screens/customer/HomeCustomer" options={{ headerShown: false }} />

        {/* Test Screen */}
        <Stack.Screen name="TestNotification" options={{ title: 'Tes Notifikasi' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
