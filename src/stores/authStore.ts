import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

// Интерфейс для состояния авторизации
interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // ИСПРАВЛЕНО: Добавлен 'phone' в сигнатуру функции.
  login: (phone: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Ключ для сохранения токена в защищенном хранилище (ТЗ: Шифрование данных)
const TOKEN_KEY = 'user_jwt_secure';

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // Логика входа
  // ИСПРАВЛЕНО: Добавлен 'phone' в аргументы.
  login: async (phone: string, token: string) => {
    try {
      set({ isLoading: true });

      // ВЫПОЛНЯЕМ ТЗ: Шифруем токен при сохранении
      await SecureStore.setItemAsync(TOKEN_KEY, token);

      // Обновляем состояние и переходим на главный экран
      set({ token, isAuthenticated: true, isLoading: false });
      router.replace('/tabs/tab_home');

    } catch (error) {
      console.error('Ошибка входа:', error);
      set({ isLoading: false });
    }
  },

  // Логика выхода
  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, isAuthenticated: false });
    router.replace('/login');
  },

  // Проверка при запуске
  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        set({ token, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));