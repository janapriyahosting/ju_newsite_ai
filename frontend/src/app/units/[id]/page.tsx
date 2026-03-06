'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { Unit } from '@/types'

function formatPrice(price: string | undefined) {
  if (!price) return 'Price on request'
  const num = parseFloat(price)
  if (num >= 10000000) return `₹${(num/10000000).toFixed(2)} Cr`
  if (num >= 100000) return `₹${(num/100000).toFixed(2)} L`
  return `₹${num.toLocaleString()}`
}

export default function UnitDetailPage() {
  const { id } = useParams()
  const [unit, setUnit] = useState<Unit | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEnquiry, setShowEnquiry] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    api.get(`/units/${id}`)
      .then(r => setUnit(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const submitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/leads', {
        ...form,
        source: 'unit_detail',
        interest: unit?.unit_type,
        message: `Enquiry for Unit ${unit?.unit_number}: ${form.message}`,
      })
      setSubmitted(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full" />
    </div>
  )

  if (!unit) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl text-gray-400 mb-4">Unit not found</p>
        <Link href="/units" className="btn-primary">Browse Units</Link>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-brand-dark text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif font-bold text-brand-gold">Janapriya Upscale</Link>
          <nav className="hidden md:flex gap-6 text-sm">
            <Link href="/units" className="hover:text-brand-gold transition-colors">← Back to Units</Link>
          </nav>
          <div className="flex gap-3">
            <Link href="/login" className="btn-outline text-sm py-2 px-4">Login</Link>
            <Link href="/site-visit" className="btn-primary text-sm py-2 px-4">Book Visit</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-400 mb-6 flex gap-2">
          <Link href="/" className="hover:text-brand-gold">Home</Link>
          <span>/</span>
          <Link href="/units" className="hover:text-brand-gold">Units</Link>
          <span>/</span>
          <span className="text-gray-700">{unit.unit_number}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <div className="bg-gray-100 rounded-2xl h-80 flex items-center justify-center text-gray-300 relative">
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              <div className="absolute top-4 left-4 flex gap-2">
                {unit.is_trending && <span className="badge-trending">🔥 Trending</span>}
                <span className={unit.status === 'available' ? 'badge-available' : 'badge-booked'}>
                  {unit.status}
                </span>
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">
                {unit.unit_type} — Unit {unit.unit_number}
              </h1>
              <p className="text-gray-500 mt-1">Floor {unit.floor_number} · {unit.facing} Facing</p>
            </div>

            {/* Specs Grid */}
            <div className="card p-6">
              <h2 className="font-semibold text-lg mb-4">Unit Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Unit Type', value: unit.unit_type },
                  { label: 'Bedrooms', value: unit.bedrooms ? `${unit.bedrooms} BHK` : null },
                  { label: 'Bathrooms', value: unit.bathrooms },
                  { label: 'Balconies', value: unit.balconies },
                  { label: 'Super Area', value: unit.area_sqft ? `${unit.area_sqft} sqft` : null },
                  { label: 'Carpet Area', value: unit.carpet_area ? `${unit.carpet_area} sqft` : null },
                  { label: 'Plot Area', value: unit.plot_area ? `${unit.plot_area} sqft` : null },
                  { label: 'Floor', value: unit.floor_number },
                  { label: 'Facing', value: unit.facing },
                  { label: 'Price/sqft', value: unit.price_per_sqft ? `₹${unit.price_per_sqft}` : null },
                  { label: 'Status', value: unit.status },
                  { label: 'Views', value: unit.view_count },
                ].filter(item => item.value !== null && item.value !== undefined).map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="font-semibold text-gray-900 capitalize">{String(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {unit.amenities?.length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold text-lg mb-4">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {unit.amenities.map(a => (
                    <span key={a} className="bg-brand-light border border-gray-200 text-gray-700 text-sm px-3 py-1 rounded-full">
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Sidebar */}
          <div className="space-y-4">
            {/* Price Card */}
            <div className="card p-6 sticky top-4">
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-brand-gold">{formatPrice(unit.base_price)}</p>
                {unit.price_per_sqft && (
                  <p className="text-gray-400 text-sm mt-1">₹{unit.price_per_sqft}/sqft</p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Down Payment</span>
                  <span className="font-semibold text-sm">{formatPrice(unit.down_payment)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">EMI (est.)</span>
                  <span className="font-semibold text-sm">{formatPrice(unit.emi_estimate)}/mo</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 text-sm">Status</span>
                  <span className={`text-sm font-semibold ${unit.status === 'available' ? 'text-green-600' : 'text-red-500'}`}>
                    {unit.status}
                  </span>
                </div>
              </div>

              {unit.status === 'available' && (
                <div className="space-y-3">
                  <button onClick={() => setShowEnquiry(!showEnquiry)}
                    className="btn-primary w-full text-center">
                    📩 Enquire Now
                  </button>
                  <Link href="/site-visit" className="btn-outline w-full text-center block">
                    🏠 Book Site Visit
                  </Link>
                </div>
              )}

              {/* Enquiry Form */}
              {showEnquiry && !submitted && (
                <form onSubmit={submitEnquiry} className="mt-4 space-y-3">
                  <input required placeholder="Your Name" value={form.name}
                    onChange={e => setForm(f => ({...f, name: e.target.value}))}
                    className="input text-sm" />
                  <input required placeholder="Phone Number" value={form.phone}
                    onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                    className="input text-sm" />
                  <input placeholder="Email (optional)" value={form.email}
                    onChange={e => setForm(f => ({...f, email: e.target.value}))}
                    className="input text-sm" />
                  <textarea placeholder="Message" rows={2} value={form.message}
                    onChange={e => setForm(f => ({...f, message: e.target.value}))}
                    className="input text-sm resize-none" />
                  <button type="submit" disabled={submitting} className="btn-primary w-full">
                    {submitting ? 'Sending...' : 'Send Enquiry'}
                  </button>
                </form>
              )}

              {submitted && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-green-700 font-semibold">✅ Enquiry sent!</p>
                  <p className="text-green-600 text-sm">Our team will contact you shortly.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
