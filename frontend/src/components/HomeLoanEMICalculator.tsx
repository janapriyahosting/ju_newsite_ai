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
  const defaultLoan = Math.round(unitPrice * 0.8);
  const [loanAmount, setLoanAmount] = useState(defaultLoan);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  const emi = useMemo(() => {
    const r = rate / 12 / 100;
    const n = tenure * 12;
    if (r === 0) return loanAmount / n;
    return (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [loanAmount, rate, tenure]);

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
        {/* Loan Amount */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold" style={{ color: '#64748b' }}>Loan Amount</label>
            <span className="text-sm font-black" style={{ color: '#2A3887' }}>{formatCurrency(loanAmount)}</span>
          </div>
          <input type="range" min={100000} max={unitPrice} step={50000}
            value={loanAmount} onChange={e => setLoanAmount(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#2A3887', background: '#e2e8f0' }} />
          <div className="flex justify-between text-xs mt-1" style={{ color: '#94a3b8' }}>
            <span>₹1L</span><span>{formatCurrency(unitPrice)}</span>
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
          <p className="text-xs text-white/70 mb-1">Monthly EMI</p>
          <p className="text-2xl font-black text-white">{formatCurrency(Math.round(emi))}</p>
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
