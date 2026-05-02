'use client';
import { useState, useMemo } from 'react';

interface Props {
  unitPrice: number;
  unitName?: string;
}

function formatCurrency(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function HomeLoanEMICalculator({ unitPrice, unitName }: Props) {
  // Two modes:
  //  • Standard — bank loan covers up to ~90% of the full price.
  //  • RiseUp   — during construction the loan only needs to cover ~90% of
  //               the 80% portion (i.e. ~72% of P). The remaining 20% is
  //               settled 6 months after handover via top-up loan / savings.
  const [plan, setPlan] = useState<"standard" | "riseup">("standard");

  const standardDefault = Math.round(unitPrice * 0.9);
  const riseupDefault   = Math.round(unitPrice * 0.8 * 0.9); // 72% of P
  const sliderMax       = plan === "riseup" ? Math.round(unitPrice * 0.8) : unitPrice;
  const defaultLoan     = plan === "riseup" ? riseupDefault : standardDefault;

  const [loanAmount, setLoanAmount] = useState(defaultLoan);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  // When the visitor flips between Standard and RiseUp, snap the loan amount
  // to the new plan's typical default so the EMI immediately reflects the
  // smaller principal — they can still drag the slider afterwards.
  function switchPlan(next: "standard" | "riseup") {
    setPlan(next);
    setLoanAmount(next === "riseup" ? riseupDefault : standardDefault);
  }

  const emi = useMemo(() => {
    const r = rate / 12 / 100;
    const n = tenure * 12;
    if (r === 0) return loanAmount / n;
    return (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [loanAmount, rate, tenure]);

  // Comparison EMI for the *other* plan, computed at the same rate/tenure
  // so the visitor can see the per-month difference at a glance.
  const altLoan = plan === "riseup" ? standardDefault : riseupDefault;
  const altEmi = useMemo(() => {
    const r = rate / 12 / 100;
    const n = tenure * 12;
    if (r === 0) return altLoan / n;
    return (altLoan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [altLoan, rate, tenure]);
  const monthlyDelta = plan === "riseup" ? Math.max(0, altEmi - emi) : Math.max(0, emi - altEmi);

  const totalPayment = emi * tenure * 12;
  const totalInterest = totalPayment - loanAmount;

  const principalPct = (loanAmount / totalPayment) * 100;
  const interestPct = (totalInterest / totalPayment) * 100;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E2F1FC' }}>
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg,#262262,#2A3887)' }}>
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          🏦 Home Loan EMI Calculator
        </h3>
        {unitName && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>For {unitName}</p>}
      </div>

      <div className="p-5 space-y-5" style={{ background: '#F8F9FB' }}>
        {/* Plan toggle */}
        <div className="rounded-xl p-1 flex gap-1" style={{ background: '#E2F1FC' }}>
          {([
            { key: 'standard', label: 'Standard', sub: 'Loan up to 90% of price' },
            { key: 'riseup',   label: '🚀 RiseUp', sub: 'Loan only on the 80% portion' },
          ] as const).map(opt => (
            <button key={opt.key} onClick={() => switchPlan(opt.key)}
              className="flex-1 rounded-lg px-3 py-2 text-left transition-all"
              style={{
                background: plan === opt.key ? 'white' : 'transparent',
                boxShadow: plan === opt.key ? '0 2px 8px rgba(42,56,135,0.12)' : 'none',
              }}>
              <div className="text-xs font-black" style={{ color: plan === opt.key ? '#2A3887' : '#64748b' }}>{opt.label}</div>
              <div className="text-[10px]" style={{ color: '#94a3b8' }}>{opt.sub}</div>
            </button>
          ))}
        </div>

        {plan === 'riseup' && (
          <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: '#FFF8E1', border: '1px solid #FCD34D33', color: '#92400E' }}>
            With RiseUp, the bank only needs to fund up to {formatCurrency(Math.round(unitPrice * 0.8))} (the 80% paid during construction). The remaining {formatCurrency(Math.round(unitPrice * 0.2))} is due 6 months after handover and can be funded via a top-up loan or savings.
          </div>
        )}

        {/* Loan Amount */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold" style={{ color: '#64748b' }}>Loan Amount</label>
            <span className="text-sm font-black" style={{ color: '#2A3887' }}>{formatCurrency(loanAmount)}</span>
          </div>
          <input type="range" min={100000} max={sliderMax} step={50000}
            value={Math.min(loanAmount, sliderMax)} onChange={e => setLoanAmount(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#2A3887', background: '#e2e8f0' }} />
          <div className="flex justify-between text-xs mt-1" style={{ color: '#94a3b8' }}>
            <span>₹1L</span><span>{formatCurrency(sliderMax)}</span>
          </div>
        </div>

        {/* Interest Rate */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold" style={{ color: '#64748b' }}>Interest Rate</label>
            <span className="text-sm font-black" style={{ color: '#2A3887' }}>{rate}%</span>
          </div>
          <input type="range" min={5} max={15} step={0.1}
            value={rate} onChange={e => setRate(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#2A3887', background: '#e2e8f0' }} />
          <div className="flex justify-between text-xs mt-1" style={{ color: '#94a3b8' }}>
            <span>5%</span><span>15%</span>
          </div>
        </div>

        {/* Tenure */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold" style={{ color: '#64748b' }}>Loan Tenure</label>
            <span className="text-sm font-black" style={{ color: '#2A3887' }}>{tenure} Years</span>
          </div>
          <input type="range" min={1} max={30} step={1}
            value={tenure} onChange={e => setTenure(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#2A3887', background: '#e2e8f0' }} />
          <div className="flex justify-between text-xs mt-1" style={{ color: '#94a3b8' }}>
            <span>1 Yr</span><span>30 Yrs</span>
          </div>
        </div>

        {/* EMI Result */}
        <div className="rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
          <p className="text-xs text-white/70 mb-1">Monthly EMI {plan === 'riseup' ? '(during construction)' : ''}</p>
          <p className="text-2xl font-black text-white">{formatCurrency(Math.round(emi))}</p>
          {monthlyDelta > 0 && (
            <p className="text-[11px] font-medium mt-1.5" style={{ color: '#9DD8F2' }}>
              {plan === 'riseup'
                ? <>≈ {formatCurrency(Math.round(monthlyDelta))} less per month than the Standard plan</>
                : <>≈ {formatCurrency(Math.round(monthlyDelta))} more per month than the RiseUp plan</>}
            </p>
          )}
        </div>

        {/* Breakdown Bar */}
        <div>
          <div className="flex rounded-full overflow-hidden h-3">
            <div style={{ width: `${principalPct}%`, background: '#2A3887' }} />
            <div style={{ width: `${interestPct}%`, background: '#29A9DF' }} />
          </div>
          <div className="flex justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#2A3887' }} />
              <span className="text-xs" style={{ color: '#64748b' }}>Principal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#29A9DF' }} />
              <span className="text-xs" style={{ color: '#64748b' }}>Interest</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Principal', value: formatCurrency(loanAmount), color: '#2A3887' },
            { label: 'Interest', value: formatCurrency(Math.round(totalInterest)), color: '#29A9DF' },
            { label: 'Total', value: formatCurrency(Math.round(totalPayment)), color: '#262262' },
          ].map(item => (
            <div key={item.label} className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'white', border: '1px solid #E2F1FC' }}>
              <p className="text-xs mb-0.5" style={{ color: '#94a3b8' }}>{item.label}</p>
              <p className="text-xs font-black" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
