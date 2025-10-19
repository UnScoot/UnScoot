// Helper untuk menampilkan notifikasi sederhana
import { Alert } from "react-native";

export function showAlert(title, message) {
  Alert.alert(title, message);
}
