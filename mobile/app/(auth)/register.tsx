import React, { useState } from 'react';
import { Text, View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import Screen from '@/components/Screen';
import { Button, Field } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { apiError } from '@/api/client';
import { colors } from '@/theme';

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name || !email || password.length < 6) {
      Alert.alert('Check details', 'Name, a valid email and a 6+ char password are required.');
      return;
    }
    setBusy(true);
    try {
      await register({ name, email, password, user_type: 'individual' });
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Registration failed', apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ marginTop: 40, marginBottom: 24 }}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.sub}>Get ₹50 wallet welcome bonus on signup.</Text>
        </View>
        <Field label="Full name" placeholder="Your name" value={name} onChangeText={setName} testID="reg-name" />
        <Field
          label="Email"
          placeholder="you@work.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          testID="reg-email"
        />
        <Field
          label="Password"
          placeholder="6+ characters"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          testID="reg-password"
        />
        <Button title="Create account" onPress={submit} loading={busy} testID="reg-submit" />
        <View style={styles.row}>
          <Text style={styles.muted}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.slate, marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  muted: { color: colors.slate },
  link: { color: colors.navy, fontWeight: '700' },
});
