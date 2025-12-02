import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import { Text, TextInput, Button, useTheme, IconButton, Avatar, Searchbar, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import { bankApi } from '../../src/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter, useFocusEffect } from 'expo-router';

interface Favorite { id: number; name: string; value: string; type: 'phone' | 'card'; color: readonly [string, string]; }

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

  // --- DATA ---
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

  // --- ИСПРАВЛЕННЫЙ ВВОД НОМЕРА (БЕЗ ГЛЮКОВ) ---
  const formatPhoneNumber = (text: string) => {
    // 1. Удаляем всё кроме цифр
    let cleaned = text.replace(/\D/g, '');
    
    // 2. Если пользователь стирает всё до "+7", даем ему это сделать
    if (text === '+') { setReceiver(''); return; }
    if (text === '+7') { setReceiver('+7'); return; }
    
    // 3. Если вставили номер или начали ввод (8.. или 7..)
    // Нормализуем: убираем первую цифру кода страны, если она дублируется
    if (cleaned.length > 0) {
        if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
            cleaned = cleaned.slice(1);
        }
    }
    
    // Обрезаем лишнее (макс 10 цифр номера)
    if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);

    // 4. Формируем маску
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

  // --- CONTACTS ---
  const openContacts = async () => {
    setLoadingContacts(true);
    setContactsModalVisible(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
        const valid = data.filter((c: any) => c.phoneNumbers && c.phoneNumbers.length > 0 && c.name);
        setContacts(valid);
        setFilteredContacts(valid);
      } else {
        Alert.alert("Ошибка", "Нет доступа к контактам");
      }
    } catch (e) {} finally { setLoadingContacts(false); }
  };

  const handleContactSelect = (contact: any) => {
    let num = contact.phoneNumbers?.[0]?.number;
    if (!num) return;
    // Просто чистим и передаем в форматтер
    num = num.replace(/\D/g, '');
    // Если номер длинный (с кодом страны), обрезаем последние 10 цифр
    if (num.length >= 10) num = num.slice(-10);
    
    // Эмулируем ввод
    formatPhoneNumber('7' + num);
    setContactsModalVisible(false);
  };

  const handleSearchContact = (query: string) => {
      setSearchQuery(query);
      if (!query) setFilteredContacts(contacts);
      else setFilteredContacts(contacts.filter((c: any) => c.name.toLowerCase().includes(query.toLowerCase())));
  };

  // --- ПЕРЕВОД ---
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
              // Превращаем в 8... для бэка
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

  // --- FAVORITES CRUD ---
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

  // --- MENU ITEMS ---
  const menuItems = [
      { title: "Между своими счетами", subtitle: "Мгновенно", icon: "cached", colors: ['#5C6BC0', '#3949AB'] as const, action: () => openTransfer('own') },
      { title: "Клиенту Belly Bank", subtitle: "По номеру телефона", icon: "account", colors: ['#AB47BC', '#7B1FA2'] as const, action: () => openTransfer('phone') },
      { title: "Карта другого банка", subtitle: "VISA / MasterCard", icon: "credit-card-outline", colors: ['#FF7043', '#E64A19'] as const, action: () => openTransfer('card') },
      { title: "Международные переводы", subtitle: "На карту (Мир)", icon: "earth", colors: ['#26A69A', '#00897B'] as const, action: () => openTransfer('inter') },
      { title: "QR Платежи", subtitle: "Сканируйте и платите", icon: "qrcode-scan", colors: ['#66BB6A', '#43A047'] as const, action: () => router.push('/qr') },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.headerTitle}>Переводы</Text></View>

      <ScrollView contentContainerStyle={{paddingBottom: 50}}>
          <View style={styles.menuContainer}>
              {menuItems.map((item, index) => (
                  <TouchableOpacity key={index} style={styles.menuItem} onPress={item.action as any} activeOpacity={0.7}>
                      {/* 1. ИСПРАВЛЕНО: flex: 1 для текста, чтобы стрелка была справа */}
                      <LinearGradient colors={item.colors} style={styles.menuIconBg} start={{x:0, y:0}} end={{x:1, y:1}}>
                          <MaterialCommunityIcons name={item.icon} size={24} color="white" />
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
                  <Text style={styles.sectionTitle}>Частые</Text>
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

      {/* МОДАЛКА ПЕРЕВОДА */}
      <Modal visible={transferModalVisible} transparent={true} animationType="slide" onRequestClose={() => setTransferModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContent}>
                    <View style={styles.dragHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {activeTransferType === 'phone' ? 'Клиенту банка' : activeTransferType === 'own' ? 'Между счетами' : activeTransferType === 'inter' ? 'Международный' : 'На карту'}
                        </Text>
                        <IconButton icon="close" size={20} onPress={() => setTransferModalVisible(false)} />
                    </View>
                    <ScrollView contentContainerStyle={{padding: 20}} keyboardShouldPersistTaps="handled">
                        
                        {/* ОТКУДА */}
                        <Text style={styles.label}>Списать с</Text>
                        <TouchableOpacity style={styles.cardSelector} onPress={() => {
                             if(myCards.length < 2) return;
                             const idx = myCards.indexOf(selectedSourceCard);
                             setSelectedSourceCard(myCards[(idx+1)%myCards.length]);
                        }}>
                            <MaterialCommunityIcons name="credit-card" size={24} color="#3F51B5" />
                            <View style={{marginLeft:10, flex:1}}>
                                <Text style={{fontWeight:'bold'}}>{selectedSourceCard?.card_number ? `*${selectedSourceCard.card_number.slice(-4)}` : 'Выбрать'}</Text>
                                <Text style={{color:'#666'}}>{Number(selectedSourceCard?.balance).toLocaleString()} {selectedSourceCard?.currency}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                        </TouchableOpacity>

                        {/* КУДА (МЕЖДУ СВОИМИ) */}
                        {activeTransferType === 'own' && (
                             <TouchableOpacity style={[styles.cardSelector, {marginTop:10}]} onPress={() => {
                                if(myCards.length < 2) return;
                                const idx = myCards.indexOf(selectedDestCard);
                                setSelectedDestCard(myCards[(idx+1)%myCards.length]);
                           }}>
                               <MaterialCommunityIcons name="wallet" size={24} color="#4CAF50" />
                               <View style={{marginLeft:10, flex:1}}>
                                   <Text style={{fontWeight:'bold'}}>{selectedDestCard?.card_number ? `*${selectedDestCard.card_number.slice(-4)}` : 'Выбрать'}</Text>
                                   <Text style={{color:'#666'}}>{Number(selectedDestCard?.balance).toLocaleString()} ₸</Text>
                               </View>
                               <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                           </TouchableOpacity>
                        )}

                        {/* МЕЖДУНАРОДНЫЕ (СТРАНА) */}
                        {activeTransferType === 'inter' && (
                            <View style={{marginVertical: 10}}>
                                <Text style={styles.label}>Страна получателя</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection:'row', marginBottom:10}}>
                                    {COUNTRIES.map(c => (
                                        <TouchableOpacity key={c.code} onPress={() => setSelectedCountry(c)} style={[styles.countryChip, selectedCountry.code === c.code && styles.countryChipActive]}>
                                            <Text style={{fontSize:18, marginRight:5}}>{c.flag}</Text>
                                            <Text>{c.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* ПОЛЯ ВВОДА */}
                        {activeTransferType === 'phone' && (
                            <TextInput 
                                label="Телефон (+7...)" 
                                mode="outlined" 
                                value={receiver} 
                                onChangeText={formatPhoneNumber} 
                                keyboardType="phone-pad" 
                                style={styles.input} 
                                // ИСПРАВЛЕНО: Иконка контактов всегда видна
                                right={<TextInput.Icon icon="account-box" onPress={openContacts}/>} 
                            />
                        )}
                        {(activeTransferType === 'card' || activeTransferType === 'inter') && (
                            <TextInput label="Номер карты получателя" mode="outlined" value={receiver} onChangeText={formatCardNumber} keyboardType="numeric" maxLength={19} style={styles.input} left={<TextInput.Icon icon="credit-card-outline" />} />
                        )}
                        {activeTransferType === 'inter' && (
                            <TextInput label="Имя Фамилия (на латинице)" mode="outlined" value={interReceiverName} onChangeText={setInterReceiverName} style={styles.input} />
                        )}

                        <TextInput label="Сумма (₸)" mode="outlined" value={amount} onChangeText={setAmount} keyboardType="numeric" style={[styles.input, {marginTop: 10, backgroundColor:'#E8F5E9'}]} autoFocus={activeTransferType !== 'inter'} right={<TextInput.Icon icon="cash" />} />
                        <Button mode="contained" onPress={handleTransfer} loading={loading} style={{marginTop: 20, borderRadius: 10}} contentStyle={{height: 50}}>Перевести</Button>
                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={addFavoriteModalVisible} transparent={true} animationType="fade">
          <View style={styles.centerModalOverlay}>
              <View style={styles.centerModal}>
                  <Text style={{fontSize:18, fontWeight:'bold', marginBottom:15}}>Новый контакт</Text>
                  <TextInput label="Имя" mode="outlined" value={newFavName} onChangeText={setNewFavName} style={styles.input} />
                  <TextInput label="Телефон (цифры)" mode="outlined" value={newFavValue} onChangeText={setNewFavValue} keyboardType="phone-pad" style={styles.input} />
                  <View style={{flexDirection:'row', justifyContent:'flex-end', marginTop:10}}>
                      <Button onPress={() => setAddFavoriteModalVisible(false)}>Отмена</Button>
                      <Button onPress={handleAddFavorite}>Сохранить</Button>
                  </View>
              </View>
          </View>
      </Modal>

      <Modal visible={contactsModalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={{flex:1, backgroundColor:'white', padding:20}}>
              <Searchbar placeholder="Поиск..." onChangeText={handleSearchContact} value={searchQuery} style={{marginBottom:20}} />
              {loadingContacts ? <ActivityIndicator /> : (
                  <FlatList data={filteredContacts} keyExtractor={(item:any) => item.id} renderItem={({item}) => (
                        <TouchableOpacity style={{padding:15, borderBottomWidth:1, borderColor:'#eee'}} onPress={() => handleContactSelect(item)}>
                            <Text style={{fontSize:16, fontWeight:'bold'}}>{item.name}</Text>
                            <Text style={{color:'#666'}}>{item.phoneNumbers?.[0]?.number}</Text>
                        </TouchableOpacity>
                    )} />
              )}
              <Button onPress={() => setContactsModalVisible(false)}>Закрыть</Button>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: { padding: 20, alignItems: 'center', backgroundColor: 'white' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color:'#111' },
  menuContainer: { backgroundColor: 'white', borderRadius: 24, marginHorizontal: 15, paddingVertical: 10, elevation: 2, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuIconBg: { width: 44, height: 44, borderRadius: 14, justifyContent:'center', alignItems:'center', marginRight: 16 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  menuSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  favoritesSection: { marginTop: 10, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  favItem: { alignItems: 'center', marginRight: 15, width: 70 },
  favAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation:3 },
  favName: { fontSize: 11, textAlign: 'center', color:'#555' },
  deleteBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  // 2. ИСПРАВЛЕНО: Увеличенная высота модалки, чтобы не жалось
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '75%' }, 
  dragHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginTop: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems:'center', borderBottomWidth:1, borderColor:'#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  label: { color:'#666', marginBottom: 5, marginTop: 10 },
  cardSelector: { flexDirection:'row', alignItems:'center', padding: 15, backgroundColor:'#F5F5F5', borderRadius: 12, borderWidth:1, borderColor:'#ddd' },
  input: { marginBottom: 10, backgroundColor:'white' },
  countryChip: { padding: 10, borderRadius: 20, backgroundColor: '#eee', marginRight: 10, flexDirection: 'row', alignItems: 'center' },
  countryChipActive: { backgroundColor: '#C8E6C9', borderWidth: 1, borderColor: '#4CAF50' },
  centerModalOverlay: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)' },
  centerModal: { width:'80%', backgroundColor:'white', padding: 20, borderRadius: 15 }
});