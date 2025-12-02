import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import { Text, TextInput, Button, useTheme, IconButton, Avatar, Searchbar, ActivityIndicator, Divider, Switch } from 'react-native-paper';
import { bankApi } from '../../src/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter, useFocusEffect } from 'expo-router';

// Типы для избранного
interface Favorite {
    id: number;
    name: string;
    value: string; // phone or card
    type: 'phone' | 'card';
    color: readonly [string, string];
}

export default function PaymentsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // --- СОСТОЯНИЕ ---
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [activeTransferType, setActiveTransferType] = useState<'phone' | 'card' | 'own' | 'inter' | null>(null);
  
  // Данные формы
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Карты пользователя (для "Между счетами")
  const [myCards, setMyCards] = useState<any[]>([]);
  const [selectedSourceCard, setSelectedSourceCard] = useState<any>(null);
  const [selectedDestCard, setSelectedDestCard] = useState<any>(null);

  // Контакты
  const [contactsModalVisible, setContactsModalVisible] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Избранное (Локальный стейт для примера, в идеале - AsyncStorage)
  const [favorites, setFavorites] = useState<Favorite[]>([
      {id: 1, name: 'Айдана Б.', value: '87771234567', type: 'phone', color: ['#FFD54F', '#FFCA28']},
      {id: 2, name: 'Бақдәулет Е.', value: '87079998877', type: 'phone', color: ['#4DB6AC', '#009688']},
      {id: 3, name: 'Елхан К.', value: '87755554433', type: 'phone', color: ['#9575CD', '#673AB7']},
      {id: 4, name: 'Мама ❤️', value: '87011112233', type: 'phone', color: ['#F06292', '#E91E63']},
  ]);
  const [isEditingFavorites, setIsEditingFavorites] = useState(false);

  // --- ЗАГРУЗКА ДАННЫХ ---
  const fetchCards = async () => {
      try {
          const res = await bankApi.getCards();
          const cards = res.data || [];
          // Добавляем "Призрачную карту" (Mock)
          const ghostCard = { id: 999, card_number: '4000 0000 GHOST 9999', balance: 50000, currency: 'KZT', isGhost: true };
          const allCards = [...cards, ghostCard];
          
          setMyCards(allCards);
          if (allCards.length > 0) setSelectedSourceCard(allCards[0]);
          if (allCards.length > 1) setSelectedDestCard(allCards[1]);
      } catch (e) { console.error(e); }
  };

  useFocusEffect(useCallback(() => { fetchCards(); }, []));

  // --- ХЕЛПЕРЫ ФОРМАТИРОВАНИЯ ---
  const formatPhoneNumber = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    // Убираем 7 или 8 в начале для унификации
    if (cleaned.length > 0 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
        cleaned = cleaned.slice(1); 
    }
    // Ограничиваем длину (10 цифр без кода страны)
    cleaned = cleaned.slice(0, 10);
    
    let formatted = '';
    if (cleaned.length > 0) formatted += '+7 (' + cleaned.substring(0, 3);
    if (cleaned.length >= 4) formatted += ') ' + cleaned.substring(3, 6);
    if (cleaned.length >= 7) formatted += ' ' + cleaned.substring(6, 8);
    if (cleaned.length >= 9) formatted += ' ' + cleaned.substring(8, 10);
    
    setReceiver(formatted);
  };

  const formatCardNumber = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < cleaned.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += cleaned[i];
    }
    setReceiver(formatted);
  };

  // --- КОНТАКТЫ ---
  const openContacts = async () => {
    setLoadingContacts(true);
    setContactsModalVisible(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
        const valid = data.filter((c: any) => c.phoneNumbers && c.phoneNumbers.length > 0);
        setContacts(valid);
        setFilteredContacts(valid);
      } else {
        Alert.alert("Доступ запрещен", "Разрешите доступ к контактам в настройках.");
      }
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось загрузить контакты");
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleContactSelect = (contact: any) => {
    const rawNumber = contact.phoneNumbers[0].number;
    formatPhoneNumber(rawNumber);
    setContactsModalVisible(false);
  };

  // --- ВОТ ЭТА ФУНКЦИЯ БЫЛА ПРОПУЩЕНА ---
  const handleSearchContact = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setFilteredContacts(contacts.filter((c: any) => c.name?.toLowerCase().includes(query.toLowerCase())));
    } else {
      setFilteredContacts(contacts);
    }
  };

  // --- ПЕРЕВОД ---
  const openTransfer = (type: 'phone' | 'card' | 'own' | 'inter', initialValue?: string) => {
      setActiveTransferType(type);
      setReceiver(initialValue || '');
      setAmount('');
      setTransferModalVisible(true);
  };

  const handleTransfer = async () => {
    let cleanReceiver = receiver.replace(/\D/g, '');
    
    // Корректировка номера для бэкенда (8...)
    if (activeTransferType === 'phone' || activeTransferType === 'inter') {
        if (cleanReceiver.startsWith('7')) cleanReceiver = '8' + cleanReceiver.slice(1);
        if (cleanReceiver.length === 10) cleanReceiver = '8' + cleanReceiver; // Если ввели без 8
    }

    // Валидация
    if (activeTransferType !== 'own' && !cleanReceiver) {
        Alert.alert('Ошибка', 'Заполните получателя'); return;
    }
    if (!amount || Number(amount) <= 0) {
        Alert.alert('Ошибка', 'Введите сумму'); return;
    }

    setLoading(true);
    try {
        // Подготовка данных
        let toPhone = (activeTransferType === 'phone' || activeTransferType === 'inter') ? cleanReceiver : undefined;
        let toCard = (activeTransferType === 'card' || activeTransferType === 'inter') ? cleanReceiver : undefined;
        
        // Логика "Между своими"
        if (activeTransferType === 'own') {
            if (!selectedSourceCard || !selectedDestCard) return;
            if (selectedSourceCard.id === selectedDestCard.id) {
                Alert.alert("Ошибка", "Выберите разные карты"); setLoading(false); return;
            }
            toCard = selectedDestCard.card_number; // Шлем на номер своей второй карты
        }

        // Отправка на бэкенд
        await bankApi.transferP2P(
            Number(amount),
            toPhone,
            toCard
        );

        Alert.alert('Успешно ✅', `Перевод ${amount} ₸ выполнен!`);
        
        // Добавление в частые (эмуляция)
        if (activeTransferType !== 'own') {
            const exists = favorites.find(f => f.value === cleanReceiver);
            if (!exists) {
                setFavorites([...favorites, {
                    id: Date.now(),
                    name: activeTransferType === 'phone' ? `Тел: ${cleanReceiver.slice(-4)}` : `Карта: ${cleanReceiver.slice(-4)}`,
                    value: cleanReceiver,
                    type: activeTransferType === 'phone' ? 'phone' : 'card',
                    color: ['#B0BEC5', '#78909C']
                }]);
            }
        }

        setTransferModalVisible(false);

    } catch (error: any) {
        const msg = error.response?.data?.detail || "Ошибка перевода";
        Alert.alert("Неудачно", msg);
    } finally {
        setLoading(false);
    }
  };

  // --- УДАЛЕНИЕ ИЗ ИЗБРАННОГО ---
  const removeFavorite = (id: number) => {
      setFavorites(prev => prev.filter(f => f.id !== id));
  };

  // --- МЕНЮ ---
  const menuItems = [
      { 
          title: "Между своими счетами", 
          subtitle: "Мгновенно без комиссии", 
          icon: "swap-horizontal", 
          colors: ['#5C6BC0', '#3949AB'] as const, 
          action: () => openTransfer('own') 
      },
      { 
          title: "Клиенту Belly Bank", 
          subtitle: "По номеру телефона", 
          icon: "account", 
          colors: ['#AB47BC', '#7B1FA2'] as const, 
          action: () => openTransfer('phone') 
      },
      { 
          title: "Карта другого банка", 
          subtitle: "VISA / MasterCard", 
          icon: "credit-card-outline", 
          colors: ['#FF7043', '#E64A19'] as const, 
          action: () => openTransfer('card') 
      },
      { 
          title: "Международные переводы", 
          subtitle: "Золотая Корона, SWIFT", 
          icon: "earth", 
          colors: ['#26A69A', '#00897B'] as const, 
          action: () => openTransfer('inter') 
      },
      { 
          title: "QR Платежи", 
          subtitle: "Сканируйте и платите", 
          icon: "qrcode-scan", 
          colors: ['#66BB6A', '#43A047'] as const, 
          action: () => router.push('/qr') 
      },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Переводы</Text>
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom: 50}}>
          
          {/* МЕНЮ */}
          <View style={styles.menuContainer}>
              {menuItems.map((item, index) => (
                  <TouchableOpacity key={index} style={styles.menuItem} onPress={item.action} activeOpacity={0.7}>
                      <View style={{flexDirection:'row', alignItems:'center'}}>
                          <LinearGradient colors={item.colors} style={styles.menuIconBg} start={{x:0, y:0}} end={{x:1, y:1}}>
                              <MaterialCommunityIcons name={item.icon} size={24} color="white" />
                          </LinearGradient>
                          <View>
                              <Text style={styles.menuTitle}>{item.title}</Text>
                              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                          </View>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                  </TouchableOpacity>
              ))}
          </View>

          {/* ЧАСТЫЕ */}
          <View style={styles.favoritesSection}>
              <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                  <Text style={styles.sectionTitle}>Частые</Text>
                  <TouchableOpacity onPress={() => setIsEditingFavorites(!isEditingFavorites)}>
                      <Text style={{color: isEditingFavorites ? 'red' : '#3F51B5'}}>{isEditingFavorites ? 'Готово' : 'Изменить'}</Text>
                  </TouchableOpacity>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 5}}>
                  {favorites.map((f) => (
                      <TouchableOpacity 
                        key={f.id} 
                        style={styles.favoriteItem} 
                        onPress={() => !isEditingFavorites && openTransfer(f.type, f.value)}
                        disabled={isEditingFavorites}
                      >
                          <View>
                            <LinearGradient colors={f.color} style={styles.favoriteAvatar}>
                                <Text style={{fontWeight:'bold', color:'white', fontSize:18}}>{f.name[0]}</Text>
                            </LinearGradient>
                            {isEditingFavorites && (
                                <TouchableOpacity style={styles.deleteBadge} onPress={() => removeFavorite(f.id)}>
                                    <MaterialCommunityIcons name="minus" size={16} color="white" />
                                </TouchableOpacity>
                            )}
                          </View>
                          <Text style={styles.favoriteName} numberOfLines={1}>{f.name}</Text>
                      </TouchableOpacity>
                  ))}
              </ScrollView>
          </View>

      </ScrollView>

      {/* --- МОДАЛКА ПЕРЕВОДА --- */}
      <Modal visible={transferModalVisible} transparent={true} animationType="slide" onRequestClose={() => setTransferModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={styles.modalContent}>
                    <View style={styles.dragHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {activeTransferType === 'phone' ? 'Клиенту Belly Bank' : 
                             activeTransferType === 'card' ? 'На карту' : 
                             activeTransferType === 'own' ? 'Между счетами' : 'Международный'}
                        </Text>
                        <IconButton icon="close" size={20} onPress={() => setTransferModalVisible(false)} />
                    </View>

                    <View style={{padding: 20}}>
                        
                        {/* ВЫБОР КАРТЫ СПИСАНИЯ */}
                        <Text style={styles.label}>Откуда</Text>
                        <TouchableOpacity style={styles.cardSelect} onPress={() => {
                            const idx = myCards.indexOf(selectedSourceCard);
                            const next = myCards[(idx + 1) % myCards.length];
                            setSelectedSourceCard(next);
                        }}>
                            <View style={{flexDirection:'row', alignItems:'center'}}>
                                <MaterialCommunityIcons name="credit-card" size={24} color="#3F51B5" />
                                <View style={{marginLeft: 10}}>
                                    <Text style={{fontWeight:'bold'}}>
                                        {selectedSourceCard?.isGhost ? 'Ghost Card' : `Belly Card *${selectedSourceCard?.card_number?.slice(-4)}`}
                                    </Text>
                                    <Text style={{fontSize:12, color:'#666'}}>{Number(selectedSourceCard?.balance).toLocaleString()} {selectedSourceCard?.currency}</Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-down" size={20} color="#ccc" />
                        </TouchableOpacity>

                        {/* СЦЕНАРИЙ "МЕЖДУ СВОИМИ" */}
                        {activeTransferType === 'own' && (
                            <>
                                <View style={{alignItems:'center', marginVertical:5}}><MaterialCommunityIcons name="arrow-down" size={20} color="#ccc"/></View>
                                <Text style={styles.label}>Куда</Text>
                                <TouchableOpacity style={styles.cardSelect} onPress={() => {
                                    const idx = myCards.indexOf(selectedDestCard);
                                    const next = myCards[(idx + 1) % myCards.length];
                                    setSelectedDestCard(next);
                                }}>
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <MaterialCommunityIcons name="wallet" size={24} color="#4CAF50" />
                                        <View style={{marginLeft: 10}}>
                                            <Text style={{fontWeight:'bold'}}>
                                                {selectedDestCard?.isGhost ? 'Ghost Card' : `Belly Card *${selectedDestCard?.card_number?.slice(-4)}`}
                                            </Text>
                                            <Text style={{fontSize:12, color:'#666'}}>{Number(selectedDestCard?.balance).toLocaleString()} ₸</Text>
                                        </View>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-down" size={20} color="#ccc" />
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ПОЛЯ ВВОДА (ЕСЛИ НЕ "СВОИ") */}
                        {(activeTransferType === 'phone' || activeTransferType === 'inter') && (
                            <TextInput 
                                label="Телефон получателя" mode="outlined" value={receiver} onChangeText={formatPhoneNumber} 
                                keyboardType="phone-pad" style={styles.input}
                                right={<TextInput.Icon icon="contacts" onPress={openContacts}/>}
                            />
                        )}

                        {(activeTransferType === 'card' || activeTransferType === 'inter') && (
                            <TextInput 
                                label="Номер карты получателя" mode="outlined" value={receiver} onChangeText={formatCardNumber} 
                                keyboardType="numeric" style={styles.input} maxLength={19}
                                left={<TextInput.Icon icon="credit-card-outline" />}
                            />
                        )}

                        <TextInput 
                            label="Сумма (₸)" mode="outlined" value={amount} onChangeText={setAmount} 
                            keyboardType="numeric" style={[styles.input, {marginTop: 10, backgroundColor: '#F1F8E9'}]}
                            right={<TextInput.Icon icon="cash" />}
                        />

                        <TouchableOpacity onPress={handleTransfer} disabled={loading} activeOpacity={0.8}>
                            <LinearGradient colors={['#3F51B5', '#283593']} style={styles.transferButton} start={{x:0, y:0}} end={{x:1, y:0}}>
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.transferButtonText}>Перевести</Text>}
                            </LinearGradient>
                        </TouchableOpacity>

                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* МОДАЛКА КОНТАКТОВ */}
      <Modal visible={contactsModalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.contactsContainer, { backgroundColor: theme.colors.background }]}>
            <View style={styles.contactsHeader}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 10, backgroundColor: '#F7F9FC' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color:'#111' },
  
  // TABS
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15 },
  activeTab: { backgroundColor: '#E8EAF6', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  inactiveTab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  activeTabText: { fontWeight: 'bold', color: '#3F51B5', fontSize: 15 },
  inactiveTabText: { color: '#888', fontSize: 15 },

  // MENU
  menuContainer: { backgroundColor: 'white', borderRadius: 24, marginHorizontal: 15, paddingVertical: 10, elevation: 2, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuIconBg: { width: 44, height: 44, borderRadius: 14, justifyContent:'center', alignItems:'center', marginRight: 16 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  menuSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },

  // FAVORITES
  favoritesSection: { marginTop: 25, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  favoriteItem: { alignItems: 'center', marginRight: 15, width: 70 },
  favoriteAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation:3 },
  favoriteName: { fontSize: 12, textAlign: 'center', color: '#555', fontWeight:'500' },
  deleteBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: '60%', paddingBottom: 40 },
  dragHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginTop: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 15, marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color:'#222' },
  
  label: { fontSize: 14, color: '#666', marginBottom: 5, marginLeft: 5 },
  input: { marginBottom: 15, backgroundColor: 'white' },
  
  cardSelect: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#F5F7FA', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  
  transferButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 15, elevation: 4 },
  transferButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // CONTACTS
  contactsContainer: { flex: 1, paddingTop: 20 },
  contactsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }
});