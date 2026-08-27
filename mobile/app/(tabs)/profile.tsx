import React from 'react';
import { Text, View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { API_BASE } from '@/api/client';
import { colors, money } from '@/theme';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const doLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Profile</Text>

        <Card style={{ marginTop: 12, alignItems: 'center' }}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color="#fff" />
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phone ? <Text style={styles.email}>{user.phone}</Text> : null}
        </Card>

        <Card style={{ marginTop: 16 }}>
          <Row label="Wallet balance" value={money(user?.wallet_balance)} />
          <Row label="Account type" value={user?.user_type || 'individual'} />
          {user?.referral_code ? <Row label="Referral code" value={user.referral_code} /> : null}
          <Row label="API" value={API_BASE.replace('https://', '')} />
        </Card>

        <View style={{ marginTop: 20 }}>
          <Button title="Log out" variant="outline" onPress={doLogout} testID="logout-btn" />
        </View>
        <Text style={styles.footer}>BILL4PE · www.bill4pay.com</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  email: { color: colors.slate, marginTop: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.slate },
  rowValue: { color: colors.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  footer: { textAlign: 'center', color: colors.slate, fontSize: 12, marginTop: 24 },
});
