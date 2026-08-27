import React, { useCallback, useState } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui';
import { useAuth } from '@/store/auth';
import api from '@/api/client';
import { colors, money } from '@/theme';

type Expense = { id: string; total: number; category?: string; bill_id?: string; created_at?: string; payment?: any };

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      const { data } = await api.get('/expenses');
      const list = Array.isArray(data) ? data : data?.expenses || [];
      setExpenses(list.slice(0, 8));
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

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
        <Text style={styles.hi}>Hi, {user?.name?.split(' ')[0] || 'there'} 👋</Text>

        <Card style={{ backgroundColor: colors.navy, marginTop: 12 }}>
          <Text style={styles.walletLabel}>Wallet balance</Text>
          <Text style={styles.walletAmt}>{money(user?.wallet_balance)}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/wallet')}>
            <Ionicons name="add-circle" size={16} color={colors.navy} />
            <Text style={styles.addBtnText}>Add money</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.actions}>
          <Action icon="scan" label="Pay & Bill" onPress={() => router.push('/pay')} testID="action-pay" />
          <Action icon="add" label="New Expense" onPress={() => router.push('/new-expense')} testID="action-new-expense" />
        </View>

        <Text style={styles.section}>Recent expenses</Text>
        {expenses.length === 0 ? (
          <Text style={styles.empty}>No expenses yet. Tap "Pay & Bill" to create your first receipt.</Text>
        ) : (
          expenses.map((e) => (
            <TouchableOpacity
              key={e.id}
              onPress={() => e.bill_id && router.push(`/bill/${e.id}`)}
              style={styles.expRow}
            >
              <View>
                <Text style={styles.expTitle}>{e.payment?.merchant_name || e.category || 'Expense'}</Text>
                <Text style={styles.expSub}>{e.bill_id ? `Bill ${e.bill_id}` : 'Draft'}</Text>
              </View>
              <Text style={styles.expAmt}>{money(e.total)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({ icon, label, onPress, testID }: { icon: any; label: string; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} testID={testID} activeOpacity={0.85}>
      <Ionicons name={icon} size={26} color={colors.navy} />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hi: { fontSize: 22, fontWeight: '800', color: colors.text },
  walletLabel: { color: '#B9C6E4', fontSize: 12, fontWeight: '600' },
  walletAmt: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
  addBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 14,
  },
  addBtnText: { color: colors.navy, fontWeight: '700', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  action: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: { fontWeight: '700', color: colors.text },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 24, marginBottom: 8 },
  empty: { color: colors.slate, fontSize: 14 },
  expRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  expTitle: { fontWeight: '600', color: colors.text },
  expSub: { color: colors.slate, fontSize: 12, marginTop: 2 },
  expAmt: { fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
});
