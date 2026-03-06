'use client'
import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

const BUDGETS = [
  'Under ₹30 Lakhs', '₹30–50 Lakhs', '₹50–75 Lakhs',
  '₹75L–1 Cr', '₹1–2 Cr', 'Above ₹2 Cr'
]

const INTERESTS = ['1BHK', '2BHK', '3BHK', '4BHK', 'Villa', 'Plot', 'Not sure yet']

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    interest: '', budget_min: '', budget_max: '',
    message: '', utm_source: 'contact_page'
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [selectedBudget, setSelectedBudget] = useState('')

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const selectBudget = (b: string) => {
    setSelectedBudget(b)
    const map: Record<string, [string, string]> = {
      'Under ₹30 Lakhs':  ['0', '3000000'],
      '₹30–50 Lakhs':     ['3000000', '5000000'],
      '₹50–75 Lakhs':     ['5000000', '7500000'],
      '₹75L–1 Cr':        ['7500000', '10000000'],
      '₹1–2 Cr':          ['10000000', '20000000'],
      'Above ₹2 Cr':      ['20000000', ''],
    }
    if (map[b]) {
      setForm(f => ({ ...f, budget_min: map[b][0], budget_max: map[b][1] }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/leads', form)
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
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-3">We'll Be in Touch!</h1>
        <p className="text-gray-500 mb-8">
          Thank you <strong>{form.name}</strong>! Our property expert will call you
          on <strong>{form.phone}</strong> within 24 hours.
        </p>
        <div className="bg-white rounded-2xl p-6 shadow-md mb-8 text-left space-y-3">
          {form.interest && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Interest</span>
              <span className="font-medium">{form.interest}</span>
            </div>
          )}
          {selectedBudget && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Budget</span>
              <span className="font-medium">{selectedBudget}</span>
            </div>
          )}
        </div>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="btn-primary">Browse Properties</Link>
          <Link href="/site-visit" className="btn-outline">Book Site Visit</Link>
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

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Left Info */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-serif font-bold text-gray-900 mb-3">Talk to an Expert</h1>
              <p className="text-gray-500">
                Our property advisors are ready to help you find the perfect home.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { icon: '📞', title: 'Call Us', info: '+91 98765 43210', sub: 'Mon–Sun, 9AM–7PM' },
                { icon: '📧', title: 'Email Us', info: 'sales@janapriyaupscale.com', sub: 'Reply within 2 hours' },
                { icon: '📍', title: 'Visit Us', info: 'Kondapur Main Road', sub: 'Hyderabad, Telangana 500084' },
              ].map(item => (
                <div key={item.title} className="flex gap-4">
                  <div className="text-2xl">{item.icon}</div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-gray-700 text-sm">{item.info}</p>
                    <p className="text-gray-400 text-xs">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="card p-5 bg-brand-dark text-white">
              <p className="font-serif font-bold text-lg text-brand-gold mb-2">Free Consultation</p>
              <p className="text-gray-300 text-sm">
                No charges. No spam. Just expert guidance to help you make the right decision.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2 card p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Send an Enquiry</h2>

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

              {/* Interest */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I'm looking for
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(i => (
                    <button key={i} type="button"
                      onClick={() => update('interest', form.interest === i ? '' : i)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        form.interest === i
                          ? 'bg-brand-gold text-white border-brand-gold'
                          : 'border-gray-300 text-gray-600 hover:border-brand-gold'
                      }`}>
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {BUDGETS.map(b => (
                    <button key={b} type="button"
                      onClick={() => selectBudget(b)}
                      className={`py-2 px-3 rounded-lg text-sm border transition-colors ${
                        selectedBudget === b
                          ? 'bg-brand-gold text-white border-brand-gold'
                          : 'border-gray-300 text-gray-600 hover:border-brand-gold'
                      }`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea rows={4}
                  placeholder="Tell us more about what you're looking for — location preference, move-in timeline, specific requirements..."
                  value={form.message} onChange={e => update('message', e.target.value)}
                  className="input resize-none" />
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full text-lg py-4">
                {loading ? 'Sending...' : '📩 Send Enquiry'}
              </button>

              <p className="text-center text-xs text-gray-400">
                We respect your privacy. Your information will never be shared.
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
