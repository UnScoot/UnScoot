import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, BackHandler, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfileImageUrl } from '../../../src/database/uploadProfileImage';

const HomeCustomer = () => {
  const { nama, nim, email, userId, profileImageUrl } = useLocalSearchParams();
  const router = useRouter();
  const displayName = nama || 'Nicholas';

  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(
    typeof profileImageUrl === 'string' ? profileImageUrl : null
  );
  const [showPreview, setShowPreview] = React.useState(false);

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

  useFocusEffect(
    React.useCallback(() => {
      loadProfileImage();
    }, [userId])
  );

  const loadProfileImage = async () => {
    if (userId && typeof userId === 'string') {
      const imageUrl = await getProfileImageUrl(userId, 'customer');
      if (imageUrl) {
        setCurrentImageUrl(imageUrl);
      }
    }
  };

  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    userId: userId || '',
    profileImageUrl: currentImageUrl || ''
  };

  const scootRideImage = require('../../../assets/images/ScootRide.png');
  const scootFoodImage = require('../../../assets/images/ScootFood.png');
  const scootSendImage = require('../../../assets/images/ScootSend.png');

  const handleScootRide = () => {
    try {
      router.push({
        pathname: '/screens/customer/ScootRideCustomer/PilihLokasi',
        params: userParams, // ini biar data user juga ikut dikirim
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Gagal membuka halaman ScootRide');
    }
  };


  const handleScootFood = () => {
    Alert.alert('ScootFood', 'Fitur ScootFood Customer sedang dalam pengembangan 🚧');
  };

  const handleScootSend = () => {
    Alert.alert('ScootSend', 'Fitur ScootSend Customer sedang dalam pengembangan 🚧');
  };

  const handleEditProfile = () => {
    console.log('Edit Profile clicked!', userParams);
    try {
      router.push({
        pathname: '/screens/customer/EditeProfileCustomer/EditProfile_Customer',
        params: userParams
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Gagal membuka Edit Profile');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
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
                source={require('../../../assets/images/Passenger.png')}
                style={styles.avatar}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
          
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Hai, {displayName}!</Text>
            <Text style={styles.subGreeting}>Semangat kuliahnya hari ini 🔥</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditProfile}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="edit-profile-button"
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
          onPress={() => router.replace({
            pathname: '/screens/customer/Riwayat_Customer',
            params: userParams
          })}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>🕒</Text>
          </View>
          <Text style={styles.navText}>Riwayat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.replace({
            pathname: '/screens/customer/TermsAndConditionCustomer',
            params: userParams
          })}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>📋</Text>
          </View>
          <Text style={styles.navText}>Terms & Cond</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Preview */}
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
                  source={require('../../../assets/images/Passenger.png')}
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
    backgroundColor: '#fff',
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFE5E5',
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
    color: '#000',
    fontFamily: 'Montserrat-Bold',
  },
  subGreeting: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'Montserrat-Regular',
  },
  editButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  editText: {
    fontSize: 10,
    color: '#4CAF50',
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
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Montserrat-Bold',
  },
  card: {
    backgroundColor: '#FFE5F0',
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#000',
    marginBottom: 4,
    fontFamily: 'Montserrat-Bold',
  },
  cardDesc: {
    fontSize: 12,
    color: '#666',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  navTextActive: {
    color: '#016837',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  previewImage: {
    width: '100%',
    height: '100%'
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
    alignItems: 'center'
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold'
  }
});

export default HomeCustomer;