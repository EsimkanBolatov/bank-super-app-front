import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Linking, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, Card, Button, Avatar, IconButton, Title, ProgressBar, Snackbar, Paragraph, Divider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bankApi } from '../../src/api';

// --- УНИВЕРСАЛЬНЫЙ КОМПОНЕНТ МОДАЛКИ ---
const CenteredModal = ({ visible, onClose, children, title, height = undefined }: any) => {
  const theme = useTheme();

  // Контент модалки
  const content = (
     <View style={[styles.modalContent, { backgroundColor: theme.colors.background, maxHeight: height }]}>
        <View style={styles.modalHeader}>
            <Title style={{fontWeight:'bold', flex: 1}}>{title}</Title>
            <IconButton icon="close" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{paddingBottom: 20}} showsVerticalScrollIndicator={false}>
            {children}
        </ScrollView>
    </View>
  );

  if (!visible) return null;

  // Для Веба: Рендерим как оверлей (чтобы избежать ошибок фокуса)
  if (Platform.OS === 'web') {
      return (
        <View style={[styles.modalOverlay, StyleSheet.absoluteFill, { zIndex: 9999, position: 'fixed' as any }]}>
            {content}
        </View>
      );
  }

  // Для Телефона: Нативный Modal
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                {content}
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    </Modal>
  );
};

export default function Services() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // --- УВЕДОМЛЕНИЯ ---
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const showSnack = (msg: string) => { setSnackMessage(msg); setSnackVisible(true); };

  // --- СОСТОЯНИЕ МОДАЛОК ---
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [ghostModalVisible, setGhostModalVisible] = useState(false); // NEW
  const [ecoModalVisible, setEcoModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [linkBillModalVisible, setLinkBillModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);

  // --- 1. ORTAK (SPLIT) ЛОГИКА ---
  const [splitTotal, setSplitTotal] = useState('');
  const [splitPeople, setSplitPeople] = useState<number[]>([]);
  const friends = [
    { id: 1, name: 'Алибек', avatar: 'face-man', phone: '+7 707 111 22 33' },
    { id: 2, name: 'Айжан', avatar: 'face-woman', phone: '+7 777 444 55 66' },
    { id: 3, name: 'Ержан', avatar: 'face-man-profile', phone: '+7 701 777 88 99' },
  ];

  const toggleFriend = (id: number) => {
    if (splitPeople.includes(id)) setSplitPeople(splitPeople.filter(i => i !== id));
    else setSplitPeople([...splitPeople, id]);
  };

  const handleSplitRequest = () => {
    if (!splitTotal || splitPeople.length === 0) { showSnack("Введите сумму и выберите друзей"); return; }
    setLoading(true);
    setTimeout(() => {
        const perPerson = Math.round(Number(splitTotal) / (splitPeople.length + 1));
        showSnack(`Запрос отправлен! По ${perPerson} ₸ с каждого.`);
        setSplitTotal(''); setSplitPeople([]); setLoading(false); setSplitModalVisible(false);
    }, 1000);
  };

  // --- 2. GHOST CARD ЛОГИКА ---
  const [ghostCard, setGhostCard] = useState<any>(null);
  const createGhostCard = async () => {
      setLoading(true);
      setTimeout(() => {
          setGhostCard({ number: '4400 4302 9988 1234', cvv: '909', exp: '02/26' });
          setLoading(false);
          showSnack("Виртуальная карта создана! 👻");
      }, 1500);
  };

  // --- 3. ECO LIFE ЛОГИКА ---
  const [treesPlanted, setTreesPlanted] = useState(3);
  const handlePlantTree = async () => {
    setLoading(true);
    try {
        await bankApi.payService("Eco Tree", 500);
        setTreesPlanted(prev => prev + 1);
        showSnack(`Дерево посажено! (-500 ₸) 🌳`);
    } catch(e) { showSnack("Ошибка оплаты"); } 
    finally { setLoading(false); }
  };

  // --- 4. МОЙ БЮДЖЕТ (СЕЙФ) ---
  const [freeBalance, setFreeBalance] = useState(250000);
  const [envelopes, setEnvelopes] = useState([
    { id: 1, name: 'Аренда', amount: 0, icon: 'home', color: '#673ab7', inputValue: '', linkedBill: '' },
    { id: 2, name: 'Продукты', amount: 0, icon: 'cart', color: '#4caf50', inputValue: '', linkedBill: '' },
  ]);
  const [newEnvelopeName, setNewEnvelopeName] = useState('');
  const [isCreatingEnvelope, setIsCreatingEnvelope] = useState(false);
  const [billInput, setBillInput] = useState('');
  const [currentEnvId, setCurrentEnvId] = useState<number | null>(null);

  const updateEnvelopeInput = (id: number, text: string) => {
    setEnvelopes(prev => prev.map(env => env.id === id ? { ...env, inputValue: text } : env));
  };
  
  const freezeMoney = (id: number) => {
    const env = envelopes.find(e => e.id === id);
    if (!env || !env.inputValue) return;
    const val = Number(env.inputValue);
    if (val <= 0 || val > freeBalance) { showSnack("Некорректная сумма"); return; }
    setFreeBalance(prev => prev - val);
    setEnvelopes(prev => prev.map(e => e.id === id ? { ...e, amount: e.amount + val, inputValue: '' } : e));
    showSnack(`Отложено ${val} ₸`);
  };

  const unfreezeMoney = (id: number) => {
    const env = envelopes.find(e => e.id === id);
    if (!env || env.amount <= 0) return;
    setFreeBalance(prev => prev + env.amount);
    setEnvelopes(prev => prev.map(e => e.id === id ? { ...e, amount: 0 } : e));
    showSnack(`Деньги возвращены`);
  };

  const handleCreateEnvelope = () => {
      if (!newEnvelopeName.trim()) return;
      const newEnv = { id: Date.now(), name: newEnvelopeName, amount: 0, icon: 'folder-star', color: '#f4511e', inputValue: '', linkedBill: '' };
      setEnvelopes([...envelopes, newEnv]); setNewEnvelopeName(''); setIsCreatingEnvelope(false);
  };
  
  const saveLinkedBill = () => {
      if (currentEnvId !== null) {
          setEnvelopes(prev => prev.map(e => e.id === currentEnvId ? { ...e, linkedBill: billInput } : e));
          setLinkBillModalVisible(false); setBillInput(''); showSnack("Счет привязан");
      }
  };

  // --- СТАРЫЕ СЕРВИСЫ (Кредит, Универ) ---
  const [loanAmount, setLoanAmount] = useState('');
  const [income, setIncome] = useState('');
  const [loanSchedule, setLoanSchedule] = useState<any[]>([]);
  const [loanApproved, setLoanApproved] = useState(false);
  
  const handleLoanApply = async () => {
      if(!loanAmount || !income) return;
      setLoading(true);
      try {
          const res = await bankApi.applyLoan(Number(loanAmount), 12, Number(income));
          if(res.data.status === 'approved') {
              setLoanSchedule(res.data.schedule); setLoanApproved(true); showSnack("Кредит одобрен! 🎉");
          } else { showSnack("Отказ по кредиту"); }
      } catch(e) { showSnack("Ошибка сервера"); } finally { setLoading(false); }
  };

  const studentData = { tuitionTotal: 600000, tuitionPaid: 60000 };
  const [payAmount, setPayAmount] = useState('');
  const handleTuitionPayment = async () => {
      if(!payAmount) return;
      setLoading(true);
      try { await bankApi.payService("ITU Tuition", Number(payAmount)); showSnack("Оплачено!"); setStudentModalVisible(false); }
      catch(e) { showSnack("Ошибка"); } finally { setLoading(false); }
  };

  // --- СПИСОК СЕРВИСОВ ---
  const services = [
    { id: 9, title: 'Мой Бюджет', icon: 'safe', color: '#3f51b5', badge: 'NEW', desc: 'Сейф расходов', fullDesc: 'Конверты для накоплений.' },
    { id: 1, title: 'Ortak (Split)', icon: 'account-group', color: '#f4511e', badge: 'HOT', desc: 'Разделить счет', fullDesc: 'Скиньтесь с друзьями.' },
    { id: 3, title: 'Ghost Card', icon: 'ghost', color: '#607d8b', badge: 'SAFE', desc: 'Безопасность', fullDesc: 'Одноразовая карта.' },
    { id: 2, title: 'Eco Life', icon: 'tree', color: '#4caf50', badge: 'ESG', desc: 'Посади дерево', fullDesc: 'Экологический вклад.' },
    { id: 7, title: 'Кредит', icon: 'cash-multiple', color: '#ff9800', badge: '1 мин', desc: 'Онлайн решение', fullDesc: 'Деньги на карту сразу.' },
    { id: 5, title: 'ITU Campus', icon: 'school', color: '#6200ee', badge: null, desc: 'Университет', fullDesc: 'Оплата и пропуск.' },
    { id: 6, title: 'Digital Taraz', icon: 'bus', color: '#03dac6', badge: null, desc: 'Транспорт', fullDesc: 'Проездной.' },
    { id: 8, title: 'Такси', icon: 'taxi', color: '#ffc107', badge: null, desc: 'Заказ поездки', fullDesc: 'Переход в Яндекс.' },
  ];

  const handlePress = (item: any) => {
    if (item.title === 'Ortak (Split)') setSplitModalVisible(true);
    else if (item.title === 'Ghost Card') setGhostModalVisible(true);
    else if (item.title === 'Eco Life') setEcoModalVisible(true);
    else if (item.title === 'Мой Бюджет') setBudgetModalVisible(true);
    else if (item.title === 'Кредит') { setLoanApproved(false); setLoanSchedule([]); setLoanModalVisible(true); }
    else if (item.title === 'ITU Campus') setStudentModalVisible(true);
    else if (item.title === 'Такси') Linking.openURL('https://go.yandex.kz');
    else if (item.title === 'Digital Taraz') Linking.openURL('https://2gis.kz/taraz');
    else { setSelectedService(item); setInfoModalVisible(true); }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>{t('services')}</Text>
          <Text style={{ color: theme.colors.secondary, marginTop: 5 }}>Суперприложение</Text>
        </View>
        <View style={styles.grid}>
          {services.map((item: any) => (
            <TouchableOpacity key={item.id} style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]} onPress={() => handlePress(item)}>
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <MaterialCommunityIcons name={item.icon} size={32} color={item.color} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
              {item.badge && <View style={[styles.badge, { backgroundColor: item.color }]}><Text style={styles.badgeText}>{item.badge}</Text></View>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 1. ORTAK (SPLIT) */}
      <CenteredModal visible={splitModalVisible} onClose={() => setSplitModalVisible(false)} title="Разделить счет 🍕">
          <Paragraph style={{color: '#666', marginBottom: 10}}>Введите сумму чека и выберите друзей:</Paragraph>
          <TextInput style={styles.input} placeholder="Сумма (₸)" keyboardType="numeric" value={splitTotal} onChangeText={setSplitTotal} />
          {friends.map(friend => (
              <TouchableOpacity key={friend.id} style={[styles.friendItem, splitPeople.includes(friend.id) && styles.friendSelected]} onPress={() => toggleFriend(friend.id)}>
                  <Avatar.Icon size={40} icon={friend.avatar} style={{backgroundColor: splitPeople.includes(friend.id) ? '#4caf50' : '#eee'}} color={splitPeople.includes(friend.id) ? 'white' : '#555'} />
                  <View style={{marginLeft: 15}}>
                      <Text style={{fontWeight: 'bold'}}>{friend.name}</Text>
                      <Text style={{color:'#888', fontSize: 12}}>{friend.phone}</Text>
                  </View>
                  {splitPeople.includes(friend.id) && <MaterialCommunityIcons name="check" size={24} color="#4caf50" style={{marginLeft:'auto'}} />}
              </TouchableOpacity>
          ))}
          <Button mode="contained" onPress={handleSplitRequest} loading={loading} style={{marginTop: 15, backgroundColor: '#f4511e'}}>
             {splitPeople.length > 0 && splitTotal ? `Разделить (по ${Math.round(Number(splitTotal) / (splitPeople.length + 1))} ₸)` : "Разделить"}
          </Button>
      </CenteredModal>

      {/* 2. GHOST CARD */}
      <CenteredModal visible={ghostModalVisible} onClose={() => setGhostModalVisible(false)} title="Ghost Card 👻">
          {!ghostCard ? (
              <View style={{alignItems: 'center'}}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={80} color="#607d8b" />
                  <Paragraph style={{textAlign:'center', marginVertical: 20}}>Безопасная карта для покупок в интернете. Исчезнет через 24 часа.</Paragraph>
                  <Button mode="contained" onPress={createGhostCard} loading={loading} style={{backgroundColor: '#607d8b'}}>Создать карту</Button>
              </View>
          ) : (
              <View style={styles.ghostCard}>
                  <View style={{flexDirection: 'row', justifyContent:'space-between'}}><Text style={{color:'white', fontWeight:'bold'}}>GHOST VIRTUAL</Text><MaterialCommunityIcons name="wifi" size={20} color="white" /></View>
                  <Title style={{color:'white', marginTop: 20, fontFamily: 'monospace'}}>{ghostCard.number}</Title>
                  <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 10}}>
                      <Text style={{color:'#ccc'}}>CVV: {ghostCard.cvv}</Text><Text style={{color:'#ccc'}}>EXP: {ghostCard.exp}</Text>
                  </View>
                  <Button mode="outlined" textColor="white" style={{marginTop: 20, borderColor:'white'}} onPress={() => {setGhostCard(null); showSnack("Карта уничтожена");}}>Уничтожить</Button>
              </View>
          )}
      </CenteredModal>

      {/* 3. ECO LIFE */}
      <CenteredModal visible={ecoModalVisible} onClose={() => setEcoModalVisible(false)} title="Eco Life 🌳">
             <View style={{alignItems: 'center'}}>
                <View style={{position:'relative'}}>
                    <MaterialCommunityIcons name="tree" size={100} color="#4caf50" />
                    <View style={{position:'absolute', bottom:0, right:0, backgroundColor:'#ffeb3b', borderRadius:12, paddingHorizontal:6}}><Text style={{fontWeight:'bold'}}>x{treesPlanted}</Text></View>
                </View>
                <Title style={{marginTop: 10, color: '#2e7d32'}}>Вы посадили {treesPlanted} дерева!</Title>
                <Paragraph style={{textAlign:'center', marginBottom: 20}}>Стоимость саженца: 500 ₸.</Paragraph>
                <Button mode="contained" onPress={handlePlantTree} loading={loading} style={{width:'100%', backgroundColor:'#4caf50'}}>Посадить еще (500 ₸)</Button>
             </View>
      </CenteredModal>

      {/* 4. МОЙ БЮДЖЕТ */}
      <CenteredModal visible={budgetModalVisible} onClose={() => setBudgetModalVisible(false)} title="Мой Бюджет 💰" height="85%">
            <View style={{backgroundColor: '#3f51b5', padding: 20, borderRadius: 16, marginBottom: 20, alignItems: 'center'}}>
               <Text style={{color: 'rgba(255,255,255,0.7)'}}>Свободно на карте</Text>
               <Title style={{fontSize: 32, fontWeight:'bold', color: 'white'}}>{freeBalance.toLocaleString()} ₸</Title>
            </View>
            {!isCreatingEnvelope ? (
                <Button mode="outlined" icon="plus" onPress={() => setIsCreatingEnvelope(true)} style={{marginBottom: 15, borderColor: '#3f51b5'}} textColor="#3f51b5">Создать конверт</Button>
            ) : (
                <View style={{flexDirection:'row', marginBottom: 15, alignItems:'center'}}>
                    <TextInput style={[styles.input, {flex:1, marginBottom:0}]} placeholder="Название..." value={newEnvelopeName} onChangeText={setNewEnvelopeName} />
                    <IconButton icon="check" mode="contained" containerColor="#4caf50" iconColor="white" onPress={handleCreateEnvelope} />
                    <IconButton icon="close" onPress={() => setIsCreatingEnvelope(false)} />
                </View>
            )}
            {envelopes.map(env => (
                <Card key={env.id} style={[styles.envelopeItem, { borderLeftColor: env.color }]}>
                    <Card.Content>
                        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                            <View style={{flexDirection:'row', alignItems:'center'}}>
                                <MaterialCommunityIcons name={env.icon} size={24} color={env.color} style={{marginRight: 10}} />
                                <Text style={{fontSize: 16, fontWeight:'bold'}}>{env.name}</Text>
                            </View>
                            <Text style={{fontSize: 18, fontWeight:'bold', color: env.color}}>{env.amount.toLocaleString()} ₸</Text>
                        </View>
                        <Divider style={{marginVertical: 10}} />
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            <TextInput style={[styles.smallInput, {flex:1}]} placeholder="Сумма..." keyboardType="numeric" value={env.inputValue} onChangeText={(t) => updateEnvelopeInput(env.id, t)} />
                            <IconButton icon="arrow-down" mode="contained" containerColor={env.color} iconColor="white" size={20} onPress={() => freezeMoney(env.id)} />
                            <IconButton icon="arrow-up" mode="outlined" iconColor={env.color} size={20} onPress={() => unfreezeMoney(env.id)} />
                        </View>
                    </Card.Content>
                </Card>
            ))}
      </CenteredModal>

      {/* 5. СТАРЫЕ МОДАЛКИ (КРЕДИТ, УНИВЕР, СЧЕТА) */}
      <CenteredModal visible={loanModalVisible} onClose={() => setLoanModalVisible(false)} title="Кредит" height="90%">
            {!loanApproved ? (
                <>
                    <TextInput style={styles.input} placeholder="Сумма" keyboardType="numeric" value={loanAmount} onChangeText={setLoanAmount} />
                    <TextInput style={styles.input} placeholder="Доход" keyboardType="numeric" value={income} onChangeText={setIncome} />
                    <Button mode="contained" onPress={handleLoanApply} loading={loading}>Рассчитать</Button>
                </>
            ) : (
                <>
                    <Title style={{color: 'green', textAlign: 'center', marginBottom: 10}}>Одобрено!</Title>
                    {loanSchedule.map((i, idx) => <View key={idx} style={{flexDirection:'row', justifyContent:'space-between', padding:10, borderBottomWidth:1, borderColor:'#eee'}}><Text>{i.date}</Text><Text>{i.amount} ₸</Text></View>)}
                </>
            )}
      </CenteredModal>

      <CenteredModal visible={studentModalVisible} onClose={() => setStudentModalVisible(false)} title="ITU Campus">
            <Title style={{textAlign:'center'}}>{(studentData.tuitionTotal - studentData.tuitionPaid).toLocaleString()} ₸ долг</Title>
            <TextInput style={[styles.input, {marginTop: 20}]} placeholder="Сумма оплаты" value={payAmount} onChangeText={setPayAmount} />
            <Button mode="contained" onPress={handleTuitionPayment} loading={loading}>Оплатить</Button>
      </CenteredModal>
      
      <CenteredModal visible={linkBillModalVisible} onClose={() => setLinkBillModalVisible(false)} title="Привязка">
            <TextInput style={styles.input} placeholder="Лицевой счет" value={billInput} onChangeText={setBillInput} />
            <Button mode="contained" onPress={saveLinkedBill}>Сохранить</Button>
      </CenteredModal>

      <Modal animationType="fade" transparent={true} visible={infoModalVisible} onRequestClose={() => setInfoModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background, alignItems: 'center' }]}>
            {selectedService && <><Title>{selectedService.title}</Title><Paragraph>{selectedService.fullDesc}</Paragraph><Button onPress={() => setInfoModalVisible(false)}>OK</Button></>}
          </View>
        </View>
      </Modal>

      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2000}>{snackMessage}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 20, marginTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: '#eee' },
  iconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  cardDesc: { fontSize: 11, color: '#888' },
  badge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20, top:0, left:0, right:0, bottom:0 },
  modalContent: { borderRadius: 24, padding: 20, width: '100%', maxWidth: 500, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  
  input: { borderWidth:1, borderColor:'#ccc', borderRadius:10, padding:12, marginBottom:15, fontSize:16, backgroundColor:'#fff' },
  smallInput: { borderWidth:1, borderColor:'#eee', borderRadius:8, padding:8, fontSize:14, backgroundColor:'#f9f9f9', marginRight: 10 },
  
  friendItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  friendSelected: { backgroundColor: '#e8f5e9', borderColor: '#4caf50' },
  
  ghostCard: { backgroundColor: '#263238', borderRadius: 16, padding: 20, marginTop: 10, height: 180, justifyContent: 'space-between' },
  envelopeItem: { marginBottom: 10, borderLeftWidth: 5, backgroundColor: 'white', elevation: 2 }
});