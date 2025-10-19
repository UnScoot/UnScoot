
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { showAlert } from "../../../components/showAlert";
import { insertProfile } from "../../../src/database/insertProfile";
import { loginUser } from "../../../src/database/loginUser";

const Login = () => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [checkingSession, setCheckingSession] = React.useState(true);

  // Check session saat component mount
  React.useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('userSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        console.log("[Login] Found existing session, auto-login:", session.role);
        
        // Auto redirect ke halaman yang sesuai
        if (session.role === 'driver') {
          router.replace({
            pathname: '/screens/driver/HomeDriver',
            params: session.params
          });
        } else if (session.role === 'customer') {
          router.replace({
            pathname: '/screens/customer/HomeCustomer',
            params: session.params
          });
        }
      }
    } catch (error) {
      console.log("[Login] No existing session found");
    } finally {
      setCheckingSession(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("Lengkapi Data", "Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    const { user, error, needsEmailConfirmation } = await loginUser(email, password);
    setLoading(false);
    if (error) {
      showAlert("Login Gagal", error);
      return;
    }
    if (needsEmailConfirmation) {
      showAlert("Email Belum Dikonfirmasi", "Silakan cek email kamu untuk konfirmasi.");
      return;
    }
    // Ambil role dan data profile dari user metadata
    console.log("[Login] RAW user.user_metadata:", JSON.stringify(user.user_metadata, null, 2));
    
    const role = user.user_metadata?.role;
    const profile = {
      nim: user.user_metadata?.nim,
      nama: user.user_metadata?.nama,
      email: user.email,
      jenis_motor: user.user_metadata?.jenisMotor,
      plat_motor: user.user_metadata?.plat,
    };
    
    console.log("[Login] User data:", {
      id: user.id,
      email: user.email,
      confirmed_at: user.confirmed_at,
      role: role,
      profile: profile
    });
    
    // Insert ke tabel role jika belum ada (setelah verifikasi email)
    if (user && user.confirmed_at) {
      console.log("[Login] Email confirmed, attempting to insert profile...");
      const inserted = await insertProfile(user, role, profile);
      if (inserted) {
        console.log("[Login] Profile inserted successfully");
        
        // Simpan session
        const sessionParams = role === 'driver' ? {
          nama: profile.nama || 'Driver',
          nim: profile.nim || '',
          email: profile.email || '',
          jenisMotor: profile.jenis_motor || '',
          plat: profile.plat_motor || '',
          userId: user.id || ''
        } : {
          nama: profile.nama || 'Customer',
          nim: profile.nim || '',
          email: profile.email || '',
          userId: user.id || ''
        };

        await AsyncStorage.setItem('userSession', JSON.stringify({
          role: role,
          params: sessionParams
        }));

        // Redirect berdasarkan role dengan passing data lengkap
        if (role === 'driver') {
          console.log("[Login] Redirecting to HomeDriver with nama:", profile.nama);
          router.replace({
            pathname: '/screens/driver/HomeDriver',
            params: sessionParams
          });
        } else if (role === 'customer') {
          console.log("[Login] Redirecting to HomeCustomer with nama:", profile.nama);
          router.replace({
            pathname: '/screens/customer/HomeCustomer',
            params: sessionParams
          });
        } else {
          console.error("[Login] Unknown role:", role);
          showAlert("Login Berhasil", "Tapi role tidak dikenali. Hubungi admin.");
        }
      } else {
        console.error("[Login] Failed to insert profile");
        showAlert("Login Berhasil", "Tapi ada masalah saat menyimpan data. Coba login lagi.");
      }
    } else {
      showAlert("Login Berhasil", "Email belum terverifikasi. Silakan cek email kamu.");
    }
  };

  // Show loading saat check session
  if (checkingSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.view, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#016837" />
          <Text style={{ marginTop: 20, fontSize: 16, color: "#016837" }}>
            Checking session...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.view}>
        {/* Illustration */}
        <Image 
          style={styles.illustration} 
          source={require("../../../assets/images/logo.jpg")}
          resizeMode="contain"
        />
        {/* Title */}
        <Text style={styles.title}>Hey, Login dulu yuk!</Text>
        {/* Email Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukin Email kamu ..."
            placeholderTextColor="#c4bfbf"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        {/* Password Input */}
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
        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>
            Belum punya akun? 
          </Text>
          <TouchableOpacity onPress={() => router.push('/screens/auth/Role')}>
            <Text style={styles.registerLink}>Daftar</Text>
          </TouchableOpacity>
        </View>
        {/* Login Button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
          <Text style={styles.loginButtonText}>{loading ? "Loading..." : "Login"}</Text>
        </TouchableOpacity>
      </View>
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
  },
  
  // Status Bar
  statusBarIphone: {
    width: "100%",
    height: 44,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },
  time: {
    flex: 1,
  },
  timeText: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "SF Pro",
    color: "#000",
  },
  levels: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  battery: {
    width: 27,
    height: 13,
    position: "relative",
  },
  border: {
    position: "absolute",
    width: 25,
    height: "100%",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#000",
    opacity: 0.35,
    left: 0,
  },
  capacity: {
    position: "absolute",
    width: 21,
    height: "69%",
    borderRadius: 3,
    backgroundColor: "#000",
    left: 2,
    top: "15%",
  },

  // Main Content
  illustration: {
    width: 300,
    height: 300,
    marginTop: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#4ab100",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  
  // Input Fields
  inputContainer: {
    width: 310,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#4ab100",
    marginBottom: 16,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  input: {
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    color: "#000",
    textAlign: "center",
  },

  // Register Link
  registerContainer: {
    marginTop: 4,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  registerText: {
    fontSize: 10,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
  registerLink: {
    color: "#4ab100",
  },

  // Login Button
  loginButton: {
    width: 120,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4ab100",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  eyeIcon: {
    padding: 8,
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',

    height: '100%',
  },
});

export default Login;