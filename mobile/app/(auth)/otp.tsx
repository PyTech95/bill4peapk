import React, { useState } from 'react';
import { Text, View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import Screen from '@/components/Screen';
import { Button, Field } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { otpRequest } from '@/api/auth';
import { apiError } from '@/api/client';
import { colors } from '@/theme';

export default function Otp() {
  const { otpVerify } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendOtp = async () => {
    if (phone.replace(/\D/g, '').length !== 10) {
      Alert.alert('Invalid phone', 'Enter a valid 10-digit number.');
      return;
    }
    setBusy(true);
    try {
      await otpRequest(phone, name);
      setSent(true);
      Alert.alert('OTP sent', 'Demo mode: use OTP 123456 for any number.');
    } catch (e) {
      Alert.alert('Could not send OTP', apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      await otpVerify(phone, otp, name);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Verification failed', apiError(e, 'Invalid OTP'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ marginTop: 40, marginBottom: 24 }}>
          <Text style={styles.title}>Phone sign in</Text>
          <Text style={styles.sub}>We'll text you a one-time code.</Text>
        </View>
        <Field
          label="Phone (10-digit)"
          placeholder="9876543210"
          keyboardType="number-pad"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
          testID="otp-phone"
        />
        {!sent ? (
          <Button title="Send OTP" onPress={sendOtp} loading={busy} testID="otp-send" />
        ) : (
          <>
            <Field label="Your name (optional)" placeholder="Name" value={name} onChangeText={setName} />
            <Field
              label="OTP"
              placeholder="123456"
              keyboardType="number-pad"
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              testID="otp-code"
            />
            <Button title="Verify & continue" onPress={verify} loading={busy} testID="otp-verify" />
          </>
        )}
        <Link href="/(auth)/login" style={styles.link}>
          Use email instead
        </Link>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.slate, marginTop: 6 },
  link: { color: colors.navy, fontWeight: '700', textAlign: 'center', marginTop: 18 },
});
