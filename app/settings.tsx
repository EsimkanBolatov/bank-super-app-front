import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, List, Switch, Button, Avatar, useTheme, Divider, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useTranslation } from 'react-i18next';
import { bankApi } from '../src/api';
import * as ImagePicker from 'expo-image-picker';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { logout } = useAuthStore();
  const { t, i18n } = useTranslation();

  const [isBiometrics, setIsBiometrics] = useState(false);
  const [language, setLanguage] = useState(i18n.language || 'ru');

  // Данные профиля
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Загружаем профиль при открытии экрана
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await bankApi.getMe();
      setProfile(res.data);
    } catch (error) {
      console.log("Ошибка загрузки профиля", error);
    } finally {
      setLoading(false);
    }
  };

  const changeLang = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleLogout = () => {
    Alert.alert(t('settings_logout'), t('settings_logout_confirm'), [
      { text: t('settings_cancel'), style: "cancel" },
      { text: t('settings_logout'), style: "destructive", onPress: logout }
    ]);
  };

  const pickImage = async () => {
    // 1. Запрашиваем разрешение
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Нужен доступ к галерее для смены фото!');
      return;
    }

    // 2. Открываем галерею
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Используем строковый массив вместо Enum для надежности
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true, // Нам нужен base64, чтобы отправить на сервер
    });

    // 3. Если фото выбрано - отправляем
    if (!result.canceled && result.assets[0].base64) {
      try {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;

        // Отправляем на бэкенд
        await bankApi.updateProfile({ avatar_url: base64Img });

        // Обновляем локально сразу, чтобы не ждать
        setProfile({ ...profile, avatar_url: base64Img });

        Alert.alert("Успешно", "Фото профиля обновлено!");
      } catch (e) {
        Alert.alert("Ошибка", "Не удалось обновить фото");
      }
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage}>
            {profile?.avatar_url ? (
                <Avatar.Image size={80} source={{ uri: profile.avatar_url }} />
            ) : (
                <Avatar.Text size={80} label={profile?.full_name?.[0] || profile?.phone?.[0] || "U"} />
            )}
            <View style={styles.editBadge}><Text style={{fontSize:10}}>✏️</Text></View>
        </TouchableOpacity>

        <Text style={[styles.name, { color: theme.colors.onBackground }]}>
            {profile?.full_name || "Имя не указано"}
        </Text>
        <Text style={{ color: '#888' }}>
            {profile?.phone ? `+${profile.phone}` : "..."}
        </Text>
      </View>

      <List.Section>
        <List.Subheader>{t('settings_security')}</List.Subheader>

        <List.Item
          title={t('settings_faceid')}
          left={props => <List.Icon {...props} icon="face-recognition" />}
          right={() => <Switch value={isBiometrics} onValueChange={setIsBiometrics} color={theme.colors.primary} />}
        />
        <List.Item
          title={t('settings_password')}
          left={props => <List.Icon {...props} icon="lock-reset" />}
          onPress={() => Alert.alert("Пароль", "Функция смены пароля в разработке")}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>{t('settings_lang')}</List.Subheader>
        <View style={{ paddingHorizontal: 20 }}>
            <SegmentedButtons
                value={language}
                onValueChange={changeLang}
                buttons={[
                  { value: 'kz', label: 'QAZ' },
                  { value: 'ru', label: 'РУС' },
                  { value: 'en', label: 'ENG' },
                ]}
            />
        </View>
      </List.Section>

      <View style={{ padding: 20, marginTop: 20 }}>
        <Button mode="outlined" icon="logout" onPress={handleLogout} textColor="red" style={{ borderColor: 'red' }}>
          {t('settings_logout')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingVertical: 30 },
  name: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  editBadge: { position: 'absolute', right: 0, bottom: 0, backgroundColor:'white', borderRadius:10, padding:4, elevation:2 }
});