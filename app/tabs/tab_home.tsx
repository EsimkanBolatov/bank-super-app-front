import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, RefreshControl, Alert, Modal, Platform } from 'react-native';
import { useTheme, Avatar, Button, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter, useFocusEffect } from 'expo-router';
import { bankApi } from '../../src/api';

const { width } = Dimensions.get('window');

export default function Home() {
  const theme = useTheme();
  const router = useRouter();

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
    if (text.includes('taxi') || text.includes('яндекс') || text.includes('uber')) return 'taxi';
    if (text.includes('bus') || text.includes('transport') || text.includes('proezd')) return 'bus';
    if (text.includes('itu') || text.includes('univer') || text.includes('tuition')) return 'school';
    if (text.includes('eco') || text.includes('tree')) return 'tree';
    if (text.includes('magnum') || text.includes('market') || text.includes('shop')) return 'cart';
    if (text.includes('starbucks') || text.includes('coffee')) return 'coffee';
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
      console.error(e);
      Alert.alert("Ошибка", "Не удалось изменить статус карты");
    } finally {
      setActionLoading(false);
    }
  };

 const quickActions = [
    { icon: 'bank-transfer', label: 'Переводы', color: '#6200ee', route: '/tabs/payments' },
    { icon: 'qrcode-scan', label: 'QR', color: '#03dac6', route: '/qr' },
    { icon: 'history', label: 'История', color: '#f4511e', route: '/history' },
    { icon: 'robot', label: 'AI Чат', color: '#e91e63', route: '/chat' }, // Заменил 'chat' на 'robot' для теста
  ];

  if (loading && !refreshing) return <ActivityIndicator style={{marginTop: 50}} size="large" color={theme.colors.primary} />;

  // --- КОНТЕНТ МОДАЛКИ (Один для всех платформ) ---
  const renderModalContent = () => (
    <View style={[styles.modalContent, {backgroundColor: theme.colors.background}]}>
        <Text style={{fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: theme.colors.onSurface}}>
            Карта *{selectedCard?.card_number?.slice(-4)}
        </Text>

        <Button
            mode="contained"
            icon={selectedCard?.is_blocked ? "lock-open" : "lock"}
            buttonColor={selectedCard?.is_blocked ? "#4caf50" : "#f44336"}
            onPress={toggleBlockCard}
            loading={actionLoading}
            style={{marginBottom: 10}}
            contentStyle={{height: 50}}
        >
            {selectedCard?.is_blocked ? "Разблокировать" : "Заблокировать карту"}
        </Button>

        <Button mode="outlined" onPress={() => setCardModalVisible(false)}>Закрыть</Button>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

        <View style={styles.header}>
            <View>
                <Text style={{ color: '#888', fontSize: 14 }}>Добрый день,</Text>
                <Text style={{ color: theme.colors.onBackground, fontSize: 24, fontWeight: 'bold' }}>
                    {userProfile.name} 👋
                </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/settings')}>
                {userProfile.avatar ? (
                    <Avatar.Image size={45} source={{ uri: userProfile.avatar }} />
                ) : (
                    <Avatar.Text size={45} label={userProfile.name[0] || "U"} />
                )}
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <View style={styles.totalBalance}>
            <Text style={{ color: '#888' }}>Общий баланс</Text>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: theme.colors.onBackground }}>{totalBalance.toLocaleString()} ₸</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsScroll}>
            {cards.map((card) => (
                <TouchableOpacity key={card.id} activeOpacity={0.9} onPress={() => { setSelectedCard(card); setCardModalVisible(true); }}>
                    <View style={[styles.card, { backgroundColor: card.is_blocked ? '#424242' : (card.type === 'Visa' ? '#1a1a1a' : '#283593') }]}>
                        <View style={styles.cardTop}>
                            <Text style={styles.cardName}>{card.is_blocked ? 'ЗАБЛОКИРОВАНА 🔒' : 'Belly Card'}</Text>
                            <MaterialCommunityIcons name="credit-card-chip" size={30} color="#fff" />
                        </View>
                        <View style={styles.cardMiddle}>
                            <Text style={styles.cardNumber}>
                                {card.card_number ? card.card_number.toString().replace(/(\d{4})/g, '$1 ').trim() : '****'}
                            </Text>
                        </View>
                        <View style={styles.cardBottom}>
                            <Text style={styles.cardBalanceLabel}>Баланс</Text>
                            <Text style={styles.cardBalance}>{Number(card.balance).toLocaleString()} {card.currency}</Text>
                        </View>
                        {card.is_blocked && <View style={styles.blockedOverlay}><MaterialCommunityIcons name="lock" size={50} color="rgba(255,255,255,0.5)" /></View>}
                    </View>
                </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.addCardBtn} onPress={handleCreateCard}>
                <MaterialCommunityIcons name="plus" size={30} color={theme.colors.onSurface} />
                <Text style={{ color: theme.colors.onSurface, marginTop: 5 }}>Открыть</Text>
            </TouchableOpacity>
            </ScrollView>

            <View style={styles.actionsContainer}>
            {quickActions.map((action, index) => (
                <TouchableOpacity key={index} style={styles.actionBtn} onPress={() => router.push(action.route as any)}>
                {/* Исправленный стиль: явно задаем размеры и центровку */}
                <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                    <MaterialCommunityIcons name={action.icon} size={32} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, { color: theme.colors.onBackground }]}>{action.label}</Text>
                </TouchableOpacity>
            ))}
            </View>

            <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Последние операции</Text>
            {transactions.length === 0 && (
                <Text style={{color: '#888', fontStyle: 'italic'}}>Операций пока нет</Text>
            )}
            {transactions.map((t) => (
                <View key={t.id} style={[styles.transaction, { backgroundColor: theme.colors.elevation.level1 }]}>
                    <Avatar.Icon 
                        size={40} 
                        icon={t.icon || 'credit-card-outline'} 
                        style={{ backgroundColor: theme.colors.elevation.level3 }} 
                        color={theme.colors.primary} 
                    />
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={[styles.tName, { color: theme.colors.onBackground }]}>
                            {t.title || t.category || "Транзакция"}
                        </Text>
                        <Text style={{ color: '#888', fontSize: 12 }}>
                            {t.created_at ? t.created_at.slice(0,10) : t.date}
                        </Text>
                    </View>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: t.amount > 0 ? '#4caf50' : theme.colors.onBackground }}>
                        {t.amount > 0 ? '+' : ''} {t.amount} ₸
                    </Text>
                </View>
            ))}
            </View>
        </ScrollView>

        {/* --- ГЛАВНОЕ ИСПРАВЛЕНИЕ: Разделение логики для Web и Native --- */}
        {Platform.OS === 'web' ? (
            // НА WEB: Обычное View (Оверлей) - никаких aria-hidden ошибок!
            cardModalVisible && (
                <View style={[styles.modalOverlay, StyleSheet.absoluteFill, { zIndex: 1000, position: 'fixed' as any }]}>
                    {renderModalContent()}
                </View>
            )
        ) : (
            // НА ТЕЛЕФОНЕ: Нативный Modal
            <Modal 
                visible={cardModalVisible} 
                transparent={true}
                animationType="fade"
                onRequestClose={() => setCardModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    {renderModalContent()}
                </View>
            </Modal>
        )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  totalBalance: { paddingHorizontal: 20, marginBottom: 20 },
  cardsScroll: { paddingLeft: 20, paddingRight: 20 },
  card: { width: width * 0.8, height: 180, borderRadius: 20, padding: 20, marginRight: 15, justifyContent: 'space-between', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8, overflow: 'hidden' },
  blockedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textTransform: 'uppercase' },
  cardMiddle: { alignItems: 'flex-start' },
  cardNumber: { color: '#fff', fontSize: 22, letterSpacing: 2, fontFamily: 'monospace' },
  cardBottom: {},
  cardBalanceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  cardBalance: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  addCardBtn: { width: 80, height: 180, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#888', justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 30, marginBottom: 20 },
  actionBtn: { alignItems: 'center', width: '22%' },
  actionIcon: { width: 65, height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  transaction: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 10 },
  tName: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20, top: 0, left: 0, right: 0, bottom: 0 },
  modalContent: { padding: 20, borderRadius: 20, width: '100%', maxWidth: 400, elevation: 5 }
});