import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useAuthStore } from '../src/stores/authStore';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import '../src/i18n';

export default function RootLayout() {
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore();
  // as string[] убирает ошибку TypeScript
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'tabs';
    const inPublicGroup = segments[0] === 'login' || segments[0] === 'register';

    if (isAuthenticated && inPublicGroup) {
      // Снимаем фокус на вебе, чтобы не было ошибки aria-hidden
      if (Platform.OS === 'web') {
        (document.activeElement as HTMLElement)?.blur();
      }
      router.replace('/tabs/tab_home');
    } else if (!isAuthenticated && !inPublicGroup) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) return null;

  return (
    <PaperProvider>
      <Stack screenOptions={{ 
        headerShown: false,
        // Отключаем анимацию на вебе для стабильности
        animation: Platform.OS === 'web' ? 'none' : 'default' 
      }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" options={{ headerShown: true, title: 'Регистрация' }} />
        <Stack.Screen name="tabs" />
        <Stack.Screen name="qr" options={{ presentation: 'modal' }} />
        <Stack.Screen name="chat" />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings" options={{ title: 'Настройки', headerShown: true }} />
      </Stack>
    </PaperProvider>
  );
}