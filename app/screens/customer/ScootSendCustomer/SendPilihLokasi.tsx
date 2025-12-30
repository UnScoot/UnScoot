import * as React from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import MapWithRoute from '../../../../components/MapWithRoute';
import { geocodeAddress } from '../../../../src/utils/routingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PilihLokasi = () => {
    const router = useRouter();
    const [lokasiSaatIni, setLokasiSaatIni] = useState("");
    const [lokasiTujuan, setLokasiTujuan] = useState("");
    const mapsImage = require("../../../../assets/images/maps.png");

    const [pickupCoords, setPickupCoords] = React.useState(null);
    const [destCoords, setDestCoords] = React.useState(null);
    const pickupTimerRef = React.useRef(null);
    const destTimerRef = React.useRef(null);
    const [isGeocodingPickup, setIsGeocodingPickup] = React.useState(false);
    const [isGeocodingDest, setIsGeocodingDest] = React.useState(false);
    const [calculatedPrice, setCalculatedPrice] = React.useState(12000);
    const [routeDistance, setRouteDistance] = React.useState(null);

    const goNext = async () => {
        // pass the values and calculated price to the next screen
        const from = encodeURIComponent(lokasiSaatIni);
        const to = encodeURIComponent(lokasiTujuan);
        router.push(`/screens/customer/ScootSendCustomer/SendIsiDetail?from=${from}&to=${to}&price=${calculatedPrice}&distance=${routeDistance ?? ''}`);
    };

    const tryParseCoords = (text: string) => {
        if (!text) return null;
        const trimmed = text.trim();
        // pattern: lat,lon
        const latlonMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
        if (latlonMatch) {
            const lat = parseFloat(latlonMatch[1]);
            const lon = parseFloat(latlonMatch[2]);
            if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
        }
        // try JSON like {"latitude":...,"longitude":...} or {"lat":...,"lng":...}
        try {
            const obj = JSON.parse(trimmed);
            if (obj && typeof obj === 'object') {
                const lat = obj.latitude ?? obj.lat ?? obj.latitiude ?? obj.latlng?.lat ?? obj.latLng?.lat;
                const lon = obj.longitude ?? obj.lng ?? obj.lon ?? obj.long ?? obj.latlng?.lng ?? obj.latLng?.lng;
                if (typeof lat === 'number' && typeof lon === 'number') return { latitude: lat, longitude: lon };
                // sometimes lat/lon are strings
                const latN = parseFloat(lat);
                const lonN = parseFloat(lon);
                if (!isNaN(latN) && !isNaN(lonN)) return { latitude: latN, longitude: lonN };
            }
        } catch (e) {
            // not JSON
        }
        return null;
    };

    // debounce geocoding pickup
    React.useEffect(() => {
        if (pickupTimerRef.current) clearTimeout(pickupTimerRef.current);
        if (!lokasiSaatIni.trim()) { setPickupCoords(null); return; }
        pickupTimerRef.current = setTimeout(async () => {
            setIsGeocodingPickup(true);
            let result = await geocodeAddress(lokasiSaatIni);
            if (!result) {
                const parsed = tryParseCoords(lokasiSaatIni);
                if (parsed) result = parsed;
            }
            if (result) setPickupCoords(result); else setPickupCoords(null);
            setIsGeocodingPickup(false);
        }, 800);
        return () => { if (pickupTimerRef.current) clearTimeout(pickupTimerRef.current); };
    }, [lokasiSaatIni]);

    // debounce geocoding destination
    React.useEffect(() => {
        if (destTimerRef.current) clearTimeout(destTimerRef.current);
        if (!lokasiTujuan.trim()) { setDestCoords(null); return; }
        destTimerRef.current = setTimeout(async () => {
            setIsGeocodingDest(true);
            let result = await geocodeAddress(lokasiTujuan);
            if (!result) {
                const parsed = tryParseCoords(lokasiTujuan);
                if (parsed) result = parsed;
            }
            if (result) setDestCoords(result); else setDestCoords(null);
            setIsGeocodingDest(false);
        }, 800);
        return () => { if (destTimerRef.current) clearTimeout(destTimerRef.current); };
    }, [lokasiTujuan]);

    const handleRouteCalculated = React.useCallback((distanceKm, _durationMin, price) => {
        setRouteDistance(distanceKm);
        setCalculatedPrice(price);
    }, []);

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.viewBg}>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Text style={styles.backArrow}>←</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.inputRow}>
                            <View style={styles.circle} />
                            <Pressable style={styles.inputBox} onPress={() => { }} android_ripple={{ color: 'rgba(0,0,0,0.03)' }}>
                                <TextInput
                                    style={styles.inputText}
                                    placeholder="Lokasi saat ini..."
                                    placeholderTextColor="#999"
                                    value={lokasiSaatIni}
                                    onChangeText={setLokasiSaatIni}
                                    returnKeyType="next"
                                />
                                {isGeocodingPickup && <ActivityIndicator size="small" color="#27AE60" style={{ marginLeft: 8 }} />}
                            </Pressable>
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.circle, { borderColor: '#fe95a3' }]} />
                            <Pressable style={[styles.inputBox, { borderColor: '#fe95a3' }]} onPress={() => { }} android_ripple={{ color: 'rgba(0,0,0,0.03)' }}>
                                <TextInput
                                    style={styles.inputText}
                                    placeholder="Lokasi tujuan..."
                                    placeholderTextColor="#999"
                                    value={lokasiTujuan}
                                    onChangeText={setLokasiTujuan}
                                    returnKeyType="done"
                                />
                                {isGeocodingDest && <ActivityIndicator size="small" color="#27AE60" style={{ marginLeft: 8 }} />}
                            </Pressable>
                        </View>

                        <View style={styles.mapCard}>
                            {pickupCoords && destCoords ? (
                                <MapWithRoute
                                    origin={pickupCoords}
                                    destination={destCoords}
                                    originLabel={lokasiSaatIni || 'Jemput'}
                                    destinationLabel={lokasiTujuan || 'Tujuan'}
                                    onRouteCalculated={handleRouteCalculated}
                                />
                            ) : (
                                <View style={styles.mapInner}>
                                    {(isGeocodingPickup || isGeocodingDest) ? (
                                        <View style={styles.mapLoadingContainer}>
                                            <ActivityIndicator size="small" color="#27AE60" />
                                            <Text style={styles.mapLoadingText}>Mencari lokasi...</Text>
                                        </View>
                                    ) : (
                                        <>
                                            <Image source={mapsImage} style={styles.mapImage} resizeMode="cover" />
                                            <View style={styles.mapOverlay}>
                                                <Text style={styles.mapOverlayText}>Masukkan lokasi untuk melihat rute</Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                            )}
                        </View>

                        <View style={styles.tarifRow}>
                            <View style={styles.tarifPill}>
                                <Text style={styles.tarifLabel}>Tarif</Text>
                                <Text style={styles.tarifValue}>{routeDistance !== null ? `Rp${calculatedPrice.toLocaleString('id-ID')} (${routeDistance.toFixed(1)} km)` : `Rp${calculatedPrice.toLocaleString('id-ID')}`}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.nextButton}
                            onPress={goNext}
                        >
                            <Text style={styles.nextButtonText}>Lanjut isi detail</Text>
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
    container: {
        flex: 1,
        backgroundColor: "#fff",
        paddingHorizontal: 24,
        paddingTop: 20
    },
    view: {
        width: "100%",
        height: 852,
        overflow: "hidden"
    },
    headerRow: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 18,
        flexDirection: 'row',
        alignItems: 'center'
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#33cc66',
        justifyContent: 'center',
        alignItems: 'center'
    },
    backArrow: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700'
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 18,
        alignItems: 'center'
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 12
    },
    circle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#33cc66',
        marginRight: 12
    },
    inputBox: {
        flex: 1,
        height: 46,
        borderRadius: 34,
        borderWidth: 1,
        borderColor: '#33cc66',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#fff'
    },
    inputText: {
        color: '#000',
        fontSize: 16,
        paddingVertical: 0,
        flex: 1
    },
    inputMargin: {
        marginTop: 8
    },
    mapContainer: {
        width: 300,
        height: 250,
        backgroundColor: "rgba(91, 211, 131, 0.3)",
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#4ab100',
        marginTop: 25,
        justifyContent: "center",
        alignItems: "center",
        padding: 10
    },
    mapsImage: {
        width: "100%",
        height: "100%",
        borderRadius: 16
    },
    mapCard: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        backgroundColor: '#e6f8ea',
        marginTop: 8,
        marginBottom: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
    },
    mapInner: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapImage: {
        width: '100%',
        height: '100%'
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    mapOverlayText: {
        color: '#fff',
        fontSize: 12,
        textAlign: 'center',
    },
    mapLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapLoadingText: {
        marginTop: 8,
        fontSize: 12,
        color: '#666',
    },
    tarifRow: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 8
    },
    tarifPill: {
        width: '100%',
        height: 48,
        borderRadius: 24,
        backgroundColor: '#ffd14a',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18
    },
    tarifLabel: {
        color: '#000',
        fontSize: 16
    },
    tarifValue: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600'
    },
    nextButton: {
        marginTop: 12,
        width: '100%',
        height: 48,
        borderRadius: 24,
        backgroundColor: '#33cc66',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700'
    },
    groupIcon: {
        top: 90,
        left: 35,
        width: 31,
        height: 12,
        position: "absolute"
    }
});

export default PilihLokasi;

