import React, { useState } from 'react';
import {
  FlatList, Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { FUEL_TYPES, useShifts, type ShiftRecord } from '@/context/ShiftContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(v: string): number {
  const p = parseFloat(v);
  return isNaN(p) ? 0 : p;
}

function fmt(v: number): string {
  return v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function displayDate(d: string): string {
  try {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

// ─── Shift Card ────────────────────────────────────────────────────────────────

function ShiftCard({
  record, expanded, onToggle, onDelete,
}: {
  record: ShiftRecord;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const isBalanced = Math.abs(record.variance) < 1;
  const isOver = record.variance > 1;
  const varianceColor = isBalanced ? colors.cyan : isOver ? colors.green : colors.primary;
  const varianceLabel = isBalanced ? 'Balanced' : isOver ? 'Over' : 'Short';

  const mpesaSales = Math.max(n(record.money.mpesaClose) - n(record.money.mpesaOpen), 0);

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header row */}
      <Pressable onPress={onToggle} style={s.cardHeader}>
        <View style={s.cardMeta}>
          <Text style={[s.cardDate, { color: colors.foreground }]}>
            {displayDate(record.date)}
          </Text>
          <Text style={[s.cardShift, { color: colors.mutedForeground }]}>
            {record.shiftName} shift
          </Text>
        </View>
        <View style={s.cardRight}>
          <Text style={[s.cardVariance, { color: varianceColor }]}>
            {record.variance >= 0 ? '+' : '−'}KES {fmt(Math.abs(record.variance))}
          </Text>
          <View style={[s.badge, { backgroundColor: varianceColor + '22' }]}>
            <Text style={[s.badgeText, { color: varianceColor }]}>{varianceLabel}</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16} color={colors.mutedForeground}
            style={{ marginLeft: 4 }}
          />
        </View>
      </Pressable>

      {/* Sales summary line */}
      <Text style={[s.salesLine, { color: colors.mutedForeground }]}>
        Fuel KES {fmt(record.totalFuelSales)}  ·  Collected KES {fmt(record.totalMoney)}
      </Text>

      {/* Expanded breakdown */}
      {expanded && (
        <View style={[s.breakdown, { borderTopColor: colors.border }]}>
          {/* Fuel breakdown */}
          {FUEL_TYPES.map(f => {
            const e = record.fuels[f.key];
            const litres = Math.max(
              n(e.A.closing) - n(e.A.opening), 0
            ) + Math.max(n(e.B.closing) - n(e.B.opening), 0);
            const val = litres * n(e.price);
            return (
              <View key={f.key} style={s.breakdownRow}>
                <View style={[s.fuelDot, { backgroundColor: f.color }]} />
                <Text style={[s.breakdownLabel, { color: colors.mutedForeground }]}>
                  {f.label}{n(e.price) > 0 ? `  @KES ${fmt(n(e.price))}/L` : ''}
                </Text>
                <Text style={[s.breakdownValue, { color: colors.foreground }]}>
                  KES {fmt(Math.max(val, 0))}
                </Text>
              </View>
            );
          })}

          {/* Divider */}
          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Money breakdown */}
          <View style={s.breakdownRow}>
            <Text style={[s.breakdownLabel, { color: colors.mutedForeground }]}>M-Pesa</Text>
            <Text style={[s.breakdownValue, { color: colors.foreground }]}>KES {fmt(mpesaSales)}</Text>
          </View>
          <View style={s.breakdownRow}>
            <Text style={[s.breakdownLabel, { color: colors.mutedForeground }]}>Cash drop</Text>
            <Text style={[s.breakdownValue, { color: colors.foreground }]}>KES {fmt(n(record.money.cashDrop))}</Text>
          </View>
          <View style={s.breakdownRow}>
            <Text style={[s.breakdownLabel, { color: colors.mutedForeground }]}>Card / PDQ</Text>
            <Text style={[s.breakdownValue, { color: colors.foreground }]}>KES {fmt(n(record.money.card))}</Text>
          </View>
          <View style={s.breakdownRow}>
            <Text style={[s.breakdownLabel, { color: colors.mutedForeground }]}>Invoices</Text>
            <Text style={[s.breakdownValue, { color: colors.foreground }]}>KES {fmt(n(record.money.invoices))}</Text>
          </View>

          {/* Delete */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onDelete();
            }}
            style={({ pressed }) => [s.deleteBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="trash-outline" size={14} color={colors.dimText} />
            <Text style={[s.deleteBtnText, { color: colors.dimText }]}>Delete shift</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14, paddingBottom: 4,
  },
  cardMeta: { flex: 1 },
  cardDate: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  cardShift: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardVariance: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
  },
  badgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  salesLine: {
    fontSize: 11, fontFamily: 'Inter_400Regular',
    paddingHorizontal: 14, paddingBottom: 12,
  },
  breakdown: {
    borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 6,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fuelDot: { width: 7, height: 7, borderRadius: 99 },
  breakdownLabel: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular' },
  breakdownValue: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  divider: { height: 1, marginVertical: 4 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 6, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' as const,
  },
  deleteBtnText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, deleteShift } = useShifts();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const topPad    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + 84 : 90;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: 14,
      }}>
        <Text style={{ color: colors.foreground, fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 }}>
          Past Shifts
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
          {history.length === 0 ? 'No shifts saved yet' : `${history.length} shift${history.length === 1 ? '' : 's'} recorded`}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: bottomPad,
          ...(history.length === 0 ? { flex: 1 } : {}),
        }}
        scrollEnabled={history.length > 0}
        keyboardDismissMode="on-drag"
        ListEmptyComponent={() => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Ionicons name="time-outline" size={52} color={colors.border} />
            <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
              Save your first shift to see{'\n'}your reconciliation history here.
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ShiftCard
            record={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(prev => prev === item.id ? null : item.id)}
            onDelete={() => deleteShift(item.id)}
          />
        )}
      />
    </View>
  );
}
