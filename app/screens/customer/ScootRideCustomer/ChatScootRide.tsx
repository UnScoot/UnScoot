import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// assets
const DriverImg = require('../../../../assets/images/driver.png');

interface ChatMessage {
	id: string;
	sender: 'driver' | 'customer';
	text: string;
	time: string;
}

const ChatScootRide = () => {
	const router = useRouter();
	const params = useLocalSearchParams() as {
		driverName?: string;
		driverRating?: string;
		driverImage?: string;
		nim?: string;
		motor?: string;
		plate?: string;
	};

	// Receive driver data from RideMendapatkanDriver
	const driverName = params?.driverName ?? 'Nicholas Saputra';
	const driverRating = params?.driverRating ?? '4.8';
	const nim = params?.nim ?? 'L0223053';
	const motor = params?.motor ?? 'Vario';
	const plate = params?.plate ?? 'AD 7513 BK';

	// Chat state
	const [messages, setMessages] = React.useState<ChatMessage[]>([
		{
			id: '1',
			sender: 'driver',
			text: 'Hallo, saya sudah di dekat lokasi Anda. Tunggu sebentar ya 😊',
			time: '14:30',
		},
	]);
	const [inputText, setInputText] = React.useState('');

	const handleSendMessage = () => {
		if (inputText.trim() === '') return;
		const newMessage: ChatMessage = {
			id: (messages.length + 1).toString(),
			sender: 'customer',
			text: inputText,
			time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
		};
		setMessages([...messages, newMessage]);
		setInputText('');
	};

	const handleBackToDriver = () => {
		// Go back to RideMendapatkanDriver screen
		router.back();
	};

	const handleCobaLanjut = () => {
		// Test button: navigate to KonfirmasiSudahSampai (backend not yet implemented)
		router.push('/screens/customer/ScootRideCustomer/KonfirmasiSudahSampai');
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* Driver Profile Header (clickable to go back) */}
			<TouchableOpacity style={styles.driverHeader} onPress={handleBackToDriver} activeOpacity={0.7}>
				<Image source={DriverImg} style={styles.driverAvatar} />
				<View style={styles.driverInfo}>
					<Text style={styles.driverName}>{driverName}</Text>
					<Text style={styles.driverRating}>⭐ {driverRating} • {motor}</Text>
				</View>
			</TouchableOpacity>

			{/* Chat Messages */}
			<ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
				{messages.map((msg) => (
					<View key={msg.id} style={msg.sender === 'driver' ? styles.messageBubbleLeft : styles.messageBubbleRight}>
						<Text style={msg.sender === 'driver' ? styles.messageText : styles.messageTextWhite}>
							{msg.text}
						</Text>
						<Text style={msg.sender === 'driver' ? styles.timeLeft : styles.timeRight}>
							{msg.time}
						</Text>
					</View>
				))}
			</ScrollView>

			{/* Test Button: Coba Lanjut (navigates to KonfirmasiSudahSampai) */}
			<TouchableOpacity style={styles.testButton} onPress={handleCobaLanjut}>
				<Text style={styles.testButtonText}>Coba Lanjut</Text>
			</TouchableOpacity>

			{/* Input Bar */}
			<View style={styles.inputBar}>
				<TextInput
					placeholder="Ketik pesan..."
					placeholderTextColor="#999"
					style={styles.inputField}
					value={inputText}
					onChangeText={setInputText}
					multiline
				/>
				<TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
					<Text style={styles.sendButtonText}>Kirim</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },

	/* Driver Header */
	driverHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	driverAvatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
	driverInfo: { flexDirection: 'column', flex: 1 },
	driverName: { fontSize: 16, fontWeight: '600', color: '#000' },
	driverRating: { fontSize: 12, color: '#666', marginTop: 2 },

	/* Messages */
	messagesContainer: { flex: 1, padding: 16 },
	messageBubbleLeft: {
		alignSelf: 'flex-start',
		backgroundColor: '#eef0ef',
		borderRadius: 14,
		padding: 12,
		marginBottom: 12,
		maxWidth: '78%',
	},
	messageBubbleRight: {
		alignSelf: 'flex-end',
		backgroundColor: '#33cc66',
		borderRadius: 14,
		paddingVertical: 10,
		paddingHorizontal: 14,
		marginBottom: 12,
		maxWidth: '68%',
	},
	messageText: { color: '#000', lineHeight: 20 },
	messageTextWhite: { color: '#fff', lineHeight: 20 },
	timeLeft: { alignSelf: 'flex-end', color: '#666', fontSize: 11, marginTop: 6 },
	timeRight: { alignSelf: 'flex-end', color: '#fff', fontSize: 11, marginTop: 6 },

	/* Input */
	inputBar: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderTopWidth: 1,
		borderTopColor: '#eee',
	},
	inputField: {
		flex: 1,
		fontSize: 14,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: '#f7f7f7',
		borderRadius: 20,
		color: '#000',
	},
	sendButton: {
		marginLeft: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sendButtonText: { color: '#33cc66', fontWeight: '700' },

	/* Test Button */
	testButton: {
		alignSelf: 'center',
		backgroundColor: '#33cc66',
		borderRadius: 20,
		paddingVertical: 10,
		paddingHorizontal: 18,
		marginVertical: 12,
		marginBottom: 16,
	},
	testButtonText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 14,
	},
});

export default ChatScootRide;

