import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';

/**
 * Cross-platform screen wrapper.
 * - SafeAreaView handles notch / Dynamic Island (iOS) and status bar / gesture bar (Android).
 * - `scroll` wraps children in a ScrollView with keyboard-friendly behaviour.
 */
export default function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  style,
  bg = colors.bg,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  style?: ViewStyle;
  bg?: string;
}) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={edges}>
      <StatusBar style="dark" />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, style]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 16 },
});
