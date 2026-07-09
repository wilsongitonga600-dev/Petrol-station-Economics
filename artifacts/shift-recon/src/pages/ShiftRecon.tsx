import { useState, useEffect, useRef, useCallback } from "react";

const SHELL_RED = "#ED1C24";
const SHELL_YELLOW = "#FDCC00";
const CYAN = "#4FB0C6";
const GREEN = "#4FBE71";

const FUEL_TYPES = [
  { key: "diesel", label: "Diesel", code: "DX", color: SHELL_YELLOW },
  { key: "vpower", label: "V-Power Diesel", code: "VP", color: SHELL_RED },
  { key: "petrol", label: "Unleaded", code: "UX", color: "#F5F1E8" },
] as const;

type FuelKey = "diesel" | "vpower" | "petrol";

interface Nozzle {
  opening: string;
  closing: string;
}

interface FuelEntry {
  price: string;
  A: Nozzle;
  B: Nozzle;
}

type FuelsState = Record<FuelKey, FuelEntry>;

interface MoneyState {
  mpesaOpen: string;
  mpesaClose: string;
  cashDrop: string;
  card: string;
  invoices: string;
}

interface ShiftRecord {
  id: string;
  date: string;
  shiftName: string;
  fuels: FuelsState;
  money: MoneyState;
  totalFuelSales: number;
  totalMoney: number;
  variance: number;
}

const n = (v: string | number | undefined | null): number => {
  if (v === "" || v === undefined || v === null) return 0;
  const parsed = parseFloat(String(v));
  return isNaN(parsed) ? 0 : parsed;
};

const fmt = (v: number): string =>
  v.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = (): string => new Date().toISOString().slice(0, 10);

const emptyNozzle = (): Nozzle => ({ opening: "", closing: "" });

const emptyFuelState = (): FuelsState => ({
  diesel: { price: "", A: emptyNozzle(), B: emptyNozzle() },
  vpower: { price: "", A: emptyNozzle(), B: emptyNozzle() },
  petrol: { price: "", A: emptyNozzle(), B: emptyNozzle() },
});

const emptyMoney = (): MoneyState => ({
  mpesaOpen: "", mpesaClose: "", cashDrop: "", card: "", invoices: "",
});

function loadHistory(): ShiftRecord[] {
  try {
    const raw = localStorage.getItem("shift-history");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(h: ShiftRecord[]) {
  try { localStorage.setItem("shift-history", JSON.stringify(h)); } catch { /* */ }
}

function loadLastPrices(): Partial<Record<FuelKey, string>> {
  try {
    const raw = localStorage.getItem("last-prices");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveLastPrices(fuels: FuelsState) {
  const prices: Record<string, string> = {};
  FUEL_TYPES.forEach(f => { prices[f.key] = fuels[f.key].price; });
  try { localStorage.setItem("last-prices", JSON.stringify(prices)); } catch { /* */ }
}

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (!audioCtx) {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx!.state === "suspended") audioCtx!.resume();
  return audioCtx;
}

function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, type: OscillatorType = "sine", peakGain = 0.16) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

function playShortSound() {
  const ctx = getAudioCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  playTone(ctx, 260, t, 0.16, "square", 0.11);
  playTone(ctx, 175, t + 0.19, 0.3, "square", 0.13);
}

function playOverSound() {
  const ctx = getAudioCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  playTone(ctx, 520, t, 0.12, "sine", 0.13);
  playTone(ctx, 660, t + 0.13, 0.16, "sine", 0.13);
}

function playBalancedSound() {
  const ctx = getAudioCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    playTone(ctx, freq, t + i * 0.11, 0.24, "triangle", 0.15)
  );
}

interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotate: number;
  color: string;
}

function Confetti({ active }: { active: boolean }) {
  const colors = [SHELL_RED, SHELL_YELLOW, CYAN, GREEN];
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < 26; i++) {
    pieces.push({
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      duration: 1.1 + Math.random() * 0.7,
      size: 6 + Math.random() * 5,
      rotate: Math.random() * 360,
      color: colors[i % colors.length],
    });
  }

  if (!active) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <div className="celebrate-banner">🎉 Balanced — nice work!</div>
    </div>
  );
}

interface FuelCardProps {
  fuel: typeof FUEL_TYPES[number];
  entry: FuelEntry;
  onChange: (key: FuelKey, field: "price" | "A" | "B", side?: "opening" | "closing", value?: string) => void;
}

function litresFor(entry: FuelEntry, side: "A" | "B"): number {
  const l = n(entry[side].closing) - n(entry[side].opening);
  return l > 0 ? l : 0;
}

function fuelSubtotal(entry: FuelEntry): number {
  return (litresFor(entry, "A") + litresFor(entry, "B")) * n(entry.price);
}

function FuelCard({ fuel, entry, onChange }: FuelCardProps) {
  return (
    <div style={{
      background: "#1B1F29", border: "1px solid #2A2F3C",
      borderRadius: 12, padding: 14, marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 9, height: 9, borderRadius: "99px",
            background: fuel.color, display: "inline-block",
            border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0,
          }} />
          <span style={{ color: "#F2F0EB", fontWeight: 600, fontSize: 14.5 }}>{fuel.label}</span>
          <span style={{ color: "#6B7280", fontSize: 12 }}>({fuel.code})</span>
        </div>
        <div style={{ width: 110 }}>
          <input
            type="number" inputMode="decimal"
            placeholder="Price/L"
            value={entry.price}
            onChange={e => onChange(fuel.key, "price", undefined, e.target.value)}
            style={{
              background: "#1C2028", border: "1px solid #333A48", color: "#F2F0EB",
              borderRadius: 8, padding: "6px 10px", fontSize: 13,
              width: "100%", textAlign: "right", outline: "none",
              fontFamily: "'SF Mono', Consolas, monospace", fontVariantNumeric: "tabular-nums",
            }}
          />
        </div>
      </div>

      {(["A", "B"] as const).map(side => (
        <div key={side} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ color: "#6B7280", fontSize: 12, fontWeight: 600 }}>Side {side}</span>
            <span style={{
              color: fuel.color, fontSize: 12, fontWeight: 700,
              fontFamily: "'SF Mono', Consolas, monospace",
            }}>
              {litresFor(entry, side).toFixed(1)} L
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ color: "#5B616C", fontSize: 10.5, fontWeight: 500, marginBottom: 3 }}>OPENING</div>
              <input
                type="number" inputMode="decimal" placeholder="0.0"
                value={entry[side].opening}
                onChange={e => onChange(fuel.key, side, "opening", e.target.value)}
                style={{
                  width: "100%", background: "#1C2028", border: "1px solid #333A48", color: "#F2F0EB",
                  borderRadius: 8, padding: "9px 10px", fontSize: 14, outline: "none",
                  fontFamily: "'SF Mono', Consolas, monospace", fontVariantNumeric: "tabular-nums",
                }}
              />
            </div>
            <div>
              <div style={{ color: "#5B616C", fontSize: 10.5, fontWeight: 500, marginBottom: 3 }}>CLOSING</div>
              <input
                type="number" inputMode="decimal" placeholder="0.0"
                value={entry[side].closing}
                onChange={e => onChange(fuel.key, side, "closing", e.target.value)}
                style={{
                  width: "100%", background: "#1C2028", border: "1px solid #333A48", color: "#F2F0EB",
                  borderRadius: 8, padding: "9px 10px", fontSize: 14, outline: "none",
                  fontFamily: "'SF Mono', Consolas, monospace", fontVariantNumeric: "tabular-nums",
                }}
              />
            </div>
          </div>
        </div>
      ))}

      <div style={{ textAlign: "right", marginTop: 4 }}>
        <span style={{ color: "#6B7280", fontSize: 12 }}>Subtotal </span>
        <span style={{
          color: fuel.color, fontWeight: 700, fontSize: 14.5,
          fontFamily: "'SF Mono', Consolas, monospace", fontVariantNumeric: "tabular-nums",
        }}>
          KES {fmt(fuelSubtotal(entry))}
        </span>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  background: "#1C2028", border: "1px solid #333A48", color: "#F2F0EB",
  borderRadius: 8, padding: "10px 12px", fontSize: 15, width: "100%", outline: "none",
  fontFamily: "'SF Mono', Consolas, monospace", fontVariantNumeric: "tabular-nums",
};

const labelStyle: React.CSSProperties = {
  color: "#8B92A0", fontSize: 11.5, display: "block",
  marginBottom: 5, fontWeight: 500,
};

const sectionTitle = (emoji: string, text: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
    <span style={{ color: SHELL_YELLOW }}>{emoji}</span>
    <span style={{ color: "#F2F0EB", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>
      {text}
    </span>
  </div>
);

function MoneyRow({
  icon, label, id, value, onChange,
}: {
  icon: string; label: string; id: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ color: "#6B7280", width: 18, flexShrink: 0, textAlign: "center" }}>{icon}</span>
      <span style={{ color: "#B0B5BE", fontSize: 12.5, width: 160, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>
        <input
          type="number" inputMode="decimal" placeholder="0.00"
          id={id} value={value}
          onChange={e => onChange(e.target.value)}
          style={fieldStyle}
        />
      </div>
    </div>
  );
}

function HistoryCard({
  record, expanded, onToggle, onDelete,
}: {
  record: ShiftRecord; expanded: boolean;
  onToggle: () => void; onDelete: () => void;
}) {
  const color = Math.abs(record.variance) < 1 ? CYAN : record.variance > 0 ? GREEN : SHELL_RED;
  const varianceState = Math.abs(record.variance) < 1 ? "Balanced" : record.variance > 0 ? "Over" : "Short";

  return (
    <div style={{ background: "#1B1F29", border: "1px solid #2A2F3C", borderRadius: 12, padding: 14, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={onToggle}
          style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", flex: 1, padding: 0 }}
        >
          <div style={{ color: "#F2F0EB", fontSize: 13.5, fontWeight: 600 }}>
            {record.date} · {record.shiftName}
          </div>
          <div style={{ fontSize: 12, color: "#8B92A0", fontFamily: "'SF Mono', Consolas, monospace" }}>
            Sales KES {fmt(record.totalFuelSales)}
          </div>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            color, fontWeight: 700, fontSize: 14,
            fontFamily: "'SF Mono', Consolas, monospace", fontVariantNumeric: "tabular-nums",
          }}>
            {record.variance >= 0 ? "+" : "−"}KES {fmt(Math.abs(record.variance))}
          </span>
          <span style={{
            background: `${color}22`, color, fontSize: 11, padding: "2px 7px",
            borderRadius: 99, fontWeight: 600,
          }}>
            {varianceState}
          </span>
          <button
            onClick={onDelete}
            style={{
              background: "none", border: "1px solid #333A48", color: "#6B7280",
              borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontSize: 12,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: "1px dashed #2A2F3C", paddingTop: 10 }}>
          {FUEL_TYPES.map(f => {
            const e = record.fuels[f.key];
            const val = (n(e.A.closing) - n(e.A.opening) + n(e.B.closing) - n(e.B.opening)) * n(e.price);
            return (
              <div key={f.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "#8B92A0" }}>{f.label} @ KES {n(e.price) > 0 ? fmt(n(e.price)) : "—"}/L</span>
                <span style={{ color: "#F2F0EB", fontFamily: "'SF Mono', Consolas, monospace" }}>KES {fmt(Math.max(val, 0))}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 8, borderTop: "1px dashed #2A2F3C", paddingTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: "#8B92A0" }}>M-Pesa sales</span>
              <span style={{ color: "#F2F0EB", fontFamily: "'SF Mono', Consolas, monospace" }}>
                KES {fmt(Math.max(n(record.money.mpesaClose) - n(record.money.mpesaOpen), 0))}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: "#8B92A0" }}>Cash drop</span>
              <span style={{ color: "#F2F0EB", fontFamily: "'SF Mono', Consolas, monospace" }}>KES {fmt(n(record.money.cashDrop))}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: "#8B92A0" }}>Card / PDQ</span>
              <span style={{ color: "#F2F0EB", fontFamily: "'SF Mono', Consolas, monospace" }}>KES {fmt(n(record.money.card))}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#8B92A0" }}>Invoices</span>
              <span style={{ color: "#F2F0EB", fontFamily: "'SF Mono', Consolas, monospace" }}>KES {fmt(n(record.money.invoices))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShiftRecon() {
  const [date, setDate] = useState(today());
  const [shiftName, setShiftName] = useState("Morning");
  const [fuels, setFuels] = useState<FuelsState>(emptyFuelState);
  const [money, setMoney] = useState<MoneyState>(emptyMoney);
  const [history, setHistory] = useState<ShiftRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const lastVarianceState = useRef<string>("");

  useEffect(() => {
    setHistory(loadHistory());
    const prices = loadLastPrices();
    if (Object.keys(prices).length > 0) {
      setFuels(prev => {
        const next = { ...prev };
        FUEL_TYPES.forEach(f => {
          if (prices[f.key]) next[f.key] = { ...next[f.key], price: prices[f.key]! };
        });
        return next;
      });
    }
  }, []);

  const mpesaSales = Math.max(n(money.mpesaClose) - n(money.mpesaOpen), 0);
  const totalFuelSales = FUEL_TYPES.reduce((sum, f) => sum + fuelSubtotal(fuels[f.key]), 0);
  const totalMoney = mpesaSales + n(money.cashDrop) + n(money.card) + n(money.invoices);
  const variance = totalMoney - totalFuelSales;
  const varianceState = Math.abs(variance) < 1 ? "balanced" : variance > 0 ? "over" : "short";
  const varianceColor = varianceState === "balanced" ? CYAN : varianceState === "over" ? GREEN : SHELL_RED;

  useEffect(() => {
    if (lastVarianceState.current && lastVarianceState.current !== varianceState) {
      if (varianceState === "balanced") { playBalancedSound(); setConfetti(true); setTimeout(() => setConfetti(false), 2100); }
      else if (varianceState === "over") playOverSound();
      else playShortSound();
    }
    lastVarianceState.current = varianceState;
  }, [varianceState]);

  const handleFuelChange = useCallback((key: FuelKey, field: "price" | "A" | "B", side?: "opening" | "closing", value?: string) => {
    setFuels(prev => {
      const next = { ...prev, [key]: { ...prev[key] } };
      if (field === "price") {
        next[key].price = value ?? "";
      } else if (side) {
        next[key][field as "A" | "B"] = { ...next[key][field as "A" | "B"], [side]: value ?? "" };
      }
      return next;
    });
  }, []);

  const handleSave = () => {
    const record: ShiftRecord = {
      id: Date.now().toString(),
      date, shiftName, fuels, money,
      totalFuelSales, totalMoney, variance,
    };
    const next = [record, ...history];
    setHistory(next);
    saveHistory(next);
    saveLastPrices(fuels);
    setFuels(emptyFuelState());
    setMoney(emptyMoney());
    setDate(today());

    // Restore prices
    const prices = loadLastPrices();
    if (Object.keys(prices).length > 0) {
      setFuels(prev => {
        const n2 = { ...prev };
        FUEL_TYPES.forEach(f => {
          if (prices[f.key]) n2[f.key] = { ...n2[f.key], price: prices[f.key]! };
        });
        return n2;
      });
    }

    if (varianceState === "balanced") {
      playBalancedSound();
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2100);
    } else if (varianceState === "over") {
      playOverSound();
    } else {
      playShortSound();
    }
  };

  const handleDelete = (id: string) => {
    const next = history.filter(h => h.id !== id);
    setHistory(next);
    saveHistory(next);
  };

  return (
    <div style={{ background: "#12151D", minHeight: "100dvh" }}>
      <Confetti active={confetti} />
      <div style={{
        width: "100%",
        padding: "env(safe-area-inset-top, 16px) env(safe-area-inset-right, 16px) env(safe-area-inset-bottom, 60px) env(safe-area-inset-left, 16px)",
        paddingTop: "max(env(safe-area-inset-top), 20px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 60px)",
        paddingLeft: "max(env(safe-area-inset-left), 16px)",
        paddingRight: "max(env(safe-area-inset-right), 16px)",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ background: SHELL_RED, borderRadius: 10, padding: 8, display: "flex" }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>⛽</span>
          </div>
          <div>
            <h1 style={{ color: "#F2F0EB", fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>
              Shift Reconciliation
            </h1>
            <p style={{ color: "#6B7280", fontSize: 12.5, margin: 0 }}>Diesel · V-Power · Unleaded</p>
          </div>
        </div>

        {/* Date / Shift */}
        <div style={{ display: "flex", gap: 10, margin: "18px 0 20px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Date</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...fieldStyle, fontFamily: "system-ui" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Shift</label>
            <select
              value={shiftName} onChange={e => setShiftName(e.target.value)}
              style={{ ...fieldStyle, fontFamily: "system-ui" }}
            >
              <option>Morning</option>
              <option>Afternoon</option>
              <option>Night</option>
            </select>
          </div>
        </div>

        {/* Pump Readings */}
        {sectionTitle("📟", "Pump Readings")}
        {FUEL_TYPES.map(f => (
          <FuelCard key={f.key} fuel={f} entry={fuels[f.key]} onChange={handleFuelChange} />
        ))}

        {/* Money Collected */}
        <div style={{ marginTop: 22 }}>
          {sectionTitle("💵", "Money Collected")}
          <div style={{ background: "#1B1F29", border: "1px solid #2A2F3C", borderRadius: 12, padding: 14 }}>
            <MoneyRow icon="📱" label="M-Pesa opening till" id="mpesaOpen"
              value={money.mpesaOpen} onChange={v => setMoney(m => ({ ...m, mpesaOpen: v }))} />
            <MoneyRow icon="📱" label="M-Pesa closing till" id="mpesaClose"
              value={money.mpesaClose} onChange={v => setMoney(m => ({ ...m, mpesaClose: v }))} />
            <div style={{ textAlign: "right", fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
              M-Pesa sales:{" "}
              <span style={{ color: "#F2F0EB", fontFamily: "'SF Mono', Consolas, monospace" }}>
                KES {fmt(mpesaSales)}
              </span>
            </div>
            <MoneyRow icon="💵" label="Cash drop" id="cashDrop"
              value={money.cashDrop} onChange={v => setMoney(m => ({ ...m, cashDrop: v }))} />
            <MoneyRow icon="💳" label="Card / PDQ receipts" id="card"
              value={money.card} onChange={v => setMoney(m => ({ ...m, card: v }))} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#6B7280", width: 18, flexShrink: 0, textAlign: "center" }}>📄</span>
              <span style={{ color: "#B0B5BE", fontSize: 12.5, width: 160, flexShrink: 0 }}>Invoices (credit sales)</span>
              <div style={{ flex: 1 }}>
                <input
                  type="number" inputMode="decimal" placeholder="0.00"
                  value={money.invoices}
                  onChange={e => setMoney(m => ({ ...m, invoices: e.target.value }))}
                  style={fieldStyle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{
          marginTop: 22, background: "#0D0F15",
          border: `1.5px solid ${varianceColor}66`,
          boxShadow: `0 2px 14px ${varianceColor}22`,
          borderRadius: 14, padding: "18px 16px",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#8B92A0", fontSize: 12.5 }}>Total fuel sales</span>
            <span style={{ color: "#F2F0EB", fontSize: 13.5, fontFamily: "'SF Mono', Consolas, monospace" }}>
              KES {fmt(totalFuelSales)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ color: "#8B92A0", fontSize: 12.5 }}>Total money collected</span>
            <span style={{ color: "#F2F0EB", fontSize: 13.5, fontFamily: "'SF Mono', Consolas, monospace" }}>
              KES {fmt(totalMoney)}
            </span>
          </div>
          <div style={{ borderTop: "1px dashed #2A2F3C", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ color: "#F2F0EB", fontSize: 13, fontWeight: 600 }}>
              {varianceState === "balanced" ? "Balanced" : varianceState === "over" ? "Over" : "Short"}
            </span>
            <span style={{
              color: varianceColor, fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px",
              fontFamily: "'SF Mono', Consolas, monospace", fontVariantNumeric: "tabular-nums",
              transition: "color 0.3s",
            }}>
              {variance >= 0 ? "+" : "−"}KES {fmt(Math.abs(variance))}
            </span>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          style={{
            width: "100%", marginTop: 16, background: SHELL_RED, color: "#FFFFFF",
            border: "none", borderRadius: 10, padding: "14px 0", fontSize: 15, fontWeight: 700,
            letterSpacing: "0.3px", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, cursor: "pointer", boxShadow: "0 4px 14px rgba(237,28,36,0.35)",
            fontFamily: "inherit",
          }}
        >
          💾 Save shift
        </button>

        {/* History */}
        <div style={{ marginTop: 26 }}>
          <button
            onClick={() => setHistoryOpen(o => !o)}
            style={{
              width: "100%", background: "transparent", border: "none",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 2px", cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#F2F0EB", fontWeight: 600, fontSize: 14 }}>
              🕘 Past shifts ({history.length})
            </span>
            <span style={{ color: "#8B92A0" }}>{historyOpen ? "▲" : "▼"}</span>
          </button>

          {historyOpen && (
            <div style={{ marginTop: 8 }}>
              {history.length === 0
                ? <p style={{ color: "#6B7280", fontSize: 13 }}>No shifts saved yet.</p>
                : history.map(h => (
                  <HistoryCard
                    key={h.id}
                    record={h}
                    expanded={expandedId === h.id}
                    onToggle={() => setExpandedId(expandedId === h.id ? null : h.id)}
                    onDelete={() => handleDelete(h.id)}
                  />
                ))
              }
            </div>
          )}
        </div>

        {/* WG Watermark */}
        <div style={{
          marginTop: 32, textAlign: "center",
          userSelect: "none", pointerEvents: "none",
        }}>
          <span style={{
            fontSize: 11, color: "#2A2F3C", fontWeight: 700,
            letterSpacing: "0.15em", textTransform: "uppercase",
          }}>
            © WG
          </span>
        </div>

      </div>
    </div>
  );
}
