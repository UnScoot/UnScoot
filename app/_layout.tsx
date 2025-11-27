import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

export default function RootLayout() {
  const colorScheme = useColorScheme();

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

        {/* 🚀 ScootRide Customer Screens */}
        <Stack.Screen name="screens/customer/ScootRideCustomer/PilihLokasi" options={{ headerShown: false }} />
        <Stack.Screen name="screens/customer/ScootRideCustomer/MenungguDriver" options={{ headerShown: false }} />
        <Stack.Screen name="screens/customer/ScootRideCustomer/RideMendapatkanDriver" options={{ headerShown: false }} />
        <Stack.Screen name="screens/customer/ScootRideCustomer/ChatScootRide" options={{ headerShown: false }} />
        <Stack.Screen name="screens/customer/ScootRideCustomer/KonfirmasiSudahSampai" options={{ headerShown: false }} />
        <Stack.Screen name="screens/customer/ScootRideCustomer/BeriRatingDriverRide" options={{ headerShown: false }} />
        <Stack.Screen name="screens/customer/ScootRideCustomer/MisiBerhasil" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
