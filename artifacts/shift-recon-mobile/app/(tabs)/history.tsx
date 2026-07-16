import React, { useMemo, useState } from 'react';
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

function monthKey(date: string): string {
  // Returns 'YYYY-MM'
  return date.slice(0, 7);
}

function monthLabel(key: string): string {
  try {
    const [y, m] = key.split('-');
    const dt = new Date(Number(y), Number(m) - 1, 1);
    return dt.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
  } catch { return key; }
}

// ─── Monthly summary banner ───────────────────────────────────────────────────

interface MonthSummary {
  totalVariance: number;   // net (positive = over, negative = short)
  totalShorts: number;     // sum of short shifts (negative variances)
  totalOvers: number;      // sum of over shifts  (positive variances)
  shiftCount: number;
  totalFuelSales: number;
  totalMoney: number;
}

function MonthlySummaryCard({ summary }: { summary: MonthSummary }) {
  const colors = useColors();
  const { totalVariance, totalShorts, totalOvers, shiftCount, totalFuelSales, totalMoney } = summary;

  const hasShorts = totalShorts < 0;
  const hasOvers  = totalOvers  > 0;
  const netColor  = Math.abs(totalVariance) < 1
    ? colors.cyan
    : totalVariance > 0 ? colors.green : colors.primary;
  const netLabel  = Math.abs(totalVariance) < 1 ? 'Balanced' : totalVariance > 0 ? 'Net Over' : 'Net Short';

  return (
    <View style={[cs.summaryCard, { backgroundColor: '#0D0F15', borderColor: netColor + '44' }]}>
      {/* Top row: shifts count + net position */}
      <View style={cs.summaryTop}>
        <Text style={[cs.summaryShiftCount, { color: colors.mutedForeground }]}>
          {shiftCount} shift{shiftCount === 1 ? '' : 's'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[cs.summaryBadge, { backgroundColor: netColor + '22' }]}>
            <Text style={[cs.summaryBadgeText, { color: netColor }]}>{netLabel}</Text>
          </View>
          <Text style={[cs.summaryNetAmount, { color: netColor }]}>
            {totalVariance >= 0 ? '+' : '−'}KES {fmt(Math.abs(totalVariance))}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[cs.summaryDivider, { backgroundColor: colors.border }]} />

      {/* Details row */}
      <View style={cs.summaryDetails}>
        <View style={cs.summaryDetailCol}>
          <Text style={[cs.summaryDetailLabel, { color: colors.mutedForeground }]}>Fuel Sales</Text>
          <Text style={[cs.summaryDetailValue, { color: colors.foreground }]}>KES {fmt(totalFuelSales)}</Text>
        </View>
        <View style={[cs.summaryDetailCol, { alignItems: 'center' }]}>
          <Text style={[cs.summaryDetailLabel, { color: colors.mutedForeground }]}>Collected</Text>
          <Text style={[cs.summaryDetailValue, { color: colors.foreground }]}>KES {fmt(totalMoney)}</Text>
        </View>
        <View style={[cs.summaryDetailCol, { alignItems: 'flex-end' }]}>
          {hasShorts && (
            <>
              <Text style={[cs.summaryDetailLabel, { color: colors.mutedForeground }]}>Total Short</Text>
              <Text style={[cs.summaryDetailValue, { color: colors.primary }]}>
                −KES {fmt(Math.abs(totalShorts))}
              </Text>
            </>
          )}
          {hasOvers && !hasShorts && (
            <>
              <Text style={[cs.summaryDetailLabel, { color: colors.mutedForeground }]}>Total Over</Text>
              <Text style={[cs.summaryDetailValue, { color: colors.green }]}>
                +KES {fmt(totalOvers)}
              </Text>
            </>
          )}
          {hasShorts && hasOvers && (
            <>
              <Text style={[cs.summaryDetailLabel, { color: colors.mutedForeground }]}>
                {`Short: KES ${fmt(Math.abs(totalShorts))}`}
              </Text>
              <Text style={[cs.summaryDetailValue, { color: colors.green }]}>
                {`Over:  KES ${fmt(totalOvers)}`}
              </Text>
            </>
          )}
          {!hasShorts && !hasOvers && (
            <>
              <Text style={[cs.summaryDetailLabel, { color: colors.mutedForeground }]}>Variance</Text>
              <Text style={[cs.summaryDetailValue, { color: colors.cyan }]}>All balanced</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  summaryCard: {
    borderRadius: 12, borderWidth: 1.5,
    padding: 14, marginBottom: 10,
  },
  summaryTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  summaryShiftCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  summaryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  summaryBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  summaryNetAmount: { fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  summaryDivider: { height: 1, marginBottom: 10 },
  summaryDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryDetailCol: { flex: 1 },
  summaryDetailLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryDetailValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});

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
            const litres =
              Math.max(n(e.A.closing) - n(e.A.opening), 0) +
              Math.max(n(e.B.closing) - n(e.B.opening), 0);
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
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
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

// ─── Flat list item types ──────────────────────────────────────────────────────

type ListItem =
  | { type: 'month-header'; label: string }
  | { type: 'month-summary'; summary: MonthSummary }
  | { type: 'shift'; record: ShiftRecord };

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, deleteShift } = useShifts();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const topPad    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + 84 : 90;

  // Build flat list with month-header → month-summary → shifts
  const listItems = useMemo<ListItem[]>(() => {
    if (history.length === 0) return [];

    // Group by month, preserving order (history is newest-first assumed)
    const groups = new Map<string, ShiftRecord[]>();
    for (const record of history) {
      const mk = monthKey(record.date);
      if (!groups.has(mk)) groups.set(mk, []);
      groups.get(mk)!.push(record);
    }

    const items: ListItem[] = [];
    for (const [mk, shifts] of groups) {
      // Month header
      items.push({ type: 'month-header', label: monthLabel(mk) });

      // Compute summary
      let totalFuelSales = 0;
      let totalMoney = 0;
      let totalShorts = 0;  // sum of negative variances only
      let totalOvers  = 0;  // sum of positive variances only
      for (const sr of shifts) {
        totalFuelSales += sr.totalFuelSales;
        totalMoney     += sr.totalMoney;
        if (sr.variance < -1)  totalShorts += sr.variance;
        if (sr.variance >  1)  totalOvers  += sr.variance;
      }
      const totalVariance = totalMoney - totalFuelSales;

      items.push({
        type: 'month-summary',
        summary: { totalVariance, totalShorts, totalOvers, shiftCount: shifts.length, totalFuelSales, totalMoney },
      });

      // Shifts
      for (const sr of shifts) {
        items.push({ type: 'shift', record: sr });
      }
    }
    return items;
  }, [history]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text style={{ color: colors.foreground, fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 }}>
          Past Shifts
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
          {history.length === 0
            ? 'No shifts saved yet'
            : `${history.length} shift${history.length === 1 ? '' : 's'} recorded`}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={listItems}
        keyExtractor={(item, index) =>
          item.type === 'shift' ? item.record.id : `${item.type}-${index}`
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: bottomPad,
          ...(listItems.length === 0 ? { flex: 1 } : {}),
        }}
        keyboardDismissMode="on-drag"
        ListEmptyComponent={() => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Ionicons name="time-outline" size={52} color={colors.border} />
            <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' }}>
              Save your first shift to see{'\n'}your reconciliation history here.
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          if (item.type === 'month-header') {
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 10 }}>
                <Ionicons name="calendar-outline" size={13} color={colors.accent} />
                <Text style={{
                  color: colors.foreground, fontSize: 11,
                  fontFamily: 'Inter_700Bold', letterSpacing: 0.8, textTransform: 'uppercase',
                }}>
                  {item.label}
                </Text>
              </View>
            );
          }
          if (item.type === 'month-summary') {
            return <MonthlySummaryCard summary={item.summary} />;
          }
          return (
            <ShiftCard
              record={item.record}
              expanded={expandedId === item.record.id}
              onToggle={() => setExpandedId(prev => prev === item.record.id ? null : item.record.id)}
              onDelete={() => deleteShift(item.record.id)}
            />
          );
        }}
      />
    </View>
  );
}
