import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '@/theme';
import { Button, Field } from './ui';
import { parseUpi } from '@/api/pay';

type Parsed = { upi: string; name: string; amt: string };

export default function QRScanner({ onResult }: { onResult: (p: Parsed) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const [manualUpi, setManualUpi] = useState('');
  const [manualName, setManualName] = useState('');
  const [err, setErr] = useState('');

  const handle = (raw: string) => {
    if (scannedRef.current) return;
    const parsed = parseUpi(raw);
    if (!parsed) {
      setErr('That is not a valid UPI payment QR. Enter the UPI ID below.');
      return;
    }
    scannedRef.current = true;
    onResult(parsed);
  };

  const submitManual = () => {
    const parsed = parseUpi(
      `upi://pay?pa=${encodeURIComponent(manualUpi.trim())}&pn=${encodeURIComponent(
        manualName.trim()
      )}`
    );
    if (!parsed) {
      setErr('Enter a valid UPI ID like name@bank');
      return;
    }
    onResult(parsed);
  };

  return (
    <View>
      <Text style={styles.title}>Scan merchant QR</Text>
      <Text style={styles.hint}>Scan the merchant's UPI QR once to continue.</Text>

      <View style={styles.cameraBox} testID="qr-scanner">
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => handle(data)}
          />
        ) : (
          <View style={styles.permBox}>
            <Text style={styles.permText}>
              {permission ? 'Camera permission needed to scan the QR.' : 'Checking camera…'}
            </Text>
            <Button title="Allow camera" onPress={requestPermission} testID="allow-camera-btn" />
          </View>
        )}
        <View pointerEvents="none" style={styles.frame} />
      </View>

      {err ? (
        <Text style={styles.err} testID="scan-error">
          {err}
        </Text>
      ) : null}

      <Text style={styles.orText}>or enter UPI ID manually</Text>
      <Field
        placeholder="merchant name (optional)"
        value={manualName}
        onChangeText={setManualName}
        testID="manual-upi-name"
      />
      <Field
        placeholder="name@bank"
        autoCapitalize="none"
        value={manualUpi}
        onChangeText={setManualUpi}
        testID="manual-upi-input"
      />
      <Button title="Use this UPI" onPress={submitManual} testID="manual-upi-submit" />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  hint: { fontSize: 13, color: colors.slate, marginTop: 4, marginBottom: 14 },
  cameraBox: {
    aspectRatio: 1,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permBox: { padding: 20, alignItems: 'center' },
  permText: { color: '#fff', textAlign: 'center', marginBottom: 12 },
  frame: {
    position: 'absolute',
    width: '65%',
    aspectRatio: 1,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
  },
  err: { color: colors.danger, textAlign: 'center', marginTop: 12 },
  orText: { textAlign: 'center', color: colors.slate, fontSize: 12, marginVertical: 16 },
});
