'use client'
import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
]

export default function SiteVisitPage() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    visit_date: '', visit_time: '', notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Min date = tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/site-visits', {
        ...form,
        visit_date: new Date(form.visit_date).toISOString(),
      })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return (
    <main className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🏠</div>
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-3">Visit Confirmed!</h1>
        <p className="text-gray-500 mb-2">
          Thank you <strong>{form.name}</strong>! Your site visit is scheduled for
        </p>
        <div className="bg-white rounded-2xl p-6 shadow-md my-6 space-y-2">
          <p className="text-brand-gold font-bold text-lg">
            {new Date(form.visit_date).toLocaleDateString('en-IN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
          <p className="text-gray-600">{form.visit_time}</p>
        </div>
        <p className="text-gray-500 text-sm mb-8">
          Our team will call you on <strong>{form.phone}</strong> to confirm.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="btn-primary">Back to Home</Link>
          <Link href="/units" className="btn-outline">Browse Units</Link>
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-brand-light">
      <header className="bg-brand-dark text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif font-bold text-brand-gold">
            Janapriya Upscale
          </Link>
          <Link href="/" className="text-sm text-gray-300 hover:text-brand-gold">← Back to Home</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🏠</div>
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-3">Book a Site Visit</h1>
          <p className="text-gray-500">
            Come see your dream home in person. Our team will guide you through the property.
          </p>
        </div>

        {/* Why Visit */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: '🎯', title: 'Expert Guide', desc: 'Personal property tour' },
            { icon: '⏰', title: 'Flexible Timing', desc: '10 AM – 5 PM, Mon–Sun' },
            { icon: '🆓', title: 'Free Visit', desc: 'No charges, no obligation' },
          ].map(item => (
            <div key={item.title} className="card p-4 text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-semibold text-sm text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Details</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input required placeholder="Ravi Kumar"
                  value={form.name} onChange={e => update('name', e.target.value)}
                  className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input required placeholder="9876543210"
                  value={form.phone} onChange={e => update('phone', e.target.value)}
                  className="input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" placeholder="you@example.com"
                value={form.email} onChange={e => update('email', e.target.value)}
                className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Date <span className="text-red-500">*</span>
              </label>
              <input required type="date" min={minDate}
                value={form.visit_date} onChange={e => update('visit_date', e.target.value)}
                className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Time <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {TIME_SLOTS.map(slot => (
                  <button key={slot} type="button"
                    onClick={() => update('visit_time', slot)}
                    className={`py-2 px-3 rounded-lg text-sm border transition-colors ${
                      form.visit_time === slot
                        ? 'bg-brand-gold text-white border-brand-gold'
                        : 'border-gray-300 text-gray-600 hover:border-brand-gold'
                    }`}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What are you looking for?
              </label>
              <textarea rows={3} placeholder="e.g. 2BHK apartment, budget around 60 lakhs, east facing preferred..."
                value={form.notes} onChange={e => update('notes', e.target.value)}
                className="input resize-none" />
            </div>

            <button type="submit" disabled={loading || !form.visit_time || !form.visit_date}
              className="btn-primary w-full text-lg py-4">
              {loading ? 'Booking...' : '✅ Confirm Site Visit'}
            </button>

            <p className="text-center text-xs text-gray-400">
              By submitting, you agree to be contacted by our team regarding your visit.
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}
