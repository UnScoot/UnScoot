import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const UbahPassword_Driver = () => {
  const router = useRouter();
  const { nama, nim, email, jenisMotor, plat, userId } = useLocalSearchParams();
  
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [verifikasiPassword, setVerifikasiPassword] = useState("");

  // Buat object params untuk pass ke semua screen
  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    jenisMotor: jenisMotor || '',
    plat: plat || '',
    userId: userId || ''
  };

  const handleApply = () => {
    if (!passwordLama || !passwordBaru || !verifikasiPassword) {
      Alert.alert("Error", "Semua field harus diisi!");
      return;
    }

    if (passwordBaru !== verifikasiPassword) {
      Alert.alert("Error", "Password baru dan verifikasi password tidak sama!");
      return;
    }

    if (passwordBaru.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter!");
      return;
    }

    // Handle password update logic here
    Alert.alert("Sukses", "Password berhasil diubah!");
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
          
          {/* Password Lama Field */}
          <View style={[styles.child, styles.itemLayout]}>
            <TextInput
              style={styles.inputText}
              placeholder="Password Lama"
              placeholderTextColor="#5a2736"
              secureTextEntry
              value={passwordLama}
              onChangeText={setPasswordLama}
            />
          </View>

          {/* Password Baru Field */}
          <View style={[styles.item, styles.itemLayout]}>
            <TextInput
              style={styles.inputText}
              placeholder="Password Baru"
              placeholderTextColor="#5a2736"
              secureTextEntry
              value={passwordBaru}
              onChangeText={setPasswordBaru}
            />
          </View>

          {/* Verifikasi Password Field */}
          <View style={[styles.inner, styles.itemLayout]}>
            <TextInput
              style={styles.inputText}
              placeholder="Verifikasi Password"
              placeholderTextColor="#5a2736"
              secureTextEntry
              value={verifikasiPassword}
              onChangeText={setVerifikasiPassword}
            />
            <Text style={styles.editIcon}>✏️</Text>
          </View>

          {/* Apply Button */}
          <TouchableOpacity 
            style={styles.roundedRectangle}
            onPress={handleApply}
            activeOpacity={0.8}
          >
            <Text style={styles.apply}>Apply</Text>
          </TouchableOpacity>

          {/* Bottom Navigation */}
          <View style={styles.rectangleView} />
          
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
  itemLayout: {
    height: 65,
    width: 325,
    borderColor: "#016837",
    borderRadius: 26,
    marginLeft: -164.5,
    borderWidth: 1,
    borderStyle: "solid",
    left: "50%",
    position: "absolute",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#fff"
  },
  child: {
    top: 212
  },
  item: {
    top: 319
  },
  inner: {
    top: 426,
    flexDirection: "row",
    alignItems: "center"
  },
  inputText: {
    flex: 1,
    textAlign: "center",
    color: "#5a2736",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22
  },
  editIcon: {
    fontSize: 20,
    position: "absolute",
    right: 20
  },
  roundedRectangle: {
    top: 622,
    left: 195,
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
    fontSize: 18,
    color: "#fff",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22
  },
  rectangleView: {
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

export default UbahPassword_Driver;