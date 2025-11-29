import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Text, TextInput, Button, useTheme, Card, SegmentedButtons, Avatar, Searchbar, ActivityIndicator } from 'react-native-paper';
import { bankApi } from '../../src/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';

export default function PaymentsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [transferType, setTransferType] = useState('phone');
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Контакты
  const [contactsModalVisible, setContactsModalVisible] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Форматирование номера (превращает 8777... в +7 777...)
  const formatPhoneNumber = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned === '') { setReceiver(''); return; }
    if (cleaned.startsWith('8')) cleaned = '7' + cleaned.slice(1);
    if (!cleaned.startsWith('7')) cleaned = '7' + cleaned;
    cleaned = cleaned.slice(0, 11);

    let formatted = '+7';
    if (cleaned.length > 1) formatted += ' ' + cleaned.slice(1, 4);
    if (cleaned.length > 4) formatted += ' ' + cleaned.slice(4, 7);
    if (cleaned.length > 7) formatted += ' ' + cleaned.slice(7, 9);
    if (cleaned.length > 9) formatted += ' ' + cleaned.slice(9, 11);

    setReceiver(formatted);
  };

  const openContacts = async () => {
    setLoadingContacts(true);
    setContactsModalVisible(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });
        if (data.length > 0) {
          const valid = data.filter((c: any) => c.phoneNumbers && c.phoneNumbers.length > 0);
          setContacts(valid);
          setFilteredContacts(valid);
        }
      } else {
        Alert.alert("Ошибка", "Нужен доступ к контактам");
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleContactSelect = (contact: any) => {
    if (contact.phoneNumbers && contact.phoneNumbers[0]) {
      formatPhoneNumber(contact.phoneNumbers[0].number);
      setContactsModalVisible(false);
    }
  };

  const handleSearchContact = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setFilteredContacts(contacts.filter((c: any) => c.name?.toLowerCase().includes(query.toLowerCase())));
    } else {
      setFilteredContacts(contacts);
    }
  };

  const handleTransfer = async () => {
    // 1. Очищаем номер от лишних символов
    let cleanReceiver = receiver.replace(/\D/g, '');

    // ВАЖНО: Если переводим по номеру телефона
    if (transferType === 'phone') {
        // Если номер начинается на 7 (из-за маски +7), меняем на 8,
        // так как в базе данных (login.tsx) пользователи записаны через 8
        if (cleanReceiver.startsWith('7')) {
            cleanReceiver = '8' + cleanReceiver.slice(1);
        }
    }

    if (cleanReceiver.length < 11 || !amount) {
      Alert.alert('Ошибка', 'Введите корректный номер и сумму');
      return;
    }

    setLoading(true);
    try {
      // Отправляем запрос
      await bankApi.transferP2P(
          Number(amount),
          transferType === 'phone' ? cleanReceiver : undefined,
          transferType === 'card' ? cleanReceiver : undefined // Для карты тоже отправляем чистые цифры
      );

      Alert.alert('Успешно ✅', `Перевод ${amount} ₸ выполнен!`);
      setReceiver('');
      setAmount('');

    } catch (error: any) {
      // ИСПРАВЛЕНИЕ: Теперь показываем РЕАЛЬНУЮ ошибку от бэкенда
      console.error(error);
      const errorMsg = error.response?.data?.detail || "Не удалось выполнить перевод";
      Alert.alert("Ошибка перевода", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>

        <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Переводы</Text>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 15}}>Мгновенный перевод</Text>

            <SegmentedButtons
              value={transferType}
              onValueChange={setTransferType}
              buttons={[{ value: 'phone', label: 'По номеру' }, { value: 'card', label: 'По карте' }]}
              style={{ marginBottom: 20 }}
            />

            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}>
                <TextInput
                    label={transferType === 'phone' ? "Телефон (+7...)" : "Номер карты"}
                    value={receiver}
                    onChangeText={transferType === 'phone' ? formatPhoneNumber : setReceiver}
                    keyboardType="numeric"
                    mode="outlined"
                    style={{flex: 1, backgroundColor: 'white'}}
                    maxLength={transferType === 'phone' ? 16 : 19}
                />

                {transferType === 'phone' && (
                    <TouchableOpacity onPress={openContacts} style={{marginLeft: 10}}>
                        <Avatar.Icon size={50} icon="contacts" style={{backgroundColor: theme.colors.primaryContainer}} color={theme.colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            <TextInput
              label="Сумма (₸)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <Button mode="contained" onPress={handleTransfer} loading={loading} style={{ marginTop: 10 }} contentStyle={{height: 50}}>
              Перевести
            </Button>
          </Card.Content>
        </Card>

        {/* МОДАЛКА КОНТАКТОВ */}
        <Modal visible={contactsModalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
                <Text style={{fontSize: 20, fontWeight:'bold'}}>Контакты</Text>
                <Button onPress={() => setContactsModalVisible(false)}>Закрыть</Button>
            </View>
            <Searchbar placeholder="Поиск..." onChangeText={handleSearchContact} value={searchQuery} style={{margin: 15}} />
            {loadingContacts ? <ActivityIndicator style={{marginTop:50}} /> : (
                <FlatList
                    data={filteredContacts}
                    keyExtractor={(item: any) => item.id || Math.random().toString()}
                    renderItem={({ item }: { item: any }) => (
                        <TouchableOpacity style={styles.contactItem} onPress={() => handleContactSelect(item)}>
                            <Avatar.Text size={40} label={item.name ? item.name[0] : "?"} style={{marginRight: 15}} />
                            <View>
                                <Text style={{fontSize: 16, fontWeight: 'bold'}}>{item.name}</Text>
                                <Text style={{color: '#888'}}>{item.phoneNumbers?.[0]?.number}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
          </View>
        </Modal>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 100 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 20, marginTop: 10 },
  card: { borderRadius: 16, elevation: 4 },
  input: { marginBottom: 15, backgroundColor: 'white' },
  modalContainer: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }
});