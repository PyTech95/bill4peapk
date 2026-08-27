import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Button, Card } from '@/components/ui';
import api, { API_BASE, getToken } from '@/api/client';
import { colors, money } from '@/theme';

export default function BillView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exp, setExp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/expenses/${id}`);
        setExp(data);
      } catch {
        Alert.alert('Not found', 'Could not load this receipt.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const pdfUrl = async () => {
    const token = await getToken();
    return `${API_BASE}/bills/${id}/pdf?token=${token}`;
  };

  const openPdf = async () => {
    await WebBrowser.openBrowserAsync(await pdfUrl());
  };

  const sharePdf = async () => {
    setDownloading(true);
    try {
      const url = await pdfUrl();
      const target = `${FileSystem.cacheDirectory}bill-${id}.pdf`;
      const { uri } = await FileSystem.downloadAsync(url, target);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share receipt' });
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (e) {
      Alert.alert('Could not share', 'Try "Open PDF" instead.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} size="large" />
      </View>
    );

  const snap = exp?.bill_snapshot || {};
  const items = exp?.items || snap.items || [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card>
        <Text style={styles.title}>BILL4PE Digital Receipt</Text>
        <Row label="Bill ID" value={exp?.bill_id || '—'} />
        <Row label="Merchant" value={exp?.payment?.merchant_name || snap.merchant_name || '—'} />
        <Row label="Status" value="Payment Confirmed by User" />
        <View style={styles.divider} />
        {items.map((it: any, i: number) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {it.name} × {it.quantity}
            </Text>
            <Text style={styles.itemAmt}>{money((it.quantity || 1) * (it.unit_price || 0))}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <Row label="Total" value={money(exp?.total)} bold />
        {exp?.bill_fee ? <Row label="Bill4Pe fee" value={money(exp.bill_fee)} /> : null}
      </Card>

      <View style={{ marginTop: 20 }}>
        <Button title={downloading ? 'Preparing…' : 'Share PDF'} onPress={sharePdf} loading={downloading} testID="share-pdf-btn" />
        <Button title="Open PDF" variant="outline" onPress={openPdf} testID="open-pdf-btn" />
      </View>
      <Text style={styles.note}>
        {Platform.OS === 'ios' ? 'Opens in Safari / share sheet.' : 'Opens in your browser / share sheet.'}
      </Text>
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value?: string; bold?: boolean }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.val, bold && { fontSize: 18, fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  muted: { color: colors.slate },
  val: { color: colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  itemName: { color: colors.text, flex: 1 },
  itemAmt: { color: colors.text, fontWeight: '600' },
  note: { textAlign: 'center', color: colors.slate, fontSize: 12, marginTop: 14 },
});
