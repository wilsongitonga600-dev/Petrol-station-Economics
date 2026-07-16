import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FuelKey = 'diesel' | 'vpower' | 'petrol';

export interface Nozzle {
  opening: string;
  closing: string;
}

export interface FuelEntry {
  price: string;
  A: Nozzle;
  B: Nozzle;
}

export type FuelsState = Record<FuelKey, FuelEntry>;

export interface MoneyState {
  mpesaOpen: string;
  mpesaClose: string;
  cashDrop: string;
  card: string;
  invoices: string;
}

export interface ShiftRecord {
  id: string;
  date: string;
  shiftName: string;
  fuels: FuelsState;
  money: MoneyState;
  totalFuelSales: number;
  totalMoney: number;
  variance: number;
}

// ─── Fuel type metadata ───────────────────────────────────────────────────────

export const FUEL_TYPES = [
  { key: 'diesel' as FuelKey, label: 'Diesel',        code: 'DX', color: '#FDCC00' },
  { key: 'vpower' as FuelKey, label: 'V-Power Diesel', code: 'VP', color: '#ED1C24' },
  { key: 'petrol' as FuelKey, label: 'Unleaded',       code: 'UX', color: '#F5F1E8' },
] as const;

// ─── Context ──────────────────────────────────────────────────────────────────

interface ShiftContextType {
  history: ShiftRecord[];
  lastPrices: Partial<Record<FuelKey, string>>;
  saveShift: (record: ShiftRecord) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
}

const HISTORY_KEY = 'shift-history';
const PRICES_KEY  = 'last-prices';

const ShiftContext = createContext<ShiftContextType | null>(null);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory]     = useState<ShiftRecord[]>([]);
  const [lastPrices, setLastPrices] = useState<Partial<Record<FuelKey, string>>>({});

  useEffect(() => {
    (async () => {
      try {
        const [rawHistory, rawPrices] = await Promise.all([
          AsyncStorage.getItem(HISTORY_KEY),
          AsyncStorage.getItem(PRICES_KEY),
        ]);
        if (rawHistory)  setHistory(JSON.parse(rawHistory));
        if (rawPrices)   setLastPrices(JSON.parse(rawPrices));
      } catch {}
    })();
  }, []);

  const saveShift = useCallback(async (record: ShiftRecord) => {
    const newPrices: Record<string, string> = {};
    (['diesel', 'vpower', 'petrol'] as FuelKey[]).forEach(k => {
      newPrices[k] = record.fuels[k].price;
    });

    setHistory(prev => {
      const next = [record, ...prev];
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setLastPrices(newPrices);
    await AsyncStorage.setItem(PRICES_KEY, JSON.stringify(newPrices));
  }, []);

  const deleteShift = useCallback(async (id: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== id);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <ShiftContext.Provider value={{ history, lastPrices, saveShift, deleteShift }}>
      {children}
    </ShiftContext.Provider>
  );
}

export function useShifts() {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShifts must be used within ShiftProvider');
  return ctx;
}
