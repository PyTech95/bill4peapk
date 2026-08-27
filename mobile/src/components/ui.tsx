import React from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors } from '@/theme';

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  testID,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
  testID?: string;
}) {
  const isOutline = variant === 'outline';
  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.85}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.btn,
        isOutline ? styles.btnOutline : styles.btnPrimary,
        (disabled || loading) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.navy : '#fff'} />
      ) : (
        <Text style={[styles.btnText, isOutline && { color: colors.navy }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Field({
  label,
  hint,
  containerStyle,
  ...props
}: TextInputProps & { label?: string; hint?: string; containerStyle?: ViewStyle }) {
  return (
    <View style={[{ marginBottom: 14 }, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.slate}
        style={styles.input}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnPrimary: { backgroundColor: colors.navy },
  btnOutline: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  hint: { fontSize: 12, color: colors.slate, marginTop: 5 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
});
