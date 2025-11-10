import { router, Stack, useLocalSearchParams } from "expo-router";
import * as React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { showAlert } from "../../../components/showAlert";
import { deleteUserByEmail } from "../../../src/database/deleteUserByEmail";

const EmailConfirmation = () => {
  const { email, role } = useLocalSearchParams();
  const [deleting, setDeleting] = React.useState(false);

  const handleChangeEmail = async () => {
    setDeleting(true);
    
    console.log("[EmailConfirmation] Deleting user with email:", email);
    
    const result = await deleteUserByEmail(email);
    
    setDeleting(false);
    
    if (result.success) {
      showAlert("Berhasil", "Akun berhasil dihapus. Silakan daftar ulang dengan email yang benar.");
      
      // Kembali ke halaman register sesuai role
      setTimeout(() => {
        if (role === 'customer') {
          router.replace('/screens/auth/RegisterCustomer');
        } else {
          router.replace('/screens/auth/RegisterDriver');
        }
      }, 1500);
    } else {
      showAlert("Error", result.error || "Gagal menghapus akun. Silakan coba lagi.");
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => router.push('/screens/auth/Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Email Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>✉️</Text>
            </View>
          </View>

          {/* Main Message */}
          <Text style={styles.mainMessage}>
            Cek inbox email kamu dan klik link untuk konfirmasi akun.
          </Text>

          {/* Email Display */}
          <Text style={styles.emailText}>{email || "email@example.com"}</Text>

          {/* Bottom Message */}
          <View style={styles.bottomMessageContainer}>
            <Text style={styles.bottomMessage}>
              Jika kamu salah ketik email, klik{" "}
            </Text>
            <TouchableOpacity onPress={handleChangeEmail} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator size="small" color="#4a9eff" />
              ) : (
                <Text style={styles.linkText}>disini</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.bottomMessage}> untuk mengubahnya.</Text>
          </View>

        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginVertical: 40,
    borderRadius: 20,
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
    fontWeight: "bold",
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#1abc9c",
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 80,
  },
  mainMessage: {
    fontSize: 17,
    color: "#4a4a4a",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 26,
    paddingHorizontal: 10,
    fontFamily: "Montserrat-Regular",
  },
  emailText: {
    fontSize: 16,
    color: "#2c2c2c",
    textAlign: "center",
    marginBottom: 60,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
  },
  bottomMessageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  bottomMessage: {
    fontSize: 14,
    color: "#9a9a9a",
    textAlign: "center",
    fontFamily: "Montserrat-Regular",
  },
  linkText: {
    fontSize: 14,
    color: "#4a9eff",
    textDecorationLine: "underline",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
  },
});

export default EmailConfirmation;
