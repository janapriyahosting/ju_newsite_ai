'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Script from 'next/script';
import { validateKycStep1, validateKycStep2, validateKycStep3, validateKycStep4 } from '@/lib/validators';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://173.168.0.81:8000/api/v1';
const MEDIA = 'http://173.168.0.81:8000';
const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

function formatPrice(p: any) {
  if (!p) return 'Price on request';
  const n = parseFloat(p);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

declare global {
  interface Window { Razorpay: any; }
}

export default function BookingPage() {
  const { unitId } = useParams() as { unitId: string };
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [error, setError] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [form, setForm] = useState({ notes: '', coupon_code: '', consent: false });

  useEffect(() => {
    const t = localStorage.getItem('jp_token');
    setToken(t);
    if (!unitId) return;
    fetch(`${API}/units/${unitId}`).then(r => r.json()).then(u => {
      setUnit(u?.id ? u : null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [unitId]);

  async function handleBook() {
    if (!token) {
      router.push(`/login?redirect=/booking/${unitId}&reason=booking`);
      return;
    }
    if (!form.consent) { setError('Please accept the terms to proceed'); return; }
    setSubmitting(true); setError('');
    try {
      // Step 1: Create booking + Razorpay order
      const r = await fetch(`${API}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          unit_id: unitId,
          notes: form.notes || null,
          coupon_code: form.coupon_code || null,
        })
      });
      const d = await r.json();
      if (r.status === 401) { router.push(`/login?redirect=/booking/${unitId}&reason=session_expired`); return; }
      if (!r.ok) { setError(d.detail || 'Booking failed'); setSubmitting(false); return; }

      // Step 2: Open Razorpay checkout
      openRazorpay(d);
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  function openRazorpay(bookingData: any) {
    if (!window.Razorpay) {
      setError('Payment gateway not loaded. Please refresh the page.');
      setSubmitting(false);
      return;
    }

    const options = {
      key: bookingData.razorpay_key_id || RZP_KEY,
      amount: bookingData.amount,
      currency: bookingData.currency,
      name: 'Janapriya Upscale',
      description: `Booking for ${bookingData.unit_number}`,
      order_id: bookingData.razorpay_order_id,
      prefill: {
        name: bookingData.customer_name || '',
        email: bookingData.customer_email || '',
        contact: bookingData.customer_phone || '',
      },
      theme: { color: '#2A3887' },
      handler: async function (response: any) {
        // Step 3: Verify payment on backend
        try {
          const vr = await fetch(`${API}/bookings/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
          });
          const vd = await vr.json();
          if (vr.status === 401) { setError('Session expired. Please login again and retry.'); setSubmitting(false); return; }
          if (!vr.ok) { setError(vd.detail || 'Payment verification failed'); setSubmitting(false); return; }

          setBooking({
            ...bookingData,
            id: vd.booking_id,
            status: 'confirmed',
            payment_status: 'paid',
            payment_id: vd.payment_id,
          });
          setPaymentDone(true);
        } catch {
          setError('Payment completed but verification failed. Contact support with your payment ID.');
        }
        setSubmitting(false);
      },
      modal: {
        ondismiss: function () {
          setError('Payment was cancelled. Your booking is on hold — you can retry payment.');
          setBooking({ ...bookingData, status: 'pending', payment_status: 'unpaid' });
          setSubmitting(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      setError(`Payment failed: ${response.error?.description || 'Unknown error'}. Please try again.`);
      setSubmitting(false);
    });
    rzp.open();
  }

  const bookingAmt = unit?.token_amount ? parseFloat(unit.token_amount) : 20000;

  if (loading) return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: '#E2F1FC', borderTopColor: '#2A3887' }} />
      </div>
    </main>
  );

  if (!unit) return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="text-6xl mb-4">🏚️</div>
          <h2 className="text-xl font-black mb-3" style={{ color: '#2A3887' }}>Unit not available</h2>
          <Link href="/store" className="px-6 py-3 rounded-full font-black text-white text-sm"
            style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>Browse Units</Link>
        </div>
      </div>
    </main>
  );

  // Payment Success Screen + KYC Form
  if (paymentDone && booking) return (
    <main className="min-h-screen bg-white">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar />
      <div className="pt-16 pb-12 px-6" style={{ background: 'linear-gradient(135deg,#F8F9FB,#E2F1FC)', minHeight: '100vh' }}>
        <div className="max-w-3xl mx-auto">
          {/* Success Banner */}
          <div className="text-center mb-8 pt-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg,#16A34A,#22c55e)' }}>
              <span className="text-3xl text-white">✓</span>
            </div>
            <h1 className="text-2xl font-black mb-1" style={{ color: '#16A34A' }}>Payment Successful!</h1>
            <p className="text-gray-500 text-sm">Booking ID: <strong className="font-mono">{booking.id?.slice(0, 8).toUpperCase()}</strong> · Unit: <strong>{booking.unit_number || unit.unit_number}</strong> · Paid: <strong className="text-green-600">{formatPrice(booking.payable_amount || booking.booking_amount)}</strong></p>
          </div>

          {/* KYC Form */}
          <BookingKYCForm bookingId={booking.id} token={token!} />

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/dashboard" className="px-6 py-3 rounded-full font-black text-white text-sm text-center"
              style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>My Dashboard</Link>
            <Link href="/store" className="px-6 py-3 rounded-full font-bold text-sm border-2 text-center"
              style={{ borderColor: '#2A3887', color: '#2A3887' }}>Browse More Units</Link>
          </div>
        </div>
      </div>
    </main>
  );

  // Booking Created but Payment Pending (user dismissed Razorpay)
  if (booking && !paymentDone) return (
    <main className="min-h-screen bg-white">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-16 px-6"
        style={{ background: 'linear-gradient(135deg,#F8F9FB,#E2F1FC)' }}>
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#FBBF24)' }}>
            <span className="text-4xl">⏳</span>
          </div>
          <h1 className="text-3xl font-black mb-2" style={{ color: '#D97706' }}>Payment Pending</h1>
          <p className="text-gray-600 mb-6">Your booking is reserved. Complete payment to confirm.</p>

          <div className="rounded-2xl p-6 text-left mb-6" style={{ background: 'white', border: '1px solid #E2F1FC' }}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Booking ID</span>
                <span className="font-bold font-mono text-xs" style={{ color: '#2A3887' }}>
                  {booking.id?.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Unit</span>
                <span className="font-bold">{booking.unit_number || unit.unit_number}</span>
              </div>
              <div className="flex justify-between border-t pt-3" style={{ borderColor: '#E2F1FC' }}>
                <span className="text-gray-500">Amount Due</span>
                <span className="font-black text-lg" style={{ color: '#D97706' }}>
                  {formatPrice(booking.payable_amount || booking.booking_amount)}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm font-bold mb-4"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => { setError(''); openRazorpay(booking); }}
              className="px-6 py-3 rounded-full font-black text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
              Retry Payment
            </button>
            <Link href="/dashboard"
              className="px-6 py-3 rounded-full font-bold text-sm border-2"
              style={{ borderColor: '#2A3887', color: '#2A3887' }}>
              My Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );

  // Main Booking Form
  return (
    <main className="min-h-screen bg-white">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Navbar />
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-8">
            <Link href="/" className="hover:text-gray-600">Home</Link>
            <span>›</span>
            <Link href="/store" className="hover:text-gray-600">Store</Link>
            <span>›</span>
            <Link href={`/units/${unit.id}`} className="hover:text-gray-600">{unit.unit_number}</Link>
            <span>›</span>
            <span style={{ color: '#2A3887' }} className="font-bold">Book</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Form */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h1 className="text-3xl font-black" style={{ color: '#262262' }}>Book This Unit</h1>
                <p className="text-gray-500 mt-1 text-sm">Complete your booking for {unit.unit_number} — pay securely via Razorpay</p>
              </div>

              {!token && (
                <div className="rounded-2xl p-5 flex items-center gap-4"
                  style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-black text-sm" style={{ color: '#92400E' }}>Sign in required to book</p>
                    <Link href={`/login?redirect=/booking/${unitId}&reason=booking`}
                      className="text-xs underline font-bold" style={{ color: '#D97706' }}>
                      Sign in or Register →
                    </Link>
                  </div>
                </div>
              )}

              {/* Coupon Code */}
              <div className="rounded-2xl p-5" style={{ background: '#F8F9FB', border: '1px solid #E2F1FC' }}>
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 block mb-2">
                  Coupon Code (Optional)
                </label>
                <div className="flex gap-2">
                  <input type="text" value={form.coupon_code}
                    onChange={e => { setForm(p => ({ ...p, coupon_code: e.target.value.toUpperCase() })); setCouponMsg(''); }}
                    placeholder="Enter coupon code"
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none"
                    style={{ border: '1px solid #E2F1FC', fontFamily: 'monospace' }} />
                  <button onClick={() => setCouponMsg(form.coupon_code ? '✓ Coupon will be applied on booking' : '')}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: '#2A3887', color: 'white' }}>Apply</button>
                </div>
                {couponMsg && <p className="text-xs mt-1.5 font-bold text-green-600">{couponMsg}</p>}
              </div>

              {/* Notes */}
              <div className="rounded-2xl p-5" style={{ background: '#F8F9FB', border: '1px solid #E2F1FC' }}>
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 block mb-2">
                  Notes / Special Requests
                </label>
                <textarea value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any specific requirements, preferred floor, or questions..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none resize-none"
                  style={{ border: '1px solid #E2F1FC' }} />
              </div>

              {/* Consent */}
              <div className="rounded-2xl p-5" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.consent}
                    onChange={e => setForm(p => ({ ...p, consent: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I agree to the <Link href="/terms" className="underline font-bold" style={{ color: '#2A3887' }}>Terms & Conditions</Link> and
                    consent to Janapriya Upscale contacting me via <strong>SMS, WhatsApp, email and calls</strong> regarding this booking.
                    I understand the token amount is payable online via Razorpay. The remaining booking amount (10-20%) is due within 30 days.
                  </span>
                </label>
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3 text-sm font-bold"
                  style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                  ⚠️ {error}
                </div>
              )}

              <button onClick={handleBook} disabled={submitting}
                className="w-full py-4 rounded-2xl font-black text-white text-lg transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
                {submitting ? '⏳ Processing...' : `Pay ${formatPrice(bookingAmt)} Token & Confirm Booking`}
              </button>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <span>🔒 Secure Payment</span>
                <span>•</span>
                <span>Powered by Razorpay</span>
                <span>•</span>
                <span>PCI DSS Compliant</span>
              </div>
            </div>

            {/* Right: Unit Summary */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 space-y-4">
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid #E2F1FC', boxShadow: '0 8px 30px rgba(42,56,135,0.1)' }}>
                  <div className="h-48 relative"
                    style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
                    {unit.images?.[0] ? (
                      <img src={MEDIA + unit.images[0]} alt={unit.unit_number}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl">🏢</span>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-black bg-white"
                      style={{ color: unit.status === 'available' ? '#16A34A' : '#F59E0B' }}>
                      ● {unit.status?.charAt(0).toUpperCase() + unit.status?.slice(1)}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{unit.unit_type}</p>
                    <h3 className="text-xl font-black mb-1" style={{ color: '#262262' }}>{unit.unit_number}</h3>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
                      {unit.bedrooms && <span>🛏 {unit.bedrooms} Bed</span>}
                      {unit.area_sqft && <span>📐 {parseFloat(unit.area_sqft).toFixed(0)} sqft</span>}
                      {unit.floor_number && <span>🏢 Floor {unit.floor_number}</span>}
                    </div>
                    <div className="space-y-2 pt-4 border-t text-sm" style={{ borderColor: '#E2F1FC' }}>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Unit Price</span>
                        <span className="font-black text-lg" style={{ color: '#2A3887' }}>
                          {formatPrice(unit.base_price)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Token Amount</span>
                        <span className="font-black" style={{ color: '#16A34A' }}>
                          {formatPrice(bookingAmt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl p-4 text-xs text-gray-500"
                  style={{ background: '#F8F9FB', border: '1px solid #E2F1FC' }}>
                  💡 <strong>10% booking amount</strong> secures the unit. Balance payable as per agreed payment plan.
                  Payment processed securely via Razorpay.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── KYC Form Component ───────────────────────────────────────────────────── */

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
const RELATIONS = ['Father','Spouse','Mother','Guardian','Brother','Sister','Other'];
const EMP_TYPES = ['Salaried','Self-Employed','Business Owner','Professional','Retired','Homemaker','Other'];

function BookingKYCForm({ bookingId, token }: { bookingId: string; token: string }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [kyc, setKyc] = useState({
    // Address
    corr_address: '', corr_city: '', corr_state: 'Telangana', corr_pincode: '',
    perm_same_as_corr: true, perm_address: '', perm_city: '', perm_state: 'Telangana', perm_pincode: '',
    // Co-applicant
    co_applicant_name: '', co_applicant_phone: '', co_applicant_email: '',
    co_applicant_relation: '', co_applicant_aadhar: '', co_applicant_pan: '',
    // Employment
    employer_name: '', designation: '', employment_type: 'Salaried',
    monthly_salary: '', work_experience: '',
    // Loans
    has_existing_loans: false, existing_loan_amount: '', existing_loan_emi: '', loan_details: '',
    // KYC
    aadhar_number: '', aadhar_name: '', pan_number: '', pan_name: '', date_of_birth: '',
  });

  const up = (k: string, v: any) => { setKyc(f => ({ ...f, [k]: v })); setFieldErrors(e => ({ ...e, [k]: '' })); };
  const ic = 'w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-400';
  const lc = 'block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide';
  const sc = { border: '1px solid #E2F1FC' };
  const fe = (k: string) => fieldErrors[k] ? <p className="text-red-500 text-xs mt-1">{fieldErrors[k]}</p> : null;
  const fi = (k: string) => ({ ...sc, borderColor: fieldErrors[k] ? '#f87171' : '#E2F1FC' });

  function validateCurrentStep(): boolean {
    const validators: Record<number, (k: any) => Record<string, string>> = {
      1: validateKycStep1, 2: validateKycStep2, 3: validateKycStep3, 4: validateKycStep4,
    };
    const errs = validators[step](kyc);
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() { if (validateCurrentStep()) setStep(s => s + 1); }

  async function handleSave() {
    if (!validateCurrentStep()) return;
    setSaving(true); setError('');
    try {
      const body: any = { booking_id: bookingId, ...kyc };
      // Convert empty strings to null for optional numeric fields
      ['monthly_salary','existing_loan_amount','existing_loan_emi'].forEach(k => {
        body[k] = body[k] && String(body[k]).trim() ? parseFloat(body[k]) : null;
      });
      // Convert empty strings to null for all optional string fields
      Object.keys(body).forEach(k => { if (body[k] === '') body[k] = null; });

      const r = await fetch(`${API}/bookings/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json();
        // Pydantic returns detail as array of {msg, loc} objects on 422
        if (Array.isArray(d.detail)) {
          const msgs = d.detail.map((e: any) => {
            const field = e.loc?.slice(-1)[0] || '';
            const msg = (e.msg || '').replace('Value error, ', '');
            return `${field}: ${msg}`;
          });
          throw new Error(msgs.join('\n'));
        }
        throw new Error(d.detail || 'Save failed');
      }
      setSaved(true);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  if (saved) return (
    <div className="rounded-2xl p-8 text-center" style={{ background: 'white', border: '1px solid #BBF7D0' }}>
      <div className="text-4xl mb-3">✅</div>
      <h3 className="font-black text-lg mb-1" style={{ color: '#16A34A' }}>KYC Details Saved!</h3>
      <p className="text-sm text-gray-500">Our team will verify your documents and contact you.</p>
    </div>
  );

  const stepTitles = ['Addresses', 'Father / Spouse / Guardian', 'Employment & Loans', 'KYC Documents'];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #E2F1FC', boxShadow: '0 8px 30px rgba(42,56,135,0.08)' }}>
      {/* Header */}
      <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg,#262262,#2A3887)' }}>
        <h2 className="text-lg font-black text-white">Complete Your KYC</h2>
        <p className="text-blue-200 text-xs mt-1">Step {step} of 4 — {stepTitles[step - 1]}</p>
        <div className="flex gap-1 mt-3">
          {[1,2,3,4].map(s => (
            <div key={s} className="flex-1 h-1.5 rounded-full" style={{ background: s <= step ? '#29A9DF' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">
        {error && <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}>{error}</div>}

        {/* Step 1: Addresses */}
        {step === 1 && (<>
          <h3 className="font-black text-sm" style={{ color: '#2A3887' }}>Correspondence Address</h3>
          <div><label className={lc}>Address *</label><textarea value={kyc.corr_address} onChange={e => up('corr_address', e.target.value)} rows={2} className={`${ic} resize-none`} style={fi('corr_address')} placeholder="Flat/House No, Street, Area" />{fe('corr_address')}</div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lc}>City *</label><input value={kyc.corr_city} onChange={e => up('corr_city', e.target.value)} className={ic} style={fi('corr_city')} placeholder="Hyderabad" />{fe('corr_city')}</div>
            <div><label className={lc}>State *</label><select value={kyc.corr_state} onChange={e => up('corr_state', e.target.value)} className={ic} style={fi('corr_state')}>{STATES.map(s => <option key={s}>{s}</option>)}</select>{fe('corr_state')}</div>
            <div><label className={lc}>Pincode *</label><input value={kyc.corr_pincode} onChange={e => up('corr_pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className={ic} style={fi('corr_pincode')} placeholder="500034" maxLength={6} />{fe('corr_pincode')}</div>
          </div>
          <div className="border-t pt-4" style={{ borderColor: '#E2F1FC' }}>
            <label className="flex items-center gap-2 cursor-pointer mb-4"><input type="checkbox" checked={kyc.perm_same_as_corr} onChange={e => up('perm_same_as_corr', e.target.checked)} className="w-4 h-4 accent-amber-500" /><span className="text-sm text-gray-600 font-medium">Permanent address same as correspondence</span></label>
            {!kyc.perm_same_as_corr && (<>
              <h3 className="font-black text-sm mb-3" style={{ color: '#2A3887' }}>Permanent Address</h3>
              <div><label className={lc}>Address *</label><textarea value={kyc.perm_address} onChange={e => up('perm_address', e.target.value)} rows={2} className={`${ic} resize-none`} style={fi('perm_address')} placeholder="Flat/House No, Street, Area" />{fe('perm_address')}</div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div><label className={lc}>City *</label><input value={kyc.perm_city} onChange={e => up('perm_city', e.target.value)} className={ic} style={fi('perm_city')} />{fe('perm_city')}</div>
                <div><label className={lc}>State</label><select value={kyc.perm_state} onChange={e => up('perm_state', e.target.value)} className={ic} style={sc}>{STATES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className={lc}>Pincode *</label><input value={kyc.perm_pincode} onChange={e => up('perm_pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className={ic} style={fi('perm_pincode')} maxLength={6} />{fe('perm_pincode')}</div>
              </div>
            </>)}
          </div>
        </>)}

        {/* Step 2: Co-Applicant */}
        {step === 2 && (<>
          <h3 className="font-black text-sm" style={{ color: '#2A3887' }}>Father / Spouse / Guardian Details</h3>
          <p className="text-xs text-gray-400">Provide details of your father, spouse, or guardian</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>Full Name</label><input value={kyc.co_applicant_name} onChange={e => up('co_applicant_name', e.target.value)} className={ic} style={fi('co_applicant_name')} placeholder="Full name" />{fe('co_applicant_name')}</div>
            <div><label className={lc}>Relationship</label><select value={kyc.co_applicant_relation} onChange={e => up('co_applicant_relation', e.target.value)} className={ic} style={sc}><option value="">Select...</option>{RELATIONS.map(r => <option key={r}>{r}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>Phone</label><input value={kyc.co_applicant_phone} onChange={e => up('co_applicant_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={ic} style={fi('co_applicant_phone')} placeholder="98765 43210" maxLength={10} />{fe('co_applicant_phone')}</div>
            <div><label className={lc}>Email</label><input type="email" value={kyc.co_applicant_email} onChange={e => up('co_applicant_email', e.target.value)} className={ic} style={fi('co_applicant_email')} placeholder="email@example.com" />{fe('co_applicant_email')}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>Aadhar Number</label><input value={kyc.co_applicant_aadhar} onChange={e => up('co_applicant_aadhar', e.target.value.replace(/\D/g, '').slice(0, 12))} className={ic} style={fi('co_applicant_aadhar')} placeholder="1234 5678 9012" maxLength={12} />{fe('co_applicant_aadhar')}</div>
            <div><label className={lc}>PAN Number</label><input value={kyc.co_applicant_pan} onChange={e => up('co_applicant_pan', e.target.value.toUpperCase().slice(0, 10))} className={ic} style={fi('co_applicant_pan')} placeholder="ABCDE1234F" maxLength={10} />{fe('co_applicant_pan')}</div>
          </div>
        </>)}

        {/* Step 3: Employment & Loans */}
        {step === 3 && (
          <>
            <h3 className="font-black text-sm" style={{ color: '#2A3887' }}>Employment Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lc}>Employer / Company *</label><input value={kyc.employer_name} onChange={e => up('employer_name', e.target.value)} className={ic} style={sc} placeholder="Company name" /></div>
              <div><label className={lc}>Designation</label><input value={kyc.designation} onChange={e => up('designation', e.target.value)} className={ic} style={sc} placeholder="Your role" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lc}>Employment Type *</label><select value={kyc.employment_type} onChange={e => up('employment_type', e.target.value)} className={ic} style={sc}>{EMP_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className={lc}>Monthly Salary (INR)</label><input type="number" value={kyc.monthly_salary} onChange={e => up('monthly_salary', e.target.value)} className={ic} style={fi('monthly_salary')} placeholder="50000" />{fe('monthly_salary')}</div>
              <div><label className={lc}>Work Experience</label><input value={kyc.work_experience} onChange={e => up('work_experience', e.target.value)} className={ic} style={sc} placeholder="e.g. 5 years" /></div>
            </div>
            <div className="border-t pt-4 mt-2" style={{ borderColor: '#E2F1FC' }}>
              <h3 className="font-black text-sm mb-3" style={{ color: '#2A3887' }}>Existing Loans</h3>
              <label className="flex items-center gap-2 cursor-pointer mb-3"><input type="checkbox" checked={kyc.has_existing_loans} onChange={e => up('has_existing_loans', e.target.checked)} className="w-4 h-4 accent-amber-500" /><span className="text-sm text-gray-600">I have existing loans</span></label>
              {kyc.has_existing_loans && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lc}>Total Loan Amount</label><input type="number" value={kyc.existing_loan_amount} onChange={e => up('existing_loan_amount', e.target.value)} className={ic} style={fi('existing_loan_amount')} placeholder="e.g. 1500000" />{fe('existing_loan_amount')}</div>
                  <div><label className={lc}>Monthly EMI</label><input type="number" value={kyc.existing_loan_emi} onChange={e => up('existing_loan_emi', e.target.value)} className={ic} style={fi('existing_loan_emi')} placeholder="e.g. 15000" />{fe('existing_loan_emi')}</div>
                  <div className="col-span-2"><label className={lc}>Loan Details</label><input value={kyc.loan_details} onChange={e => up('loan_details', e.target.value)} className={ic} style={sc} placeholder="e.g. Home loan with SBI, Car loan with HDFC" /></div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 4: KYC Documents */}
        {step === 4 && (<>
          <h3 className="font-black text-sm" style={{ color: '#2A3887' }}>Aadhar Card Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>Aadhar Number *</label><input value={kyc.aadhar_number} onChange={e => up('aadhar_number', e.target.value.replace(/\D/g, '').slice(0, 12))} className={ic} style={fi('aadhar_number')} placeholder="1234 5678 9012" maxLength={12} />{fe('aadhar_number')}</div>
            <div><label className={lc}>Name as per Aadhar *</label><input value={kyc.aadhar_name} onChange={e => up('aadhar_name', e.target.value)} className={ic} style={fi('aadhar_name')} placeholder="Full name as on Aadhar" />{fe('aadhar_name')}</div>
          </div>
          <div className="border-t pt-4" style={{ borderColor: '#E2F1FC' }}>
            <h3 className="font-black text-sm mb-3" style={{ color: '#2A3887' }}>PAN Card Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lc}>PAN Number *</label><input value={kyc.pan_number} onChange={e => up('pan_number', e.target.value.toUpperCase().slice(0, 10))} className={ic} style={fi('pan_number')} placeholder="ABCDE1234F" maxLength={10} />{fe('pan_number')}</div>
              <div><label className={lc}>Name as per PAN *</label><input value={kyc.pan_name} onChange={e => up('pan_name', e.target.value)} className={ic} style={fi('pan_name')} placeholder="Full name as on PAN" />{fe('pan_name')}</div>
            </div>
          </div>
          <div className="border-t pt-4" style={{ borderColor: '#E2F1FC' }}>
            <h3 className="font-black text-sm mb-3" style={{ color: '#2A3887' }}>Date of Birth</h3>
            <div className="max-w-xs">
              <label className={lc}>DOB (as per Aadhar/PAN) *</label>
              <input type="date" value={kyc.date_of_birth} onChange={e => up('date_of_birth', e.target.value)} className={ic} style={fi('date_of_birth')} />{fe('date_of_birth')}
            </div>
          </div>
        </>)}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t" style={{ borderColor: '#E2F1FC' }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} className="px-5 py-2.5 rounded-xl text-sm font-bold border"
              style={{ borderColor: '#2A3887', color: '#2A3887' }}>← Back</button>
          ) : <div />}
          {step < 4 ? (
            <button onClick={goNext}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>Next →</button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#16A34A,#22c55e)' }}>
              {saving ? 'Saving...' : 'Submit KYC Details'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
