"use client";
import { useState } from "react";

function fmt(p: number) {
  if (!p) return "—";
  if (p >= 10_000_000) return `₹${(p / 10_000_000).toFixed(2)} Cr`;
  if (p >= 100_000) return `₹${(p / 100_000).toFixed(1)}L`;
  return `₹${p.toLocaleString()}`;
}

interface Props {
  unitPrice: number;
  unitName?: string;
}

export default function RiseUpCalculator({ unitPrice, unitName }: Props) {
  const [dpPercent, setDpPercent] = useState<10 | 20>(10);

  if (!unitPrice || unitPrice <= 0) return null;

  const riseupPrice   = unitPrice * 0.8;
  const possession    = unitPrice * 0.2;
  const downPayment   = riseupPrice * (dpPercent / 100);
  const bankLoan      = riseupPrice - downPayment;

  // Approx interest saved: possession amount never financed during construction
  // Assume 9% p.a. over 2 years construction
  const interestSaved = possession * 0.09 * 2;

  const rows = [
    { label: "Total unit price",             val: fmt(unitPrice),   note: "Actual price", color: "#555" },
    { label: "Pay now (80%)",                val: fmt(riseupPrice), note: "RiseUp amount", color: "#2A3887", bold: true },
    { label: `Down payment (${dpPercent}%)`, val: fmt(downPayment), note: `${dpPercent}% of ₹${fmt(riseupPrice)}`, color: "#2A3887" },
    { label: "Bank loan",                    val: fmt(bankLoan),    note: `${100 - dpPercent}% funded by bank`, color: "#555" },
    { label: "At possession (20%)",          val: fmt(possession),  note: "After handover ~2 yrs", color: "#f59e0b" },
    { label: "Approx interest saved",        val: fmt(interestSaved), note: "vs financing full amount", color: "#22c55e" },
  ];

  return (
    <div style={{ background: "linear-gradient(135deg,#1a1060 0%,#2A3887 100%)", borderRadius: 20, padding: 24, color: "white" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(41,169,223,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🚀</div>
        <div>
          <h3 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>RiseUp Offer</h3>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, margin: 0 }}>
            {unitName ? `Own ${unitName} for` : "Own this home for"} <strong style={{ color: "#29A9DF" }}>{fmt(riseupPrice)}</strong> instead of {fmt(unitPrice)}
          </p>
        </div>
      </div>

      {/* Down payment toggle */}
      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Loan profile</span>
        <div style={{ display: "flex", gap: 4 }}>
          {([10, 20] as const).map(p => (
            <button key={p} onClick={() => setDpPercent(p)}
              style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800,
                background: dpPercent === p ? "#29A9DF" : "rgba(255,255,255,0.12)",
                color: "white" }}>
              {p}% down
            </button>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {rows.map(r => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.06)", borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{r.note}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: r.bold ? 800 : 600 }}>{r.label}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: r.color === "#2A3887" ? "#29A9DF" : r.color === "#22c55e" ? "#4ade80" : r.color === "#f59e0b" ? "#fcd34d" : "rgba(255,255,255,0.7)" }}>
              {r.val}
            </div>
          </div>
        ))}
      </div>

      {/* Possession tip */}
      <div style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: "#fcd34d" }}>At possession</strong> — After 2 years of construction you may receive 2 salary increments. You can fund {fmt(possession)} via a salary top-up loan, personal loan, or savings.
        </p>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", gap: 10 }}>
        <a href="https://riseup.house" target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, display: "block", textAlign: "center", background: "#29A9DF", color: "white", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 900, textDecoration: "none" }}>
          Learn at riseup.house →
        </a>
        <button onClick={() => { const btn = document.querySelector('[data-enquire-trigger]') as HTMLButtonElement; if (btn) btn.click(); }}
          style={{ flex: 1, display: "block", textAlign: "center", background: "rgba(255,255,255,0.1)", color: "white", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 800, cursor: "pointer", border: "1px solid rgba(255,255,255,0.2)" }}>
          Enquire now
        </button>
      </div>
    </div>
  );
}
