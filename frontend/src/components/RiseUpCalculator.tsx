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

  // Approx interest saved during construction. Without RiseUp the customer's
  // bank loan during construction is sized to ~90% of P; with RiseUp it's
  // ~90% × 80% = ~72% of P. The 18%-of-P delta accrues less interest at
  // ~9% p.a. over a typical 2-year construction window.
  const LOAN_RATE = 0.09;
  const CONSTRUCTION_YEARS = 2;
  const interestSaved = unitPrice * 0.18 * LOAN_RATE * CONSTRUCTION_YEARS;
  const savedPct = (interestSaved / unitPrice) * 100;

  const rows = [
    { label: "Total unit price",                     val: fmt(unitPrice),   note: "You still pay this in full, just spread out", color: "#555" },
    { label: "80% during construction",              val: fmt(riseupPrice), note: "Paid in milestones over ~24 months", color: "#2A3887", bold: true },
    { label: `Down payment at booking (${dpPercent}%)`, val: fmt(downPayment), note: `${dpPercent}% of ${fmt(riseupPrice)}`, color: "#2A3887" },
    { label: "Bank loan",                            val: fmt(bankLoan),    note: "Disbursed per construction milestones", color: "#555" },
    { label: "Final 20% (6 months after handover)", val: fmt(possession),  note: "The finishing demand means the flat is ready; the 20% follows 6 months later", color: "#f59e0b" },
    { label: "Est. interest saved",                  val: fmt(interestSaved), note: `~${savedPct.toFixed(1)}% of price · construction-period interest`, color: "#22c55e" },
  ];

  return (
    <div style={{ background: "linear-gradient(135deg,#1a1060 0%,#2A3887 100%)", borderRadius: 20, padding: 24, color: "white" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(41,169,223,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🚀</div>
        <div>
          <h3 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>RiseUp Plan</h3>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, margin: 0, lineHeight: 1.45 }}>
            {unitName ? `Pay just ${fmt(riseupPrice)} for ${unitName} during construction; ` : `Pay just ${fmt(riseupPrice)} during construction; `}
            the remaining {fmt(possession)} is due 6 months after handover.
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

      {/* Timing tip */}
      <div style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: "#fcd34d" }}>The final 20%</strong> — Of {fmt(unitPrice)}, only the {fmt(riseupPrice)} portion is paid milestone-by-milestone during the ~24-month construction. The remaining {fmt(possession)} is due 6 months after handover (i.e. 6 months after the finishing demand, when the flat is ready to move in). You can fund it through a salary top-up loan, personal loan, or savings.
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
