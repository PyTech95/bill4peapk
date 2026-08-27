import React, { useState } from 'react';
import { Text, View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import Screen from '@/components/Screen';
import { Button, Field } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { apiError } from '@/api/client';
import { colors } from '@/theme';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Login failed', apiError(e, 'Invalid credentials'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ marginTop: 40, marginBottom: 24 }}>
          <Text style={styles.brand}>BILL4PE</Text>
          <Text style={styles.title}>Welcome back.</Text>
          <Text style={styles.sub}>Sign in to your AI-powered billing workspace.</Text>
        </View>
        <Field
          label="Email"
          placeholder="you@work.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          testID="login-email"
        />
        <Field
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          testID="login-password"
        />
        <Button title="Sign in" onPress={submit} loading={busy} testID="login-submit" />

        <Link href="/(auth)/otp" style={styles.linkCenter}>
          Sign in with phone instead
        </Link>
        <View style={styles.row}>
          <Text style={styles.muted}>New here? </Text>
          <Link href="/(auth)/register" style={styles.link}>
            Create an account
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 14, fontWeight: '800', color: colors.navy, letterSpacing: 1 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 8 },
  sub: { fontSize: 14, color: colors.slate, marginTop: 6 },
  linkCenter: { textAlign: 'center', color: colors.navy, fontWeight: '600', marginTop: 20 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  muted: { color: colors.slate },
  link: { color: colors.navy, fontWeight: '700' },
});
