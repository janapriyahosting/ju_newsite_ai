"use client";
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface AffordabilityData {
  monthly_income?: number | null;
  monthly_emi: number;
  eligible_loan: number;
  suggested_property_price: number;
  down_payment: number;
  tenure_years: number;
  interest_rate: number;
  total_interest: number;
  total_repayment: number;
  target_property_price?: number | null;
  target_monthly_emi?: number | null;
  target_loan?: number | null;
  target_down_payment?: number | null;
}

interface Props {
  data: AffordabilityData;
  variant?: "hero" | "compact";
}

const NAVY = "#2A3887";
const LIGHT_BLUE = "#29A9DF";
const GOLD = "#C4973A";

function fmtINR(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function AffordabilityCard({ data, variant = "compact" }: Props) {
  const isHero = variant === "hero";

  const pieData = [
    { name: "Loan Principal", value: data.eligible_loan },
    { name: "Total Interest", value: data.total_interest },
  ];
  const pieColors = isHero ? [GOLD, "rgba(245,240,232,0.22)"] : [NAVY, LIGHT_BLUE];

  const bg = isHero ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg,#FAFBFF,#F0F4FF)";
  const border = isHero ? "1px solid rgba(196,151,58,0.32)" : "1px solid #D8E3F2";
  const textPrimary = isHero ? "rgba(245,240,232,0.95)" : "#1A2452";
  const textMuted = isHero ? "rgba(245,240,232,0.55)" : "#6A7592";
  const accent = isHero ? GOLD : NAVY;
  const titleFamily = isHero ? "'Cormorant Garamond',serif" : "'Plus Jakarta Sans',sans-serif";

  return (
    <div style={{
      background: bg,
      border,
      borderRadius: 16,
      padding: isHero ? "22px 24px" : "16px 18px",
      backdropFilter: isHero ? "blur(20px)" : undefined,
      width: "100%",
      maxWidth: isHero ? 640 : "100%",
      animation: "fadeUp 0.4s cubic-bezier(0.2,0,0,1)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14,
      }}>
        <div style={{
          fontFamily: titleFamily,
          fontSize: isHero ? 22 : 15,
          fontWeight: isHero ? 500 : 700,
          color: textPrimary,
          letterSpacing: isHero ? "-0.01em" : "0.01em",
        }}>
          {isHero ? <>Your home, <em style={{ fontStyle: "italic", color: accent }}>within reach</em></> : "Your affordability"}
        </div>
        <span style={{
          fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
          color: textMuted, fontWeight: 600,
        }}>
          {data.tenure_years}y · {data.interest_rate}% p.a.
        </span>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isHero ? "1fr 140px" : "1fr 110px",
        gap: 14, alignItems: "center",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: isHero ? 10 : 7 }}>
          <Row label="Property you can afford" value={fmtINR(data.suggested_property_price)}
            accent={accent} textMuted={textMuted} textPrimary={textPrimary} prominent />
          <Row label="Monthly EMI" value={fmtINR(data.monthly_emi)}
            accent={accent} textMuted={textMuted} textPrimary={textPrimary} />
          <Row label="Down payment (20%)" value={fmtINR(data.down_payment)}
            accent={accent} textMuted={textMuted} textPrimary={textPrimary} />
          <Row label="Eligible loan" value={fmtINR(data.eligible_loan)}
            accent={accent} textMuted={textMuted} textPrimary={textPrimary} />
        </div>

        <div style={{ position: "relative", height: isHero ? 130 : 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={isHero ? 38 : 30}
                outerRadius={isHero ? 60 : 50} paddingAngle={2} strokeWidth={0}>
                {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
              </Pie>
              <Tooltip
                formatter={(v) => fmtINR(typeof v === "number" ? v : Number(v))}
                contentStyle={{
                  background: isHero ? "rgba(20,18,38,0.95)" : "#fff",
                  border: isHero ? "1px solid rgba(196,151,58,0.3)" : "1px solid #D8E3F2",
                  borderRadius: 8, fontSize: 11, padding: "6px 9px",
                  color: isHero ? "rgba(245,240,232,0.95)" : "#1A2452",
                }}
                itemStyle={{ color: isHero ? "rgba(245,240,232,0.95)" : "#1A2452" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", pointerEvents: "none",
          }}>
            <div style={{ fontSize: 9, color: textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Total payable
            </div>
            <div style={{ fontSize: isHero ? 13 : 12, fontWeight: 700, color: textPrimary, marginTop: 2 }}>
              {fmtINR(data.total_repayment)}
            </div>
          </div>
        </div>
      </div>

      {data.target_property_price && data.target_monthly_emi ? (
        <div style={{
          marginTop: 14, paddingTop: 12,
          borderTop: isHero ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E2E8F0",
          fontSize: 12, color: textMuted, lineHeight: 1.55,
        }}>
          For your target of <strong style={{ color: textPrimary }}>{fmtINR(data.target_property_price)}</strong>,
          monthly EMI would be <strong style={{ color: accent }}>{fmtINR(data.target_monthly_emi)}</strong> with
          a <strong style={{ color: textPrimary }}>{fmtINR(data.target_down_payment)}</strong> down payment.
        </div>
      ) : null}

      <div style={{
        marginTop: 10, fontSize: 10, color: textMuted, letterSpacing: "0.02em",
        fontStyle: "italic",
      }}>
        Indicative figures. Final eligibility and rates depend on your bank's underwriting.
      </div>
    </div>
  );
}

function Row({
  label, value, accent, textMuted, textPrimary, prominent,
}: {
  label: string; value: string;
  accent: string; textMuted: string; textPrimary: string;
  prominent?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
      <span style={{ fontSize: prominent ? 12 : 11, color: textMuted, letterSpacing: "0.02em" }}>
        {label}
      </span>
      <span style={{
        fontSize: prominent ? 19 : 14,
        fontWeight: prominent ? 700 : 600,
        color: prominent ? accent : textPrimary,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: prominent ? "-0.01em" : 0,
      }}>
        {value}
      </span>
    </div>
  );
}
