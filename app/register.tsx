import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { bankApi } from '../src/api';

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!phone || !password || !fullName) {
      Alert.alert("Ошибка", "Заполните все поля!");
      return;
    }

    setLoading(true);
    try {
      // Очистка телефона (убираем скобки и пробелы)
      const cleanPhone = phone.replace(/\D/g, '');

      // Запрос строго по ТЗ [cite: 204-208]
      await bankApi.register({
        phone: cleanPhone,
        password: password,
        full_name: fullName // Бэкенд ожидает snake_case
      });

      Alert.alert("Успешно!", "Аккаунт создан. Теперь войдите в систему.");
      router.replace('/login');

    } catch (error: any) { // Добавили :any чтобы TypeScript не ругался
      console.log("Error details:", error);

      // Пытаемся достать текст ошибки от сервера (FastAPI)
      const errorDetail = error.response?.data?.detail;
      const errorMessage = typeof errorDetail === 'string'
        ? errorDetail
        : "Не удалось зарегистрироваться. Проверьте соединение.";

      Alert.alert("Ошибка", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
            <IconButton icon="arrow-left" onPress={() => router.back()} style={{alignSelf: 'flex-start'}} />
        </View>

        <Text variant="displayMedium" style={[styles.title, { color: theme.colors.primary }]}>
          Регистрация
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Создайте аккаунт Belly Bank
        </Text>

        <View style={styles.form}>
          <TextInput
            label="ФИО"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />
          <TextInput
            label="Номер телефона (87...)"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
            placeholder="87071234567"
            left={<TextInput.Icon icon="phone" />}
          />
          <TextInput
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            style={styles.button}
            contentStyle={{ height: 56 }}
          >
            Зарегистрироваться
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, justifyContent: 'center', flexGrow: 1 },
  header: { marginBottom: 20 },
  title: { fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 18, textAlign: 'center', color: '#666', marginBottom: 40 },
  form: { width: '100%' },
  input: { marginBottom: 16, backgroundColor: '#fff', borderRadius: 8 },
  button: { marginTop: 20, borderRadius: 12 },
});