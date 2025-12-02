import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, RefreshControl, Alert, Modal, Platform } from 'react-native';
import { useTheme, Avatar, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter, useFocusEffect } from 'expo-router';
import { bankApi } from '../../src/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- СТОРИЗ (Stories) ---
// Исправление: добавили 'as const', чтобы TS понимал, что это массив цветов
const STORIES = [
    { id: 1, title: 'Кэшбэк 10%', color: ['#FF9800', '#F57C00'] as const, icon: 'gift-outline' },
    { id: 2, title: 'Belly Red', color: ['#F44336', '#D32F2F'] as const, icon: 'alpha-r-circle-outline' },
    { id: 3, title: 'Автокредит', color: ['#2196F3', '#1976D2'] as const, icon: 'car-sports' },
    { id: 4, title: 'Инвестиции', color: ['#4CAF50', '#388E3C'] as const, icon: 'chart-line' },
];

export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [cards, setCards] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  const [userProfile, setUserProfile] = useState({
    name: 'Пользователь',
    avatar: null as string | null
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const getTransactionIcon = (title: string, category?: string) => {
    const text = (title + " " + (category || "")).toLowerCase();
    if (text.includes('taxi') || text.includes('яндекс')) return 'taxi';
    if (text.includes('market') || text.includes('shop') || text.includes('magnum')) return 'cart';
    if (text.includes('coffee') || text.includes('starbucks')) return 'coffee';
    if (text.includes('transfer') || text.includes('перевод')) return 'bank-transfer';
    return 'credit-card-outline';
  };

  const fetchData = useCallback(async () => {
    try {
        const [cardsRes, historyRes, profileRes] = await Promise.allSettled([
            bankApi.getCards(),
            bankApi.getHistory(),
            bankApi.getMe()
        ]);

        if (cardsRes.status === 'fulfilled') {
            setCards(cardsRes.value.data);
            const total = cardsRes.value.data.reduce((acc: number, card: any) => acc + Number(card.balance), 0);
            setTotalBalance(total);
        }

        if (historyRes.status === 'fulfilled') {
            const enrichedHistory = historyRes.value.data.map((t: any) => ({
                ...t,
                icon: getTransactionIcon(t.title || t.category || "")
            }));
            setTransactions(enrichedHistory);
        }

        if (profileRes.status === 'fulfilled') {
            const p = profileRes.value.data;
            setUserProfile({
                name: p.full_name || 'Пользователь',
                avatar: p.avatar_url
            });
        }

    } catch (error) {
      console.error("Ошибка обновления:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleCreateCard = async () => {
    try {
      setLoading(true);
      await bankApi.createCard('KZT');
      Alert.alert("Успешно", "Новая карта создана! 🎉");
      onRefresh();
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось открыть карту");
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockCard = async () => {
    if (!selectedCard) return;
    setActionLoading(true);
    try {
      if (selectedCard.is_blocked) {
        await bankApi.unblockCard(selectedCard.id);
        Alert.alert("Успешно", "Карта разблокирована ✅");
      } else {
        await bankApi.blockCard(selectedCard.id);
        Alert.alert("Блокировка", "Карта временно заблокирована 🔒");
      }
      setCardModalVisible(false);
      onRefresh();
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось изменить статус карты");
    } finally {
      setActionLoading(false);
    }
  };

  // --- 3D КНОПКИ БЫСТРЫХ ДЕЙСТВИЙ ---
  // Исправление: добавили 'as const'
  const quickActions = [
    { icon: 'bank-transfer', label: 'Переводы', colors: ['#7B1FA2', '#4A148C'] as const, route: '/tabs/payments' },
    { icon: 'qrcode-scan', label: 'QR', colors: ['#00897B', '#004D40'] as const, route: '/qr' },
    { icon: 'history', label: 'История', colors: ['#FB8C00', '#EF6C00'] as const, route: '/history' },
    { icon: 'robot', label: 'AI Чат', colors: ['#D81B60', '#880E4F'] as const, route: '/chat' },
  ];

  if (loading && !refreshing) return <View style={styles.centerLoader}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: '#F5F7FA', paddingTop: insets.top }]}>

        {/* 1. HEADER */}
        <View style={styles.header}>
            <View>
                <Text style={styles.greetingText}>Добрый день,</Text>
                <Text style={styles.userNameText}>{userProfile.name.split(' ')[0]} 👋</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/settings')} style={styles.avatarContainer}>
                {userProfile.avatar ? (
                    <Avatar.Image size={48} source={{ uri: userProfile.avatar }} />
                ) : (
                    <Avatar.Text size={48} label={userProfile.name[0] || "U"} style={{backgroundColor: theme.colors.primary}} />
                )}
            </TouchableOpacity>
        </View>

        <ScrollView 
            contentContainerStyle={{ paddingBottom: 100 }} 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            showsVerticalScrollIndicator={false}
        >
            
            {/* 2. STORIES */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesContainer}>
                {STORIES.map((story) => (
                    <TouchableOpacity key={story.id} style={styles.storyItem}>
                        <LinearGradient colors={story.color} style={styles.storyCircle}>
                            <MaterialCommunityIcons name={story.icon} size={28} color="white" />
                        </LinearGradient>
                        <Text style={styles.storyText}>{story.title}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* 3. ОБЩИЙ БАЛАНС */}
            <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>Общий баланс</Text>
                <Text style={styles.balanceValue}>{totalBalance.toLocaleString()} ₸</Text>
            </View>

            {/* 4. КАРТЫ */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsScroll}>
            {cards.map((card) => (
                <TouchableOpacity key={card.id} activeOpacity={0.9} onPress={() => { setSelectedCard(card); setCardModalVisible(true); }}>
                    <LinearGradient 
                        // Исправление: as const для цветов карточки
                        colors={card.is_blocked ? ['#424242', '#212121'] as const : ['#303F9F', '#1A237E'] as const} 
                        start={{x:0, y:0}} end={{x:1, y:1}}
                        style={styles.card}
                    >
                        {/* Верх: Название и PayWave */}
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardBankName}>BELLY BANK</Text>
                            <MaterialCommunityIcons name="contactless-payment" size={28} color="rgba(255,255,255,0.8)" />
                        </View>
                        
                        {/* Середина: Номер карты (Крупно) */}
                        <View style={styles.cardNumberContainer}>
                            <Text style={styles.cardNumber}>
                                {card.card_number ? card.card_number.toString().replace(/(\d{4})/g, '$1  ').trim() : '**** **** **** ****'}
                            </Text>
                        </View>

                        {/* Низ: Баланс и Логотип Visa */}
                        <View style={styles.cardFooter}>
                            <View>
                                <Text style={styles.cardLabel}>БАЛАНС</Text>
                                <Text style={styles.cardBalance}>{Number(card.balance).toLocaleString()} ₸</Text>
                            </View>
                            <Text style={{color:'white', fontWeight:'bold', fontStyle:'italic', fontSize: 24}}>VISA</Text>
                        </View>

                        {card.is_blocked && (
                            <View style={styles.blockedOverlay}>
                                <MaterialCommunityIcons name="lock" size={40} color="#fff" />
                                <Text style={{color:'white', fontWeight:'bold', marginTop:5}}>Заблокирована</Text>
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.addCardBtn} onPress={handleCreateCard}>
                <MaterialCommunityIcons name="plus" size={30} color="#888" />
                <Text style={{ color: '#888', marginTop: 5, fontSize: 12 }}>Открыть</Text>
            </TouchableOpacity>
            </ScrollView>

            {/* 5. 3D КНОПКИ */}
            <View style={styles.actionsContainer}>
            {quickActions.map((action, index) => (
                <TouchableOpacity key={index} style={styles.actionBtn} onPress={() => router.push(action.route as any)}>
                    <LinearGradient 
                        colors={action.colors} 
                        style={styles.actionIcon}
                        start={{x:0, y:0}} end={{x:1, y:1}}
                    >
                        <MaterialCommunityIcons name={action.icon} size={28} color="white" />
                    </LinearGradient>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
            ))}
            </View>

            {/* 6. ТРАНЗАКЦИИ */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Последние операции</Text>
                    <TouchableOpacity onPress={() => router.push('/history')}><Text style={{color: theme.colors.primary, fontWeight:'600'}}>Все</Text></TouchableOpacity>
                </View>
                
                {transactions.length === 0 && <Text style={{color:'#999', paddingVertical:10}}>Нет операций</Text>}

                {transactions.slice(0, 5).map((t) => (
                    <TouchableOpacity key={t.id} style={styles.transactionRow}>
                        <View style={[styles.transactionIconBg, {backgroundColor: t.type === 'income' ? '#E8F5E9' : '#EDE7F6'}]}>
                            <MaterialCommunityIcons 
                                name={t.icon} 
                                size={24} 
                                color={t.type === 'income' ? '#4CAF50' : '#673AB7'} 
                            />
                        </View>
                        <View style={styles.transactionInfo}>
                            <Text style={styles.transactionTitle}>{t.title || t.category || "Перевод"}</Text>
                            <Text style={styles.transactionDate}>{t.created_at ? t.created_at.slice(0,10) : t.date}</Text>
                        </View>
                        <Text style={[styles.transactionAmount, { color: t.type === 'income' ? '#4CAF50' : '#333' }]}>
                            {t.type === 'income' ? '+' : ''} {Math.abs(t.amount).toLocaleString()} ₸
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>

        {/* МОДАЛКА УПРАВЛЕНИЯ КАРТОЙ */}
        <Modal visible={cardModalVisible} transparent={true} animationType="fade" onRequestClose={() => setCardModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Карта *{selectedCard?.card_number?.slice(-4)}</Text>
                    <Text style={{color:'#666', marginBottom:20, textAlign:'center'}}>
                        {selectedCard?.is_blocked ? "Карта заблокирована. Операции недоступны." : "Вы можете временно заблокировать карту, если потеряли её."}
                    </Text>

                    <Button
                        mode="contained"
                        icon={selectedCard?.is_blocked ? "lock-open" : "lock"}
                        buttonColor={selectedCard?.is_blocked ? "#4caf50" : "#f44336"}
                        onPress={toggleBlockCard}
                        loading={actionLoading}
                        style={{marginBottom: 10, width:'100%'}}
                        contentStyle={{height: 50}}
                    >
                        {selectedCard?.is_blocked ? "Разблокировать" : "Заблокировать"}
                    </Button>

                    <Button mode="outlined" onPress={() => setCardModalVisible(false)} style={{width:'100%'}}>Закрыть</Button>
                </View>
            </View>
        </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15, marginTop: 10 },
  greetingText: { color: '#888', fontSize: 14 },
  userNameText: { color: '#333', fontSize: 26, fontWeight: 'bold' },
  avatarContainer: { elevation: 5, shadowColor:'#000', shadowOpacity:0.1, shadowRadius:5, borderRadius: 24 },

  // Stories
  storiesContainer: { paddingLeft: 20, marginBottom: 25 },
  storyItem: { alignItems: 'center', marginRight: 15, width: 75 },
  storyCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 6, elevation: 4 },
  storyText: { fontSize: 11, textAlign: 'center', color: '#444' },

  // Balance
  balanceContainer: { paddingHorizontal: 20, marginBottom: 25 },
  balanceLabel: { color: '#666', fontSize: 15 },
  balanceValue: { fontSize: 36, fontWeight: 'bold', color: '#111', marginTop: 5 },

  // Cards
  cardsScroll: { paddingLeft: 20, paddingRight: 20, marginBottom: 30 },
  card: { 
      width: width * 0.85, 
      height: 220, 
      borderRadius: 24, 
      padding: 25, 
      marginRight: 15, 
      justifyContent: 'space-between', 
      elevation: 12, 
      shadowColor: "#1A237E", 
      shadowOffset: { width: 0, height: 8 }, 
      shadowOpacity: 0.4, 
      shadowRadius: 10 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBankName: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  
  cardNumberContainer: { justifyContent: 'center', flex: 1 },
  cardNumber: { color: '#fff', fontSize: 24, letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 },
  cardBalance: { color: '#fff', fontSize: 26, fontWeight: 'bold' }, 
  
  blockedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  addCardBtn: { width: 60, height: 220, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 20, backgroundColor: 'rgba(255,255,255,0.5)' },

  // Actions
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 35 },
  actionBtn: { alignItems: 'center', width: '22%' },
  actionIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 3 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#444' },

  // Transactions
  section: { paddingHorizontal: 20, backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 30, paddingBottom: 50, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  
  transactionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  transactionIconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  transactionInfo: { flex: 1 },
  transactionTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  transactionDate: { fontSize: 12, color: '#999', marginTop: 3 },
  transactionAmount: { fontSize: 16, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 24, padding: 25, width: '100%', maxWidth: 350, alignItems: 'center', elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 }
});