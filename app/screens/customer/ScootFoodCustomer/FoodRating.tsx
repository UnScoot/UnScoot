import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateOrderRating, getOrderById } from '../../../../src/database/chatScootFood';

const FoodRating: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;

  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driverName, setDriverName] = useState<string | null>(null);

  // Load driver name
  React.useEffect(() => {
    const loadDriverName = async () => {
      if (!orderId) return;

      const result = await getOrderById(orderId);
      if (result.success && result.data && Array.isArray(result.data) && result.data[0]?.nama) {
        setDriverName(result.data[0].nama);
      }
    };

    loadDriverName();
  }, [orderId]);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Pilih Rating', 'Silakan pilih rating terlebih dahulu');
      return;
    }

    setIsSubmitting(true);

    if (orderId) {
      console.log('[FoodRating] Submitting rating:', rating, 'for order:', orderId);

      const result = await updateOrderRating(orderId, rating);

      if (result.success) {
        console.log('[FoodRating] ✅ Rating saved successfully');
        router.push('/screens/customer/ScootFoodCustomer/FoodBackHome');
      } else {
        console.error('[FoodRating] Failed to save rating:', result.error);
        Alert.alert('Error', 'Gagal menyimpan rating. Coba lagi.');
        setIsSubmitting(false);
      }
    } else {
      // No orderId - just navigate (demo mode)
      router.push('/screens/customer/ScootFoodCustomer/FoodBackHome');
    }
  };

  const handleExit = () => {
    router.replace('/screens/customer/HomeCustomer');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
      <View style={styles.card}>

        {/* EXIT top-right */}
        <TouchableOpacity
          style={styles.exitTopRight}
          onPress={handleExit}
        >
          <Image
            style={styles.exitIcon}
            source={require('../../../../assets/images/exit.png')}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Yeay, pesananmu sudah sampai! 🎉</Text>

        <Text style={styles.subtitle}>
          Terima kasih udah pakai ScootFood!{"\n"}
          {driverName 
            ? `Kasih rating buat ${driverName} ya 😄`
            : 'Jangan lupa kasih rating buat driver kamu 😄'}
        </Text>

        {/* ⭐⭐⭐⭐⭐ RATING */}
        <View style={styles.starsRow}>
          {[1,2,3,4,5].map((num) => (
            <TouchableOpacity key={num} onPress={() => setRating(num)} disabled={isSubmitting}>
              <Image
                style={styles.star}
                source={
                  num <= rating
                    ? require('../../../../assets/star-fill.png')
                    : require('../../../../assets/star-empty.png')
                }
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* BUTTON KIRIM */}
        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmitRating}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Kirim</Text>
          )}
        </TouchableOpacity>
        
      </View>
    </SafeAreaView>
    </>
  );
};

export default FoodRating;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  card: {
    width: '86%',
    backgroundColor: '#eaf9ef',
    borderRadius: 20,
    paddingVertical: 38,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },

  title: { 
    color: '#00633f', 
    fontSize: 18, 
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 30 
  },

  subtitle: { 
    color: '#2b2b2b', 
    fontSize: 13, 
    textAlign: 'center', 
    lineHeight: 20,
    marginBottom: 26 
  },

  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26
  },

  star: {
    width: 40,
    height: 40,
  },

  button: {
    backgroundColor: '#00b74a',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 26,
    elevation: 3,
    minWidth: 120,
    alignItems: 'center',
  },

  buttonDisabled: {
    backgroundColor: '#aaa',
  },

  buttonText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16 
  },

  exitButton: {
    marginTop: 20,
    padding: 10,
  },

  exitTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    zIndex: 10,
  },

  exitIcon: {
    width: 29,
    height: 29,
  }
});
