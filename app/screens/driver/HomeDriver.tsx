import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { BackHandler, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfileImageUrl } from '../../../src/database/uploadProfileImage';

const HomeDriver = () => {
  const { nama, nim, email, jenisMotor, plat, userId, profileImageUrl } = useLocalSearchParams();
  const router = useRouter();
  const displayName = nama || 'Nicholas';

  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(
    typeof profileImageUrl === 'string' ? profileImageUrl : null
  );
  const [showPreview, setShowPreview] = React.useState(false); // Modal preview foto

  const loadProfileImage = React.useCallback(async () => {
    if (userId && typeof userId === 'string') {
      const imageUrl = await getProfileImageUrl(userId, 'driver');
      if (imageUrl) {
        setCurrentImageUrl(imageUrl);
      }
    }
  }, [userId]);

  const scootRideImage = require('../../../assets/images/ScootRide.png');
  const scootFoodImage = require('../../../assets/images/ScootFood.png');
  const scootSendImage = require('../../../assets/images/ScootSend.png');

  // Handle tombol back Android - close app saat di Home
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp(); // Tutup aplikasi
        return true; // Prevent default behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [])
  );

  // Reload foto SETIAP KALI screen muncul (termasuk balik dari edit foto)
  useFocusEffect(
    React.useCallback(() => {
      loadProfileImage();
    }, [loadProfileImage])
  );


  // Buat object params untuk pass ke semua screen
  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    jenisMotor: jenisMotor || '',
    plat: plat || '',
    userId: userId || '',
    profileImageUrl: currentImageUrl || ''
  };

  // Navigation handlers
  const handleScootRide = () => {
    router.push({
      pathname: '/screens/driver/ScootRideDriver/Daftar_Pesanan_ScootRide_Off',
      params: userParams
    });
  };

  const handleScootFood = () => {
    router.push({
      pathname: '/screens/driver/ScootFoodDriver/Daftar_Pesanan_ScootFood_Off',
      params: userParams
    });
  };

  const handleScootSend = () => {
    router.push({
      pathname: '/screens/driver/ScootSendDriver/Daftar_Pesanan_ScootSend_Off',
      params: userParams
    });
  };

  const handleEditProfile = () => {
    router.push({
      pathname: '/screens/driver/EditProfileDriver/EditProfile_Driver',
      params: userParams
    });
  };

  const handleRiwayat = () => {
    router.replace({
      pathname: '/screens/driver/Riwayat_Driver',
      params: userParams
    });
  };

  const handleTerms = () => {
    router.replace({
      pathname: '/screens/driver/TermsAndConditionDriver',
      params: userParams
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header Section */}
        <View style={styles.header}>
          {/* AVATAR - BISA DI KLIK UNTUK PREVIEW */}
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => setShowPreview(true)}
            activeOpacity={0.8}
          >
            {currentImageUrl ? (
              <Image
                source={{ uri: currentImageUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require('../../../assets/images/driver.png')}
                style={styles.avatar}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Hai, {displayName}!</Text>
            <Text style={styles.subGreeting}>Semangat ngeUnScoot hari ini 🥰</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditProfile}
              activeOpacity={0.7}
            >
              <Text style={styles.editText}>Edit Profil</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <Text style={styles.question}>Mau ngapain hari ini?</Text>

          {/* ScootRide Card */}
          <TouchableOpacity style={styles.card} onPress={handleScootRide} activeOpacity={0.8}>
            <View style={styles.imageCircle}>
              <Image
                source={scootRideImage}
                style={styles.cardImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>ScootRide</Text>
              <Text style={styles.cardDesc}>Nebeng cepat, aman, dan</Text>
              <Text style={styles.cardDesc}>santai 😎</Text>
            </View>
            <View style={styles.arrowButton}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* ScootFood Card */}
          <TouchableOpacity style={styles.card} onPress={handleScootFood} activeOpacity={0.8}>
            <View style={styles.imageCircle}>
              <Image
                source={scootFoodImage}
                style={styles.cardImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>ScootFood</Text>
              <Text style={styles.cardDesc}>Antar makanan dengan</Text>
              <Text style={styles.cardDesc}>mudah 😋</Text>
            </View>
            <View style={styles.arrowButton}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* ScootSend Card */}
          <TouchableOpacity style={styles.card} onPress={handleScootSend} activeOpacity={0.8}>
            <View style={styles.imageCircle}>
              <Image
                source={scootSendImage}
                style={styles.cardImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>ScootSend</Text>
              <Text style={styles.cardDesc}>Kirim paket cepat, aman dan</Text>
              <Text style={styles.cardDesc}>terpercaya 📦</Text>
            </View>
            <View style={styles.arrowButton}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <View style={[styles.navItem, styles.navItemActive]}>
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>🏠</Text>
          </View>
          <Text style={styles.navText}>Beranda</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={handleRiwayat}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>🕒</Text>
          </View>
          <Text style={styles.navText}>Riwayat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={handleTerms}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>📋</Text>
          </View>
          <Text style={styles.navText}>Terms & Cond</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL PREVIEW FOTO FULL SCREEN */}
      <Modal
        visible={showPreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPreview(false)}
          >
            <View style={styles.modalContent}>
              {currentImageUrl ? (
                <Image 
                  source={{ uri: currentImageUrl }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : (
                <Image 
                  source={require('../../../assets/images/driver.png')}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowPreview(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
    scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  greetingContainer: {
    marginLeft: 15,
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#016837',
    fontFamily: 'Montserrat-Bold',
  },
  subGreeting: {
    fontSize: 12,
    color: '#016837',
    marginTop: 2,
    fontFamily: 'Montserrat-Regular',
  },
  editButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#016837',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  editText: {
    fontSize: 10,
    color: '#016837',
    fontFamily: 'Montserrat-Regular',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  question: {
    fontSize: 16,
    fontWeight: '700',
    color: '#016837',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Montserrat-Bold',
  },
  card: {
    backgroundColor: '#33cc66',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  imageCircle: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: 120,
    height: 120,
    transform: [{ scaleX: -1 }],
  },
  cardTextContainer: {
    flex: 1,
    paddingLeft: 16,
    paddingBottom: 8,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'Montserrat-Bold',
  },
  cardDesc: {
    fontSize: 12,
    color: '#fff',
    lineHeight: 18,
    fontFamily: 'Montserrat-Regular',
  },
  arrowButton: {
    width: 80,
    height: 32,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 8,
  },
  arrowText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navItemActive: {
    backgroundColor: '#d2ffde',
    borderRadius: 18,
    paddingVertical: 6,
  },
  navIcon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconText: {
    fontSize: 22,
  },
  navText: {
    fontSize: 10,
    color: '#016837',
    marginTop: 2,
    fontFamily: 'Montserrat-Regular',
  },
  // Modal Preview Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: -60,
    right: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
});

export default HomeDriver;