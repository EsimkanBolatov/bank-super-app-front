import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useAuthStore } from '../src/stores/authStore';
import { useEffect } from 'react';
import '../src/i18n';
import { useTranslation } from 'react-i18next';

export default function RootLayout() {
  const { checkAuth, isLoading } = useAuthStore();
  
  useEffect(() => { checkAuth(); }, []);

  if (isLoading) return null;

  return (
    <PaperProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        {/* ВАЖНО: Указываем имя твоей папки - tabs */}
        <Stack.Screen name="tabs" />
        <Stack.Screen name="register" options={{ headerShown: true, title: 'Регистрация' }} />
        <Stack.Screen name="qr" options={{ presentation: 'modal' }} />
        <Stack.Screen name="chat" />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings" options={{ title: 'Настройки', headerShown: true }} />
      </Stack>
    </PaperProvider>
  );
}