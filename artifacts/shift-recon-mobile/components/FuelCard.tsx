import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { FuelEntry, FuelKey } from '@/context/ShiftContext';
import { FUEL_TYPES } from '@/context/ShiftContext';

// ─── Math helpers ──────────────────────────────────────────────────────────────

function n(v: string): number {
  const p = parseFloat(v);
  return isNaN(p) ? 0 : p;
}

function fmt(v: number): string {
  return v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function litresFor(entry: FuelEntry, side: 'A' | 'B'): number {
  const l = n(entry[side].closing) - n(entry[side].opening);
  return l > 0 ? l : 0;
}

export function fuelSubtotal(entry: FuelEntry): number {
  return (litresFor(entry, 'A') + litresFor(entry, 'B')) * n(entry.price);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FuelCardProps {
  fuel: typeof FUEL_TYPES[number];
  entry: FuelEntry;
  onChange: (
    key: FuelKey,
    field: 'price' | 'A' | 'B',
    side?: 'opening' | 'closing',
    value?: string,
  ) => void;
}

export function FuelCard({ fuel, entry, onChange }: FuelCardProps) {
  const colors = useColors();

  const s = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 2,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    nameRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      flex: 1,
    },
    dot: {
      width: 9,
      height: 9,
      borderRadius: 99,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    fuelLabel: {
      color: colors.foreground,
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
    },
    fuelCode: {
      color: colors.dimText,
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
    },
    priceInput: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: colors.radius,
      paddingHorizontal: 10,
      paddingVertical: 7,
      color: colors.foreground,
      fontSize: 13,
      width: 110,
      textAlign: 'right' as const,
      fontFamily: 'Inter_500Medium',
    },
    nozzleSection: { marginBottom: 10 },
    nozzleHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 6,
    },
    nozzleLabel: {
      color: colors.mutedForeground,
      fontSize: 10,
      fontFamily: 'Inter_600SemiBold',
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    nozzleLitres: { fontSize: 12, fontFamily: 'Inter_700Bold' },
    inputRow: { flexDirection: 'row' as const, gap: 8 },
    inputGroup: { flex: 1 },
    inputLabel: {
      color: colors.dimText,
      fontSize: 10,
      fontFamily: 'Inter_500Medium',
      marginBottom: 4,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.input,
      borderRadius: colors.radius,
      paddingHorizontal: 10,
      paddingVertical: 10,
      color: colors.foreground,
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
    },
    subtotalRow: {
      flexDirection: 'row' as const,
      justifyContent: 'flex-end' as const,
      alignItems: 'center' as const,
      marginTop: 4,
      gap: 4,
    },
    subtotalLabel: {
      color: colors.mutedForeground,
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
    },
    subtotalValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  });

  return (
    <View style={s.card}>
      {/* Header: fuel name + price input */}
      <View style={s.header}>
        <View style={s.nameRow}>
          <View style={[s.dot, { backgroundColor: fuel.color }]} />
          <Text style={s.fuelLabel}>{fuel.label}</Text>
          <Text style={s.fuelCode}>({fuel.code})</Text>
        </View>
        <TextInput
          style={s.priceInput}
          value={entry.price}
          onChangeText={v => onChange(fuel.key, 'price', undefined, v)}
          placeholder="Price/L"
          placeholderTextColor={colors.dimText}
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
      </View>

      {/* Nozzle A & B */}
      {(['A', 'B'] as const).map(side => (
        <View key={side} style={s.nozzleSection}>
          <View style={s.nozzleHeader}>
            <Text style={s.nozzleLabel}>Nozzle {side}</Text>
            <Text style={[s.nozzleLitres, { color: fuel.color }]}>
              {litresFor(entry, side).toFixed(1)} L
            </Text>
          </View>
          <View style={s.inputRow}>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Opening</Text>
              <TextInput
                style={s.input}
                value={entry[side].opening}
                onChangeText={v => onChange(fuel.key, side, 'opening', v)}
                placeholder="0.0"
                placeholderTextColor={colors.dimText}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Closing</Text>
              <TextInput
                style={s.input}
                value={entry[side].closing}
                onChangeText={v => onChange(fuel.key, side, 'closing', v)}
                placeholder="0.0"
                placeholderTextColor={colors.dimText}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
          </View>
        </View>
      ))}

      {/* Subtotal */}
      <View style={s.subtotalRow}>
        <Text style={s.subtotalLabel}>Subtotal  </Text>
        <Text style={[s.subtotalValue, { color: fuel.color }]}>
          KES {fmt(fuelSubtotal(entry))}
        </Text>
      </View>
    </View>
  );
}
