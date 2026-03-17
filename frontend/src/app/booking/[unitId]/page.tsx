'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const API = 'http://173.168.0.81:8000/api/v1';
const MEDIA = 'http://173.168.0.81:8000';

function formatPrice(p: any) {
  if (!p) return 'Price on request';
  const n = parseFloat(p);
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function BookingPage() {
  const { unitId } = useParams() as { unitId: string };
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [form, setForm] = useState({
    notes: '',
    coupon_code: '',
    consent: false,
  });

  useEffect(() => {
    const t = localStorage.getItem('jp_token');
    setToken(t);
    if (!unitId) return;
    fetch(`${API}/units/${unitId}`).then(r=>r.json()).then(u => {
      setUnit(u?.id ? u : null);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, [unitId]);

  async function handleBook() {
    if (!token) {
      router.push(`/login?redirect=/booking/${unitId}&reason=booking`);
      return;
    }
    if (!form.consent) { setError('Please accept the terms to proceed'); return; }
    setSubmitting(true); setError('');
    try {
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
      if (!r.ok) { setError(d.detail || 'Booking failed'); setSubmitting(false); return; }
      setBooking(d);
    } catch { setError('Something went wrong. Please try again.'); }
    setSubmitting(false);
  }

  const bookingAmt = unit?.base_price ? parseFloat(unit.base_price) * 0.1 : 0;

  if (loading) return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: '#E2F1FC', borderTopColor: '#2A3887' }} />
      </div>
    </main>
  );

  if (!unit) return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
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

  // Booking Confirmed Screen
  if (booking) return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-16 px-6"
        style={{ background: 'linear-gradient(135deg,#F8F9FB,#E2F1FC)' }}>
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg,#16A34A,#22c55e)' }}>
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-3xl font-black mb-2" style={{ color: '#16A34A' }}>Booking Confirmed!</h1>
          <p className="text-gray-600 mb-6">Your booking request has been received. Our team will contact you shortly.</p>
          
          <div className="rounded-2xl p-6 text-left mb-6" style={{ background: 'white', border: '1px solid #E2F1FC' }}>
            <h3 className="font-black mb-4" style={{ color: '#262262' }}>Booking Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Booking ID</span>
                <span className="font-bold font-mono text-xs" style={{ color: '#2A3887' }}>
                  {booking.id?.slice(0,8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Unit</span>
                <span className="font-bold">{unit.unit_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black"
                  style={{ background: '#FEF3C7', color: '#D97706' }}>
                  {booking.status?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-black text-lg" style={{ color: '#2A3887' }}>{formatPrice(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between border-t pt-3" style={{ borderColor: '#E2F1FC' }}>
                <span className="text-gray-500">Booking Amount (10%)</span>
                <span className="font-black" style={{ color: '#16A34A' }}>{formatPrice(booking.booking_amount)}</span>
              </div>
              {parseFloat(booking.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount Applied</span>
                  <span className="font-bold">- {formatPrice(booking.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status</span>
                <span className="font-bold">{booking.payment_status?.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/"
              className="px-6 py-3 rounded-full font-black text-white text-sm"
              style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
              Back to Home
            </Link>
            <Link href="/store"
              className="px-6 py-3 rounded-full font-bold text-sm border-2"
              style={{ borderColor: '#2A3887', color: '#2A3887' }}>
              Browse More Units
            </Link>
          </div>
        </div>
      </div>
    </main>
  );

  return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-6 py-10">
          {/* Breadcrumb */}
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
                <p className="text-gray-500 mt-1 text-sm">Complete your booking for {unit.unit_number}</p>
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
                  <input
                    type="text"
                    value={form.coupon_code}
                    onChange={e => { setForm(p=>({...p, coupon_code: e.target.value.toUpperCase()})); setCouponMsg(''); }}
                    placeholder="Enter coupon code"
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none"
                    style={{ border: '1px solid #E2F1FC', fontFamily: 'monospace' }} />
                  <button onClick={() => setCouponMsg(form.coupon_code ? '✓ Coupon will be applied on booking' : '')}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: '#2A3887', color: 'white' }}>
                    Apply
                  </button>
                </div>
                {couponMsg && <p className="text-xs mt-1.5 font-bold text-green-600">{couponMsg}</p>}
              </div>

              {/* Notes */}
              <div className="rounded-2xl p-5" style={{ background: '#F8F9FB', border: '1px solid #E2F1FC' }}>
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 block mb-2">
                  Notes / Special Requests
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p=>({...p, notes: e.target.value}))}
                  placeholder="Any specific requirements, preferred floor, or questions for our team..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none resize-none"
                  style={{ border: '1px solid #E2F1FC' }} />
              </div>

              {/* Consent */}
              <div className="rounded-2xl p-5" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.consent}
                    onChange={e => setForm(p=>({...p, consent: e.target.checked}))}
                    className="mt-0.5 w-4 h-4 accent-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I agree to the <Link href="/terms" className="underline font-bold" style={{ color: '#2A3887' }}>Terms & Conditions</Link> and 
                    consent to Janapriya Upscale contacting me via <strong>SMS, WhatsApp, email and calls</strong> regarding this booking and future properties. 
                    I understand the booking amount is 10% of the unit price.
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
                {submitting ? '⏳ Processing...' : `🏷️ Confirm Booking — ${formatPrice(bookingAmt)}`}
              </button>
              <p className="text-xs text-center text-gray-400">
                Booking amount: 10% of unit price. Balance as per payment plan.
              </p>
            </div>

            {/* Right: Unit Summary */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 space-y-4">
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid #E2F1FC', boxShadow: '0 8px 30px rgba(42,56,135,0.1)' }}>
                  {/* Image */}
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
                  {/* Details */}
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
                        <span className="text-gray-500">Booking Amount (10%)</span>
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
                  Our team will contact you within 24 hours.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
