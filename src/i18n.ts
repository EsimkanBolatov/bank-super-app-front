import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const resources = {
  ru: {
    translation: {
      welcome: 'Добро пожаловать в Belly Bank',
      login_title: 'Вход в Суперприложение',
      phone_label: 'Номер телефона',
      password_label: 'Пароль',
      login_button: 'Войти',
      home: 'Главная',
      services: 'Сервисы',
      // Настройки
      settings_security: 'Безопасность',
      settings_faceid: 'Вход по Face ID',
      settings_password: 'Сменить пароль',
      settings_lang: 'Язык / Tili / Language',
      settings_logout: 'Выйти',
      settings_cancel: 'Отмена',
      settings_logout_confirm: 'Выйти из аккаунта?',
    },
  },
  en: {
    translation: {
      welcome: 'Welcome to Belly Bank',
      login_title: 'SuperApp Login',
      phone_label: 'Phone Number',
      password_label: 'Password',
      login_button: 'Login',
      home: 'Home',
      services: 'Services',
      // Settings
      settings_security: 'Security',
      settings_faceid: 'Face ID Login',
      settings_password: 'Change Password',
      settings_lang: 'Language',
      settings_logout: 'Log Out',
      settings_cancel: 'Cancel',
      settings_logout_confirm: 'Log out of account?',
    },
  },
  kz: {
    translation: {
      welcome: 'Belly Bank-ке қош келдіңіз',
      login_title: 'Суперқосымшаға кіру',
      phone_label: 'Телефон нөмірі',
      password_label: 'Құпия сөз',
      login_button: 'Кіру',
      home: 'Басты бет',
      services: 'Қызметтер',
      // Баптаулар
      settings_security: 'Қауіпсіздік',
      settings_faceid: 'Face ID арқылы кіру',
      settings_password: 'Құпия сөзді өзгерту',
      settings_lang: 'Тіл / Язык / Language',
      settings_logout: 'Шығу',
      settings_cancel: 'Болдырмау',
      settings_logout_confirm: 'Аккаунттан шығу?',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources: resources as any,
    lng: Localization.getLocales()[0]?.languageCode || 'ru',
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
    // ИСПРАВЛЕНО: v3 -> v4, чтобы соответствовать типизации
    compatibilityJSON: 'v4',
  });

export default i18n;