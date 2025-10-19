import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const UbahPassword_Customer = () => {
  const router = useRouter();
  const { nama, nim, email, userId } = useLocalSearchParams();

  const [passwordLama, setPasswordLama] = React.useState('');
  const [passwordBaru, setPasswordBaru] = React.useState('');
  const [verifikasiPassword, setVerifikasiPassword] = React.useState('');

  // Buat object params untuk pass ke semua screen
  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    userId: userId || ''
  };

  const handleBack = () => {
    router.back();
  };

  const handleBeranda = () => {
    router.replace({
      pathname: '/screens/customer/HomeCustomer',
      params: userParams
    });
  };

  const handleRiwayat = () => {
    router.replace({
      pathname: '/screens/customer/Riwayat_Customer',
      params: userParams
    });
  };

  const handleTerms = () => {
    router.replace({
      pathname: '/screens/customer/TermsAndConditionCustomer',
      params: userParams
    });
  };

  const handleSavePassword = () => {
    // Validasi input
    if (!passwordLama || !passwordBaru || !verifikasiPassword) {
      Alert.alert("Error", "Semua field harus diisi!");
      return;
    }

    if (passwordBaru !== verifikasiPassword) {
      Alert.alert("Error", "Password baru dan verifikasi password tidak cocok!");
      return;
    }

    if (passwordBaru.length < 6) {
      Alert.alert("Error", "Password baru minimal 6 karakter!");
      return;
    }

    // TODO: Implementasi update password ke Supabase
    Alert.alert(
      "Sukses",
      "Password berhasil diubah!",
      [
        {
          text: "OK",
          onPress: () => router.back()
        }
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <View style={[styles.view, styles.viewBg]}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.unionWrapper}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <View style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </View>
          </TouchableOpacity>

          {/* Password Lama */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password Lama</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan password lama"
              secureTextEntry
              value={passwordLama}
              onChangeText={setPasswordLama}
            />
          </View>

          {/* Password Baru */}
          <View style={[styles.inputContainer, { top: 280 }]}>
            <Text style={styles.label}>Password Baru</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan password baru"
              secureTextEntry
              value={passwordBaru}
              onChangeText={setPasswordBaru}
            />
          </View>

          {/* Verifikasi Password */}
          <View style={[styles.inputContainer, { top: 380 }]}>
            <Text style={styles.label}>Verifikasi Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan ulang password baru"
              secureTextEntry
              value={verifikasiPassword}
              onChangeText={setVerifikasiPassword}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSavePassword}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>Simpan</Text>
          </TouchableOpacity>

          {/* Bottom Navigation */}
          <View style={styles.child2} />
          
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
  unionWrapper: {
    top: 63,
    left: 27,
    position: "absolute"
  },
  backButton: {
    width: 49,
    height: 47,
    borderRadius: 25,
    backgroundColor: "#33cc66",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.8
  },
  backIcon: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold"
  },
  inputContainer: {
    marginLeft: -162.5,
    top: 180,
    width: 325,
    left: "50%",
    position: "absolute"
  },
  label: {
    fontSize: 16,
    color: "#016837",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    marginBottom: 10
  },
  input: {
    height: 50,
    borderColor: "#016837",
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: "Montserrat-Regular"
  },
  saveButton: {
    marginLeft: -162.5,
    top: 500,
    height: 50,
    width: 325,
    backgroundColor: "#016837",
    borderRadius: 25,
    left: "50%",
    position: "absolute",
    justifyContent: "center",
    alignItems: "center"
  },
  saveButtonText: {
    textAlign: "center",
    fontSize: 18,
    color: "#fff",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700"
  },
  child2: {
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
    fontFamily: "Montserrat-Regular",
    fontSize: 10,
    textAlign: "center",
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
    fontFamily: "Montserrat-Regular",
    fontSize: 10,
    textAlign: "center",
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
    fontFamily: "Montserrat-Regular",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 22,
    position: "absolute"
  }
});

export default UbahPassword_Customer;
