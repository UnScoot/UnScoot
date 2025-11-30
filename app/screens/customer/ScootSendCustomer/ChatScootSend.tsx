import * as React from "react";
import {
  Image,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';

const ChatScootSend = () => {
  const router = useRouter();
  const [messages, setMessages] = React.useState([
    { id: 1, from: 'driver', text: 'Apakah titik jemput sudah sesuai?\nMohon ditunggu yaa, driver akan segera otw 😊', time: '09.00' },
    { id: 2, from: 'customer', text: 'Okay kak, terimakasiii', time: '09.05' },
    { id: 3, from: 'driver', text: 'Sudah di depan yaa...', time: '09.20' },
    { id: 4, from: 'customer', text: 'Okay kakk', time: '09.05' }
  ]);

  const [text, setText] = React.useState('');
  const scrollRef = React.useRef<ScrollView | null>(null);

  React.useEffect(() => {
    // scroll to bottom when messages change
    setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
  }, [messages]);

  const pickImageFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: false });
    if (!('canceled' in result) || result.canceled === false) {
      // For now just append a placeholder message with image uri
      setMessages(prev => [...prev, { id: Date.now(), from: 'customer', text: '[Gambar]', time: '' }]);
      // TODO: upload image to server
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    const newMsg = { id: Date.now(), from: 'customer', text: text.trim(), time: 'now' };
    setMessages(prev => [...prev, newMsg]);
    setText('');

    // placeholder save to backend
    try {
      await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newMsg) });
    } catch (e) {
      // ignore for now
      console.warn('Failed to save message', e);
    }
  };

  const handleBackPress = () => {
    router.push('/screens/customer/ScootSendCustomer/DetailDriver');
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header dengan back button + profil + Sudah Bayar */}
      <View style={styles.headerSection}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Image source={require('../../../../assets/images/back.svg')} style={styles.backIcon} />
        </TouchableOpacity>

        <View style={styles.profileRow}>
          <Image source={require('../../../../assets/images/driver.png')} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>Nicholas Saputra</Text>
            <Text style={styles.meta}>Vario · AD 7513 BK</Text>
          </View>
          <View style={styles.paidWrapper}>
            <TouchableOpacity style={styles.paidButton} onPress={() => router.push('/screens/customer/ScootSendCustomer/TemporarySudahBayar')}>
              <Text style={styles.paidButtonText}>Sudah Bayar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Rounded separator / card-like header */}
      <View style={styles.headerBottomCurve} />

      {/* Chat area dengan background cream */}
      <ScrollView style={styles.chatContainer} ref={scrollRef}>
        {messages.map(m => (
          <View key={m.id} style={m.from === 'driver' ? styles.messageDriverBox : styles.messageCustomerBox}>
            <Text style={m.from === 'driver' ? styles.messageDriverText : styles.messageCustomerText}>{m.text}</Text>
            <Text style={styles.smallTime}>{m.time}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Input pesan */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.cameraButton} onPress={pickImageFromCamera}>
            <Text style={{fontSize: 18}}>📷</Text>
          </TouchableOpacity>

          <View style={styles.inputBox}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Ketikkan pesan..."
              placeholderTextColor="#999"
              style={styles.textInput}
            />
          </View>

          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Image source={require('../../../../assets/images/send.svg')} style={styles.sendIcon} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f7efe6'},
  headerSection: {backgroundColor: '#fff', paddingTop: 48, paddingHorizontal: 14, paddingBottom: 18},
  backButton: {position: 'absolute', left: 14, top: 10, zIndex: 20, width: 60, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center'},
  backIcon: {width: 60, height: 60},
  profileRow: {flexDirection: 'row', alignItems: 'center', marginTop: 28, paddingVertical: 8},
  avatar: {width: 64, height: 64, borderRadius: 32, marginRight: 12, backgroundColor:'#eee'},
  profileInfo: {flex: 1},
  name: {fontSize: 18, fontWeight: '700', color: '#000'},
  meta: {fontSize: 13, color: '#666', marginTop: 4},
  paidWrapper: {justifyContent: 'flex-end', marginTop: 18},
  paidButton: {backgroundColor: '#33cc66', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22},
  paidButtonText: {color: '#fff', fontWeight: '700', fontSize: 15},
  headerBottomCurve: {height: 18, backgroundColor: '#fff', borderBottomLeftRadius: 18, borderBottomRightRadius: 18},
  chatContainer: {flex: 1, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f7efe6'},
  messageDriverBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 8,
    alignSelf: 'flex-start',
    maxWidth: '80%'
  },
  messageDriverText: {fontSize: 14, color: '#000', lineHeight: 20},
  messageCustomerBox: {
    backgroundColor: '#33cc66',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 8,
    alignSelf: 'flex-end',
    maxWidth: '80%'
  },
  messageCustomerText: {fontSize: 14, color: '#fff', lineHeight: 20},
  smallTime: {fontSize: 11, color: '#999', marginTop: 6, textAlign: 'right'},
  inputRow: {flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16, backgroundColor: '#fff'},
  cameraButton: {width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f2f2', marginRight: 8},
  inputBox: {flex: 1, backgroundColor: '#f0f0f0', borderRadius: 24, paddingHorizontal: 12, justifyContent: 'center'},
  textInput: {height: 44, fontSize: 14},
  sendButton: {width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8, backgroundColor: '#33cc66'},
  sendIcon: {width: 20, height: 20, tintColor: '#fff'}
});

export default ChatScootSend;
        				