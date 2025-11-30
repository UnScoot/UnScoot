// util notifikasi untuk registrasi: pakai modul native bila tersedia,
// fallback ke Alert atau console.log.

import { Alert, Platform, NativeModules } from 'react-native';

function getNotifications() {
  try {
    // Periksa NativeModules terlebih dahulu untuk menghindari memanggil
    // require('expo-notifications') pada environment yang hanya menyediakan
    // lapisan JS tetapi tidak memiliki native bridge. Memanggil require
    // pada kasus tersebut dapat langsung melempar error "Cannot find native module ...".
    if (Platform.OS !== 'web') {
      const nativePresent =
        Boolean(NativeModules?.ExpoPushTokenManager) ||
        Boolean(NativeModules?.ExponentPushTokenManager) ||
        Boolean(NativeModules?.ExpoNotifications);

      if (!nativePresent) {
        // Native bridge tidak ada — jangan require modul notifications
        console.log('notifikasiregister: Native bridge tidak ada, fallback ke Alert/console');
        return null;
      }
    }

    // Sekarang aman untuk me-require modul JS karena native bridge ada
    // eslint-disable-next-line global-require
    const Notifications = require('expo-notifications');

    // Pastikan API yang kita pakai tersedia; beberapa versi/edge-cases
    // mengekspos sebagian modul JS tanpa implementasi fungsi native.
    const hasApi =
      typeof Notifications.getPermissionsAsync === 'function' &&
      typeof Notifications.requestPermissionsAsync === 'function' &&
      typeof Notifications.scheduleNotificationAsync === 'function';

    if (!hasApi) {
      console.log('notifikasiregister: API tidak lengkap, fallback ke Alert/console');
      return null;
    }

    console.log('notifikasiregister: Modul native tersedia, akan gunakan notifikasi native');
    return Notifications;
  } catch (_err) {
    // Jika require gagal, catat untuk debugging dan fallback ke null
    // eslint-disable-next-line no-console
    console.warn('notifikasiregister: getNotifications error', _err);
    return null;
  }
}

// Setup handler & permissions untuk dipanggil saat app start
export async function setupNotifications() {
  console.log('notifikasiregister: setupNotifications dipanggil');
  const Notifications = getNotifications();
  if (!Notifications) {
    console.log('notifikasiregister: setupNotifications dilewati karena Notifications null');
    return;
  }

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS !== 'web') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('notifikasiregister: Permission status:', existingStatus);
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        console.log('notifikasiregister: Permission requested, status:', status);
      }
    }

    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      const importance = Notifications.AndroidImportance?.HIGH ?? 4;
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance,
      });
      console.log('notifikasiregister: Channel Android dibuat');
    }
    console.log('notifikasiregister: setupNotifications selesai');
  } catch (err) {
    console.warn('setupNotifications gagal:', err);
  }
}

async function notifikasiregister({
  title = 'Registrasi Berhasil',
  body = 'Akun Anda telah dibuat. Silakan cek email untuk verifikasi.',
} = {}) {
  console.log('notifikasiregister: dipanggil dengan title:', title);
  const Notifications = getNotifications();

  // Jika module native tidak ada, fallback ke Alert/console
  if (!Notifications || !Notifications.scheduleNotificationAsync) {
    console.log('notifikasiregister: fallback ke Alert/console');
    if (Platform && Platform.OS) {
      Alert.alert(title, body);
      return;
    }
    console.log(`${title} - ${body}`);
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('notifikasiregister: permission status:', existingStatus);
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('notifikasiregister: permission requested, final status:', finalStatus);
    }

    if (finalStatus !== 'granted') {
      console.log('notifikasiregister: permission tidak diberikan, fallback ke Alert');
      Alert.alert(title, body);
      return;
    }

    try {
      if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
        const importance = Notifications.AndroidImportance?.HIGH ?? 4;
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance,
        });
        console.log('notifikasiregister: channel Android dibuat');
      }
    } catch (_err) {
      console.warn('Gagal membuat/atur channel notifikasi Android', _err);
    }

    console.log('notifikasiregister: menjadwalkan notifikasi native');
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
    console.log('notifikasiregister: notifikasi native berhasil dijadwalkan');
    return;
  } catch (err) {
    console.warn('notifikasiregister: gagal menampilkan notifikasi', err);
    try {
      Alert.alert(title, body);
    } catch (_e) {
      console.log(`${title} - ${body}`);
    }
  }
}

export default notifikasiregister;
