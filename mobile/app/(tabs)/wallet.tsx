import React, { useCallback, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button, Card, Field } from '@/components/ui';
import { useAuth } from '@/store/auth';
import api, { apiError } from '@/api/client';
import { colors, money } from '@/theme';

type Txn = { id: string; type: string; amount: number; reason?: string; created_at?: string };

export default function Wallet() {
  const { user, refresh } = useAuth();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      const { data } = await api.get('/wallet');
      setTxns(data?.transactions || []);
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

  const recharge = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0 || amt > 10000) {
      Alert.alert('Invalid amount', 'Enter an amount between ₹1 and ₹10,000.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/wallet/recharge', { amount: amt });
      setAmount('');
      await load();
      Alert.alert('Wallet updated', `Added ${money(amt)} to your wallet.`);
    } catch (e) {
      Alert.alert('Recharge failed', apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      >
        <Text style={styles.title}>Wallet</Text>
        <Card style={{ backgroundColor: colors.navy, marginTop: 12 }}>
          <Text style={styles.label}>Balance</Text>
          <Text style={styles.amt}>{money(user?.wallet_balance)}</Text>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <Text style={styles.section}>Add money</Text>
          <Field
            placeholder="Amount (₹)"
            keyboardType="number-pad"
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/\D/g, ''))}
            testID="recharge-amount"
          />
          <Button title="Add to wallet" onPress={recharge} loading={busy} testID="recharge-btn" />
        </Card>

        <Text style={styles.section}>Transactions</Text>
        {txns.length === 0 ? (
          <Text style={styles.empty}>No transactions yet.</Text>
        ) : (
          txns.map((t) => (
            <View key={t.id} style={styles.row}>
              <Text style={styles.reason}>{t.reason || t.type}</Text>
              <Text style={[styles.tAmt, { color: t.type === 'credit' ? colors.success : colors.danger }]}>
                {t.type === 'credit' ? '+' : '-'}
                {money(t.amount)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  label: { color: '#B9C6E4', fontSize: 12, fontWeight: '600' },
  amt: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 8 },
  empty: { color: colors.slate },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reason: { color: colors.text, flex: 1, marginRight: 10 },
  tAmt: { fontWeight: '800' },
});
