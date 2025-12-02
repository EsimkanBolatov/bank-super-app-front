import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, 
  Dimensions, Alert, Modal, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, Searchbar, Button, IconButton, Title, TextInput, Avatar, Card, List } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bankApi } from '../../src/api';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = width / COLUMN_COUNT;

// --- КОНФИГУРАЦИЯ СТАНДАРТНЫХ ПЛАТЕЖЕЙ ---
const SERVICE_CONFIG: any = {
  'Мобильный': { type: 'mobile', fields: ['operator', 'phone', 'amount'], operators: [{value:'beeline', label:'Beeline'}, {value:'kcell', label:'Kcell'}, {value:'tele2', label:'Tele2'}, {value:'altel', label:'Altel'}] },
  'Коммуналка': { type: 'utilities', fields: ['service_type', 'account_id', 'amount'], services: [{value:'alts', label:'Алматы Су'}, {value:'als', label:'Алматы Энерго'}, {value:'kaztrans', label:'КазТрансГаз'}, {value:'ivc', label:'ИВЦ'}] },
  'Транспорт': { type: 'transport', fields: ['city', 'card_number', 'amount'], cities: [{value:'taraz', label:'Тараз (Tulpar)'}, {value:'almaty', label:'Алматы (Onay)'}, {value:'astana', label:'Астана (CTS)'}] },
  'Штрафы': { type: 'fines', fields: ['search_type', 'search_value', 'amount'], searchTypes: [{value:'iin', label:'По ИИН'}, {value:'grnz', label:'По Госномеру'}] },
  'Игры': { type: 'games', fields: ['game_service', 'username', 'amount'], services: [{value:'steam', label:'Steam'}, {value:'psn', label:'PlayStation'}, {value:'pubg', label:'PUBG Mobile'}] },
  'default': { type: 'generic', fields: ['text_input', 'amount'] }
};

export default function ServicesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('Тараз');
  const [loading, setLoading] = useState(false);
  
  // Состояния модалок
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [ortakModalVisible, setOrtakModalVisible] = useState(false);
  const [ghostModalVisible, setGhostModalVisible] = useState(false);
  const [ecoModalVisible, setEcoModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [formState, setFormState] = useState<any>({});

  // --- ДАННЫЕ СПЕЦ. СЕРВИСОВ ---
  // Ortak
  const [friends] = useState([{id:1, name:'Алибек', ph:'+7 777...'}, {id:2, name:'Айжан', ph:'+7 707...'}]);
  const [splitSelected, setSplitSelected] = useState<number[]>([]);
  // Ghost
  const [ghostCard, setGhostCard] = useState<any>(null);
  // Eco
  const [treesPlanted, setTreesPlanted] = useState(3);
  
  // Budget
  const [envelopes, setEnvelopes] = useState([
      {id:1, name:'Аренда', amount: 50000, icon: 'home-outline'}, 
      {id:2, name:'Еда', amount: 20000, icon: 'food-apple-outline'}
  ]);
  const [isAddingEnvelope, setIsAddingEnvelope] = useState(false);
  const [newEnvelopeName, setNewEnvelopeName] = useState('');
  
  // Пополнение конверта (Исправление для Android)
  const [activeEnvelopeId, setActiveEnvelopeId] = useState<number | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');

  // Список всех сервисов
  const allServices = [
    { id: 'u1', name: 'Ortak (Split)', icon: 'account-group', color: '#FF5722', isSpecial: true, type: 'ortak' },
    { id: 'u2', name: 'Ghost Card', icon: 'ghost', color: '#607D8B', isSpecial: true, type: 'ghost' },
    { id: 'u3', name: 'Eco Life', icon: 'tree', color: '#4CAF50', isSpecial: true, type: 'eco' },
    { id: 'u4', name: 'Мой Бюджет', icon: 'safe', color: '#3F51B5', isSpecial: true, type: 'budget' },
    { id: 1, name: 'Мобильный', icon: 'cellphone', color: '#F44336' },
    { id: 2, name: 'Коммуналка', icon: 'home-city', color: '#795548' },
    { id: 3, name: 'Транспорт', icon: 'bus', color: '#FF9800' },
    { id: 4, name: 'Интернет и ТВ', icon: 'wifi', color: '#E91E63' },
    { id: 5, name: 'Образование', icon: 'school', color: '#4CAF50' },
    { id: 6, name: 'Штрафы', icon: 'gavel', color: '#607D8B' },
    { id: 8, name: 'Финансы', icon: 'bank', color: '#9E9E9E' },
    { id: 9, name: 'Красота', icon: 'lipstick', color: '#E91E63' },
    { id: 10, name: 'Билеты', icon: 'ticket', color: '#F44336' },
    { id: 11, name: 'Покупки', icon: 'shopping', color: '#F44336' },
    { id: 12, name: 'Развлечения', icon: 'gamepad-variant', color: '#8BC34A' },
    { id: 13, name: 'Объявления', icon: 'bullhorn', color: '#2196F3' },
    { id: 14, name: 'Игры', icon: 'controller-classic', color: '#673AB7' },
    { id: 15, name: 'Другое', icon: 'dots-horizontal', color: '#9E9E9E' },
  ];

  const handlePress = (item: any) => {
    setSelectedCategory(item);
    setFormState({}); // Сброс формы
    
    if (item.isSpecial) {
        if (item.type === 'ortak') setOrtakModalVisible(true);
        if (item.type === 'ghost') setGhostModalVisible(true);
        if (item.type === 'eco') setEcoModalVisible(true);
        if (item.type === 'budget') {
            setIsAddingEnvelope(false);
            setNewEnvelopeName('');
            setActiveEnvelopeId(null);
            setBudgetModalVisible(true);
        }
    } else {
        setPaymentModalVisible(true);
    }
  };

  const handleStandardPayment = async () => {
      if(!formState.amount) return Alert.alert("Ошибка", "Введите сумму");
      setLoading(true);
      try {
          await bankApi.payService(selectedCategory.name, Number(formState.amount), { ...formState });
          Alert.alert("Успешно ✅", "Платеж проведен!");
          setPaymentModalVisible(false);
      } catch(e: any) {
          Alert.alert("Ошибка", e.response?.data?.detail || "Сбой оплаты");
      } finally { setLoading(false); }
  };

  // --- ЛОГИКА БЮДЖЕТА ---
  const handleAddEnvelope = () => {
      if (!newEnvelopeName.trim()) return;
      const newEnv = {
          id: Date.now(),
          name: newEnvelopeName,
          amount: 0,
          icon: 'folder-outline'
      };
      setEnvelopes([...envelopes, newEnv]);
      setNewEnvelopeName('');
      setIsAddingEnvelope(false);
  };

  const handleTopUpConfirm = (id: number) => {
      if (!topUpAmount) {
          setActiveEnvelopeId(null); 
          return;
      }
      setEnvelopes(prev => prev.map(e => e.id === id ? {...e, amount: e.amount + Number(topUpAmount)} : e));
      setTopUpAmount('');
      setActiveEnvelopeId(null);
  };

  // --- ЛОГИКА ГЕОЛОКАЦИИ ---
  const handleGeoLocation = async () => {
    setLoading(true);
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Ошибка', 'Нет доступа к геолокации');
            setLoading(false);
            return;
        }
        setTimeout(() => {
            setCurrentCity("Алматы (GPS)");
            setLoading(false);
            setCityModalVisible(false);
        }, 1500);
    } catch (e) {
        setLoading(false);
        setCurrentCity("Тараз (Default)");
        setCityModalVisible(false);
    }
  };

  const renderGridItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.gridItem, item.isSpecial && styles.specialGridItem]} onPress={() => handlePress(item)}>
      <View style={[styles.iconWrapper, { backgroundColor: item.color + '15' }]}>
         <MaterialCommunityIcons name={item.icon} size={32} color={item.color} />
      </View>
      <Text style={styles.gridLabel} numberOfLines={2}>{item.name}</Text>
      {item.isSpecial && <View style={[styles.badge, {backgroundColor: item.color}]}><Text style={styles.badgeText}>NEW</Text></View>}
    </TouchableOpacity>
  );

  // Динамические поля для стандартных платежей
  const renderDynamicFields = () => {
      const conf = SERVICE_CONFIG[selectedCategory?.name] || SERVICE_CONFIG['default'];
      return (
          <View>
              {conf.operators && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
                      {conf.operators.map((op: any) => (
                          <TouchableOpacity key={op.value} onPress={() => setFormState({...formState, operator: op.value})} style={[styles.chip, formState.operator === op.value && styles.chipActive]}>
                              <Text style={formState.operator === op.value ? styles.chipTextActive : styles.chipText}>{op.label}</Text>
                          </TouchableOpacity>
                      ))}
                  </ScrollView>
              )}
              {conf.fields.includes('phone') && <TextInput label="Телефон" mode="outlined" keyboardType="phone-pad" value={formState.phone} onChangeText={t => setFormState({...formState, phone:t})} style={styles.input} />}
              {conf.fields.includes('account_id') && <TextInput label="Номер счета" mode="outlined" value={formState.account_id} onChangeText={t => setFormState({...formState, account_id:t})} style={styles.input} />}
              {conf.fields.includes('card_number') && <TextInput label="Номер карты" mode="outlined" keyboardType="numeric" value={formState.card_number} onChangeText={t => setFormState({...formState, card_number:t})} style={styles.input} />}
              {conf.fields.includes('search_value') && <TextInput label={formState.search_type === 'iin' ? 'ИИН' : 'Госномер'} mode="outlined" value={formState.search_value} onChangeText={t => setFormState({...formState, search_value:t})} style={styles.input} />}
              {conf.fields.includes('username') && <TextInput label="Логин (Login)" mode="outlined" value={formState.username} onChangeText={t => setFormState({...formState, username:t})} style={styles.input} />}
              
              <TextInput label="Сумма (₸)" mode="outlined" keyboardType="numeric" value={formState.amount} onChangeText={t => setFormState({...formState, amount:t})} style={[styles.input, {backgroundColor: '#E8F5E9'}]} right={<TextInput.Icon icon="cash" />} />
          </View>
      );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} iconColor={theme.colors.primary} />
        <Text style={styles.headerTitle}>Платежи</Text>
        <TouchableOpacity style={styles.citySelector} onPress={() => setCityModalVisible(true)}>
            <Text style={styles.cityText}>{currentCity}</Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color="#2196F3" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar placeholder="Поиск..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} inputStyle={{fontSize: 14}} />
      </View>

      <FlatList
        data={allServices.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))}
        renderItem={renderGridItem}
        keyExtractor={item => item.id.toString()}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* МОДАЛКА ГОРОДА */}
      <Modal animationType="fade" transparent={true} visible={cityModalVisible} onRequestClose={() => setCityModalVisible(false)}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContentCenter}>
                <Title style={{marginBottom: 15, textAlign:'center'}}>Выберите город</Title>
                <Button mode="outlined" icon="crosshairs-gps" onPress={handleGeoLocation} loading={loading} style={{marginBottom: 10}}>
                    Определить автоматически
                </Button>
                <ScrollView style={{maxHeight: 300}}>
                    {['Алматы', 'Астана', 'Шымкент', 'Тараз', 'Актобе'].map(city => (
                        <TouchableOpacity key={city} style={styles.cityItem} onPress={() => { setCurrentCity(city); setCityModalVisible(false); }}>
                            <Text style={{fontSize: 16}}>{city}</Text>
                            {currentCity === city && <MaterialCommunityIcons name="check" size={20} color="green" />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <Button onPress={() => setCityModalVisible(false)} style={{marginTop: 10}}>Закрыть</Button>
            </View>
         </View>
      </Modal>

      {/* МОДАЛКА СТАНДАРТНАЯ (С KEYBOARD FIX) */}
      <Modal animationType="slide" transparent={true} visible={paymentModalVisible} onRequestClose={() => setPaymentModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.bottomSheet}>
                    <View style={styles.dragHandle} />
                    <View style={{flexDirection:'row', alignItems:'center', marginBottom: 20}}>
                        <MaterialCommunityIcons name={selectedCategory?.icon} size={28} color={selectedCategory?.color} />
                        <Title style={{marginLeft: 10}}>{selectedCategory?.name}</Title>
                    </View>
                    <ScrollView contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {renderDynamicFields()}
                        <Button mode="contained" onPress={handleStandardPayment} loading={loading} style={{marginTop: 20, borderRadius: 12}} contentStyle={{height: 50}}>Оплатить</Button>
                    </ScrollView>
                    <IconButton icon="close" style={{position:'absolute', top:5, right:5}} onPress={() => setPaymentModalVisible(false)} />
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 1. ORTAK (С KEYBOARD FIX) --- */}
      <Modal animationType="slide" transparent={true} visible={ortakModalVisible} onRequestClose={() => setOrtakModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.bottomSheet}>
                    <View style={styles.dragHandle} />
                    <Title>Ortak (Split) 🍕</Title>
                    <Text style={{color: '#666', marginBottom: 15}}>Разделите счет с друзьями</Text>
                    <TextInput label="Общая сумма (₸)" mode="outlined" keyboardType="numeric" style={styles.input} />
                    <Text style={{fontWeight: 'bold', marginVertical: 10}}>Друзья:</Text>
                    <ScrollView style={{maxHeight: 200}} keyboardShouldPersistTaps="handled">
                        {friends.map(f => (
                            <TouchableOpacity key={f.id} style={styles.friendRow} onPress={() => {
                                if(splitSelected.includes(f.id)) setSplitSelected(splitSelected.filter(id => id !== f.id));
                                else setSplitSelected([...splitSelected, f.id]);
                            }}>
                                <Avatar.Text size={40} label={f.name[0]} />
                                <View style={{flex:1, marginLeft: 10}}>
                                    <Text style={{fontWeight: 'bold'}}>{f.name}</Text>
                                    <Text style={{color: '#888'}}>{f.ph}</Text>
                                </View>
                                {splitSelected.includes(f.id) && <MaterialCommunityIcons name="check-circle" size={24} color="green" />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <Button mode="contained" onPress={() => {setLoading(true); setTimeout(() => {setLoading(false); setOrtakModalVisible(false); Alert.alert("Успешно", "Запрос отправлен")}, 1000)}} loading={loading} style={{marginTop: 20}}>Запросить</Button>
                    <IconButton icon="close" style={{position:'absolute', top:0, right:0}} onPress={() => setOrtakModalVisible(false)} />
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 2. GHOST CARD (С KEYBOARD FIX) --- */}
      <Modal animationType="slide" transparent={true} visible={ghostModalVisible} onRequestClose={() => setGhostModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.bottomSheet}>
                    <View style={styles.dragHandle} />
                    <Title>Ghost Card 👻</Title>
                    <Text style={{color: '#666', marginBottom: 20}}>Безопасная карта на 24 часа</Text>
                    {!ghostCard ? (
                        <Button mode="contained" icon="plus" onPress={() => {setLoading(true); setTimeout(() => {setGhostCard({num:'4400 1122 3344 5566', cvv:'777', exp:'12/24'}); setLoading(false)}, 1500)}} loading={loading}>Создать карту</Button>
                    ) : (
                        <View style={{backgroundColor:'#263238', padding:20, borderRadius:16}}>
                            <Text style={{color:'white', fontWeight:'bold', fontSize:18}}>{ghostCard.num}</Text>
                            <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:15}}>
                                <Text style={{color:'#ccc'}}>CVV: {ghostCard.cvv}</Text>
                                <Text style={{color:'#ccc'}}>EXP: {ghostCard.exp}</Text>
                            </View>
                        </View>
                    )}
                    <IconButton icon="close" style={{position:'absolute', top:0, right:0}} onPress={() => setGhostModalVisible(false)} />
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 3. ECO LIFE (С KEYBOARD FIX) --- */}
      <Modal animationType="slide" transparent={true} visible={ecoModalVisible} onRequestClose={() => setEcoModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.bottomSheet}>
                    <View style={styles.dragHandle} />
                    <View style={{alignItems:'center'}}>
                        <MaterialCommunityIcons name="tree" size={80} color="#4CAF50" />
                        <Title style={{color:'#2E7D32'}}>Eco Life</Title>
                        <Text style={{fontSize: 16, marginVertical:20}}>Вы посадили {treesPlanted} дерева!</Text>
                        <Button mode="contained" onPress={async () => {
                            setLoading(true);
                            try { await bankApi.payService("Eco Tree", 500); setTreesPlanted(p => p+1); Alert.alert("Ура!", "Дерево посажено!"); } 
                            catch(e){Alert.alert("Ошибка")} finally {setLoading(false)}
                        }} loading={loading} style={{backgroundColor:'#4CAF50', width:'100%'}}>Посадить (500 ₸)</Button>
                    </View>
                    <IconButton icon="close" style={{position:'absolute', top:0, right:0}} onPress={() => setEcoModalVisible(false)} />
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 4. BUDGET (ИСПРАВЛЕНО И С KEYBOARD FIX) --- */}
      <Modal animationType="slide" transparent={true} visible={budgetModalVisible} onRequestClose={() => setBudgetModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.bottomSheet}>
                    <View style={styles.dragHandle} />
                    <Title>Мой Бюджет 💰</Title>
                    <ScrollView style={{marginTop: 10, maxHeight: 300}} keyboardShouldPersistTaps="handled">
                        {envelopes.map(e => (
                            <View key={e.id} style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:1, borderColor:'#eee'}}>
                                <View style={{flexDirection:'row', alignItems:'center'}}>
                                    <MaterialCommunityIcons name={e.icon} size={24} color="#3F51B5" />
                                    <View style={{marginLeft:10}}>
                                        <Text style={{fontWeight:'bold'}}>{e.name}</Text>
                                        <Text style={{color:'#666'}}>{e.amount.toLocaleString()} ₸</Text>
                                    </View>
                                </View>
                                {/* Пополнение работает везде (iOS/Android) */}
                                {activeEnvelopeId === e.id ? (
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <TextInput 
                                            placeholder="+" 
                                            keyboardType="numeric" 
                                            style={{width:60, height:35, backgroundColor:'white', fontSize:14}} 
                                            mode="outlined"
                                            value={topUpAmount}
                                            onChangeText={setTopUpAmount}
                                            autoFocus
                                        />
                                        <IconButton icon="check" size={20} onPress={() => handleTopUpConfirm(e.id)} />
                                    </View>
                                ) : (
                                    <IconButton icon="plus-circle" iconColor="#4CAF50" onPress={() => setActiveEnvelopeId(e.id)} />
                                )}
                            </View>
                        ))}
                    </ScrollView>
                    
                    {isAddingEnvelope ? (
                        <View style={{marginTop: 15, flexDirection:'row', alignItems:'center'}}>
                            <TextInput style={{flex:1, backgroundColor:'white', height:40, fontSize: 14}} mode="outlined" placeholder="Название конверта" value={newEnvelopeName} onChangeText={setNewEnvelopeName} />
                            <IconButton icon="check" mode="contained" containerColor="#4CAF50" iconColor="white" onPress={handleAddEnvelope} />
                        </View>
                    ) : (
                        <Button mode="outlined" icon="plus" onPress={() => setIsAddingEnvelope(true)} style={{marginTop: 20}}>Добавить конверт</Button>
                    )}
                    <IconButton icon="close" style={{position:'absolute', top:0, right:0}} onPress={() => setBudgetModalVisible(false)} />
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 5 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  citySelector: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  cityText: { color: '#2196F3', fontWeight: '500', marginRight: 4, fontSize: 16 },
  searchContainer: { paddingHorizontal: 15, marginBottom: 15 },
  searchBar: { borderRadius: 12, backgroundColor: '#f5f5f5', height: 45, elevation: 0 },
  gridItem: { width: ITEM_WIDTH, alignItems: 'center', paddingVertical: 15, marginBottom: 10 },
  specialGridItem: { borderWidth: 1, borderColor: '#eee', borderRadius: 10 },
  iconWrapper: { width: 55, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  gridLabel: { fontSize: 12, textAlign: 'center', color: '#333', paddingHorizontal: 5, fontWeight: '500' },
  badge: { position: 'absolute', top: 5, right: 15, paddingHorizontal: 4, borderRadius: 4 },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalContentCenter: { backgroundColor: 'white', borderRadius: 20, padding: 20, width: '80%', alignSelf: 'center', marginTop: '40%' },
  
  dragHandle: { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  input: { marginBottom: 12, backgroundColor: 'white', fontSize: 16 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
  chipText: { color: '#666', fontSize: 13 },
  chipTextActive: { color: '#2196F3', fontWeight: 'bold' },
  cityItem: { paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
});