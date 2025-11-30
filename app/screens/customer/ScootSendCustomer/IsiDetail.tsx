import * as React from "react";
import {Text, StyleSheet, View, TouchableOpacity, Image, TextInput, ScrollView} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const IsiDetail = () => {
    const router = useRouter();
    const [namaPenerima, setNamaPenerima] = React.useState("");
    const [beratBarang, setBeratBarang] = React.useState("");
    const [kategoriBarang, setKategoriBarang] = React.useState("");
  	
  	return (
    		<SafeAreaView style={styles.viewBg}>
      			<ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Back Button */}
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.push('/screens/customer/ScootSendCustomer/PilihLokasi')}
                    accessibilityLabel="Back"
                >
                    <Image 
                        source={require("../../../../assets/images/back.svg")}
                        style={styles.backIcon} 
                        resizeMode="contain" 
                    />
                </TouchableOpacity>

                {/* Shopping Image */}
                <Image 
                    source={require("../../../../assets/images/shopping.png")}
                    style={styles.shoppingImage}
                    resizeMode="contain"
                />

                {/* Title */}
                <Text style={styles.title}>Yuk, isi detail barangmu terlebih dahulu!</Text>

                {/* Form Container */}
                <View style={styles.form}>
                    <TextInput
                        value={namaPenerima}
                        onChangeText={setNamaPenerima}
                        placeholder="Isikan nama penerima..."
                        placeholderTextColor="#999"
                        style={styles.input}
                    />

                    <TextInput
                        value={beratBarang}
                        onChangeText={setBeratBarang}
                        placeholder="Isikan berat barang (kg)..."
                        placeholderTextColor="#999"
                        keyboardType="decimal-pad"
                        style={[styles.input, styles.inputMargin]}
                    />

                    <TextInput
                        value={kategoriBarang}
                        onChangeText={setKategoriBarang}
                        placeholder="Kategori/jenis barang..."
                        placeholderTextColor="#999"
                        style={[styles.input, styles.inputMargin]}
                    />

                    {/* Tarif Section (Non-interactive, Yellow) */}
                    <View style={styles.tarifSection}>
                        <Text style={styles.tarifLabel}>Tarif</Text>
                        <Text style={styles.tarifNominal}>Rp12.000</Text>
                    </View>

                    {/* Pesan Button (Interactive, Green) */}
                    <TouchableOpacity 
                        style={styles.pesanButton}
                        onPress={() => router.push("/screens/customer/ScootSendCustomer/MenungguDriver")}
                    >
                        <Text style={styles.pesanText}>Pesan</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
    		</SafeAreaView>);
};

const styles = StyleSheet.create({
  	viewBg: {
    		backgroundColor: "#fff",
    		flex: 1
  	},
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40
    },
    backButton: {
        position: "absolute",
        top: 30,
        left: 24,
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10
    },
    backIcon: {
        width: 60,
        height: 60
    },
    shoppingImage: {
        width: 150,
        height: 150,
        alignSelf: "center",
        marginTop: 80,
        marginBottom: 20
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#00633f",
        textAlign: "center",
        marginBottom: 40,
        paddingHorizontal: 30,
        marginLeft: "auto",
        marginRight: "auto",
        width: "100%",
        fontFamily: "Montserrat-Bold"
    },
    form: {
        paddingHorizontal: 24,
        alignItems: "center"
    },
    input: {
        width: 300,
        height: 50,
        borderRadius: 34,
        borderWidth: 1,
        borderColor: '#4ab100',
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        fontSize: 16,
        color: '#000',
        textAlign: 'center',
        alignSelf: 'center'
    },
    inputMargin: {
        marginTop: 16
    },
    tarifSection: {
        width: 300,
        height: 50,
        borderRadius: 34,
        backgroundColor: '#ffd14a',
        borderWidth: 1,
        borderColor: '#ffd14a',
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        marginTop: 20,
        alignSelf: 'center'
    },
    tarifLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000",
        fontFamily: "Inter-Regular"
    },
    tarifNominal: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000",
        fontFamily: "Inter-Regular"
    },
    pesanButton: {
        marginTop: 20,
        width: 300,
        height: 50,
        borderRadius: 34,
        backgroundColor: '#33cc66',
        borderWidth: 1,
        borderColor: '#33cc66',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    pesanText: {
        fontFamily: 'Inter-Regular',
        fontSize: 18,
        fontWeight: "600",
        color: '#000'
    }
});

export default IsiDetail;
