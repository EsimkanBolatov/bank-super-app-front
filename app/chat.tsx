import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme, IconButton, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { bankApi } from '../src/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Импортируем из новой библиотеки expo-audio
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { id: 1, text: 'Привет! Нажми на микрофон и скажи: "Переведи 1000 тенге на 8700..."', isMe: false }
  ]);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    (async () => {
      try {
        // ИСПРАВЛЕНО: Используем новые кроссплатформенные названия свойств
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,        // Было playsInSilentModeIOS
          shouldPlayInBackground: false,  // Было staysActiveInBackground
        });
      } catch (e) {
        console.log("Ошибка настройки аудио:", e);
      }

      // Запрашиваем права
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Ошибка', 'Нужен доступ к микрофону для голосового чата');
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      if (audioRecorder.isRecording) return;
      
      // Подготовка и старт
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert("Ошибка записи", "Не удалось начать запись. Проверьте права доступа.");
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return;
    
    try {
      setLoading(true);
      await audioRecorder.stop();
      
      const uri = audioRecorder.uri;

      if (uri) {
          setMessages(prev => [...prev, { id: Date.now(), text: "🎤 (Голосовое сообщение)", isMe: true }]);

          try {
            const res = await bankApi.sendVoice(uri);
            handleAiResponse(res.data);
          } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { id: Date.now()+1, text: "Ошибка распознавания или связи", isMe: false }]);
          }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendTextMsg = async () => {
    if(!msg.trim()) return;
    const userMsg = { id: Date.now(), text: msg, isMe: true };
    setMessages(prev => [...prev, userMsg]);
    const txt = msg; setMsg(''); setLoading(true);

    try {
      const res = await bankApi.chatWithAI(txt);
      handleAiResponse(res.data);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now()+1, text: "Ошибка связи", isMe: false }]);
    } finally { setLoading(false); }
  };

  const handleAiResponse = async (data: any) => {
      setMessages(prev => [...prev, { id: Date.now(), text: data.reply, isMe: false }]);
      
      Speech.speak(data.reply, { language: 'ru' });

      if (data.action === 'transfer' && data.data) {
          const { amount, phone } = data.data;
          setTimeout(async () => {
            try {
                await bankApi.transferP2P(Number(amount), phone);
                const successText = `✅ Перевод ${amount} ₸ выполнен успешно!`;
                setMessages(prev => [...prev, { id: Date.now()+1, text: successText, isMe: false }]);
                Speech.speak("Перевод выполнен успешно");
            } catch (e) {
                const errText = "❌ Ошибка перевода. Проверьте баланс.";
                setMessages(prev => [...prev, { id: Date.now()+1, text: errText, isMe: false }]);
                Speech.speak("Не удалось выполнить перевод");
            }
          }, 2000);
      }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1, backgroundColor: theme.colors.background}}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text style={styles.title}>AI Assistant</Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
        {messages.map(m => (
          <View key={m.id} style={[styles.bubble, { alignSelf: m.isMe ? 'flex-end' : 'flex-start', backgroundColor: m.isMe ? theme.colors.primary : theme.colors.elevation.level2 }]}>
             <Text style={{color: m.isMe ? 'white' : theme.colors.onSurface}}>{m.text}</Text>
          </View>
        ))}
        {loading && <ActivityIndicator style={{marginTop:20}} />}
      </ScrollView>

      <View style={styles.inputContainer}>
         <TextInput style={styles.input} placeholder="Сообщение..." value={msg} onChangeText={setMsg} />

         {msg.length > 0 ? (
            <IconButton icon="send" iconColor={theme.colors.primary} onPress={sendTextMsg} />
         ) : (
            <TouchableOpacity
                onPressIn={startRecording}
                onPressOut={stopRecording}
                style={[styles.micBtn, { backgroundColor: audioRecorder.isRecording ? 'red' : theme.colors.primary }]}
            >
                <Avatar.Icon size={50} icon="microphone" style={{backgroundColor:'transparent'}} />
            </TouchableOpacity>
         )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  bubble: { maxWidth: '80%', padding: 15, borderRadius: 15, marginBottom: 10 },
  inputContainer: { flexDirection: 'row', padding: 10, alignItems: 'center', backgroundColor: '#fff', paddingBottom: 30 },
  input: { flex: 1, padding: 10, fontSize: 16, backgroundColor: '#f5f5f5', borderRadius: 25, marginRight: 10, paddingHorizontal: 20 },
  micBtn: { borderRadius: 50, padding: 2, elevation: 4 }
});