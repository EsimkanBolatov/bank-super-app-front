import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text, TextInput, Button, useTheme, IconButton, Searchbar, ActivityIndicator } from 'react-native-paper';
import { bankApi } from '../../src/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter, useFocusEffect } from 'expo-router';

// Страны для международных переводов
const COUNTRIES = [
    { code: 'TR', name: 'Турция', flag: '🇹🇷' }, { code: 'UZ', name: 'Узбекистан', flag: '🇺🇿' },
    { code: 'KG', name: 'Кыргызстан', flag: '🇰🇬' }, { code: 'RU', name: 'Россия', flag: '🇷🇺' },
    { code: 'CN', name: 'Китай', flag: '🇨🇳' }, { code: 'AE', name: 'ОАЭ', flag: '🇦🇪' },
];

export default function PaymentsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // --- STATE ---
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [activeTransferType, setActiveTransferType] = useState<'phone' | 'card' | 'own' | 'inter' | null>(null);
  
  const [receiver, setReceiver] = useState('');
  const [interReceiverName, setInterReceiverName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Cards
  const [myCards, setMyCards] = useState<any[]>([]);
  const [selectedSourceCard, setSelectedSourceCard] = useState<any>(null);
  const [selectedDestCard, setSelectedDestCard] = useState<any>(null);

  // Contacts
  const [contactsModalVisible, setContactsModalVisible] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Favorites
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isEditingFavorites, setIsEditingFavorites] = useState(false);
  const [addFavoriteModalVisible, setAddFavoriteModalVisible] = useState(false);
  const [newFavName, setNewFavName] = useState('');
  const [newFavValue, setNewFavValue] = useState('');

  // --- DATA LOADING ---
  const fetchInitialData = async () => {
      try {
          const cardsRes = await bankApi.getCards();
          const cards = cardsRes.data || [];
          if (cards.length === 0) cards.push({id:999, card_number:'4000 0000 VIRT 0000', balance:0, currency:'KZT', isGhost:true});
          
          setMyCards(cards);
          if (cards.length > 0) setSelectedSourceCard(cards[0]);
          if (cards.length > 1) setSelectedDestCard(cards[1]);
          else setSelectedDestCard(cards[0]);

          const favRes = await bankApi.getFavorites();
          setFavorites(favRes.data || []);
      } catch (e) {}
  };

  useFocusEffect(useCallback(() => { fetchInitialData(); }, []));

  // --- ВВОД НОМЕРА ---
  const formatPhoneNumber = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    
    // Если пользователь стирает
    if (text === '+') { setReceiver(''); return; }
    if (text === '+7') { setReceiver('+7'); return; }
    
    // Нормализация (убираем дублирование 7 или 8 в начале)
    if (cleaned.length > 0) {
        if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
            cleaned = cleaned.slice(1);
        }
    }
    
    if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);

    // Маска
    let formatted = '+7';
    if (cleaned.length > 0) formatted += ' (' + cleaned.substring(0, 3);
    if (cleaned.length >= 4) formatted += ') ' + cleaned.substring(3, 6);
    if (cleaned.length >= 7) formatted += '-' + cleaned.substring(6, 8);
    if (cleaned.length >= 9) formatted += '-' + cleaned.substring(8, 10);

    setReceiver(formatted);
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
    setReceiver(formatted);
  };

  // --- КОНТАКТЫ (ИСПРАВЛЕНО) ---
  const openContacts = async () => {
    setLoadingContacts(true);
    setContactsModalVisible(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
        const valid = data
            .filter((c: any) => c.phoneNumbers && c.phoneNumbers.length > 0 && c.name)
            .sort((a, b) => a.name.localeCompare(b.name));
        
        setContacts(valid);
        setFilteredContacts(valid);
      } else {
        Alert.alert("Ошибка", "Нет доступа к контактам. Проверьте настройки телефона.");
        setContactsModalVisible(false);
      }
    } catch (e) {
        Alert.alert("Ошибка", "Не удалось открыть контакты");
    } finally { 
        setLoadingContacts(false); 
    }
  };

  const handleContactSelect = (contact: any) => {
    let num = contact.phoneNumbers?.[0]?.number;
    if (!num) return;
    
    // Глубокая очистка номера от скобок, пробелов, +7, 8 и т.д.
    let cleanNum = num.replace(/\D/g, '');
    if (cleanNum.startsWith('7') || cleanNum.startsWith('8')) {
        cleanNum = cleanNum.slice(1);
    }
    if (cleanNum.length > 10) cleanNum = cleanNum.slice(-10); // Берем последние 10 цифр

    // Форматируем для UI
    formatPhoneNumber('7' + cleanNum);
    setContactsModalVisible(false);
  };

  const handleSearchContact = (query: string) => {
      setSearchQuery(query);
      if (!query) setFilteredContacts(contacts);
      else setFilteredContacts(contacts.filter((c: any) => c.name.toLowerCase().includes(query.toLowerCase())));
  };

  // --- ЛОГИКА ПЕРЕВОДА ---
  const openTransfer = (type: 'phone' | 'card' | 'own' | 'inter', initialValue?: string) => {
      setActiveTransferType(type);
      setReceiver(initialValue || (type === 'phone' ? '+7 (' : ''));
      setAmount('');
      setTransferModalVisible(true);
  };

  const handleTransfer = async () => {
      if (!amount || Number(amount) <= 0) return Alert.alert("Ошибка", "Введите сумму");

      setLoading(true);
      try {
          let toPhone = undefined;
          let toCard = undefined;
          let fromId = selectedSourceCard?.id;

          if (!fromId) throw new Error("Нет карты для списания");

          if (activeTransferType === 'own') {
              if (selectedSourceCard.id === selectedDestCard.id) throw new Error("Выберите разные карты");
              toCard = selectedDestCard.card_number;
          } 
          else if (activeTransferType === 'phone') {
              let p = receiver.replace(/\D/g, ''); 
              if (p.length === 11 && p.startsWith('7')) p = '8' + p.slice(1);
              if (p.length === 10) p = '8' + p;
              toPhone = p;
          }
          else {
              toCard = receiver.replace(/\D/g, '');
          }

          await bankApi.transferP2P(Number(amount), toPhone, toCard, fromId);
          
          Alert.alert("Успешно ✅", "Перевод отправлен!");
          setTransferModalVisible(false);
          fetchInitialData(); 

      } catch (error: any) {
          const msg = error.response?.data?.detail || error.message || "Сбой перевода";
          Alert.alert("Ошибка", msg);
      } finally {
          setLoading(false);
      }
  };

  // --- CRUD ИЗБРАННОГО ---
  const handleAddFavorite = async () => {
      if (!newFavName || !newFavValue) return;
      try {
          await bankApi.addFavorite(newFavName, newFavValue, 'phone');
          setAddFavoriteModalVisible(false);
          setNewFavName(''); setNewFavValue('');
          fetchInitialData();
      } catch (e) { Alert.alert("Ошибка", "Не удалось сохранить"); }
  };

  const handleDeleteFavorite = async (id: number) => {
      try {
          await bankApi.deleteFavorite(id);
          fetchInitialData();
      } catch (e) {}
  };

  // --- MENU ITEMS (ОБНОВЛЕННЫЕ ИКОНКИ) ---
  const menuItems = [
      { title: "Между счетами", subtitle: "Мгновенно", icon: "cached", colors: ['#5C6BC0', '#3949AB'], action: () => openTransfer('own') },
      { title: "Клиенту банка", subtitle: "По номеру телефона", icon: "account", colors: ['#AB47BC', '#7B1FA2'], action: () => openTransfer('phone') },
      { title: "На карту", subtitle: "VISA / MasterCard", icon: "credit-card-outline", colors: ['#FF7043', '#E64A19'], action: () => openTransfer('card') },
      { title: "За рубеж", subtitle: "SWIFT / Мир", icon: "earth", colors: ['#26A69A', '#00897B'], action: () => openTransfer('inter') },
      { title: "QR Платежи", subtitle: "Сканируй и плати", icon: "qrcode-scan", colors: ['#66BB6A', '#43A047'], action: () => router.push('/qr') },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.headerTitle}>Переводы</Text></View>

      <ScrollView contentContainerStyle={{paddingBottom: 50}}>
          {/* ОБНОВЛЕННОЕ МЕНЮ */}
          <View style={styles.menuContainer}>
              {menuItems.map((item, index) => (
                  <TouchableOpacity key={index} style={styles.menuItem} onPress={item.action as any} activeOpacity={0.7}>
                      <LinearGradient colors={item.colors as any} style={styles.menuIconBg} start={{x:0, y:0}} end={{x:1, y:1}}>
                          <MaterialCommunityIcons name={item.icon} size={28} color="white" />
                      </LinearGradient>
                      <View style={{flex:1, marginLeft: 15}}>
                          <Text style={styles.menuTitle}>{item.title}</Text>
                          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                  </TouchableOpacity>
              ))}
          </View>

          <View style={styles.favoritesSection}>
              <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                  <Text style={styles.sectionTitle}>Избранное</Text>
                  <TouchableOpacity onPress={() => setIsEditingFavorites(!isEditingFavorites)}>
                      <Text style={{color: theme.colors.primary}}>{isEditingFavorites ? 'Готово' : 'Изменить'}</Text>
                  </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 5}}>
                  <TouchableOpacity style={styles.favItem} onPress={() => setAddFavoriteModalVisible(true)}>
                      <View style={[styles.favAvatar, {backgroundColor: '#EEEEEE'}]}><MaterialCommunityIcons name="plus" size={30} color="#757575" /></View>
                      <Text style={styles.favName}>Добавить</Text>
                  </TouchableOpacity>
                  {favorites.map((f) => (
                      <TouchableOpacity key={f.id} style={styles.favItem} onPress={() => !isEditingFavorites && openTransfer(f.type, f.value)} disabled={isEditingFavorites}>
                          <View>
                            <LinearGradient colors={f.color || ['#90A4AE', '#607D8B']} style={styles.favAvatar}>
                                <Text style={{fontWeight:'bold', color:'white', fontSize:18}}>{f.name[0]}</Text>
                            </LinearGradient>
                            {isEditingFavorites && (
                                <TouchableOpacity style={styles.deleteBadge} onPress={() => handleDeleteFavorite(f.id)}>
                                    <MaterialCommunityIcons name="close" size={12} color="white" />
                                </TouchableOpacity>
                            )}
                          </View>
                          <Text style={styles.favName} numberOfLines={1}>{f.name}</Text>
                      </TouchableOpacity>
                  ))}
              </ScrollView>
          </View>
      </ScrollView>

      {/* --- МОДАЛКА ПЕРЕВОДА (ИСПРАВЛЕНАЯ) --- */}
      <Modal visible={transferModalVisible} transparent={true} animationType="slide" onRequestClose={() => setTransferModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContent}>
                    <View style={styles.dragHandle} />
                    
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {activeTransferType === 'phone' ? 'Клиенту банка' : activeTransferType === 'own' ? 'Между счетами' : activeTransferType === 'inter' ? 'Международный' : 'На карту'}
                        </Text>
                        <IconButton icon="close" size={24} onPress={() => setTransferModalVisible(false)} style={{marginRight:-10}} />
                    </View>

                    <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 40}} keyboardShouldPersistTaps="handled">
                        
                        {/* 1. КАРТА СПИСАНИЯ */}
                        <Text style={styles.label}>Откуда</Text>
                        <TouchableOpacity style={styles.cardSelector} onPress={() => {
                             if(myCards.length < 2) return;
                             const idx = myCards.indexOf(selectedSourceCard);
                             setSelectedSourceCard(myCards[(idx+1)%myCards.length]);
                        }}>
                            <View style={styles.cardIconSmall}>
                                <MaterialCommunityIcons name="credit-card" size={20} color="white" />
                            </View>
                            <View style={{marginLeft:12, flex:1}}>
                                <Text style={{fontWeight:'bold', fontSize: 16}}>
                                    {selectedSourceCard?.card_number ? `*${selectedSourceCard.card_number.slice(-4)}` : 'Выбрать карту'}
                                </Text>
                                <Text style={{color:'#666'}}>
                                    {selectedSourceCard ? `${Number(selectedSourceCard.balance).toLocaleString()} ${selectedSourceCard.currency}` : '0 ₸'}
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-down" size={24} color="#666" />
                        </TouchableOpacity>

                        {/* 2. ПОЛЯ ПОЛУЧАТЕЛЯ */}
                        <Text style={[styles.label, {marginTop: 20}]}>Кому</Text>

                        {/* МЕЖДУ СВОИМИ */}
                        {activeTransferType === 'own' && (
                             <TouchableOpacity style={styles.cardSelector} onPress={() => {
                                if(myCards.length < 2) return;
                                const idx = myCards.indexOf(selectedDestCard);
                                setSelectedDestCard(myCards[(idx+1)%myCards.length]);
                           }}>
                               <View style={[styles.cardIconSmall, {backgroundColor:'#4CAF50'}]}>
                                    <MaterialCommunityIcons name="wallet" size={20} color="white" />
                               </View>
                               <View style={{marginLeft:12, flex:1}}>
                                   <Text style={{fontWeight:'bold', fontSize: 16}}>{selectedDestCard?.card_number ? `*${selectedDestCard.card_number.slice(-4)}` : 'Выбрать'}</Text>
                                   <Text style={{color:'#666'}}>{Number(selectedDestCard?.balance).toLocaleString()} ₸</Text>
                               </View>
                               <MaterialCommunityIcons name="chevron-down" size={24} color="#666" />
                           </TouchableOpacity>
                        )}

                        {/* МЕЖДУНАРОДНЫЕ */}
                        {activeTransferType === 'inter' && (
                            <View style={{marginBottom: 15}}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection:'row', marginBottom:10}}>
                                    {COUNTRIES.map(c => (
                                        <TouchableOpacity key={c.code} onPress={() => setSelectedCountry(c)} style={[styles.countryChip, selectedCountry.code === c.code && styles.countryChipActive]}>
                                            <Text style={{fontSize:20, marginRight:6}}>{c.flag}</Text>
                                            <Text style={{fontWeight: selectedCountry.code === c.code ? 'bold' : 'normal'}}>{c.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TextInput label="Имя Фамилия (lat)" mode="outlined" value={interReceiverName} onChangeText={setInterReceiverName} style={styles.input} />
                            </View>
                        )}

                        {/* НОМЕР ТЕЛЕФОНА (КНОПКА КОНТАКТОВ ВЫНЕСЕНА) */}
                        {activeTransferType === 'phone' && (
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                                <TextInput 
                                    label="Телефон (+7...)" 
                                    mode="outlined" 
                                    value={receiver} 
                                    onChangeText={formatPhoneNumber} 
                                    keyboardType="phone-pad" 
                                    style={[styles.input, {flex: 1, marginBottom: 0}]} 
                                />
                                <TouchableOpacity onPress={openContacts} style={styles.contactBtn}>
                                    <MaterialCommunityIcons name="contacts" size={28} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* НОМЕР КАРТЫ */}
                        {(activeTransferType === 'card' || activeTransferType === 'inter') && (
                            <TextInput 
                                label="Номер карты получателя" 
                                mode="outlined" 
                                value={receiver} 
                                onChangeText={formatCardNumber} 
                                keyboardType="numeric" 
                                maxLength={19} 
                                style={styles.input} 
                                left={<TextInput.Icon icon="credit-card-outline" />} 
                            />
                        )}

                        {/* 3. СУММА */}
                        <Text style={[styles.label, {marginTop: 20}]}>Сумма</Text>
                        <TextInput 
                            mode="outlined" 
                            value={amount} 
                            onChangeText={setAmount} 
                            keyboardType="numeric" 
                            style={[styles.input, {backgroundColor:'#F1F8E9', fontSize: 18}]} 
                            right={<TextInput.Icon icon="currency-kzt" />} 
                            placeholder="0"
                        />

                        <Button 
                            mode="contained" 
                            onPress={handleTransfer} 
                            loading={loading} 
                            style={styles.payButton} 
                            contentStyle={{height: 56}}
                            labelStyle={{fontSize: 18, fontWeight: 'bold'}}
                        >
                            Перевести
                        </Button>

                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: ADD FAVORITE */}
      <Modal visible={addFavoriteModalVisible} transparent={true} animationType="fade">
          <View style={styles.centerModalOverlay}>
              <View style={styles.centerModal}>
                  <Text style={{fontSize:18, fontWeight:'bold', marginBottom:15}}>Новый контакт</Text>
                  <TextInput label="Имя" mode="outlined" value={newFavName} onChangeText={setNewFavName} style={styles.input} />
                  <TextInput label="Телефон" mode="outlined" value={newFavValue} onChangeText={setNewFavValue} keyboardType="phone-pad" style={styles.input} />
                  <View style={{flexDirection:'row', justifyContent:'flex-end', marginTop:15}}>
                      <Button onPress={() => setAddFavoriteModalVisible(false)} textColor="#666">Отмена</Button>
                      <Button onPress={handleAddFavorite} mode="contained" style={{marginLeft:10}}>Сохранить</Button>
                  </View>
              </View>
          </View>
      </Modal>

      {/* MODAL: CONTACTS LIST */}
      <Modal visible={contactsModalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={{flex:1, backgroundColor:'white', paddingTop: 20}}>
              <View style={{paddingHorizontal: 20, marginBottom: 10}}>
                  <Text style={{fontSize: 24, fontWeight: 'bold', marginBottom: 15}}>Контакты</Text>
                  <Searchbar placeholder="Поиск..." onChangeText={handleSearchContact} value={searchQuery} style={{backgroundColor:'#f5f5f5'}} />
              </View>
              
              {loadingContacts ? (
                  <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" /></View>
              ) : (
                  <FlatList 
                    data={filteredContacts} 
                    keyExtractor={(item:any) => item.id || Math.random().toString()} 
                    renderItem={({item}) => (
                        <TouchableOpacity style={styles.contactRow} onPress={() => handleContactSelect(item)}>
                            <View style={styles.contactAvatar}>
                                <Text style={{color:'white', fontWeight:'bold'}}>{item.name?.[0]}</Text>
                            </View>
                            <View>
                                <Text style={{fontSize:16, fontWeight:'bold'}}>{item.name}</Text>
                                <Text style={{color:'#666'}}>{item.phoneNumbers?.[0]?.number}</Text>
                            </View>
                        </TouchableOpacity>
                    )} 
                  />
              )}
              <Button mode="contained" onPress={() => setContactsModalVisible(false)} style={{margin: 20}}>Закрыть</Button>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: { padding: 20, alignItems: 'center', backgroundColor: 'white' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color:'#111' },
  
  menuContainer: { backgroundColor: 'white', borderRadius: 24, marginHorizontal: 15, paddingVertical: 10, marginTop: 10, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  // Исправленные стили иконок (живые)
  menuIconBg: { width: 52, height: 52, borderRadius: 18, justifyContent:'center', alignItems:'center', marginRight: 16, elevation: 4 },
  menuTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  menuSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  
  favoritesSection: { marginTop: 25, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  favItem: { alignItems: 'center', marginRight: 15, width: 70 },
  favAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation:3 },
  favName: { fontSize: 11, textAlign: 'center', color:'#555' },
  deleteBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  
  // Модалка перевода
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', paddingTop: 10 }, // Увеличили высоту
  dragHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems:'center', marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  
  label: { color:'#666', marginBottom: 8, fontSize: 14, fontWeight: '600' },
  cardSelector: { flexDirection:'row', alignItems:'center', padding: 16, backgroundColor:'#F5F7FA', borderRadius: 16, borderWidth:1, borderColor:'#E0E0E0' },
  cardIconSmall: { width: 40, height: 26, backgroundColor:'#3949AB', borderRadius: 4, justifyContent:'center', alignItems:'center' },
  
  input: { marginBottom: 15, backgroundColor:'white' },
  contactBtn: { width: 56, height: 56, backgroundColor: '#AB47BC', justifyContent:'center', alignItems:'center', borderRadius: 12, marginLeft: 10, marginTop: 5 },
  
  payButton: { marginTop: 10, borderRadius: 14, backgroundColor: '#6200EE' },
  
  countryChip: { padding: 12, borderRadius: 20, backgroundColor: '#F5F5F5', marginRight: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  countryChipActive: { backgroundColor: '#E0F2F1', borderColor: '#00897B' },
  
  centerModalOverlay: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)' },
  centerModal: { width:'85%', backgroundColor:'white', padding: 25, borderRadius: 20, elevation: 10 },
  
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BDBDBD', justifyContent: 'center', alignItems: 'center', marginRight: 15 }
});