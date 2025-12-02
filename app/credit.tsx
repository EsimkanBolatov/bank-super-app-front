import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput as RNTextInput, Platform, Alert } from 'react-native';
import { Text, useTheme, IconButton, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ИСПРАВЛЕНИЕ 1: Добавлен импорт 'api' для прямых запросов
import { bankApi, api } from '../src/api';

// Типы продуктов
type ProductType = 'cash' | 'installment' | 'bellyred' | 'mortgage' | 'auto' | 'deposit' | 'insurance';

// Конфигурация продуктов
const PRODUCTS = [
  { id: 'cash', title: 'Кредит наличными', subtitle: 'До 10 млн ₸', icon: 'cash-multiple', colors: ['#FF6B6B', '#C92A2A'], rate: '15%' },
  { id: 'installment', title: 'Рассрочка 0%', subtitle: 'На 24 месяца', icon: 'calendar-clock', colors: ['#4ECDC4', '#2D9CDB'], rate: '0%' },
  { id: 'bellyred', title: 'Belly Red', subtitle: 'Беспроцентный период', icon: 'credit-card-outline', colors: ['#E74C3C', '#8E44AD'], rate: '0%' },
  { id: 'mortgage', title: 'Ипотека', subtitle: 'От 3.5% годовых', icon: 'home-city', colors: ['#F39C12', '#D68910'], rate: '3.5%' },
  { id: 'auto', title: 'Автокредит', subtitle: 'От 7% годовых', icon: 'car-sports', colors: ['#3498DB', '#2980B9'], rate: '7%' },
  { id: 'deposit', title: 'Вклад', subtitle: 'До 16% годовых', icon: 'piggy-bank', colors: ['#27AE60', '#1E8449'], rate: '16%' },
  { id: 'insurance', title: 'Страхование', subtitle: 'Защита на все случаи', icon: 'shield-check', colors: ['#9B59B6', '#7D3C98'], rate: 'от 5000₸/мес' },
];

export default function CreditScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Состояния формы
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('12');
  const [income, setIncome] = useState('');

  // Состояния для специальных продуктов
  const [propertyValue, setPropertyValue] = useState(''); // Для ипотеки
  const [vehiclePrice, setVehiclePrice] = useState(''); // Для авто
  const [depositAmount, setDepositAmount] = useState(''); // Для вклада
  const [depositTerm, setDepositTerm] = useState('12'); // Срок вклада
  const [insuranceType, setInsuranceType] = useState('life'); // Тип страхования

  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);

  const handleOpenModal = (productId: ProductType) => {
    setSelectedProduct(productId);
    setModalVisible(true);
    setAmount('');
    setTerm('12');
    setMonthlyPayment(null);
  };

  const calculatePayment = () => {
    const product = PRODUCTS.find(p => p.id === selectedProduct);
    if (!product || !amount) return;

    const principal = parseFloat(amount);
    const months = parseInt(term);
    
    let ratePerMonth = 0;
    
    // Определяем ставку
    if (selectedProduct === 'cash') ratePerMonth = 0.15 / 12;
    else if (selectedProduct === 'mortgage') ratePerMonth = 0.035 / 12;
    else if (selectedProduct === 'auto') ratePerMonth = 0.07 / 12;
    else if (selectedProduct === 'deposit') {
      // Для вклада считаем доход
      const depositVal = parseFloat(depositAmount);
      const rate = 0.16;
      const monthlyIncome = (depositVal * rate) / 12;
      setMonthlyPayment(monthlyIncome);
      return;
    }

    if (ratePerMonth === 0) {
      // Для 0% рассрочки и Belly Red
      setMonthlyPayment(principal / months);
    } else {
      // Аннуитетная формула
      const payment = principal * (ratePerMonth * Math.pow(1 + ratePerMonth, months)) / (Math.pow(1 + ratePerMonth, months) - 1);
      setMonthlyPayment(payment);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct || !amount) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const requestData: any = {
        amount: parseFloat(amount),
        term_months: parseInt(term),
        income: parseFloat(income) || 100000,
      };

      // Добавляем специфичные поля
      if (selectedProduct === 'mortgage') {
        requestData.type = 'mortgage';
        requestData.property_value = parseFloat(propertyValue);
      } else if (selectedProduct === 'auto') {
        requestData.type = 'auto';
        requestData.vehicle_price = parseFloat(vehiclePrice);
      } else if (selectedProduct === 'bellyred') {
        requestData.type = 'red';
      } else if (selectedProduct === 'deposit') {
        requestData.type = 'deposit';
        requestData.amount = parseFloat(depositAmount);
        requestData.term_months = parseInt(depositTerm);
      } else if (selectedProduct === 'insurance') {
        requestData.type = 'insurance';
        requestData.insurance_type = insuranceType;
      } else {
        requestData.type = selectedProduct;
      }

      const endpoint = selectedProduct === 'deposit' ? '/deposits/create' : 
                      selectedProduct === 'insurance' ? '/insurance/apply' : 
                      '/loans/apply';

      // ИСПРАВЛЕНИЕ 1: Используем 'api.post' вместо 'bankApi.post'
      await api.post(endpoint, requestData);
      
      if (Platform.OS === 'web') {
        alert('Успешно! Ваша заявка принята в обработку.');
      } else {
        Alert.alert('Успешно ✅', 'Ваша заявка принята в обработку!');
      }
      
      setModalVisible(false);
      
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Ошибка оформления';
      Alert.alert('Ошибка', msg);
    } finally {
      setLoading(false);
    }
  };

  const renderProductForm = () => {
    const product = PRODUCTS.find(p => p.id === selectedProduct);
    if (!product) return null;

    return (
      <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
        <Text style={styles.modalSubtitle}>{product.subtitle}</Text>

        {/* Общие поля для кредитов */}
        {(['cash', 'installment', 'bellyred', 'mortgage', 'auto'] as ProductType[]).includes(selectedProduct!) && (
          <>
            <TextInput
              label="Сумма (₸)"
              mode="outlined"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
              left={<TextInput.Icon icon="currency-kzt" />}
            />

            <TextInput
              label="Срок (месяцев)"
              mode="outlined"
              keyboardType="numeric"
              value={term}
              onChangeText={setTerm}
              style={styles.input}
              left={<TextInput.Icon icon="calendar" />}
            />

            <TextInput
              label="Ваш доход (₸)"
              mode="outlined"
              keyboardType="numeric"
              value={income}
              onChangeText={setIncome}
              style={styles.input}
              left={<TextInput.Icon icon="cash" />}
            />
          </>
        )}

        {/* Поля для ипотеки */}
        {selectedProduct === 'mortgage' && (
          <TextInput
            label="Стоимость недвижимости (₸)"
            mode="outlined"
            keyboardType="numeric"
            value={propertyValue}
            onChangeText={setPropertyValue}
            style={styles.input}
            left={<TextInput.Icon icon="home" />}
          />
        )}

        {/* Поля для автокредита */}
        {selectedProduct === 'auto' && (
          <TextInput
            label="Стоимость автомобиля (₸)"
            mode="outlined"
            keyboardType="numeric"
            value={vehiclePrice}
            onChangeText={setVehiclePrice}
            style={styles.input}
            left={<TextInput.Icon icon="car" />}
          />
        )}

        {/* Поля для вклада */}
        {selectedProduct === 'deposit' && (
          <>
            <TextInput
              label="Сумма вклада (₸)"
              mode="outlined"
              keyboardType="numeric"
              value={depositAmount}
              onChangeText={setDepositAmount}
              style={styles.input}
              left={<TextInput.Icon icon="piggy-bank" />}
            />
            <TextInput
              label="Срок (месяцев)"
              mode="outlined"
              keyboardType="numeric"
              value={depositTerm}
              onChangeText={setDepositTerm}
              style={styles.input}
              left={<TextInput.Icon icon="calendar-clock" />}
            />
          </>
        )}

        {/* Поля для страхования */}
        {selectedProduct === 'insurance' && (
          <>
            <Text style={styles.label}>Выберите тип страхования</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
              {['life', 'health', 'property', 'auto', 'travel'].map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setInsuranceType(type)}
                  style={[styles.chip, insuranceType === type && {backgroundColor: product.colors[0], borderColor: product.colors[0]}]}
                >
                  <Text style={[styles.chipText, insuranceType === type && {color: 'white', fontWeight: 'bold'}]}>
                    {type === 'life' ? 'Жизнь' : type === 'health' ? 'Здоровье' : type === 'property' ? 'Имущество' : type === 'auto' ? 'Авто' : 'Путешествия'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Кнопка расчета */}
        {selectedProduct !== 'insurance' && (
          <Button mode="outlined" onPress={calculatePayment} style={{marginVertical: 10}}>
            Рассчитать
          </Button>
        )}

        {/* Результат расчета */}
        {monthlyPayment !== null && (
          <View style={[styles.resultBox, {backgroundColor: theme.colors.surfaceVariant}]}>
            <Text style={styles.resultLabel}>
              {selectedProduct === 'deposit' ? 'Ежемесячный доход' : 'Ежемесячный платёж'}
            </Text>
            <Text style={[styles.resultValue, {color: product.colors[0]}]}>
              {monthlyPayment.toLocaleString()} ₸
            </Text>
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          style={[styles.submitBtn, {backgroundColor: product.colors[0]}]}
          contentStyle={{height: 56}}
        >
          Оформить
        </Button>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background, paddingTop: insets.top}]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={28} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Кредиты и вклады</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 100}}>
        {/* Баннер */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.banner}
        >
          <MaterialCommunityIcons name="finance" size={50} color="white" />
          <Text style={styles.bannerTitle}>Финансовые решения</Text>
          <Text style={styles.bannerSubtitle}>для каждой жизненной ситуации</Text>
        </LinearGradient>

        {/* Карточки продуктов */}
        <View style={styles.productsGrid}>
          {PRODUCTS.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => handleOpenModal(product.id as ProductType)}
              activeOpacity={0.8}
            >
              <LinearGradient
                // ИСПРАВЛЕНИЕ 2: Приведение типа цветов для LinearGradient
                colors={product.colors as [string, string, ...string[]]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.productGradient}
              >
                <View style={styles.productIconBg}>
                  <MaterialCommunityIcons name={product.icon} size={32} color="white" />
                </View>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productSubtitle}>{product.subtitle}</Text>
                <View style={styles.productFooter}>
                  <Text style={styles.productRate}>{product.rate}</Text>
                  <MaterialCommunityIcons name="arrow-right-circle" size={24} color="rgba(255,255,255,0.9)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Преимущества */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Почему выбирают Belly Bank?</Text>
          {[
            { icon: 'clock-fast', text: 'Решение за 5 минут' },
            { icon: 'shield-check', text: 'Безопасность данных' },
            { icon: 'cash-refund', text: 'Без скрытых комиссий' },
            { icon: 'head-check', text: 'Индивидуальный подход' },
          ].map((benefit, idx) => (
            <View key={idx} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <MaterialCommunityIcons name={benefit.icon} size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Модальное окно */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, {backgroundColor: theme.colors.background}]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {PRODUCTS.find(p => p.id === selectedProduct)?.title}
            </Text>
            <IconButton icon="close" size={28} onPress={() => setModalVisible(false)} />
          </View>

          {renderProductForm()}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  
  banner: { marginHorizontal: 20, marginVertical: 20, borderRadius: 24, padding: 30, alignItems: 'center', elevation: 8 },
  bannerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 15 },
  bannerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 16, marginTop: 5 },
  
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  productCard: { width: '48%', margin: '1%', borderRadius: 20, overflow: 'hidden', elevation: 6 },
  productGradient: { padding: 20, height: 220, justifyContent: 'space-between' },
  productIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  productTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  productSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 5 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  productRate: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  benefitsSection: { backgroundColor: 'white', marginHorizontal: 20, marginVertical: 20, borderRadius: 24, padding: 25, elevation: 4 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  benefitIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  benefitText: { fontSize: 16, color: '#555', flex: 1 },
  
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  modalTitle: { fontSize: 24, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center' },
  modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  
  input: { marginBottom: 15, backgroundColor: 'white' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#666' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F5F5F5', marginRight: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  chipText: { fontSize: 14, color: '#666' },
  
  resultBox: { padding: 20, borderRadius: 16, marginVertical: 15, alignItems: 'center' },
  resultLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  resultValue: { fontSize: 32, fontWeight: 'bold' },
  
  submitBtn: { marginTop: 20, borderRadius: 16, marginBottom: 40 },
});