import React, { useState } from 'react';
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field } from '@/components/ui';
import { colors, money } from '@/theme';

const CATEGORIES = ['food', 'travel', 'hotel', 'grocery', 'pantry', 'other'];
type Item = { name: string; quantity: string; unit_price: string };

export default function NewExpense() {
  const router = useRouter();
  const [category, setCategory] = useState('food');
  const [items, setItems] = useState<Item[]>([{ name: '', quantity: '1', unit_price: '' }]);

  const setItem = (i: number, key: keyof Item, val: string) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  };
  const addItem = () => setItems((p) => [...p, { name: '', quantity: '1', unit_price: '' }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const total = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );

  const proceed = () => {
    const clean = items
      .filter((it) => it.name.trim() && Number(it.unit_price) > 0)
      .map((it) => ({
        name: it.name.trim(),
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price),
      }));
    if (clean.length === 0) {
      Alert.alert('Add an item', 'Enter at least one item with a name and price.');
      return;
    }
    const draft = { category, items: clean };
    router.push({ pathname: '/pay', params: { draft: JSON.stringify(draft) } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Category</Text>
        <View style={styles.catRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.cat, category === c && styles.catActive]}
              testID={`cat-${c}`}
            >
              <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 18 }]}>Items</Text>
        {items.map((it, i) => (
          <Card key={i} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.itemNo}>Item {i + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(i)}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
            <Field placeholder="Item name" value={it.name} onChangeText={(t) => setItem(i, 'name', t)} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field
                containerStyle={{ flex: 1 }}
                label="Qty"
                keyboardType="number-pad"
                value={it.quantity}
                onChangeText={(t) => setItem(i, 'quantity', t.replace(/\D/g, ''))}
              />
              <Field
                containerStyle={{ flex: 1 }}
                label="Unit price (₹)"
                keyboardType="decimal-pad"
                value={it.unit_price}
                onChangeText={(t) => setItem(i, 'unit_price', t.replace(/[^0-9.]/g, ''))}
              />
            </View>
          </Card>
        ))}
        <Button title="+ Add item" variant="outline" onPress={addItem} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmt}>{money(total)}</Text>
        </View>
        <Button title="Pay now" onPress={proceed} testID="proceed-pay" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  catActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  catText: { color: colors.text, textTransform: 'capitalize' },
  catTextActive: { color: '#fff', fontWeight: '700' },
  itemNo: { fontWeight: '700', color: colors.slate, marginBottom: 6 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 18,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.slate },
  totalAmt: { fontSize: 24, fontWeight: '800', color: colors.text },
});
