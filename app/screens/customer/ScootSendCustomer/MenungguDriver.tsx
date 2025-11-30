import * as React from "react";
import {Text, StyleSheet, View, TouchableOpacity, Image} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";

const MenungguDriver = () => {
    const router = useRouter();
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    
    useFocusEffect(
        React.useCallback(() => {
            // Timer starts ketika user masuk ke page ini
            timerRef.current = setTimeout(() => {
                router.push("/screens/customer/ScootSendCustomer/DetailDriver");
            }, 8000); // Auto navigate setelah 8 detik (sudah mendapatkan driver)
            
            // Cleanup: clear timer ketika user meninggalkan page
            return () => {
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                }
            };
        }, [router])
    );
  	
  	return (
    		<SafeAreaView style={styles.viewBg}>
      			<View style={styles.container}>
                {/* Title */}
                <Text style={styles.title}>Menunggu Driver</Text>

                {/* Waiting Image */}
                <Image 
                    source={require("../../../../assets/images/waiting.png")}
                    style={styles.waitingImage}
                    resizeMode="contain"
                />

                {/* Cancel Button */}
                <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => router.push("/screens/customer/HomeCustomer")}
                >
                    <Text style={styles.cancelButtonText}>Batalkan Pesanan</Text>
                </TouchableOpacity>
            </View>
    		</SafeAreaView>);
};

const styles = StyleSheet.create({
  	viewBg: {
    		backgroundColor: "#fff",
    		flex: 1
  	},
    container: {
        flex: 1,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#00633f",
        textAlign: "center",
        marginBottom: 40,
        fontFamily: "Montserrat-Bold"
    },
    waitingImage: {
        width: 180,
        height: 180,
        marginBottom: 5
    },
    cancelButton: {
        marginTop: 50,
        width: 300,
        height: 50,
        borderRadius: 34,
        backgroundColor: "#fe95a3",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 5
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000",
        fontFamily: "Inter-Regular"
    }
});

export default MenungguDriver;
