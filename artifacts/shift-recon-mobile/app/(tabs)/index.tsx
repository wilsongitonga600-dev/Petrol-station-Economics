import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import {
  FUEL_TYPES,
  useShifts,
  type FuelKey,
  type FuelsState,
  type MoneyState,
  type ShiftRecord,
} from '@/context/ShiftContext';
import { FuelCard, fuelSubtotal } from '@/components/FuelCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(v: string): number {
  const p = parseFloat(v);
  return isNaN(p) ? 0 : p;
}

function fmt(v: number): string {
  return v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(d: string): string {
  try {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-KE', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return d;
  }
}

function addDays(dateStr: string, days: number): string {
  const dt = new Date(dateStr + 'T00:00:00');
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

const emptyNozzle = () => ({ opening: '', closing: '' });
const emptyFuelState = (): FuelsState => ({
  diesel: { price: '', A: emptyNozzle(), B: emptyNozzle() },
  vpower: { price: '', A: emptyNozzle(), B: emptyNozzle() },
  petrol: { price: '', A: emptyNozzle(), B: emptyNozzle() },
});
const emptyMoney = (): MoneyState => ({
  mpesaOpen: '', mpesaClose: '', cashDrop: '', card: '', invoices: '',
});

const SHIFTS = ['Morning', 'Afternoon', 'Night'] as const;
type ShiftName = typeof SHIFTS[number];

// ─── Money row sub-component ──────────────────────────────────────────────────

function MoneyRow({
  label, value, onChange, last = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[ms.row, last ? null : ms.rowBorder]}>
      <Text style={[ms.label, { color: '#B0B5BE' }]}>{label}</Text>
      <TextInput
        style={[ms.input, {
          backgroundColor: colors.inputBg,
          borderColor: colors.input,
          color: colors.foreground,
        }]}
        value={value}
        onChangeText={onChange}
        placeholder="0.00"
        placeholderTextColor={colors.dimText}
        keyboardType="decimal-pad"
        returnKeyType="next"
      />
    </View>
  );
}

const ms = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, marginBottom: 2 },
  rowBorder: { borderBottomWidth: 0 },
  label: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  input: {
    width: 130, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 9,
    fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'right',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NewShiftScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { saveShift, lastPrices } = useShifts();

  const [date, setDate]           = useState(todayStr());
  const [shiftName, setShiftName] = useState<ShiftName>('Morning');
  const [fuels, setFuels]         = useState<FuelsState>(emptyFuelState);
  const [money, setMoney]         = useState<MoneyState>(emptyMoney);

  // Pre-fill prices from last saved shift
  useEffect(() => {
    if (Object.keys(lastPrices).length > 0) {
      setFuels(prev => {
        const next = { ...prev };
        (Object.keys(lastPrices) as FuelKey[]).forEach(k => {
          if (lastPrices[k]) next[k] = { ...next[k], price: lastPrices[k]! };
        });
        return next;
      });
    }
  }, [lastPrices]);

  const handleFuelChange = useCallback((
    key: FuelKey,
    field: 'price' | 'A' | 'B',
    side?: 'opening' | 'closing',
    value?: string,
  ) => {
    setFuels(prev => {
      const next = { ...prev, [key]: { ...prev[key] } };
      if (field === 'price') {
        next[key].price = value ?? '';
      } else if (side && (field === 'A' || field === 'B')) {
        next[key][field] = { ...next[key][field], [side]: value ?? '' };
      }
      return next;
    });
  }, []);

  // ── Calculations ────────────────────────────────────────────────────────────
  const mpesaSales    = Math.max(n(money.mpesaClose) - n(money.mpesaOpen), 0);
  const totalFuelSales = FUEL_TYPES.reduce((sum, f) => sum + fuelSubtotal(fuels[f.key]), 0);
  const totalMoney    = mpesaSales + n(money.cashDrop) + n(money.card) + n(money.invoices);
  const variance      = totalMoney - totalFuelSales;
  const isBalanced    = Math.abs(variance) < 1;
  const isOver        = variance > 1;
  const varianceColor = isBalanced ? colors.cyan : isOver ? colors.green : colors.primary;
  const varianceLabel = isBalanced ? 'Balanced' : isOver ? 'Over' : 'Short';

  const handleSave = async () => {
    const record: ShiftRecord = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      date, shiftName, fuels, money, totalFuelSales, totalMoney, variance,
    };
    await saveShift(record);
    await Haptics.notificationAsync(
      isBalanced
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
    // Reset — keep prices for next shift
    setFuels(prev => ({
      diesel: { price: prev.diesel.price, A: emptyNozzle(), B: emptyNozzle() },
      vpower: { price: prev.vpower.price, A: emptyNozzle(), B: emptyNozzle() },
      petrol: { price: prev.petrol.price, A: emptyNozzle(), B: emptyNozzle() },
    }));
    setMoney(emptyMoney());
    setDate(todayStr());
  };

  const topPad    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + 84 : 90;
  const r         = colors.radius;

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad }}
      bottomOffset={60}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <View style={{
          width: 44, height: 44, borderRadius: 11,
          backgroundColor: colors.primary,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <MaterialCommunityIcons name="gas-station" size={22} color="#FFFFFF" />
        </View>
        <View>
          <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 }}>
            Shift Recon
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            Diesel · V-Power · Unleaded
          </Text>
        </View>
      </View>

      {/* ── Date navigator ──────────────────────────────────────────────────── */}
      <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.7, marginBottom: 6 }}>
        DATE
      </Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: r, marginBottom: 12, overflow: 'hidden',
      }}>
        <Pressable onPress={() => setDate(d => addDays(d, -1))} style={{ padding: 12 }}>
          <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
            {displayDate(date)}
          </Text>
        </View>
        <Pressable
          onPress={() => setDate(d => addDays(d, 1))}
          disabled={date >= todayStr()}
          style={{ padding: 12 }}
        >
          <Ionicons
            name="chevron-forward" size={16}
            color={date >= todayStr() ? colors.border : colors.mutedForeground}
          />
        </Pressable>
      </View>

      {/* ── Shift selector ──────────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>
        {SHIFTS.map(s => (
          <Pressable
            key={s}
            onPress={() => setShiftName(s)}
            style={{
              flex: 1, paddingVertical: 11, alignItems: 'center',
              backgroundColor: shiftName === s ? colors.primary + '22' : colors.card,
              borderRadius: r, borderWidth: 1,
              borderColor: shiftName === s ? colors.primary : colors.border,
            }}
          >
            <Text style={{
              fontSize: 13,
              fontFamily: shiftName === s ? 'Inter_600SemiBold' : 'Inter_400Regular',
              color: shiftName === s ? colors.primary : colors.mutedForeground,
            }}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Pump Readings ───────────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <MaterialCommunityIcons name="gauge" size={13} color={colors.accent} />
        <Text style={{ color: colors.foreground, fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 }}>
          PUMP READINGS
        </Text>
      </View>
      {FUEL_TYPES.map(f => (
        <FuelCard key={f.key} fuel={f} entry={fuels[f.key]} onChange={handleFuelChange} />
      ))}

      {/* ── Money Collected ─────────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 10 }}>
        <Ionicons name="card-outline" size={13} color={colors.accent} />
        <Text style={{ color: colors.foreground, fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 }}>
          MONEY COLLECTED
        </Text>
      </View>
      <View style={{
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: r + 2, padding: 14, marginBottom: 10,
      }}>
        <MoneyRow label="M-Pesa opening till" value={money.mpesaOpen}
          onChange={v => setMoney(m => ({ ...m, mpesaOpen: v }))} />
        <MoneyRow label="M-Pesa closing till" value={money.mpesaClose}
          onChange={v => setMoney(m => ({ ...m, mpesaClose: v }))} />
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            M-Pesa sales{'  '}
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: 'Inter_500Medium' }}>
            KES {fmt(mpesaSales)}
          </Text>
        </View>
        <MoneyRow label="Cash drop" value={money.cashDrop}
          onChange={v => setMoney(m => ({ ...m, cashDrop: v }))} />
        <MoneyRow label="Card / PDQ" value={money.card}
          onChange={v => setMoney(m => ({ ...m, card: v }))} />
        <MoneyRow label="Invoices (credit)" value={money.invoices}
          onChange={v => setMoney(m => ({ ...m, invoices: v }))} last />
      </View>

      {/* ── Summary ─────────────────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: '#0D0F15',
        borderWidth: 1.5, borderColor: varianceColor + '55',
        borderRadius: r + 4, padding: 18, marginBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
            Total fuel sales
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: 'Inter_500Medium' }}>
            KES {fmt(totalFuelSales)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
            Money collected
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: 'Inter_500Medium' }}>
            KES {fmt(totalMoney)}
          </Text>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{
            backgroundColor: varianceColor + '22', paddingHorizontal: 10, paddingVertical: 4,
            borderRadius: 99,
          }}>
            <Text style={{ color: varianceColor, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
              {varianceLabel}
            </Text>
          </View>
          <Text style={{
            color: varianceColor, fontSize: 30,
            fontFamily: 'Inter_700Bold', letterSpacing: -0.5,
          }}>
            {variance >= 0 ? '+' : '−'}KES {fmt(Math.abs(variance))}
          </Text>
        </View>
      </View>

      {/* ── Save ────────────────────────────────────────────────────────────── */}
      <Pressable
        onPress={handleSave}
        style={({ pressed }) => ({
          flexDirection: 'row' as const, alignItems: 'center' as const,
          justifyContent: 'center' as const, gap: 8,
          backgroundColor: colors.primary, borderRadius: r + 2,
          paddingVertical: 15, marginBottom: 28,
          opacity: pressed ? 0.85 : 1,
          shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
        })}
      >
        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 0.2 }}>
          Save Shift
        </Text>
      </Pressable>

      {/* Watermark */}
      <Text style={{
        textAlign: 'center', color: '#2A2F3C', fontSize: 10,
        fontFamily: 'Inter_700Bold', letterSpacing: 3,
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        © WG
      </Text>
    </KeyboardAwareScrollViewCompat>
  );
}
