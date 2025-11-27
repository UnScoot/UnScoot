import { useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// status-bar assets removed; keep file focused on screen content
// assets
const BintangKosong = require('../../../../assets/images/BintangBelum.png');
const BintangIsi = require('../../../../assets/images/BintangSudah.png');
const ExitImg = require('../../../../assets/images/exit.png');

const RatingDriverScootRide = () => {
	const router = useRouter();
	const [rating, setRating] = React.useState<number>(0);

	const handleSubmitRating = () => {
		if (rating > 0) router.push('/screens/customer/ScootRideCustomer/MisiBerhasil');
	};

	const handleExit = () => {
		router.push('/screens/customer/HomeCustomer');
	};

	return (
		<SafeAreaView style={styles.container}>

			<View style={styles.card}>
				{/* exit inside card (top-right) */}
				<TouchableOpacity style={styles.exitInsideCard} onPress={handleExit}>
					<Image source={ExitImg} style={styles.exitIcon} />
				</TouchableOpacity>

				<Text style={styles.title}>Yeay, kamu sudah sampai!</Text>
				<Text style={styles.subtitle}>Terima kasih udah pakai ScootRide!{"\n"}Jangan lupa kasih rating buat driver kamu 😄</Text>

				{/* stars */}
				<View style={styles.starsRowCentered}>
					{[1,2,3,4,5].map(i => (
						<TouchableOpacity key={i} onPress={() => setRating(i)} activeOpacity={0.7}>
							<Image source={ i <= rating ? BintangIsi : BintangKosong } style={styles.starIcon} />
						</TouchableOpacity>
					))}
				</View>

				<TouchableOpacity
					style={[styles.button, rating === 0 ? styles.roundedDisabled : null]}
					onPress={handleSubmitRating}
					activeOpacity={rating === 0 ? 1 : 0.8}
				>
					<Text style={styles.buttonText}>Kirim</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
	exitIcon: { width: 26, height: 26 },

  card: {
    width: '86%',
    backgroundColor: '#eaf9ef',
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
		position: 'relative',
  },

  title: { color: '#00633f', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#2b2b2b', fontSize: 14, textAlign: 'center', marginBottom: 18, lineHeight: 20 },

	starsRowCentered: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 0, marginBottom: 20 },
	starIcon: { width: 40, height: 40, marginHorizontal: 8 },

	exitInsideCard: { position: 'absolute', top: 12, right: 12, padding: 6, zIndex: 5 },

  button: { backgroundColor: '#00b74a', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 26 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  roundedDisabled: { backgroundColor: '#9bd9a8' },
});

export default RatingDriverScootRide;

