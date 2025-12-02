import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const theme = useTheme();

  // Пока проверяем токен, показываем крутилку
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Если мы авторизованы — перекидываем в табы (Главная)
  // Если нет — на экран логина
  return <Redirect href={isAuthenticated ? "/tabs/tab_home" : "/login"} />;
}