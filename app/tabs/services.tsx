import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, 
  Dimensions, Alert, Modal, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import { useTheme, Searchbar, Button, IconButton, TextInput, Avatar, Title } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bankApi } from '../../src/api';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = width / COLUMN_COUNT;

// --- КОНФИГУРАЦИЯ СТАНДАРТНЫХ ПЛАТЕЖЕЙ (Настройки полей) ---
const SERVICE_CONFIG: any = {
  'Мобильный': { 
      type: 'mobile', 
      label: 'Выберите оператора',
      fields: ['phone', 'amount'], 
      options: [ // Используем единый массив options для всех типов списков
          {value:'beeline', label:'Beeline'}, 
          {value:'kcell', label:'Kcell'}, 
          {value:'tele2', label:'Tele2'}, 
          {value:'altel', label:'Altel'}
      ],
      optionKey: 'operator' // Ключ, куда записывать выбор
  },
  'Коммуналка': { 
      type: 'utilities', 
      label: 'Выберите службу',
      fields: ['account_id', 'amount'], 
      options: [
          {value:'alts', label:'Алматы Су'}, 
          {value:'als', label:'Алматы Энерго'}, 
          {value:'kaztrans', label:'КазТрансГаз'}, 
          {value:'ivc', label:'ИВЦ'}
      ],
      optionKey: 'service_type'
  },
  'Транспорт': { 
      type: 'transport', 
      label: 'Выберите город',
      fields: ['card_number', 'amount'], 
      options: [
          {value:'taraz', label:'Тараз (Tulpar)'}, 
          {value:'almaty', label:'Алматы (Onay)'}, 
          {value:'astana', label:'Астана (CTS)'}
      ],
      optionKey: 'city'
  },
  'Штрафы': { 
      type: 'fines', 
      label: 'Тип поиска',
      fields: ['search_value', 'amount'], 
      options: [
          {value:'iin', label:'По ИИН'}, 
          {value:'grnz', label:'По Госномеру'}
      ],
      optionKey: 'search_type'
  },
  'Игры': { 
      type: 'games', 
      label: 'Выберите сервис',
      fields: ['username', 'amount'], 
      options: [
          {value:'steam', label:'Steam'}, 
          {value:'psn', label:'PlayStation'}, 
          {value:'pubg', label:'PUBG Mobile'}
      ],
      optionKey: 'game_service'
  },
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

  // --- ДАННЫЕ СЕРВИСОВ ---
  const [friends] = useState([{id:1, name:'Алибек', ph:'+7 777...'}, {id:2, name:'Айжан', ph:'+7 707...'}]);
  const [splitSelected, setSplitSelected] = useState<number[]>([]);
  const [ghostCard, setGhostCard] = useState<any>(null);
  const [treesPlanted, setTreesPlanted] = useState(3);
  
  const [envelopes, setEnvelopes] = useState([
      {id:1, name:'Аренда', amount: 50000, icon: 'home-outline'}, 
      {id:2, name:'Еда', amount: 20000, icon: 'food-apple-outline'}
  ]);
  const [isAddingEnvelope, setIsAddingEnvelope] = useState(false);
  const [newEnvelopeName, setNewEnvelopeName] = useState('');
  const [activeEnvelopeId, setActiveEnvelopeId] = useState<number | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');

  // Список сервисов (Названия должны совпадать с ключами в SERVICE_CONFIG!)
  const allServices = [
    // Фишки (SuperApp)
    { id: 'u1', name: 'Ortak (Split)', icon: 'account-group', color: '#FF5722', isSpecial: true, type: 'ortak' },
    { id: 'u2', name: 'Ghost Card', icon: 'ghost', color: '#607D8B', isSpecial: true, type: 'ghost' },
    { id: 'u3', name: 'Eco Life', icon: 'tree', color: '#4CAF50', isSpecial: true, type: 'eco' },
    { id: 'u4', name: 'Мой Бюджет', icon: 'safe', color: '#3F51B5', isSpecial: true, type: 'budget' },
    
    // Переводы (как одна иконка)
    { id: 'transfers', name: 'Переводы', icon: 'bank-transfer', color: '#6200EE', isSpecial: false, type: 'transfer_nav' },

    // Обычные сервисы
    { id: 1, name: 'Мобильный', icon: 'cellphone', color: '#F44336' },
    { id: 2, name: 'Коммуналка', icon: 'home-city', color: '#795548' },
    { id: 3, name: 'Транспорт', icon: 'bus', color: '#FF9800' },
    { id: 4, name: 'Интернет и ТВ', icon: 'wifi', color: '#E91E63' }, // Исправлено название
    { id: 5, name: 'Образование', icon: 'school', color: '#4CAF50' },
    { id: 6, name: 'Штрафы', icon: 'gavel', color: '#607D8B' },
    { id: 10, name: 'Билеты', icon: 'ticket', color: '#F44336' },
    { id: 11, name: 'Покупки', icon: 'shopping', color: '#F44336' },
    { id: 12, name: 'Развлечения', icon: 'gamepad-variant', color: '#8BC34A' },
    { id: 14, name: 'Игры', icon: 'controller-classic', color: '#673AB7' },
    { id: 15, name: 'Другое', icon: 'dots-horizontal', color: '#9E9E9E' },
  ];

  const handlePress = (item: any) => {
    // Навигация на переводы
    if (item.type === 'transfer_nav') {
        router.push('/tabs/payments');
        return;
    }

    setSelectedCategory(item);
    // Инициализация формы дефолтными значениями (первый элемент списка)
    const conf = SERVICE_CONFIG[item.name];
    if (conf && conf.options && conf.options.length > 0) {
        setFormState({ [conf.optionKey]: conf.options[0].value });
    } else {
        setFormState({});
    }
    
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

  const handleAddEnvelope = () => {
      if (!newEnvelopeName.trim()) return;
      setEnvelopes([...envelopes, { id: Date.now(), name: newEnvelopeName, amount: 0, icon: 'folder-outline' }]);
      setNewEnvelopeName(''); setIsAddingEnvelope(false);
  };

  const handleTopUpConfirm = (id: number) => {
      if (!topUpAmount) { setActiveEnvelopeId(null); return; }
      setEnvelopes(prev => prev.map(e => e.id === id ? {...e, amount: e.amount + Number(topUpAmount)} : e));
      setTopUpAmount(''); setActiveEnvelopeId(null);
  };

  const handleGeoLocation = async () => {
    setLoading(true);
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('No permission');
        setTimeout(() => {
            setCurrentCity("Алматы (GPS)");
            setLoading(false);
            setCityModalVisible(false);
        }, 1000);
    } catch (e) {
        Alert.alert('Ошибка', 'Не удалось определить местоположение');
        setLoading(false);
    }
  };

  // --- ЯРКАЯ СЕТКА (GRADIENT) ---
  const renderGridItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.gridItemContainer} onPress={() => handlePress(item)} activeOpacity={0.8}>
      <LinearGradient
        colors={[item.color, '#455A64']} // Немного темнее во втором цвете для объема
        start={{x: 0, y: 0}} end={{x: 1, y: 1}}
        style={styles.iconBackground}
      >
         <MaterialCommunityIcons name={item.icon} size={32} color="white" />
      </LinearGradient>
      <Text style={styles.gridLabel} numberOfLines={2}>{item.name}</Text>
      
      {item.isSpecial && (
          <View style={[styles.badge, {backgroundColor: item.color}]}>
              <Text style={styles.badgeText}>NEW</Text>
          </View>
      )}
    </TouchableOpacity>
  );

  // --- КОМПОНЕНТ ЦЕНТРАЛЬНОГО ОКНА ---
  const CentralModal = ({ visible, onClose, title, icon, color, children }: any) => (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.modalOverlay}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>
            
            <View style={styles.centeredCard}>
                {/* Шапка окна с градиентом */}
                <LinearGradient 
                    colors={[color || theme.colors.primary, '#263238']}
                    start={{x:0, y:0}} end={{x:1, y:0}}
                    style={styles.modalHeader}
                >
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                        <MaterialCommunityIcons name={icon || 'wallet'} size={24} color="white" />
                        <Text style={styles.modalTitle}>{title}</Text>
                    </View>
                    <IconButton icon="close" iconColor="white" size={20} onPress={onClose} style={{margin:0}} />
                </LinearGradient>

                <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                    {children}
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    </Modal>
  );

  // --- ДИНАМИЧЕСКИЕ ПОЛЯ ВВОДА (ГЛАВНАЯ ЛОГИКА) ---
  const renderDynamicFields = () => {
      const conf = SERVICE_CONFIG[selectedCategory?.name] || SERVICE_CONFIG['default'];
      const activeOptionKey = conf.optionKey; // Например 'operator'
      const activeValue = formState[activeOptionKey]; // Текущее значение

      return (
          <View>
              {/* Рендер Чипсов (Горизонтальный список) */}
              {conf.options && (
                  <View style={{marginBottom: 15}}>
                      <Text style={styles.fieldLabel}>{conf.label || 'Выберите:'}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {conf.options.map((op: any) => {
                              const isActive = activeValue === op.value;
                              return (
                                  <TouchableOpacity 
                                    key={op.value} 
                                    onPress={() => setFormState({...formState, [activeOptionKey]: op.value})} 
                                    style={[styles.chip, isActive && {backgroundColor: selectedCategory?.color || theme.colors.primary, borderColor: 'transparent'}]}
                                  >
                                      <Text style={[styles.chipText, isActive && {color: 'white', fontWeight: 'bold'}]}>
                                          {op.label}
                                      </Text>
                                  </TouchableOpacity>
                              );
                          })}
                      </ScrollView>
                  </View>
              )}

              {/* Поля ввода в зависимости от конфига */}
              {conf.fields.includes('phone') && (
                  <TextInput label="Номер телефона" mode="outlined" keyboardType="phone-pad" 
                    value={formState.phone} onChangeText={t => setFormState({...formState, phone:t})} 
                    style={styles.input} left={<TextInput.Icon icon="phone" color="#888"/>}
                  />
              )}
              
              {conf.fields.includes('account_id') && (
                  <TextInput label="Лицевой счет / Договор" mode="outlined" 
                    value={formState.account_id} onChangeText={t => setFormState({...formState, account_id:t})} 
                    style={styles.input} left={<TextInput.Icon icon="file-document-outline" color="#888"/>}
                  />
              )}
              
              {conf.fields.includes('card_number') && (
                  <TextInput label="Номер транспортной карты" mode="outlined" keyboardType="numeric" 
                    value={formState.card_number} onChangeText={t => setFormState({...formState, card_number:t})} 
                    style={styles.input} left={<TextInput.Icon icon="card-bulleted-outline" color="#888"/>}
                  />
              )}
              
              {conf.fields.includes('search_value') && (
                  <TextInput label={formState.search_type === 'iin' ? 'Введите ИИН' : 'Госномер авто'} mode="outlined" 
                    value={formState.search_value} onChangeText={t => setFormState({...formState, search_value:t})} 
                    style={styles.input} left={<TextInput.Icon icon="magnify" color="#888"/>}
                  />
              )}
              
              {conf.fields.includes('username') && (
                  <TextInput label="Логин / ID аккаунта" mode="outlined" 
                    value={formState.username} onChangeText={t => setFormState({...formState, username:t})} 
                    style={styles.input} left={<TextInput.Icon icon="account" color="#888"/>}
                  />
              )}
              
              <TextInput label="Сумма платежа (₸)" mode="outlined" keyboardType="numeric" 
                value={formState.amount} onChangeText={t => setFormState({...formState, amount:t})} 
                style={[styles.input, {backgroundColor: '#F1F8E9'}]} 
                right={<TextInput.Icon icon="currency-kzzt" />}
                contentStyle={{fontWeight: 'bold', fontSize: 18, color: '#2E7D32'}}
              />
          </View>
      );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F5F7FA', paddingTop: insets.top }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Платежи</Text>
        <TouchableOpacity style={styles.citySelector} onPress={() => setCityModalVisible(true)}>
            <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
            <Text style={styles.cityText}>{currentCity}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* SEARCH */}
        <View style={styles.searchContainer}>
            <Searchbar 
                placeholder="Поиск услуг..." 
                onChangeText={setSearchQuery} 
                value={searchQuery} 
                style={styles.searchBar} 
                inputStyle={{fontSize: 15}}
                iconColor="#90A4AE"
                placeholderTextColor="#90A4AE"
            />
        </View>

        {/* --- ФИНАНСЫ --- */}
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Финансы</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 20, paddingRight: 10}}>
                
                {/* 1. RED */}
                <TouchableOpacity style={styles.financeCard} activeOpacity={0.9}>
                    <LinearGradient colors={['#D32F2F', '#B71C1C']} style={styles.financeGradient}>
                        <View style={styles.financeTop}>
                            <MaterialCommunityIcons name="alpha-r-circle-outline" size={28} color="white" />
                            <Text style={styles.financeLabel}>0%</Text>
                        </View>
                        <Text style={styles.financeTitle}>Belly Red</Text>
                        <Text style={styles.financeSub}>Рассрочка</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* 2. CREDIT */}
                <TouchableOpacity style={styles.financeCard} activeOpacity={0.9}>
                    <LinearGradient colors={['#1976D2', '#0D47A1']} style={styles.financeGradient}>
                        <View style={styles.financeTop}>
                            <MaterialCommunityIcons name="cash-multiple" size={28} color="white" />
                            <Text style={styles.financeLabel}>до 5 млн</Text>
                        </View>
                        <Text style={styles.financeTitle}>Кредит</Text>
                        <Text style={styles.financeSub}>Наличными</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* 3. DEPOSIT */}
                <TouchableOpacity style={styles.financeCard} activeOpacity={0.9}>
                    <LinearGradient colors={['#388E3C', '#1B5E20']} style={styles.financeGradient}>
                        <View style={styles.financeTop}>
                            <MaterialCommunityIcons name="safe" size={28} color="white" />
                            <Text style={styles.financeLabel}>15.5%</Text>
                        </View>
                        <Text style={styles.financeTitle}>Депозит</Text>
                        <Text style={styles.financeSub}>Сбережения</Text>
                    </LinearGradient>
                </TouchableOpacity>

            </ScrollView>
        </View>

        {/* --- СЕТКА СЕРВИСОВ --- */}
        <Text style={[styles.sectionTitle, {marginLeft: 20, marginTop: 25}]}>Все услуги</Text>
        <FlatList
            data={allServices.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))}
            renderItem={renderGridItem}
            keyExtractor={item => item.id.toString()}
            numColumns={COLUMN_COUNT}
            scrollEnabled={false} // Чтобы скроллил внешний ScrollView
            contentContainerStyle={{paddingHorizontal: 10, paddingTop: 10}} // paddingTop спасет от обрезания бейджиков!
        />
      </ScrollView>

      {/* --- МОДАЛКИ (ЦЕНТРАЛЬНЫЕ) --- */}

      {/* 1. ГОРОД */}
      <CentralModal visible={cityModalVisible} onClose={() => setCityModalVisible(false)} title="Выберите регион" icon="city" color="#607D8B">
          <Button mode="outlined" icon="crosshairs-gps" onPress={handleGeoLocation} style={{marginBottom: 15, borderColor: theme.colors.primary}}>
              Определить автоматически
          </Button>
          {['Алматы', 'Астана', 'Шымкент', 'Тараз', 'Актобе'].map(city => (
                <TouchableOpacity key={city} style={styles.listItem} onPress={() => { setCurrentCity(city); setCityModalVisible(false); }}>
                    <Text style={{fontSize: 16, color:'#333'}}>{city}</Text>
                    {currentCity === city && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
                </TouchableOpacity>
          ))}
      </CentralModal>

      {/* 2. СТАНДАРТНАЯ ОПЛАТА */}
      <CentralModal visible={paymentModalVisible} onClose={() => setPaymentModalVisible(false)} title={selectedCategory?.name} icon={selectedCategory?.icon} color={selectedCategory?.color}>
          {renderDynamicFields()}
          <Button mode="contained" onPress={handleStandardPayment} loading={loading} style={styles.payButton} contentStyle={{height: 50}}>
              Оплатить
          </Button>
      </CentralModal>

      {/* 3. ORTAK */}
      <CentralModal visible={ortakModalVisible} onClose={() => setOrtakModalVisible(false)} title="Ortak (Split)" icon="account-group" color="#FF5722">
          <Text style={{marginBottom: 15, color:'#666', textAlign:'center'}}>Разделите счет с друзьями</Text>
          <TextInput label="Общая сумма (₸)" mode="outlined" keyboardType="numeric" style={styles.input} />
          <Text style={{fontWeight:'bold', marginTop:10, marginBottom:5}}>Выберите участников:</Text>
          {friends.map(f => (
              <TouchableOpacity key={f.id} style={styles.listItem} onPress={() => setSplitSelected(prev => prev.includes(f.id) ? prev.filter(i => i!==f.id) : [...prev, f.id])}>
                  <View style={{flexDirection:'row', alignItems:'center'}}>
                      <Avatar.Text size={36} label={f.name[0]} style={{marginRight:12, backgroundColor:'#FFCCBC'}} color="#BF360C" />
                      <View>
                          <Text style={{fontWeight:'bold', fontSize:15}}>{f.name}</Text>
                          <Text style={{fontSize:12, color:'#888'}}>{f.ph}</Text>
                      </View>
                  </View>
                  {splitSelected.includes(f.id) ? 
                    <MaterialCommunityIcons name="checkbox-marked-circle" size={24} color="#FF5722" /> :
                    <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={24} color="#ccc" />
                  }
              </TouchableOpacity>
          ))}
          <Button mode="contained" style={[styles.payButton, {backgroundColor:'#FF5722'}]} onPress={() => {Alert.alert("Запрос отправлен!"); setOrtakModalVisible(false)}}>Отправить запрос</Button>
      </CentralModal>

      {/* 4. GHOST CARD */}
      <CentralModal visible={ghostModalVisible} onClose={() => setGhostModalVisible(false)} title="Ghost Card" icon="ghost" color="#607D8B">
          <Text style={{textAlign:'center', color:'#555', marginBottom:20}}>
              Виртуальная карта для безопасных покупок в интернете. CVV меняется каждые 24 часа.
          </Text>
          {!ghostCard ? (
              <Button mode="contained" icon="plus" onPress={() => setGhostCard({num:'4400 **** **** 9999', cvv:'123', exp:'12/28'})} style={{backgroundColor:'#607D8B', borderRadius:10}}>
                  Создать карту
              </Button>
          ) : (
              <LinearGradient colors={['#37474F', '#263238']} style={styles.ghostCardView}>
                  <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                      <MaterialCommunityIcons name="contactless-payment" size={30} color="white" />
                      <Text style={{color:'white', fontWeight:'bold'}}>VISA</Text>
                  </View>
                  <Text style={{color:'white', fontSize: 20, letterSpacing:3, textAlign:'center', marginVertical:20}}>{ghostCard.num}</Text>
                  <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                      <Text style={{color:'#B0BEC5'}}>CVV: {ghostCard.cvv}</Text>
                      <Text style={{color:'#B0BEC5'}}>EXP: {ghostCard.exp}</Text>
                  </View>
              </LinearGradient>
          )}
      </CentralModal>

      {/* 5. ECO */}
      <CentralModal visible={ecoModalVisible} onClose={() => setEcoModalVisible(false)} title="Eco Life" icon="tree" color="#4CAF50">
          <View style={{alignItems:'center', padding:10}}>
              <View style={{width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', justifyContent:'center', alignItems:'center', marginBottom:15}}>
                  <MaterialCommunityIcons name="flower" size={50} color="#4CAF50" />
              </View>
              <Text style={{fontSize:18, fontWeight:'bold', marginBottom:5}}>Ваш вклад: {treesPlanted} дерева</Text>
              <Text style={{textAlign:'center', color:'#666', marginBottom:20, lineHeight: 20}}>
                  Пожертвуйте 500 тенге в фонд озеленения города. Каждое дерево имеет значение!
              </Text>
              <Button mode="contained" onPress={() => {setTreesPlanted(p=>p+1); Alert.alert("Спасибо! 🌿")}} style={{width:'100%', backgroundColor:'#4CAF50', borderRadius:10}} contentStyle={{height:50}}>
                  Посадить (500 ₸)
              </Button>
          </View>
      </CentralModal>

      {/* 6. BUDGET */}
      <CentralModal visible={budgetModalVisible} onClose={() => setBudgetModalVisible(false)} title="Мой Бюджет" icon="safe" color="#3F51B5">
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                <Text style={{fontWeight:'bold', fontSize:16, color:'#333'}}>Ваши конверты</Text>
                <TouchableOpacity onPress={() => setIsAddingEnvelope(!isAddingEnvelope)}>
                    <Text style={{color:'#3F51B5', fontWeight:'bold'}}>+ Добавить</Text>
                </TouchableOpacity>
          </View>
          
          {isAddingEnvelope && (
              <View style={{flexDirection:'row', marginBottom:15}}>
                  <TextInput style={{flex:1, height:40, backgroundColor:'white', fontSize:14}} mode="outlined" placeholder="Название" value={newEnvelopeName} onChangeText={setNewEnvelopeName} autoFocus />
                  <Button mode="contained" onPress={handleAddEnvelope} style={{marginLeft:10, justifyContent:'center', backgroundColor:'#3F51B5'}}>OK</Button>
              </View>
          )}

          <ScrollView style={{maxHeight:300}}>
            {envelopes.map(e => (
                <View key={e.id} style={styles.envelopeRow}>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                        <View style={{backgroundColor:'#E8EAF6', padding:10, borderRadius:12, marginRight:12}}>
                            <MaterialCommunityIcons name={e.icon} size={22} color="#3F51B5" />
                        </View>
                        <View>
                            <Text style={{fontWeight:'bold', fontSize:15, color:'#333'}}>{e.name}</Text>
                            <Text style={{color:'#777', fontSize:12}}>{e.amount.toLocaleString()} ₸</Text>
                        </View>
                    </View>
                    {activeEnvelopeId === e.id ? (
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            <TextInput 
                                placeholder="Сумма" keyboardType="numeric" mode="outlined"
                                style={{width:80, height:35, backgroundColor:'white', fontSize:13, textAlign:'center'}}
                                value={topUpAmount} onChangeText={setTopUpAmount} autoFocus
                            />
                            <IconButton icon="check" size={20} iconColor="#4CAF50" onPress={() => handleTopUpConfirm(e.id)} />
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => setActiveEnvelopeId(e.id)} style={{padding:5}}>
                            <MaterialCommunityIcons name="plus-circle-outline" size={26} color="#3F51B5" />
                        </TouchableOpacity>
                    )}
                </View>
            ))}
          </ScrollView>
      </CentralModal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // HEADER
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  citySelector: { flexDirection:'row', alignItems:'center', backgroundColor:'#E3F2FD', paddingHorizontal:12, paddingVertical:6, borderRadius:20 },
  cityText: { fontWeight:'600', fontSize:14, color: '#1976D2', marginRight: 4 },
  
  searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
  searchBar: { borderRadius: 16, backgroundColor: 'white', elevation: 3, height: 50, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  
  // FINANCE SECTION
  sectionContainer: { marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, paddingLeft: 20, color:'#333' },
  financeCard: { width: 140, height: 100, borderRadius: 16, marginRight: 12, overflow:'hidden', elevation: 4, shadowColor:'#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.2, shadowRadius:4 },
  financeGradient: { flex:1, padding: 12, justifyContent:'space-between' },
  financeTop: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  financeLabel: { color:'white', fontSize:11, fontWeight:'bold', backgroundColor:'rgba(255,255,255,0.2)', paddingHorizontal:6, paddingVertical:2, borderRadius:4, overflow:'hidden' },
  financeTitle: { color:'white', fontWeight:'bold', fontSize:16 },
  financeSub: { color:'rgba(255,255,255,0.8)', fontSize:12 },

  // GRID ITEMS
  gridItemContainer: { width: ITEM_WIDTH, alignItems: 'center', marginBottom: 25 },
  iconBackground: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4.65 },
  gridLabel: { fontSize: 12, textAlign: 'center', color: '#444', fontWeight: '600', width: '90%' },
  badge: { position: 'absolute', top: -6, right: 12, backgroundColor: '#FF3D00', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'white' },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },

  // CENTRAL MODAL STYLES
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  centeredCard: { width: '85%', backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', elevation: 20, maxHeight: height * 0.7 },
  modalHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  modalBody: { padding: 20 },
  
  // ELEMENTS
  fieldLabel: { fontWeight:'bold', marginBottom:8, color:'#555', marginLeft:2 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  payButton: { marginTop: 15, borderRadius: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5', marginRight: 8, borderWidth:1, borderColor:'#E0E0E0' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { fontSize: 13, color: '#2196F3', fontWeight: 'bold' },
  listItem: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12, borderBottomWidth:1, borderColor:'#F0F0F0' },
  
  // SPECIFIC
  ghostCardView: { padding: 20, borderRadius: 16, marginTop: 10, elevation: 5 },
  envelopeRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical: 12, borderBottomWidth:1, borderColor:'#f0f0f0' }
});