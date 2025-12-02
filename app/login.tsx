import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useAuthStore } from '../src/stores/authStore';
import { useTranslation } from 'react-i18next';
import { bankApi, saveToken, getToken } from '../src/api';
import { useRouter } from 'expo-router';
import '../src/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('87472939873'); 
  const [password, setPassword] = useState('pass');
  const [code, setCode] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const { login } = useAuthStore();
  const theme = useTheme();
  const { t } = useTranslation();

  // Хелпер для снятия фокуса (для Web)
  const blurInputs = () => {
    if (Platform.OS === 'web') {
        (document.activeElement as HTMLElement)?.blur();
    }
  };

  const handleLoginStep1 = async () => {
    blurInputs(); // Снимаем фокус перед запросом
    if (phone.length < 5) return alert('Введите номер');
    setLocalLoading(true);
    try {
      const response = await bankApi.login(phone, password);
      const accessToken = response.data.access_token;
      await saveToken(accessToken);
      const mfaRes = await bankApi.generateMFA();
      setStep(2);

      if (mfaRes.data.demo_code) {
        if (Platform.OS === 'web') {
            alert(`💬 Ваш код: ${mfaRes.data.demo_code}`);
        } else {
            Alert.alert("Сообщение", `Ваш код: ${mfaRes.data.demo_code}`);
        }
      }
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.detail || 'Ошибка входа');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    blurInputs(); // Снимаем фокус перед переходом
    if (code.length < 4) return alert('Введите код');
    setLocalLoading(true);

    try {
      await bankApi.verifyMFA(code);
      const validToken = await getToken();
      if (!validToken) throw new Error("Токен не найден");

      await login(phone, validToken);
      router.replace('/tabs/tab_home');

    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.detail || 'Неверный код');
      if (error.message?.includes("Токен")) setStep(1);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.content}>
        <Text variant="displayMedium" style={[styles.title, { color: theme.colors.primary }]}>
          BellyBank
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          {step === 1 ? 'Вход в экосистему' : 'Двухфакторная аутентификация'}
        </Text>

        <View style={styles.form}>
          {step === 1 ? (
            <>
              <TextInput label="Номер телефона" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad" style={styles.input} left={<TextInput.Icon icon="phone" />} />
              <TextInput label="Пароль" value={password} onChangeText={setPassword} mode="outlined" secureTextEntry style={styles.input} left={<TextInput.Icon icon="lock" />} />

              <Button mode="contained" onPress={handleLoginStep1} loading={localLoading} disabled={localLoading} style={styles.button} contentStyle={{ height: 56 }}>
                Войти
              </Button>

              <View style={styles.registerContainer}>
                  <Text style={{color: '#666'}}>Нет аккаунта? </Text>
                  <TouchableOpacity onPress={() => router.push('/register')}>
                      <Text style={{color: theme.colors.primary, fontWeight: 'bold'}}>Зарегистрироваться</Text>
                  </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={{textAlign: 'center', marginBottom: 10, color: '#666'}}>Код отправлен на ваш номер</Text>
              <TextInput label="Код из СМС" value={code} onChangeText={setCode} mode="outlined" keyboardType="number-pad" style={styles.input} left={<TextInput.Icon icon="message-processing" />} placeholder="Код" />

              <Button mode="contained" onPress={handleVerifyCode} loading={localLoading} disabled={localLoading} style={styles.button} contentStyle={{ height: 56 }}>
                Подтвердить и Войти
              </Button>

              <Button mode="text" onPress={() => setStep(1)} style={{marginTop: 10}}>
                Назад
              </Button>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, justifyContent: 'center' },
  content: { paddingHorizontal: 10, paddingBottom: 50 },
  title: { fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 18, textAlign: 'center', color: '#666', marginBottom: 30 },
  form: { width: '100%', marginTop: 20 },
  input: { marginBottom: 16, backgroundColor: '#fff', borderRadius: 8 },
  button: { marginTop: 20, borderRadius: 12 },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, alignItems: 'center' }
});