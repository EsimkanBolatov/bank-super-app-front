import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Linking, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, Card, Button, Avatar, IconButton, Title, ProgressBar, Snackbar, Paragraph, Divider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bankApi } from '../../src/api';

// --- ИСПРАВЛЕНИЕ: Компонент вынесен наружу, чтобы избежать пересоздания при вводе текста ---
const CenteredModal = ({ visible, onClose, children, title, height = undefined }: any) => {
  const theme = useTheme();

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={[styles.modalContent, { backgroundColor: theme.colors.background, maxHeight: height }]}>
                    <View style={styles.modalHeader}>
                        <Title style={{fontWeight:'bold', flex: 1}}>{title}</Title>
                        <IconButton icon="close" onPress={onClose} />
                    </View>
                    <ScrollView contentContainerStyle={{paddingBottom: 20}}>
                        {children}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    </Modal>
  );
};

export default function Services() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // --- STATE ДЛЯ SNACKBAR ---
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [snackColor, setSnackColor] = useState(theme.colors.inverseSurface);

  const showSnack = (msg: string, isError = false) => {
    setSnackMessage(msg);
    setSnackColor(isError ? theme.colors.error : '#333');
    setSnackVisible(true);
  };

  // --- МОДАЛКИ ---
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [ecoModalVisible, setEcoModalVisible] = useState(false);
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [linkBillModalVisible, setLinkBillModalVisible] = useState(false);

  const [selectedService, setSelectedService] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ФОРМЫ
  const [payAmount, setPayAmount] = useState('');

  // КРЕДИТ
  const [loanAmount, setLoanAmount] = useState('');
  const [income, setIncome] = useState('');
  const [loanSchedule, setLoanSchedule] = useState<any[]>([]); // График платежей
  const [loanApproved, setLoanApproved] = useState(false);

  // --- БЮДЖЕТ (СЕЙФ) ---
  const [freeBalance, setFreeBalance] = useState(250000);
  const [envelopes, setEnvelopes] = useState([
    { id: 1, name: 'Аренда', amount: 0, icon: 'home', color: '#673ab7', inputValue: '', linkedBill: '' },
    { id: 2, name: 'Продукты', amount: 0, icon: 'cart', color: '#4caf50', inputValue: '', linkedBill: '' },
  ]);

  const [newEnvelopeName, setNewEnvelopeName] = useState('');
  const [isCreatingEnvelope, setIsCreatingEnvelope] = useState(false);
  const [billInput, setBillInput] = useState('');
  const [currentEnvId, setCurrentEnvId] = useState<number | null>(null);

  const studentData = { name: 'Нурбек', id: '210107', gpa: '3.8', tuitionTotal: 600000, tuitionPaid: 60000 };
  const frequentContacts = [
    { id: 1, name: 'Алибек', avatar: 'face-man', recent: 'Вчера' },
    { id: 2, name: 'Айжан', avatar: 'face-woman', recent: '3 дня назад' },
  ];

  const services = [
    { id: 9, title: 'Мой Бюджет', icon: 'safe', color: '#3f51b5', badge: 'NEW', desc: 'Сейф расходов', fullDesc: 'Временная стоянка для денег.' },
    { id: 5, title: 'ITU Campus', icon: 'school', color: '#6200ee', badge: null, desc: 'Университет', fullDesc: 'Оплата учебы и доступ в универ.' },
    { id: 6, title: 'Digital Taraz', icon: 'bus', color: '#03dac6', badge: null, desc: 'Транспорт', fullDesc: 'Билеты и проезд.' },
    { id: 8, title: 'Такси', icon: 'taxi', color: '#ffc107', badge: null, desc: 'Заказ поездки', fullDesc: 'Быстрый заказ такси.' },
    { id: 1, title: 'Ortak (Split)', icon: 'account-group', color: '#f4511e', badge: 'HOT', desc: 'Разделить счет', fullDesc: 'Скиньтесь с друзьями.' },
    { id: 2, title: 'Eco Life', icon: 'tree', color: '#4caf50', badge: 'ESG', desc: 'Посади дерево', fullDesc: 'Внеси вклад в экологию.' },
    { id: 7, title: 'Кредит', icon: 'cash-multiple', color: '#ff9800', badge: 'NEW', desc: 'Онлайн за 1 мин', fullDesc: 'Получи деньги на карту мгновенно.' },
    { id: 3, title: 'Ghost Card', icon: 'ghost', color: '#607d8b', badge: 'SAFE', desc: 'Безопасность', fullDesc: 'Виртуальная карта.' },
  ];

  const handlePress = (serviceItem: any) => {
    if (serviceItem.title === 'Ortak (Split)') setSplitModalVisible(true);
    else if (serviceItem.title === 'ITU Campus') setStudentModalVisible(true);
    else if (serviceItem.title === 'Eco Life') setEcoModalVisible(true);
    else if (serviceItem.title === 'Кредит') {
        // Сбрасываем состояние кредита при открытии
        setLoanApproved(false);
        setLoanSchedule([]);
        setLoanModalVisible(true);
    }
    else if (serviceItem.title === 'Мой Бюджет') setBudgetModalVisible(true);
    else if (serviceItem.title === 'Такси') {
        Linking.openURL('https://go.yandex.kz');
    }
    else if (serviceItem.title === 'Digital Taraz') {
        //
        Linking.openURL('https://2gis.kz/taraz'); // Или ссылка на Tulpar Card
    }
    else { setSelectedService(serviceItem); setInfoModalVisible(true); }
  };

  // --- ЛОГИКА БЮДЖЕТА ---
  const updateEnvelopeInput = (id: number, text: string) => {
    setEnvelopes(prev => prev.map(env => env.id === id ? { ...env, inputValue: text } : env));
  };

  const freezeMoney = (id: number) => {
    const env = envelopes.find(e => e.id === id);
    if (!env || !env.inputValue) return;
    const val = Number(env.inputValue);
    if (val <= 0) return;

    if (val > freeBalance) { showSnack("Недостаточно свободных средств", true); return; }

    setFreeBalance(prev => prev - val);
    setEnvelopes(prev => prev.map(e => e.id === id ? { ...e, amount: e.amount + val, inputValue: '' } : e));
    showSnack(`Отложено ${val} ₸ в "${env.name}"`);
  };

  const unfreezeMoney = (id: number) => {
    const env = envelopes.find(e => e.id === id);
    if (!env || env.amount <= 0) { showSnack("Ячейка пуста", true); return; }

    setFreeBalance(prev => prev + env.amount);
    setEnvelopes(prev => prev.map(e => e.id === id ? { ...e, amount: 0 } : e));
    showSnack(`Деньги возвращены на карту`);
  };

  const handleCreateEnvelope = () => {
      if (!newEnvelopeName.trim()) return;
      const newId = Date.now();
      const colors = ['#e91e63', '#9c27b0', '#2196f3', '#00bcd4', '#009688', '#ffc107', '#ff5722'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newEnv = {
          id: newId,
          name: newEnvelopeName,
          amount: 0,
          icon: 'folder-star',
          color: randomColor,
          inputValue: '',
          linkedBill: ''
      };

      setEnvelopes([...envelopes, newEnv]);
      setNewEnvelopeName('');
      setIsCreatingEnvelope(false);
      showSnack("Новая ячейка создана");
  };

  const openLinkBillModal = (id: number) => {
      setCurrentEnvId(id);
      setLinkBillModalVisible(true);
  };

  const saveLinkedBill = () => {
      if (!billInput || currentEnvId === null) return;
      setEnvelopes(prev => prev.map(e => e.id === currentEnvId ? { ...e, linkedBill: billInput } : e));
      setBillInput('');
      setLinkBillModalVisible(false);
      showSnack("Счет успешно привязан!");
  };

  const payFromEnvelope = (id: number) => {
      const env = envelopes.find(e => e.id === id);
      if (!env || env.amount <= 0) { showSnack("Нет денег для оплаты", true); return; }

      setEnvelopes(prev => prev.map(e => e.id === id ? { ...e, amount: 0 } : e));
      showSnack(`Оплачено: ${env.amount} ₸`);
  };

  // --- API ---
  const handlePlantTree = async () => {
    setLoading(true);
    try {
        await bankApi.payService("Eco Tree", 500);
        showSnack(`Дерево посажено! 🌳`);
        setEcoModalVisible(false);
    }
    catch (e) { showSnack("Ошибка оплаты", true); }
    finally { setLoading(false); }
  };

  const handleTuitionPayment = async () => {
    if (!payAmount) return;
    setLoading(true);
    try {
        await bankApi.payService("ITU Tuition", Number(payAmount));
        showSnack(`Оплата принята`);
        setPayAmount('');
        setStudentModalVisible(false);
    }
    catch (e) { showSnack("Ошибка оплаты", true); }
    finally { setLoading(false); }
  };

  const handleLoanApply = async () => {
    if (!loanAmount || !income) return;
    setLoading(true);
    try {
        const res = await bankApi.applyLoan(Number(loanAmount), 12, Number(income));

        if (res.data.status === 'approved') {
            showSnack(`🎉 ОДОБРЕНО! Деньги зачислены.`);
            // Сохраняем график и переключаем режим модалки
            setLoanSchedule(res.data.schedule);
            setLoanApproved(true);
        }
        else {
            showSnack("Отказ. Кредитная нагрузка высока.", true);
        }
    } catch (e) {
        showSnack("Ошибка соединения", true);
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const progress = studentData.tuitionPaid / studentData.tuitionTotal;

  const MySnackbar = () => (
    <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={3000}
        style={{ backgroundColor: snackColor, marginBottom: 50, zIndex: 9999 }} // Поднял снекбар выше
        action={{ label: 'OK', onPress: () => setSnackVisible(false), textColor: '#fff' }}
    >
        {snackMessage}
    </Snackbar>
  );

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

      {/* 1. БЮДЖЕТ */}
      <CenteredModal visible={budgetModalVisible} onClose={() => setBudgetModalVisible(false)} title="Мой Бюджет 🔒" height="85%">
            <View style={{backgroundColor: '#e8eaf6', padding: 20, borderRadius: 16, marginBottom: 20}}>
               <Text style={{color: '#5c6bc0'}}>Доступно на карте</Text>
               <Title style={{fontSize: 32, fontWeight:'bold', color: '#3f51b5'}}>{freeBalance.toLocaleString()} ₸</Title>
            </View>
            {!isCreatingEnvelope ? (
                <Button mode="outlined" icon="plus" onPress={() => setIsCreatingEnvelope(true)} style={{marginBottom: 15}}>Создать ячейку</Button>
            ) : (
                <View style={{flexDirection:'row', marginBottom: 15, alignItems:'center'}}>
                    <TextInput style={[styles.input, {flex:1, marginBottom:0}]} placeholder="Название (Напр: Машина)" value={newEnvelopeName} onChangeText={setNewEnvelopeName} />
                    <IconButton icon="check" mode="contained" containerColor="#4caf50" iconColor="white" onPress={handleCreateEnvelope} />
                    <IconButton icon="close" onPress={() => setIsCreatingEnvelope(false)} />
                </View>
            )}
            <View>
                {envelopes.map(env => (
                    <View key={env.id} style={[styles.envelopeItem, { borderColor: env.color }]}>
                        <View style={{flexDirection:'row', alignItems:'center', marginBottom: 10}}>
                            <View style={{backgroundColor: env.color+'20', padding: 10, borderRadius: 10, marginRight: 15}}>
                                <MaterialCommunityIcons name={env.icon} size={24} color={env.color} />
                            </View>
                            <View style={{flex:1}}>
                                <Text style={{fontWeight:'bold', fontSize: 16}}>{env.name}</Text>
                                {env.linkedBill ? <Text style={{color: '#4caf50', fontSize: 10}}>🔗 {env.linkedBill}</Text> : <Text style={{color: '#888', fontSize: 10}}>Нет привязки</Text>}
                            </View>
                            <Text style={{fontWeight:'bold', fontSize: 20, color: env.color}}>{env.amount.toLocaleString()} ₸</Text>
                        </View>
                        <View style={{flexDirection:'row', alignItems:'center', justifyContent: 'space-between'}}>
                            <TextInput
                                style={[styles.input, {flex:1, marginBottom:0, height: 40, fontSize: 14, marginRight: 10}]}
                                placeholder="Сумма..." keyboardType="numeric" value={env.inputValue} onChangeText={(text) => updateEnvelopeInput(env.id, text)}
                            />
                            <IconButton icon="arrow-down-bold-box" iconColor={env.color} size={30} onPress={() => freezeMoney(env.id)} />
                        </View>
                        {env.amount > 0 && (
                            <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 10}}>
                                <Button mode="contained" buttonColor={env.color} style={{flex: 1, marginRight: 5}} onPress={() => payFromEnvelope(env.id)}>Оплатить</Button>
                                <Button mode="outlined" textColor="#888" style={{flex: 1, marginLeft: 5}} onPress={() => unfreezeMoney(env.id)}>Вернуть</Button>
                            </View>
                        )}
                        {env.amount === 0 && (
                            <Button mode="text" compact textColor="#888" onPress={() => openLinkBillModal(env.id)}>
                                {env.linkedBill ? "Изменить счет" : "Привязать счет"}
                            </Button>
                        )}
                    </View>
                ))}
            </View>
      </CenteredModal>

      {/* 2. ПРИВЯЗКА СЧЕТА */}
      <CenteredModal visible={linkBillModalVisible} onClose={() => setLinkBillModalVisible(false)} title="Привязка счета">
            <Paragraph style={{color:'#888', marginBottom:20}}>Введите лицевой счет (ЖКХ, Интернет) или номер карты.</Paragraph>
            <TextInput style={styles.input} placeholder="Например: ЕРЦ-99112233" value={billInput} onChangeText={setBillInput} />
            <Button mode="contained" onPress={saveLinkedBill} style={{marginTop:10}}>Сохранить</Button>
      </CenteredModal>

      {/* 3. КРЕДИТ И ГРАФИК ПЛАТЕЖЕЙ */}
      <CenteredModal visible={loanModalVisible} onClose={() => setLoanModalVisible(false)} title="Онлайн Кредит" height="90%">
            {!loanApproved ? (
                <>
                    <View style={{alignItems:'center', marginBottom: 20}}>
                        <MaterialCommunityIcons name="cash-fast" size={60} color={theme.colors.primary} />
                        <Paragraph style={{textAlign:'center', marginTop: 10}}>Получите деньги на карту за 1 минуту</Paragraph>
                    </View>
                    <TextInput style={styles.input} placeholder="Сумма кредита" keyboardType="numeric" value={loanAmount} onChangeText={setLoanAmount} />
                    <TextInput style={styles.input} placeholder="Ваш ежемесячный доход" keyboardType="numeric" value={income} onChangeText={setIncome} />
                    <Button mode="contained" onPress={handleLoanApply} loading={loading} style={{marginTop:10}} contentStyle={{height: 50}}>Рассчитать и Взять</Button>
                </>
            ) : (
                <>
                    <View style={{backgroundColor: '#e8f5e9', padding: 20, borderRadius: 12, marginBottom: 20, alignItems: 'center'}}>
                        <MaterialCommunityIcons name="check-circle" size={50} color="#4caf50" />
                        <Title style={{color: '#2e7d32', marginTop: 10}}>Кредит одобрен!</Title>
                        <Paragraph>Деньги зачислены на ваш основной счет.</Paragraph>
                    </View>
                    <Title style={{fontSize: 18, marginBottom: 10}}>Ваш календарь платежей 📅</Title>
                    <View style={{borderWidth: 1, borderColor: '#eee', borderRadius: 12, overflow: 'hidden'}}>
                        {loanSchedule.map((item, index) => (
                            <View key={index} style={{flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: index % 2 === 0 ? '#fafafa' : 'white', borderBottomWidth: 1, borderBottomColor: '#eee'}}>
                                <Text style={{fontWeight: 'bold', color: '#555'}}>{item.date}</Text>
                                <Text style={{fontWeight: 'bold', color: theme.colors.primary}}>{item.amount} ₸</Text>
                            </View>
                        ))}
                    </View>
                    <Button mode="contained" onPress={() => setLoanModalVisible(false)} style={{marginTop: 20}}>Отлично</Button>
                </>
            )}
      </CenteredModal>

      {/* 4. ECO */}
      <CenteredModal visible={ecoModalVisible} onClose={() => setEcoModalVisible(false)} title="Посади дерево">
             <View style={{alignItems: 'center'}}>
                <MaterialCommunityIcons name="tree" size={80} color="#4caf50" style={{marginBottom:20}} />
                <Paragraph style={{textAlign:'center', marginBottom: 20}}>
                    Ваш вклад в озеленение города. Стоимость саженца: 500 ₸.
                </Paragraph>
                <Button mode="contained" onPress={handlePlantTree} loading={loading} style={{width:'100%', backgroundColor:'#4caf50'}}>Пожертвовать 500 ₸</Button>
             </View>
      </CenteredModal>

      {/* 5. ITU STUDENT */}
      <CenteredModal visible={studentModalVisible} onClose={() => setStudentModalVisible(false)} title="ITU Campus">
             <Card style={{marginVertical:20, backgroundColor: theme.colors.elevation.level2}}>
                <Card.Content>
                    <Text style={{color:'#888'}}>Остаток оплаты</Text>
                    <Title>{(studentData.tuitionTotal - studentData.tuitionPaid).toLocaleString()} ₸</Title>
                    <ProgressBar progress={progress} color={theme.colors.primary} style={{height:8, borderRadius:4, marginTop:10}} />
                </Card.Content>
             </Card>
             <TextInput style={styles.input} placeholder="Сумма оплаты" keyboardType="numeric" value={payAmount} onChangeText={setPayAmount} />
             <Button mode="contained" onPress={handleTuitionPayment} loading={loading} contentStyle={{height:50}}>Оплатить</Button>
             <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 20}}>
                <TouchableOpacity style={[styles.miniCard, {backgroundColor: '#e3f2fd'}]} onPress={() => showSnack("QR-код сгенерирован")}>
                    <MaterialCommunityIcons name="qrcode" size={30} color="#1976d2" />
                    <Text style={{marginTop: 5, fontSize: 12, fontWeight: 'bold', color: '#1976d2'}}>Пропуск</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniCard, {backgroundColor: '#e8f5e9'}]} onPress={() => showSnack("Загрузка расписания...")}>
                    <MaterialCommunityIcons name="calendar-clock" size={30} color="#388e3c" />
                    <Text style={{marginTop: 5, fontSize: 12, fontWeight: 'bold', color: '#388e3c'}}>Распис.</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniCard, {backgroundColor: '#fff3e0'}]} onPress={() => showSnack("GPA: 3.8")}>
                    <MaterialCommunityIcons name="book-open-page-variant" size={30} color="#f57c00" />
                    <Text style={{marginTop: 5, fontSize: 12, fontWeight: 'bold', color: '#f57c00'}}>Оценки</Text>
                </TouchableOpacity>
             </View>
      </CenteredModal>

      {/* 6. SPLIT */}
      <CenteredModal visible={splitModalVisible} onClose={() => setSplitModalVisible(false)} title="Разделить счет">
            <View style={{marginTop:10}}>
              {frequentContacts.map(c => (
                <TouchableOpacity key={c.id} style={styles.contactItem} onPress={() => {showSnack('Запрос отправлен!'); setSplitModalVisible(false)}}>
                   <Avatar.Icon size={40} icon={c.avatar} />
                   <Text style={{marginLeft:10, fontWeight:'bold'}}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
      </CenteredModal>

      {/* 7. INFO */}
      <Modal animationType="fade" transparent={true} visible={infoModalVisible} onRequestClose={() => setInfoModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background, alignItems: 'center' }]}>
            {selectedService && (
              <>
                <Title style={{textAlign:'center', marginBottom:10}}>{selectedService.title}</Title>
                <Paragraph style={{textAlign: 'center', marginBottom: 20}}>{selectedService.fullDesc}</Paragraph>
                <Button mode="contained" onPress={() => setInfoModalVisible(false)}>Понятно</Button>
              </>
            )}
          </View>
        </View>
      </Modal>

      <MySnackbar />

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
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#888' },
  badge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // ОБНОВЛЕННЫЕ СТИЛИ МОДАЛКИ
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: {
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 500, // Для планшетов
    alignSelf: 'center',
    elevation: 5
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  input: { borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10, marginBottom:15, fontSize:16, backgroundColor:'#fff' },
  contactItem: { flexDirection:'row', alignItems:'center', padding:10, marginBottom:10, backgroundColor:'#f0f0f0', borderRadius:10 },
  miniCard: { width: '30%', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  envelopeItem: { backgroundColor: '#fff', borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 10, elevation: 1 },
});