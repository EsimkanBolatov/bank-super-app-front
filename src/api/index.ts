import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ⚠️ ВАЖНО: Убедитесь, что URL правильный (ngrok или IP)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://bank-super-app-production.up.railway.app/';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TOKEN_KEY = 'user_jwt_secure';

export async function getToken() {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(TOKEN_KEY);
      return null;
    } else {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
  } catch (error) {
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
  } catch (error) {}
}

export async function removeToken() {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {}
}

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token && config.headers) {
      (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export const bankApi = {
  login: (phone: string, pass: string) => {
    const formData = new URLSearchParams();
    formData.append('username', phone);
    formData.append('password', pass);
    return api.post('/auth/login', formData.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  },
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/settings/me'),
  updateProfile: (data: any) => api.patch('/settings/me', data),
  
  getCards: () => api.get('/accounts/'),
  createCard: (curr: string = 'KZT') => api.post('/accounts/create', { currency: curr }),
  blockCard: (id: number) => api.patch(`/accounts/${id}/block`),
  unblockCard: (id: number) => api.patch(`/accounts/${id}/unblock`),

  getHistory: () => api.get('/transactions/'),
  
  // ОБНОВЛЕННЫЙ ПЕРЕВОД (Добавили from_account_id)
  transferP2P: (amount: number, to_phone?: string, to_card?: string, from_account_id?: number) =>
    api.post('/transfers/p2p', { amount, to_phone, to_card, from_account_id }),

  // ИЗБРАННОЕ
  getFavorites: () => api.get('/transfers/favorites'),
  addFavorite: (name: string, value: string, type: 'phone' | 'card') => 
    api.post('/transfers/favorites', { name, value, type }),
  deleteFavorite: (id: number) => api.delete(`/transfers/favorites/${id}`),

  payService: (name: string, amount: number, details?: any) =>
    api.post('/services/pay', { service_name: name, amount, details }),

  chatWithAI: (msg: string) => api.post('/ai/chat', { message: msg }),
  sendVoice: (uri: string) => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', { uri: uri, name: 'voice.m4a', type: 'audio/m4a' });
    return api.post('/ai/voice', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  
  applyLoan: (amount: number, term: number, income: number, type: string = 'credit') =>
    api.post('/loans/apply', { amount, term_months: term, income, type }),
    
  generateMFA: () => api.post('/mfa/generate'),
  verifyMFA: (code: string) => api.post('/mfa/verify', { code }),
};

export default api;