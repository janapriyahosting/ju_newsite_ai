'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Unit } from '@/types'

function formatPrice(price: string | undefined) {
  if (!price) return 'POA'
  const num = parseFloat(price)
  if (num >= 10000000) return `₹${(num/10000000).toFixed(2)} Cr`
  if (num >= 100000) return `₹${(num/100000).toFixed(2)} L`
  return `₹${num.toLocaleString()}`
}

const STEPS = ['Unit Summary', 'Coupon', 'Confirm']

export default function BookingPage() {
  const { unitId } = useParams()
  const router = useRouter()
  const { isLoggedIn, customer, loadFromStorage } = useAuthStore()
  const [unit, setUnit] = useState<Unit | null>(null)
  const [step, setStep] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState<any>(null)

  useEffect(() => { loadFromStorage() }, [])

  useEffect(() => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/booking/${unitId}`)
      return
    }
    api.get(`/units/${unitId}`)
      .then(r => setUnit(r.data))
      .catch(() => router.push('/units'))
      .finally(() => setLoading(false))
  }, [isLoggedIn, unitId])

  const confirmBooking = async () => {
    setBooking(true)
    try {
      const res = await api.post('/bookings', {
        unit_id: unitId,
        coupon_code: couponApplied ? couponCode : undefined,
        notes,
      })
      setBooked(res.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Booking failed. Please try again.')
    } finally {
      setBooking(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full" />
    </div>
  )

  if (booked) return (
    <main className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-serif font-bold mb-3">Booking Confirmed!</h1>
        <p className="text-gray-500 mb-6">Our team will contact <strong>{customer?.name}</strong> within 24 hours.</p>
        <div className="card p-6 mb-6 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Unit</span>
            <span className="font-semibold">{unit?.unit_type} — {unit?.unit_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Booking Amount</span>
            <span className="font-bold text-brand-gold">{formatPrice(booked.booking_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Status</span>
            <span className="text-green-600 font-medium capitalize">{booked.status}</span>
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="btn-primary">Back to Home</Link>
          <Link href="/units" className="btn-outline">Browse More</Link>
        </div>
      </div>
    </main>
  )

  if (!unit) return null
  const bookingAmount = parseFloat(unit.base_price || '0') * 0.1

  return (
    <main className="min-h-screen bg-brand-light">
      <header className="bg-brand-dark text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif font-bold text-brand-gold">Janapriya Upscale</Link>
          <Link href={`/units/${unitId}`} className="text-sm text-gray-300 hover:text-brand-gold">← Back to Unit</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-serif font-bold mb-2">Book This Unit</h1>
        <p className="text-gray-500 mb-8">Logged in as <strong>{customer?.name}</strong></p>

        {/* Stepper */}
        <div className="flex items-center mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'bg-brand-gold text-white' : 'bg-gray-200 text-gray-400'
              }`}>{i < step ? '✓' : i + 1}</div>
              <span className={`ml-2 text-sm font-medium ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="font-semibold text-lg mb-4">Unit Summary</h2>
              <h3 className="font-bold text-xl mb-1">{unit.unit_type} — {unit.unit_number}</h3>
              <div className="flex gap-3 text-sm text-gray-500 mb-4">
                {unit.bedrooms && <span>🛏 {unit.bedrooms} Bed</span>}
                {unit.area_sqft && <span>📐 {unit.area_sqft} sqft</span>}
                {unit.facing && <span>🧭 {unit.facing}</span>}
                <span>Floor {unit.floor_number}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400">Total Price</p>
                  <p className="font-bold text-brand-gold">{formatPrice(unit.base_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Booking (10%)</p>
                  <p className="font-bold">₹{Math.round(bookingAmount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">EMI/month</p>
                  <p className="font-bold">{formatPrice(unit.emi_estimate)}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setStep(1)} className="btn-primary px-8">Continue →</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="font-semibold text-lg mb-4">Apply Coupon (Optional)</h2>
              <div className="flex gap-3">
                <input placeholder="e.g. LAUNCH10 or FLAT25K"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponApplied(false) }}
                  className="input flex-1" disabled={couponApplied} />
                <button onClick={() => couponCode && setCouponApplied(true)}
                  disabled={!couponCode || couponApplied} className="btn-primary px-6">
                  {couponApplied ? '✓ Applied' : 'Apply'}
                </button>
              </div>
              {couponApplied && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                  ✅ Coupon <strong>{couponCode}</strong> applied! Discount calculated at confirmation.
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Available: <strong>LAUNCH10</strong> (10% off), <strong>FLAT25K</strong> (₹25,000 off)
              </p>
            </div>
            <div className="card p-6">
              <h2 className="font-semibold mb-3">Notes (Optional)</h2>
              <textarea rows={3} placeholder="Any special requests..."
                value={notes} onChange={e => setNotes(e.target.value)}
                className="input resize-none" />
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="btn-outline px-8">← Back</button>
              <button onClick={() => setStep(2)} className="btn-primary px-8">Review →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="font-semibold text-lg mb-6">Booking Summary</h2>
              <div className="space-y-3 text-sm">
                {[
                  ['Unit', `${unit.unit_type} — ${unit.unit_number}`],
                  ['Customer', customer?.name || ''],
                  ['Total Price', formatPrice(unit.base_price)],
                  ['Booking Amount (10%)', `₹${Math.round(bookingAmount).toLocaleString()}`],
                  ...(couponApplied ? [['Coupon', `${couponCode} ✓`]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between py-3 font-bold text-base">
                  <span>Payable Now</span>
                  <span className="text-brand-gold text-xl">₹{Math.round(bookingAmount).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="card p-4 bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
              ⚠️ Razorpay integration coming soon. Our team will contact you within 24 hours to complete payment.
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-outline px-8">← Back</button>
              <button onClick={confirmBooking} disabled={booking} className="btn-primary px-8">
                {booking ? 'Confirming...' : '✅ Confirm Booking'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
