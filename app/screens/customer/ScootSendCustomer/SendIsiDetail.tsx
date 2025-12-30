import * as React from "react";
import { Text, StyleSheet, View, TouchableOpacity, Image, TextInput, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSendOrder } from '../../../../src/scootSendCustomer/scootSendMemesan';
import { kirimNotifikasi } from '../../../../src/notifications/notifikasiregister';
import { hasActiveOrderCustomer } from '../../../../src/utils/activeOrderChecker';

const IsiDetail = () => {
    const router = useRouter();
    const [namaPenerima, setNamaPenerima] = React.useState("");
    const [beratBarang, setBeratBarang] = React.useState("");
    const [kategoriBarang, setKategoriBarang] = React.useState("");
    const params = useLocalSearchParams();
    const fromParam = (params.from as string) || '';
    const toParam = (params.to as string) || '';
    const priceParam = Number(params.price as string) || 12000;
    const distanceParam = params.distance as string || '';
    const [isLoading, setIsLoading] = React.useState(false);

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.viewBg}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.push('/screens/customer/ScootSendCustomer/SendPilihLokasi')}
                        accessibilityLabel="Back"
                    >
                        <Text style={styles.backText}>←</Text>
                    </TouchableOpacity>

                    {/* Shopping Basket Image */}
                    <Image
                        source={require("../../../../assets/images/isi detail.png")}
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

                        {/* Tarif Section (Yellow) */}
                        <View style={styles.tarifSection}>
                            <Text style={styles.tarifLabel}>Tarif</Text>
                            <Text style={styles.tarifNominal}>Rp{priceParam.toLocaleString('id-ID')}</Text>
                        </View>

                        {/* Pesan Button (Green) */}
                        <TouchableOpacity
                            style={styles.pesanButton}
                            onPress={async () => {
                                // Validation
                                if (!namaPenerima || !beratBarang || !kategoriBarang) {
                                    Alert.alert('Perhatian', 'Mohon lengkapi semua data terlebih dahulu');
                                    return;
                                }

                                setIsLoading(true);
                                try {
                                    // Resolve customer id from AsyncStorage
                                    let customerId = null;
                                    try {
                                        const session = await AsyncStorage.getItem('userSession');
                                        if (session) {
                                            const parsed = JSON.parse(session);
                                            customerId = parsed.params?.userId || null;
                                        }
                                    } catch (_e) {
                                        // ignore
                                    }

                                    // Check for active order before creating new one (checks ALL services)
                                    if (customerId) {
                                        const activeCheck = await hasActiveOrderCustomer(customerId) as any;
                                        if (activeCheck.hasActive) {
                                            setIsLoading(false);
                                            Alert.alert(
                                                'Pesanan Aktif',
                                                `Kamu masih punya pesanan ${activeCheck.service} yang belum selesai. Selesaikan dulu sebelum pesan baru.`,
                                                [{ text: 'OK' }]
                                            );
                                            return;
                                        }
                                    }

                                    const result = await createSendOrder({
                                        customerId,
                                        lokasiJemput: decodeURIComponent(fromParam),
                                        lokasiTujuan: decodeURIComponent(toParam),
                                        namaPenerima,
                                        beratBarang,
                                        kategoriBarang,
                                        biaya: priceParam
                                    });

                                    if (result.success) {
                                        await kirimNotifikasi({
                                            title: 'Pesanan Dikirim',
                                            body: 'Pesanan ScootSend kamu sedang dicari driver.'
                                        });
                                        const created = result.data;
                                        // Resolve customer id used when creating order
                                        const finalCustomerId = customerId || created?.id_customer || null;
                                        // Navigate to the Send-specific waiting screen with params so subscription works
                                        router.replace({
                                            pathname: '/screens/customer/ScootSendCustomer/SendMenungguDriver',
                                            params: {
                                                orderId: created?.id,
                                                userId: finalCustomerId,
                                                lokasiJemput: decodeURIComponent(fromParam),
                                                lokasiTujuan: decodeURIComponent(toParam),
                                                biaya: priceParam,
                                                nama: namaPenerima
                                            }
                                        });
                                    } else {
                                        Alert.alert('Error', 'Gagal membuat pesanan: ' + result.error);
                                    }
                                } catch (err) {
                                    Alert.alert('Error', 'Terjadi kesalahan saat membuat pesanan');
                                    console.error(err);
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.pesanText}>Pesan</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </>
    );
};

const styles = StyleSheet.create({
    viewBg: {
        backgroundColor: "#fff",
        flex: 1
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
        paddingTop: 20
    },
    backButton: {
        position: "absolute",
        top: 20,
        left: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#4ab100",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3
    },
    backText: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff"
    },
    shoppingImage: {
        width: 220,
        height: 220,
        alignSelf: "center",
        marginTop: 60,
        marginBottom: 20
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#00633f",
        textAlign: "center",
        marginBottom: 30,
        paddingHorizontal: 40,
        fontFamily: "Montserrat-Bold"
    },
    form: {
        paddingHorizontal: 24,
        alignItems: "center"
    },
    input: {
        width: 320,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: '#4ab100',
        paddingHorizontal: 24,
        backgroundColor: '#fff',
        fontSize: 15,
        color: '#000',
        textAlign: 'center'
    },
    inputMargin: {
        marginTop: 16
    },
    tarifSection: {
        width: 320,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFD84A',
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 28,
        marginTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
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
        marginTop: 16,
        width: 320,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4ECB71',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3
    },
    pesanText: {
        fontSize: 18,
        fontWeight: "700",
        color: '#fff',
        fontFamily: "Inter-Regular"
    }
});

export default IsiDetail;