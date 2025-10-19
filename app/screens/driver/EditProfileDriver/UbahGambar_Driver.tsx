import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Alert, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getProfileImageUrl, uploadProfileImage } from "../../../../src/database/uploadProfileImage";

const UbahGambar_Driver = () => {
  const router = useRouter();
  const { nama, nim, email, jenisMotor, plat, userId, profileImageUrl } = useLocalSearchParams();

  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(
    typeof profileImageUrl === 'string' ? profileImageUrl : null
  );
  const [uploading, setUploading] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false); // Modal preview

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

  // Load foto profil saat pertama kali
  React.useEffect(() => {
    loadProfileImage();
  }, []);

  const loadProfileImage = async () => {
    if (userId && typeof userId === 'string') {
      const imageUrl = await getProfileImageUrl(userId, 'driver');
      if (imageUrl) {
        setCurrentImageUrl(imageUrl);
      }
    }
  };

  const handlePickImage = async () => {
    try {
      console.log('🖼️ Starting image selection...');
      
      // Minta permission untuk akses galeri
      console.log('📋 Requesting media library permissions...');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission result:', permissionResult);
      
      if (permissionResult.granted === false) {
        console.log('❌ Permission denied');
        Alert.alert("Permission Denied", "Anda perlu memberikan izin untuk mengakses galeri!");
        return;
      }

      console.log('✅ Permission granted, launching image picker...');
      
      // Buka image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      console.log('📸 Image picker result:', JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        console.log('✅ Image selected:', selectedImage.uri);
        console.log('📏 File size:', selectedImage.fileSize);
        
        // Cek ukuran file (max 5MB sesuai bucket setting)
        if (selectedImage.fileSize && selectedImage.fileSize > 5 * 1024 * 1024) {
          console.log('❌ File too large:', selectedImage.fileSize);
          Alert.alert("File Terlalu Besar", "Ukuran foto maksimal 5 MB!");
          return;
        }

        console.log('🚀 Starting upload...');
        console.log('User ID:', userId);
        
        // Upload foto
        setUploading(true);
        const uploadResult = await uploadProfileImage(
          userId as string, 
          selectedImage.uri, 
          'driver'
        );
        setUploading(false);
        
        console.log('📤 Upload result:', uploadResult);

        if (uploadResult.success) {
          console.log('✅ Upload successful! Image URL:', uploadResult.imageUrl);
          setCurrentImageUrl(uploadResult.imageUrl || null);
          
          // Update session dengan URL foto baru
          const session = await AsyncStorage.getItem('userSession');
          if (session) {
            const sessionData = JSON.parse(session);
            sessionData.params.profileImageUrl = uploadResult.imageUrl;
            await AsyncStorage.setItem('userSession', JSON.stringify(sessionData));
            console.log('✅ Session updated with new image URL');
          }

          Alert.alert(
            "Berhasil!", 
            "Foto profil berhasil diubah!",
            [
              {
                text: "OK",
                onPress: () => router.back()
              }
            ]
          );
        } else {
          console.log('❌ Upload failed:', uploadResult.error);
          Alert.alert("Gagal Upload", uploadResult.error || "Terjadi kesalahan saat upload foto");
        }
      } else {
        console.log('❌ Image selection canceled or no image selected');
      }
    } catch (error) {
      setUploading(false);
      console.error('❌ Image select error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert("Error", `Gagal memilih gambar: ${errorMessage}`);
    }
  };

  const handleApply = () => {
    // Untuk sekarang, apply sama dengan back (foto sudah langsung terupload)
    router.back();
  };

  const handleBeranda = () => {
    router.replace({
      pathname: '/screens/driver/HomeDriver',
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
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <View style={[styles.view, styles.viewBg]}>
          
          {/* Profile Image - BISA DI KLIK UNTUK PREVIEW */}
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => setShowPreview(true)}
            activeOpacity={0.8}
          >
            {currentImageUrl ? (
              <Image 
                style={styles.iconProfil1} 
                source={{ uri: currentImageUrl }}
                resizeMode="cover" 
              />
            ) : (
              <Image 
                style={styles.iconProfil1} 
                source={require('../../../../assets/images/driver.png')}
                resizeMode="cover" 
              />
            )}
          </TouchableOpacity>

          {/* Ambil dari Gallery Button */}
          <TouchableOpacity 
            style={styles.child}
            onPress={handlePickImage}
            activeOpacity={0.7}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color="#016837" style={{ marginRight: 10 }} />
                <Text style={styles.ambilDariGallery}>Uploading...</Text>
              </>
            ) : (
              <>
                <Text style={styles.ambilDariGallery}>Ambil dari gallery</Text>
                <Text style={styles.galleryIcon}>🖼️</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Apply Button */}
          <TouchableOpacity 
            style={styles.roundedRectangle}
            onPress={handleApply}
            activeOpacity={0.8}
          >
            <Text style={styles.apply}>Apply</Text>
          </TouchableOpacity>

          {/* Bottom Navigation */}
          <View style={styles.item} />
          
          <TouchableOpacity 
            style={styles.berandaButton}
            onPress={handleBeranda}
            activeOpacity={0.7}
          >
            <Text style={styles.berandaIcon}>🏠</Text>
            <Text style={styles.beranda}>Beranda</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.riwayatButton}
            onPress={handleRiwayat}
            activeOpacity={0.7}
          >
            <Text style={styles.riwayatIcon}>🕐</Text>
            <Text style={styles.riwayat}>Riwayat</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.termsButton}
            onPress={handleTerms}
            activeOpacity={0.7}
          >
            <Text style={styles.termsIcon}>📋</Text>
            <Text style={styles.termsNCond}>Terms n Cond</Text>
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
                    source={require('../../../../assets/images/driver.png')}
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
    </>
  );
};

const styles = StyleSheet.create({
  viewBg: {
    backgroundColor: "#fff",
    flex: 1
  },
  view: {
    width: "100%",
    height: 852,
    overflow: "hidden"
  },
  imageContainer: {
    alignItems: "center",
    marginTop: 80
  },
  iconProfil1: {
    width: 271,
    height: 271,
    borderRadius: 40,
    backgroundColor: "#f5f5f5",
    borderWidth: 3,
    borderColor: "#016837",
    justifyContent: "center",
    alignItems: "center"
  },
  profilePlaceholder: {
    fontSize: 120,
    color: "#016837"
  },
  child: {
    marginLeft: -136.5,
    top: 485,
    borderRadius: 26,
    borderColor: "#016837",
    height: 64,
    width: 271,
    borderWidth: 1,
    borderStyle: "solid",
    left: "50%",
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff"
  },
  ambilDariGallery: {
    color: "#5a2736",
    textAlign: "center",
    fontFamily: "Montserrat-Regular",
    fontSize: 18,
    lineHeight: 22,
    marginRight: 10
  },
  galleryIcon: {
    fontSize: 22
  },
  roundedRectangle: {
    top: 629,
    left: 197,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 21,
    backgroundColor: "#33cc66",
    borderColor: "rgba(1, 104, 55, 0.4)",
    borderWidth: 1,
    borderStyle: "solid",
    width: 155,
    height: 43,
    position: "absolute",
    justifyContent: "center",
    alignItems: "center"
  },
  apply: {
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 22
  },
  item: {
    top: 751,
    left: 29,
    borderRadius: 18,
    backgroundColor: "#d2ffde",
    width: 108,
    height: 71,
    position: "absolute"
  },
  berandaButton: {
    position: "absolute",
    top: 758,
    left: 63,
    alignItems: "center"
  },
  berandaIcon: {
    fontSize: 32,
    marginBottom: 5
  },
  beranda: {
    color: "#016837",
    fontSize: 10,
    textAlign: "center",
    fontFamily: "Montserrat-Regular",
    lineHeight: 22
  },
  riwayatButton: {
    position: "absolute",
    top: 759,
    left: 185,
    alignItems: "center"
  },
  riwayatIcon: {
    fontSize: 32,
    marginBottom: 5
  },
  riwayat: {
    top: 795,
    color: "#016837",
    fontSize: 10,
    textAlign: "center",
    fontFamily: "Montserrat-Regular",
    lineHeight: 22,
    position: "absolute"
  },
  termsButton: {
    position: "absolute",
    top: 761,
    left: 307,
    alignItems: "center"
  },
  termsIcon: {
    fontSize: 30,
    marginBottom: 5
  },
  termsNCond: {
    top: 795,
    color: "#016837",
    fontSize: 10,
    textAlign: "center",
    fontFamily: "Montserrat-Regular",
    lineHeight: 22,
    position: "absolute"
  },
  // Modal Preview Styles
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

export default UbahGambar_Driver;