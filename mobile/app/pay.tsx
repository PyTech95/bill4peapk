import React, { useCallback, useEffect, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, Alert, Linking, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field } from '@/components/ui';
import QRScanner from '@/components/QRScanner';
import { useAuth } from '@/store/auth';
import { apiError } from '@/api/client';
import {
  ManualTxn,
  cancelTxn,
  confirmPay,
  extractUtr,
  firstScan,
  generateReceipt,
  getStatus,
  submitProof,
} from '@/api/pay';
import { colors, money } from '@/theme';

const TXN_KEY = 'bill4pe_manual_txn';
const RESUMABLE = ['merchant_payment_claimed', 'proof_submitted', 'fee_due', 'fee_pending'];

export default function Pay() {
  const router = useRouter();
  const { refresh } = useAuth();
  const params = useLocalSearchParams<{ draft?: string }>();
  const draft = params.draft ? JSON.parse(params.draft) : null;
  const draftAmount =
    draft?.items?.reduce(
      (s: number, i: any) => s + (Number(i.quantity) || 1) * (Number(i.unit_price) || 0),
      0
    ) || 0;

  const [txn, setTxn] = useState<ManualTxn | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [utr, setUtr] = useState('');
  const [shot, setShot] = useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    (async () => {
      const tid = await SecureStore.getItemAsync(TXN_KEY);
      if (tid) {
        try {
          const data = await getStatus(tid);
          if (data && !data.bill_id && RESUMABLE.includes(data.state)) {
            setTxn(data);
          } else {
            await SecureStore.deleteItemAsync(TXN_KEY);
          }
        } catch {
          await SecureStore.deleteItemAsync(TXN_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const doFirstScan = useCallback(
    async (parsed: { upi: string; name: string; amt: string }) => {
      setBusy(true);
      try {
        const data = await firstScan({
          payee_upi: parsed.upi,
          payee_name: parsed.name || null,
          merchant_amount: draft ? undefined : Number(parsed.amt) || undefined,
          expense_draft: draft || undefined,
        });
        await SecureStore.setItemAsync(TXN_KEY, data.transaction_id);
        setTxn(data);
      } catch (e) {
        Alert.alert('Could not start', apiError(e));
      } finally {
        setBusy(false);
      }
    },
    [draft]
  );

  const openUpiApp = async () => {
    if (!txn) return;
    const url = `upi://pay?pa=${encodeURIComponent(txn.payee_upi || '')}&pn=${encodeURIComponent(
      txn.payee_name || ''
    )}&am=${txn.merchant_amount}&cu=INR`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert('Open your UPI app', `Pay ${money(txn.merchant_amount)} to ${txn.payee_upi}`);
    } catch {
      Alert.alert('Open your UPI app', `Pay ${money(txn.merchant_amount)} to ${txn.payee_upi}`);
    }
  };

  const confirm = async (completed: boolean) => {
    if (!txn) return;
    if (!completed) {
      Alert.alert('No problem', 'Pay the merchant, then tap "Yes, payment done".');
      return;
    }
    setBusy(true);
    try {
      setTxn(await confirmPay(txn.transaction_id, true));
    } catch (e) {
      Alert.alert('Failed', apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const pickScreenshot = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to upload a screenshot.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setShot(asset);
    // Auto-read the 12-digit UTR from the screenshot (Gemini vision).
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'screenshot.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);
      const data = await extractUtr(fd);
      if (data.found && data.utr) {
        setUtr(data.utr);
        Alert.alert('UTR found', 'We auto-filled the 12-digit UTR from your screenshot.');
      } else {
        Alert.alert('Could not read UTR', 'Please type the 12-digit UTR manually.');
      }
    } catch (e) {
      Alert.alert('Could not read UTR', 'Please type the 12-digit UTR manually.');
    } finally {
      setExtracting(false);
    }
  };

  const doSubmitProof = async () => {
    if (!txn) return;
    if (utr && utr.length !== 12) {
      Alert.alert('Invalid UTR', 'UTR number must be exactly 12 digits.');
      return;
    }
    if (!utr && !shot) {
      Alert.alert('Add proof', 'Enter the 12-digit UTR or upload a payment screenshot.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      if (utr) fd.append('utr_full', utr);
      if (shot)
        fd.append('screenshot', {
          uri: shot.uri,
          name: shot.fileName || 'proof.jpg',
          type: shot.mimeType || 'image/jpeg',
        } as any);
      setTxn(await submitProof(txn.transaction_id, fd));
    } catch (e) {
      Alert.alert('Could not save proof', apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const doGenerate = async () => {
    if (!txn) return;
    setBusy(true);
    try {
      const data = await generateReceipt(txn.transaction_id);
      setTxn(data);
      await refresh();
      if (data.needs_fee) Alert.alert('Service fee due', 'Add money to your wallet to generate the receipt.');
    } catch (e) {
      Alert.alert('Could not generate', apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const finishDone = async () => {
    const eid = txn?.expense_id;
    await SecureStore.deleteItemAsync(TXN_KEY);
    if (eid) router.replace(`/bill/${eid}`);
    else router.replace('/(tabs)');
  };

  const startNew = async () => {
    if (txn) {
      try {
        await cancelTxn(txn.transaction_id);
      } catch {
        /* ignore */
      }
    }
    await SecureStore.deleteItemAsync(TXN_KEY);
    setTxn(null);
    setUtr('');
    setShot(null);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} size="large" />
      </View>
    );

  const st = txn?.state;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      {/* STEP 1 — single scan */}
      {!txn && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.muted}>Bill amount</Text>
            <Text style={styles.big}>{money(draftAmount)}</Text>
            {draft?.category ? <Text style={styles.muted}>{draft.category}</Text> : null}
          </Card>
          <QRScanner onResult={doFirstScan} />
          {busy && <ActivityIndicator style={{ marginTop: 12 }} color={colors.navy} />}
        </>
      )}

      {/* STEP 2 — ready to pay */}
      {st === 'awaiting_merchant_payment' && txn && (
        <View testID="ready-to-pay">
          <Card>
            <View style={styles.rowIcon}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Text style={styles.verified}>Merchant captured</Text>
            </View>
            <Text style={[styles.muted, { marginTop: 10 }]}>Merchant</Text>
            <Text style={styles.merchant}>{txn.payee_name || 'UPI Payee'}</Text>
            <Text style={styles.mono}>{txn.payee_upi}</Text>
            <Text style={[styles.muted, { marginTop: 10 }]}>Bill amount</Text>
            <Text style={styles.big}>{money(txn.merchant_amount)}</Text>
          </Card>
          <Card style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Pay the merchant in your UPI app</Text>
            <Text style={[styles.muted, { marginTop: 6 }]}>
              Pay exactly {money(txn.merchant_amount)} to {txn.payee_upi}, then return here.
            </Text>
            <Button title="Open UPI app" variant="outline" onPress={openUpiApp} testID="open-upi-btn" />
          </Card>
          <Card style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: '700', textAlign: 'center', color: colors.text }}>
              Did you complete the payment?
            </Text>
            <Button title="Yes, payment done" onPress={() => confirm(true)} loading={busy} testID="payment-done-btn" />
            <Button title="Not yet" variant="outline" onPress={() => confirm(false)} testID="not-yet-btn" />
          </Card>
          <TouchableOpacity onPress={startNew} style={{ marginTop: 14 }}>
            <Text style={styles.cancelLink}>Cancel / start new payment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 3 — proof */}
      {st === 'merchant_payment_claimed' && txn && (
        <View testID="proof-screen">
          <Text style={styles.h2}>Payment proof</Text>
          <Card style={{ marginVertical: 12 }}>
            <Text style={styles.muted}>Paid to</Text>
            <Text style={styles.merchant}>{txn.payee_name || txn.payee_upi}</Text>
            <Text style={styles.mono}>{txn.payee_upi}</Text>
            <Text style={[styles.muted, { marginTop: 8 }]}>Amount {money(txn.merchant_amount)}</Text>
          </Card>
          <Field
            label="UPI Transaction ID / UTR (12 digits)"
            placeholder="401234567890"
            keyboardType="number-pad"
            value={utr}
            onChangeText={(t) => setUtr(t.replace(/\D/g, '').slice(0, 12))}
            hint={`${utr.length}/12 digits`}
            testID="utr-input"
          />
          <Button
            title={extracting ? 'Reading UTR…' : shot ? 'Screenshot added — change' : 'Upload screenshot (auto-read UTR)'}
            variant="outline"
            onPress={pickScreenshot}
            loading={extracting}
            testID="upload-screenshot-btn"
          />
          <View style={{ height: 10 }} />
          <Button title="Submit proof" onPress={doSubmitProof} loading={busy} testID="submit-proof-btn" />
        </View>
      )}

      {/* STEP 4 — generate receipt */}
      {(st === 'proof_submitted' || st === 'fee_due' || st === 'fee_pending') && txn && (
        <View testID="generate-screen">
          <Card style={{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }}>
            <Text style={{ color: colors.success, fontWeight: '700' }}>Payment details saved</Text>
          </Card>
          <Card style={{ marginTop: 12 }}>
            <Row label="Merchant amount" value={money(txn.merchant_amount)} />
            <Row label={`Bill4Pe fee (${txn.platform_fee_percent || ''}%)`} value={money(txn.platform_fee)} />
          </Card>
          {txn.needs_fee ? (
            <Card style={{ marginTop: 12 }} >
              <Text style={{ color: colors.accent, fontWeight: '700' }}>Service fee due</Text>
              <Row label="Wallet balance" value={money(txn.wallet_balance)} />
              <Row label="Amount due" value={money(txn.fee)} />
              <Button title="Add money to wallet" onPress={() => router.push('/(tabs)/wallet')} testID="add-money-btn" />
            </Card>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Button title="Generate digital receipt" onPress={doGenerate} loading={busy} testID="generate-receipt-btn" />
            </View>
          )}
        </View>
      )}

      {/* STEP 5 — done */}
      {(st === 'completed' || txn?.bill_id) && txn && (
        <View style={{ alignItems: 'center', paddingTop: 30 }} testID="receipt-done">
          <Ionicons name="checkmark-circle" size={72} color={colors.success} />
          <Text style={styles.h2}>Receipt generated</Text>
          <Text style={styles.mono}>Bill ID {txn.bill_id}</Text>
          <View style={{ width: '100%', marginTop: 20 }}>
            <Button title="View receipt" onPress={finishDone} testID="view-receipt-btn" />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.slate, fontSize: 13 },
  big: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 2 },
  merchant: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 },
  mono: { fontVariant: ['tabular-nums'], color: colors.text, marginTop: 2 },
  rowIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verified: { color: colors.success, fontWeight: '700' },
  h2: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 8 },
  cancelLink: { textAlign: 'center', color: colors.danger, fontWeight: '600' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
});
