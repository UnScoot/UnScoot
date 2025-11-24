import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FoodRating: React.FC = () => {
  const router = useRouter();
  const [rating, setRating] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>

        {/* EXIT top-right */}
        <TouchableOpacity
          style={styles.exitTopRight}
          onPress={() => router.replace('/screens/customer/HomeCustomer')}
        >
          <Image
            style={styles.exitIcon}
            source={require('../../../../assets/images/exit.png')}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Yeay, pesananmu sudah sampai! 🎉</Text>

        <Text style={styles.subtitle}>
          Terima kasih udah pakai ScootFood!{"\n"}
          Jangan lupa kasih rating buat driver kamu 😄
        </Text>

        {/* ⭐⭐⭐⭐⭐ RATING */}
        <View style={styles.starsRow}>
          {[1,2,3,4,5].map((num) => (
            <TouchableOpacity key={num} onPress={() => setRating(num)}>
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
          style={styles.button}
          onPress={() => router.push('/screens/customer/ScootFood/FoodBackHome')}
        >
          <Text style={styles.buttonText}>Kirim</Text>
        </TouchableOpacity>
        
      </View>
    </SafeAreaView>
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
