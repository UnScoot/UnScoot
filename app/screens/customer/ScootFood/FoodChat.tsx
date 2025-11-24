import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ChatMessage {
  id: string;
  sender: 'driver' | 'customer';
  text: string;
  time: string;
}

const ChatScootFood: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const notes = params?.notes || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Robust parser: accept stringified JSON or already-parsed arrays/objects
  const parseOrderItems = (raw: any) => {
    try {
      if (!raw) return [];
      if (typeof raw === 'string') return JSON.parse(raw as string);
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'object') return raw as any[];
      return [];
    } catch (e) {
      return [];
    }
  };

  useEffect(() => {
    const parsed = parseOrderItems(params?.orderItems);
    const itemsList = parsed.map((item: any) => `${item.name} ${item.quantity}`).join('\n');
    const initialMessage = `Hallo, pesanan kamu sudah diterima:\n${itemsList}${params?.notes ? `\n${params.notes}` : ''}\nHarap menunggu yaa 😊`;

    // Only set the initial messages once when component mounts / params arrive
    setMessages(current => {
      if (current.length > 0) return current;
      return [
        {
          id: '1',
          sender: 'driver',
          text: initialMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    });
  }, [params?.orderItems, params?.notes]);
  
  const [inputText, setInputText] = useState('');

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../../../../assets/images/driver.png')} style={styles.avatar} />
        <View style={styles.headerText}>
          <Text style={styles.name}>Nicholas Saputra</Text>
          <Text style={styles.status}>Driver • 3 menit lalu</Text>
        </View>
      </View>

      <ScrollView style={styles.messages} showsVerticalScrollIndicator={false}>
        {messages.map((msg) => (
          <View key={msg.id} style={msg.sender === 'driver' ? styles.bubbleLeft : styles.bubbleRight}>
            <Text style={msg.sender === 'driver' ? styles.bubbleText : styles.bubbleTextRight}>
              {msg.text}
            </Text>
            <Text style={msg.sender === 'driver' ? styles.timeLeft : styles.timeRight}>
              {msg.time}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* TEST BUTTON: Coba Lanjut (navigates to FoodValidasi) */}
      <TouchableOpacity style={styles.tryButton} onPress={() => router.push('/screens/customer/ScootFood/FoodValidasi')}>
        <Text style={styles.tryButtonText}>Coba Lanjut</Text>
      </TouchableOpacity>

      <View style={styles.inputBar}>
        <TextInput
          placeholder="Ketikkan pesan..."
          placeholderTextColor="#999"
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <Image
            source={require('../../../../assets/images/KirimChat.png')}
            style={styles.sendIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  headerText: { flexDirection: 'column' },
  name: { fontSize: 16, fontWeight: '600', color: '#000' },
  status: { fontSize: 12, color: '#666', marginTop: 2 },
  messages: { flex: 1, padding: 16 },
  bubbleLeft: { alignSelf: 'flex-start', backgroundColor: '#eef0ef', borderRadius: 14, padding: 12, marginBottom: 12, maxWidth: '78%' },
  bubbleText: { color: '#000', lineHeight: 20 },
  timeLeft: { alignSelf: 'flex-end', color: '#666', fontSize: 11, marginTop: 6 },
  bubbleRight: { alignSelf: 'flex-end', backgroundColor: '#00b74a', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12, maxWidth: '68%' },
  bubbleTextRight: { color: '#fff', lineHeight: 20 },
  timeRight: { alignSelf: 'flex-end', color: '#fff', fontSize: 11, marginTop: 6 },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, fontSize: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f7f7f7', borderRadius: 20, color: '#000' },
  sendButton: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { width: 28, height: 28 },
  tryButton: {
    alignSelf: 'center',
    backgroundColor: '#33cc66',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginVertical: 10,
  },
  tryButtonText: {
    color: '#fff',
    fontWeight: '700',
  }
});

export default ChatScootFood;


