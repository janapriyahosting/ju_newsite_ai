"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { isLoggedIn, getCustomer } from "@/lib/customerAuth";

const API = process.env.NEXT_PUBLIC_API_URL || "";
const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
const EMP_TYPES = ['Salaried', 'Self Employed', 'Business Owner', 'Professional'];
const CO_EMP_TYPES = ['Salaried', 'Self Employed', 'Business Owner', 'Professional', 'Homemaker', 'Retired', 'Not Employed'];
const NO_INCOME_TYPES = new Set(['Homemaker', 'Retired', 'Not Employed']);

const empty = () => ({
  name: '', pan: '', aadhar: '', dob: '', address_line1: '', address_line2: '',
  city: '', pincode: '', state: '', country: 'India', email: '', phone: '',
});
const emptyEmp = () => ({
  employment_type: '', gross_monthly_income: '', current_obligations: '',
  organisation: '', work_experience: '', payslips: null as File | null, form16: null as File | null,
});

const inputStyle = { background: '#F8F9FB', border: '1.5px solid #E2F1FC', color: '#333' };
const labelCls = "block text-xs font-bold mb-1";
const labelStyle = { color: '#2A3887' };
const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all";

function Field({ label, required, value, onChange, type = 'text', placeholder = '', maxLength }: any) {
  return (
    <div>
      <label className={labelCls} style={labelStyle}>{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        maxLength={maxLength} className={inputCls} style={inputStyle} />
    </div>
  );
}

function SelectField({ label, required, value, onChange, options }: any) {
  return (
    <div>
      <label className={labelCls} style={labelStyle}>{label} {required && <span className="text-red-500">*</span>}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={inputCls} style={inputStyle}>
        <option value="">Select...</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FileField({ label, onChange }: any) {
  return (
    <div>
      <label className={labelCls} style={labelStyle}>{label}</label>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => onChange(e.target.files?.[0] || null)}
        className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
      <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG or WebP. Max 10MB.</p>
    </div>
  );
}

function PersonForm({ data, setData, title }: { data: any; setData: (fn: any) => void; title: string }) {
  const up = (k: string, v: string) => setData((d: any) => ({ ...d, [k]: v }));
  return (
    <>
      <h3 className="text-sm font-black mb-3" style={{ color: '#262262' }}>{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Full Name" required value={data.name} onChange={(v: string) => up('name', v)} placeholder="Full Name" />
        <Field label="PAN Card Number" required value={data.pan} onChange={(v: string) => up('pan', v.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
        <Field label="Aadhar Card Number" required value={data.aadhar} onChange={(v: string) => up('aadhar', v.replace(/\D/g, ''))} placeholder="1234 5678 9012" maxLength={12} />
        <Field label="Date of Birth" value={data.dob} onChange={(v: string) => up('dob', v)} type="date" />
        <div className="sm:col-span-2"><Field label="Address Line 1" value={data.address_line1} onChange={(v: string) => up('address_line1', v)} placeholder="Address Line 1" /></div>
        <div className="sm:col-span-2"><Field label="Address Line 2" value={data.address_line2} onChange={(v: string) => up('address_line2', v)} placeholder="Address Line 2" /></div>
        <Field label="City" value={data.city} onChange={(v: string) => up('city', v)} placeholder="City" />
        <Field label="Pin Code" value={data.pincode} onChange={(v: string) => up('pincode', v.replace(/\D/g, ''))} placeholder="500001" maxLength={6} />
        <SelectField label="State" value={data.state} onChange={(v: string) => up('state', v)} options={STATES} />
        <Field label="Country" value={data.country} onChange={(v: string) => up('country', v)} placeholder="India" />
        <Field label="Email Id" required value={data.email} onChange={(v: string) => up('email', v)} placeholder="email@example.com" type="email" />
        <Field label="Mobile No" required value={data.phone} onChange={(v: string) => up('phone', v.replace(/\D/g, ''))} placeholder="9876543210" maxLength={10} type="tel" />
      </div>
    </>
  );
}

function EmpForm({ data, setData, title, isCoApplicant = false }: { data: any; setData: (fn: any) => void; title: string; isCoApplicant?: boolean }) {
  const up = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }));
  const empTypes = isCoApplicant ? CO_EMP_TYPES : EMP_TYPES;
  const hideIncome = isCoApplicant && NO_INCOME_TYPES.has(data.employment_type);
  return (
    <>
      <h3 className="text-sm font-black mb-3" style={{ color: '#262262' }}>{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectField label="Employment Type" value={data.employment_type} onChange={(v: string) => up('employment_type', v)} options={empTypes} />
        {!hideIncome && (
          <>
            <Field label="Gross Fixed Monthly Income" value={data.gross_monthly_income} onChange={(v: string) => up('gross_monthly_income', v)} type="number" placeholder="Monthly Income (₹)" />
            <Field label="Current Financial Obligations" value={data.current_obligations} onChange={(v: string) => up('current_obligations', v)} type="number" placeholder="EMIs / Obligations (₹)" />
            <Field label="Name of Organisation" value={data.organisation} onChange={(v: string) => up('organisation', v)} placeholder="Company / Business Name" />
            <Field label="Work Experience (Years)" value={data.work_experience} onChange={(v: string) => up('work_experience', v)} placeholder="e.g. 5" />
            <FileField label="Pay Slips (Last 3 months)" onChange={(f: File | null) => up('payslips', f)} />
            <div className="sm:col-span-2">
              <FileField label="Form 16 (Last 2 Years - Salaried / Last 3 Years - Business)" onChange={(f: File | null) => up('form16', f)} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function HomeLoanFormPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [hasCo, setHasCo] = useState<boolean | null>(null);
  const [applicant, setApplicant] = useState(empty());
  const [coApplicant, setCoApplicant] = useState(empty());
  const [appEmp, setAppEmp] = useState(emptyEmp());
  const [coEmp, setCoEmp] = useState(emptyEmp());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [unitInfo, setUnitInfo] = useState<any>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login?redirect=' + encodeURIComponent('/home-loan/' + unitId) + '&reason=home_loan');
      return;
    }
    const c = getCustomer();
    if (c) {
      setApplicant(a => ({ ...a, name: c.name || '', email: c.email || '', phone: c.phone || '' }));
    }
    fetch(`${API}/units/${unitId}`).then(r => r.ok ? r.json() : null).then(async u => {
      if (!u) return;
      setUnitInfo(u);
      // Fetch tower + project names
      if (u.tower_id) {
        try {
          const t = await fetch(`${API}/admin/towers/${u.tower_id}`).then(r => r.ok ? r.json() : null);
          if (t) {
            setUnitInfo((prev: any) => ({ ...prev, tower_name: t.name, project_id: t.project_id }));
            if (t.project_id) {
              const projects = await fetch(`${API}/projects`).then(r => r.json());
              const pList = Array.isArray(projects) ? projects : projects.items || [];
              const p = pList.find((pp: any) => pp.id === t.project_id);
              if (p) setUnitInfo((prev: any) => ({ ...prev, project_name: p.name }));
            }
          }
        } catch {}
      }
    }).catch(() => {});
  }, [unitId, router]);

  function validateStep1() {
    if (!applicant.name.trim()) return 'Applicant name is required';
    if (!applicant.pan.trim()) return 'Applicant PAN is required';
    if (!applicant.aadhar.trim() || applicant.aadhar.length !== 12) return 'Applicant Aadhar (12 digits) is required';
    if (!applicant.email.trim()) return 'Applicant email is required';
    const ph = applicant.phone.replace(/\D/g, '').replace(/^91/, '');
    if (ph.length !== 10 || !/^[6-9]/.test(ph)) return 'Applicant mobile must be a valid 10-digit number';
    if (hasCo) {
      if (!coApplicant.name.trim()) return 'Co-applicant name is required';
      if (!coApplicant.pan.trim()) return 'Co-applicant PAN is required';
      if (!coApplicant.aadhar.trim() || coApplicant.aadhar.length !== 12) return 'Co-applicant Aadhar (12 digits) is required';
      if (!coApplicant.email.trim()) return 'Co-applicant email is required';
      const cph = coApplicant.phone.replace(/\D/g, '').replace(/^91/, '');
      if (cph.length !== 10 || !/^[6-9]/.test(cph)) return 'Co-applicant mobile must be a valid 10-digit number';
    }
    return '';
  }

  async function handleSubmit() {
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      // Applicant
      fd.append('name', applicant.name.trim());
      fd.append('phone', applicant.phone.replace(/\D/g, '').replace(/^91/, ''));
      if (applicant.email) fd.append('email', applicant.email);
      if (applicant.pan) fd.append('pan', applicant.pan);
      if (applicant.aadhar) fd.append('aadhar', applicant.aadhar);
      if (applicant.dob) fd.append('dob', applicant.dob);
      if (applicant.address_line1) fd.append('address_line1', applicant.address_line1);
      if (applicant.address_line2) fd.append('address_line2', applicant.address_line2);
      if (applicant.city) fd.append('city', applicant.city);
      if (applicant.pincode) fd.append('pincode', applicant.pincode);
      if (applicant.state) fd.append('state', applicant.state);
      if (applicant.country) fd.append('country', applicant.country);
      // Employment
      if (appEmp.employment_type) fd.append('employment_type', appEmp.employment_type);
      if (appEmp.gross_monthly_income) fd.append('gross_monthly_income', appEmp.gross_monthly_income);
      if (appEmp.current_obligations) fd.append('current_obligations', appEmp.current_obligations);
      if (appEmp.organisation) fd.append('organisation', appEmp.organisation);
      if (appEmp.work_experience) fd.append('work_experience', appEmp.work_experience);
      if (appEmp.payslips) fd.append('payslips', appEmp.payslips);
      if (appEmp.form16) fd.append('form16', appEmp.form16);
      // Co-applicant
      fd.append('has_co_applicant', String(!!hasCo));
      if (hasCo) {
        const coData = {
          ...coApplicant,
          employment_type: coEmp.employment_type,
          gross_monthly_income: coEmp.gross_monthly_income,
          current_obligations: coEmp.current_obligations,
          organisation: coEmp.organisation,
          work_experience: coEmp.work_experience,
        };
        fd.append('co_applicant', JSON.stringify(coData));
        if (coEmp.payslips) fd.append('co_payslips', coEmp.payslips);
        if (coEmp.form16) fd.append('co_form16', coEmp.form16);
      }
      // Property
      if (unitInfo?.base_price) fd.append('property_value', unitInfo.base_price);
      fd.append('unit_id', unitId);
      if (unitInfo?.unit_number) fd.append('unit_number', unitInfo.unit_number);
      if (unitInfo?.tower_name) fd.append('tower_name', unitInfo.tower_name);
      if (unitInfo?.project_name) fd.append('project_name', unitInfo.project_name);

      const token = localStorage.getItem('jp_token') || '';
      const res = await fetch(`${API}/home-loan-requests`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: fd,
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Submission failed'); }
      setDone(true);
    } catch (e: any) { setError(e.message || 'Something went wrong'); }
    setLoading(false);
  }

  if (done) {
    return (
      <main className="min-h-screen bg-white">
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-20 pb-12 px-4" style={{ background: 'linear-gradient(135deg, #F8F9FB 0%, #E2F1FC 100%)' }}>
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-black mb-2" style={{ color: '#2A3887' }}>Application Submitted!</h1>
            <p className="text-gray-500 mb-6">Your home loan application has been submitted successfully. Our team will review and contact you shortly.</p>
            <div className="flex gap-3 justify-center">
              <Link href={`/units/${unitId}`} className="px-6 py-3 rounded-xl font-bold text-sm" style={{ border: '2px solid #2A3887', color: '#2A3887' }}>Back to Unit</Link>
              <Link href="/dashboard?tab=home-loans" className="px-6 py-3 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>View My Applications</Link>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-20 pb-12 px-4" style={{ background: 'linear-gradient(135deg, #F8F9FB 0%, #E2F1FC 100%)' }}>
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link href={`/units/${unitId}`} className="text-xs font-semibold hover:underline" style={{ color: '#29A9DF' }}>← Back to Unit</Link>
            <h1 className="text-2xl font-black mt-2" style={{ color: '#2A3887' }}>🏦 Home Loan Application</h1>
            {unitInfo && <p className="text-sm text-gray-500 mt-1">{[unitInfo.project_name, unitInfo.tower_name, unitInfo.unit_number].filter(Boolean).join(' / ')} {unitInfo.base_price ? `| ${parseFloat(unitInfo.base_price) >= 10000000 ? `₹${(parseFloat(unitInfo.base_price)/10000000).toFixed(2)} Cr` : `₹${(parseFloat(unitInfo.base_price)/100000).toFixed(1)} L`}` : ''}</p>}
          </div>

          {/* Step Indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex-1 h-2 rounded-full" style={{ background: step >= s ? '#2A3887' : '#E2F1FC' }} />
            ))}
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: '0 8px 40px rgba(42,56,135,0.12)' }}>
            {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}>{error}</div>}

            {/* ── STEP 1: Applicant + Co-Applicant Details ── */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Co-applicant question */}
                <div>
                  <p className="text-sm font-black mb-3" style={{ color: '#2A3887' }}>Do you have a Co-Applicant?</p>
                  <div className="flex gap-3">
                    {[true, false].map(v => (
                      <button key={String(v)} onClick={() => setHasCo(v)}
                        className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                        style={hasCo === v
                          ? { background: '#2A3887', color: 'white' }
                          : { background: '#F8F9FB', border: '1.5px solid #E2F1FC', color: '#555' }
                        }>
                        {v ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                {hasCo !== null && (
                  <>
                    {/* Applicant */}
                    <div className="pt-4" style={{ borderTop: '1px solid #E2F1FC' }}>
                      <PersonForm data={applicant} setData={setApplicant} title="Applicant Details" />
                    </div>

                    {/* Co-Applicant */}
                    {hasCo && (
                      <div className="pt-4" style={{ borderTop: '1px solid #E2F1FC' }}>
                        <PersonForm data={coApplicant} setData={setCoApplicant} title="Co-Applicant Details" />
                      </div>
                    )}

                    <button
                      onClick={() => { const err = validateStep1(); if (err) { setError(err); return; } setError(''); setStep(2); }}
                      className="w-full py-3.5 text-white font-black rounded-xl text-sm transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #2A3887, #29A9DF)' }}>
                      Next →
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── STEP 2: Employment + Documents ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <EmpForm data={appEmp} setData={setAppEmp} title="Applicant - Employment Details" />
                </div>

                {hasCo && (
                  <div className="pt-4" style={{ borderTop: '1px solid #E2F1FC' }}>
                    <EmpForm data={coEmp} setData={setCoEmp} title="Co-Applicant - Employment Details" isCoApplicant />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)}
                    className="flex-1 py-3.5 font-bold rounded-xl text-sm"
                    style={{ border: '2px solid #2A3887', color: '#2A3887' }}>
                    ← Back
                  </button>
                  <button onClick={handleSubmit} disabled={loading}
                    className="flex-1 py-3.5 text-white font-black rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #16A34A, #22c55e)' }}>
                    {loading ? '⏳ Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
