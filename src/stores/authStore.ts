import { create } from 'zustand';
import { router } from 'expo-router';
import { saveToken, removeToken, getToken } from '../api'; 

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // Логика входа
  login: async (phone: string, token: string) => {
    try {
      set({ isLoading: true });
      
      // Используем универсальную функцию (работает везде)
      await saveToken(token);

      set({ token, isAuthenticated: true, isLoading: false });
      
      // Перенаправляем на главную
      router.replace('/tabs/tab_home');

    } catch (error) {
      console.error('Ошибка входа:', error);
      set({ isLoading: false });
    }
  },

  // Логика выхода
  logout: async () => {
    try {
      // 👇 ЭТО РЕШАЕТ ПРОБЛЕМУ НА ВЕБЕ
      // removeToken сам поймет, удалить из localStorage или SecureStore
      await removeToken();
      
      set({ token: null, isAuthenticated: false });
      router.replace('/login');
    } catch (error) {
      console.error("Ошибка при выходе:", error);
    }
  },

  // Проверка при запуске
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const token = await getToken();
      
      if (token) {
        // Если токен есть — авторизуем
        set({ token, isAuthenticated: true });
      } else {
        // Если токена нет — сбрасываем
        set({ token: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
      set({ token: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));