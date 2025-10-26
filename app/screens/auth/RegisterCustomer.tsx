import { router } from "expo-router";
import * as React from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { showAlert } from "../../../components/showAlert";
import { isNimMahasiswaUNS } from "../../../src/database/isNimMahasiswaUNS";
import { registerUserViaEdge } from "../../../src/database/registerUserViaEdge";


const RegisterCustomer = () => {
  const [nama, setNama] = React.useState("");
  const [jenisMotor, setJenisMotor] = React.useState("");
  const [nim, setNim] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [plat, setPlat] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);

  const handleRegister = async () => {
    if (!nim || !email || !password || !nama ) {
      showAlert("Lengkapi Data", "Semua field wajib diisi.");
      return;
    }
    setLoading(true);
    
    console.log("========================================");
    console.log("[RegisterCustomer] Starting registration...");
    console.log("[RegisterCustomer] NIM input:", nim, "Type:", typeof nim);
    
    // Cek NIM ke mahasiswa_uns
    console.log("[RegisterCustomer] Checking NIM in mahasiswa_uns...");
    const nimValid = await isNimMahasiswaUNS(nim);
    console.log("[RegisterCustomer] NIM validation result:", nimValid);
    
    if (!nimValid) {
      setLoading(false);
      console.error("[RegisterCustomer] NIM NOT VALID - tidak ditemukan di mahasiswa_uns");
      showAlert("NIM Tidak Valid", "NIM tidak terdaftar sebagai mahasiswa UNS.");
      return;
    }
    
    console.log("[RegisterCustomer] NIM VALID - proceeding to registerUserViaEdge...");
    const result = await registerUserViaEdge({ nim, email, password, nama, role: "customer" });
    setLoading(false);
    if (!result.success) {
      // Tampilkan warning jika ada error (email/NIM sudah digunakan)
      const errorMsg = result.error || "Terjadi kesalahan";
      if (errorMsg.toLowerCase().includes("email")) {
        showAlert("Email Sudah Digunakan", "Email ini sudah terdaftar. Silakan gunakan email lain.");
      } else if (errorMsg.toLowerCase().includes("nim")) {
        showAlert("NIM Sudah Digunakan", "NIM ini sudah digunakan untuk registrasi di aplikasi, baik sebagai customer maupun driver. Silakan gunakan NIM lain.");
      } else {
        showAlert("Gagal Daftar", errorMsg);
      }
      return;
    }
    // Jika berhasil, navigasi ke halaman konfirmasi email
    router.push({
      pathname: '/screens/auth/EmailConfirmation',
      params: {
        email: email,
        role: 'customer'
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.view}>
        <Text style={styles.title}>Sebelum pesen Anjem, isi ini dulu ya!</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukkin Nama kamu ..."
            placeholderTextColor="#c4bfbf"
            value={nama}
            onChangeText={setNama}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukin NIM kamu ..."
            placeholderTextColor="#c4bfbf"
            value={nim}
            onChangeText={setNim}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukin Email kamu ..."
            placeholderTextColor="#c4bfbf"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukkin Password kamu ..."
            placeholderTextColor="#c4bfbf"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword((v) => !v)}
          >
            <Text>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Loading..." : "Daftar"}</Text>
        </TouchableOpacity>
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Sudah punya akun?</Text>
          <TouchableOpacity onPress={() => router.push('/screens/auth/Login')}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Success */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.checkmarkContainer}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Pendaftaran Akun Pengguna kamu Berhasil!</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.push("/screens/auth/Login");
              }}
            >
              <Text style={styles.modalButtonText}>Kembali</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  view: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#4ab100",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
    inputContainer: {
      width: 310,
      height: 50,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: "#4ab100",
      marginBottom: 16,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      backgroundColor: "#fff",
      paddingHorizontal: 10,
    },
    input: {
      flex: 1,
      fontSize: 12,
      fontFamily: "Montserrat-Regular",
      color: "#000",
      textAlign: "center",
      backgroundColor: "#fff",
    },
    eyeIcon: {
      padding: 8,
    },
  button: {
    width: 120,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4ab100",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  loginContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loginText: {
    fontSize: 10,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginRight: 4,
  },
  loginLink: {
    color: "#4ab100",
    fontSize: 10,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: 320,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  checkmarkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4ab100",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  checkmark: {
    fontSize: 50,
    color: "#fff",
    fontWeight: "bold",
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  modalButton: {
    width: 200,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFD233",
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
});

export default RegisterCustomer;
