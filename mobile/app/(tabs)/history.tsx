import React, { useCallback, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import api from '@/api/client';
import { colors, money } from '@/theme';

type Expense = { id: string; total: number; category?: string; bill_id?: string; payment?: any; created_at?: string };

export default function History() {
  const router = useRouter();
  const [items, setItems] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await api.get('/expenses');
      const list = Array.isArray(data) ? data : data?.expenses || [];
      setItems(list);
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      >
        <Text style={styles.title}>Bills & History</Text>
        {items.length === 0 ? (
          <Text style={styles.empty}>No bills yet.</Text>
        ) : (
          items.map((e) => (
            <TouchableOpacity
              key={e.id}
              style={styles.row}
              onPress={() => router.push(`/bill/${e.id}`)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{e.payment?.merchant_name || e.category || 'Expense'}</Text>
                <Text style={styles.sub}>{e.bill_id ? `Bill ${e.bill_id}` : 'Draft'}</Text>
              </View>
              <Text style={styles.amt}>{money(e.total)}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.slate} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
  empty: { color: colors.slate, marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { fontWeight: '600', color: colors.text },
  sub: { color: colors.slate, fontSize: 12, marginTop: 2 },
  amt: { fontWeight: '800', color: colors.text },
});
