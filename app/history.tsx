import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, List, Avatar, IconButton, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Мы удалили API из этого файла, чтобы он не ждал сервер!

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // ДЕМО ДАННЫЕ (МНОГО!) - ЗАГРУЖАЮТСЯ МОМЕНТАЛЬНО
  const transactions = [
    { id: 1, title: 'Magnum Cash & Carry', category: 'Продукты', amount: -12400, date: 'Сегодня, 14:30', icon: 'cart', type: 'expense' },
    { id: 2, title: 'Пополнение ЗП', category: 'Перевод', amount: 350000, date: 'Сегодня, 09:00', icon: 'bank-transfer', type: 'income' },
    { id: 3, title: 'Starbucks Coffee', category: 'Еда', amount: -1800, date: 'Вчера, 09:00', icon: 'coffee', type: 'expense' },
    { id: 4, title: 'Yandex Go', category: 'Транспорт', amount: -1200, date: '22 Ноября', icon: 'taxi', type: 'expense' },
    { id: 5, title: 'ITU Tuition Payment', category: 'Образование', amount: -15000, date: '20 Ноября', icon: 'school', type: 'expense' },
    { id: 6, title: 'Продажа: Кроссовки', category: 'Доход', amount: 25000, date: '20 Ноября', icon: 'shoe-sneaker', type: 'income' },
    { id: 7, title: 'Netflix Subscription', category: 'Подписки', amount: -4500, date: '19 Ноября', icon: 'netflix', type: 'expense' },
    { id: 8, title: 'Оплата ЖКХ', category: 'Коммуналка', amount: -21000, date: '18 Ноября', icon: 'lightbulb-on-outline', type: 'expense' },
  ];
  
  // Логика загрузки убрана - данные уже в массиве
  const loading = false; // Всегда false, чтобы не крутилось колесико

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text style={styles.title}>История операций</Text>
        <IconButton icon="filter-variant" onPress={() => {}} />
      </View>
      
      <ScrollView contentContainerStyle={{paddingBottom: 20}}>
          <Text style={{marginLeft: 20, marginTop: 10, marginBottom: 10, color: '#888', fontWeight: 'bold'}}>Ноябрь 2025</Text>
          
          {transactions.map((t, i) => (
          <List.Item
              key={i}
              title={t.title}
              description={`${t.category} • ${t.date}`}
              left={props => (
                  <Avatar.Icon 
                      {...props} 
                      icon={t.icon || 'cash'} 
                      style={{backgroundColor: t.type === 'income' ? '#e8f5e9' : '#ffebee'}} 
                      color={t.type === 'income' ? '#4caf50' : '#ef5350'} 
                  />
              )}
              right={() => (
                  <Text style={{
                      alignSelf:'center', 
                      fontWeight:'bold', 
                      fontSize: 16,
                      color: t.type === 'income' ? '#4caf50' : theme.colors.onSurface 
                  }}>
                      {t.type === 'income' ? '+' : ''} {t.amount.toLocaleString()} ₸
                  </Text>
              )}
              style={{paddingHorizontal: 20, paddingVertical: 5}}
          />
          ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold' }
});