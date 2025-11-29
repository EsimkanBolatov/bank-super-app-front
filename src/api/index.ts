import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ⚠️ ВАЖНО: Укажите здесь ВАШ IP адрес компьютера.
// Если запускаете на реальном устройстве, localhost не сработает.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'bank-super-app-production.up.railway.app';
// http://192.168.1.3:8000
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- ХЕЛПЕРЫ ДЛЯ ТОКЕНА ---

const TOKEN_KEY = 'user_jwt_secure';

export async function getToken() {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error("Ошибка при чтении токена:", error);
    return null;
  }
}

export async function saveToken(token: string) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
    console.log("✅ Токен успешно сохранен");
  } catch (error) {
    console.error("❌ Ошибка при сохранении токена:", error);
  }
}

export async function removeToken() {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    console.log("🗑️ Токен удален");
  } catch (error) {
    console.error("Ошибка при удалении токена:", error);
  }
}

// --- ИНТЕРЦЕПТОР ---

// Автоматическая подстановка токена (Bearer)
api.interceptors.request.use(async (config) => {
  try {
    // Не добавляем токен для запросов логина/регистрации
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/register')) {
      return config;
    }

    const token = await getToken();

    // ЛОГИ ДЛЯ ОТЛАДКИ
    console.log(`[API Request] ➡️ ${config.method?.toUpperCase()} ${config.url}`);

    if (token) {
        // Приведение типов для headers, чтобы избежать ошибок TypeScript
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("[API Interceptor] ❌ Ошибка в интерцепторе:", error);
  }
  return config;
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ✅ ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    if (error.response) {
      console.log(`[API Error] ❌ ${error.response.status} ${error.config?.url}`);

      // Если 401 - значит токен протух или неверен
      if (error.response.status === 401) {
        console.log('Token expired or invalid. Clearing storage.');
        await removeToken();
      }
    } else {
      console.log(`[API Error] ❌ Network Error or no response: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

export const bankApi = {
  // 1. АВТОРИЗАЦИЯ
  login: async (phone: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', phone);
    formData.append('password', password);

    return api.post('/auth/login', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  register: (data: any) => api.post('/auth/register', data),

  // --- ПРОФИЛЬ (Настройки) ---
  getMe: () => api.get('/settings/me'),
  updateProfile: (data: { full_name?: string; avatar_url?: string }) => api.patch('/settings/me', data),

  // 2. СЧЕТА И КАРТЫ
  getCards: () => api.get('/accounts/'),
  createCard: (currency: string = 'KZT') => api.post('/accounts/create', { currency }),
  blockCard: (accountId: number) => api.patch(`/accounts/${accountId}/block`),
  unblockCard: (accountId: number) => api.patch(`/accounts/${accountId}/unblock`),

  // 3. ОПЕРАЦИИ
  getHistory: () => api.get('/transactions/'),
  transferP2P: (amount: number, to_phone?: string, to_card?: string) =>
    api.post('/transfers/p2p', { amount, to_phone, to_card }),

  // 4. СЕРВИСЫ
  payService: (service_name: string, amount: number) =>
    api.post('/services/pay', { service_name, amount }),

  // 5. ИИ ЧАТ И ГОЛОСОВОЙ АССИСТЕНТ
  // Текстовый чат
  chatWithAI: (message: string) => api.post('/ai/chat', { message }),

  // Голосовой чат (отправка файла)
  sendVoice: async (uri: string) => {
    const formData = new FormData();
    // @ts-ignore: React Native требует специальный объект для файла, TS его не видит в стандартном FormData
    formData.append('file', {
      uri: uri,
      name: 'voice.m4a',
      type: 'audio/m4a',
    });

    return api.post('/ai/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 6. КРЕДИТЫ
  applyLoan: (amount: number, term_months: number, income: number) =>
    api.post('/loans/apply', { amount, term_months, income }),

  // 7. MFA
  generateMFA: () => api.post('/mfa/generate'),
  verifyMFA: (code: string) => api.post('/mfa/verify', { code }),
};

export default api;