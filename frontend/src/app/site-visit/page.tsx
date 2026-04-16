'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { customerApi } from '@/lib/customerAuth'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
]

export default function SiteVisitPage() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    visit_date: '', visit_time: '', notes: '', consent: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); }
  }, [countdown])

  useEffect(() => { if (otpStep) otpRefs.current[0]?.focus(); }, [otpStep])

  const update = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); }
  function cleanPhone(p: string) { return p.replace(/\D/g, '').replace(/^91/, ''); }

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters'
    const ph = cleanPhone(form.phone)
    if (!ph) e.phone = 'Phone number is required'
    else if (ph.length !== 10) e.phone = 'Enter a valid 10-digit mobile number'
    else if (!/^[6-9]\d{9}$/.test(ph)) e.phone = 'Enter a valid Indian mobile number'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'
    if (!form.visit_date) e.visit_date = 'Please select a date'
    if (!form.visit_time) e.visit_time = 'Please select a time slot'
    if (!form.consent) e.consent = 'Please provide your consent to continue'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setOtpLoading(true); setOtpError('')
    try {
      const res = await customerApi('/auth/send-otp', {
        method: 'POST', body: JSON.stringify({ phone: cleanPhone(form.phone), purpose: 'site_visit' }),
      })
      if (res.dev_otp) setDevOtp(res.dev_otp)
      setOtpStep(true); setCountdown(30)
    } catch (err: any) { setOtpError(err.message || 'Failed to send OTP') }
    finally { setOtpLoading(false) }
  }

  async function resendOtp() {
    setOtpLoading(true); setOtpError(''); setDevOtp(null)
    try {
      const res = await customerApi('/auth/send-otp', {
        method: 'POST', body: JSON.stringify({ phone: cleanPhone(form.phone), purpose: 'site_visit' }),
      })
      if (res.dev_otp) setDevOtp(res.dev_otp)
      setOtp(['', '', '', '', '', '']); setCountdown(30)
    } catch (err: any) { setOtpError(err.message || 'Failed to resend') }
    finally { setOtpLoading(false) }
  }

  function handleOtpChange(i: number, v: string) {
    if (v && !/^\d$/.test(v)) return
    const n = [...otp]; n[i] = v; setOtp(n)
    if (v && i < 5) otpRefs.current[i + 1]?.focus()
  }
  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }
  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (p.length === 6) { setOtp(p.split('')); otpRefs.current[5]?.focus() }
  }

  async function handleVerifyAndSubmit() {
    const code = otp.join('')
    if (code.length !== 6) { setOtpError('Enter the 6-digit OTP'); return }
    setOtpLoading(true); setOtpError(''); setSubmitError('')
    try {
      await customerApi('/auth/verify-phone', {
        method: 'POST', body: JSON.stringify({ phone: cleanPhone(form.phone), otp: code }),
      })
      await api.post('/site-visits', {
        name: form.name.trim(), phone: cleanPhone(form.phone),
        email: form.email.trim() || undefined, notes: form.notes.trim(),
        visit_date: new Date(form.visit_date).toISOString(), visit_time: form.visit_time,
      })
      setSubmitted(true)
    } catch (err: any) {
      setOtpError(err.message || err.response?.data?.detail || 'Failed')
    } finally { setOtpLoading(false) }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#29A9DF] bg-white'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'
  const errCls = 'text-red-500 text-xs mt-1'

  if (submitted) return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F8F9FB" }}>
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🏠</div>
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-3">Visit Confirmed!</h1>
        <p className="text-gray-500 mb-2">
          Thank you <strong>{form.name}</strong>! Your site visit is scheduled for
        </p>
        <div className="bg-white rounded-2xl p-6 shadow-md my-6 space-y-2">
          <p className="font-bold text-lg" style={{ color: "#2A3887" }}>
            {new Date(form.visit_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-gray-600">{form.visit_time}</p>
        </div>
        <p className="text-gray-500 text-sm mb-8">Our team will call you on <strong>+91 {cleanPhone(form.phone)}</strong> to confirm.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="btn-primary">Back to Home</Link>
          <Link href="/units" className="btn-outline">Browse Units</Link>
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen" style={{ background: "#F8F9FB" }}>
      <Navbar />
      <header className="pt-16 text-white shadow-lg" style={{ background: "linear-gradient(135deg, #262262, #2A3887)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif font-bold" style={{ color: "#29A9DF" }}>Janapriya Upscale</Link>
          <Link href="/" className="text-sm text-gray-300 hover:text-[#29A9DF]">← Back to Home</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🏠</div>
          <h1 className="text-4xl font-serif font-bold mb-3" style={{ color: "#2A3887" }}>Book a Site Visit</h1>
          <p className="text-gray-500">Come see your dream home in person. Our team will guide you through the property.</p>
        </div>

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

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Details</h2>

          {submitError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{submitError}</div>}
          {otpError && <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}>{otpError}</div>}
          {devOtp && <div className="px-4 py-2 rounded-xl text-xs mb-4" style={{ background: '#FEF9C3', color: '#92400E', border: '1px solid #FDE68A' }}>Dev OTP: <strong>{devOtp}</strong></div>}

          <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                <input placeholder="Ravi Kumar" value={form.name} onChange={e => update('name', e.target.value)}
                  disabled={otpStep} className={`${inputCls} ${errors.name ? '!border-red-400' : ''} disabled:opacity-60 disabled:bg-gray-100`} />
                {errors.name && <p className={errCls}>{errors.name}</p>}
              </div>
              <div>
                <label className={labelCls}>Phone <span className="text-red-500">*</span></label>
                <input placeholder="98765 43210" value={form.phone} onChange={e => update('phone', e.target.value)}
                  disabled={otpStep} maxLength={13} className={`${inputCls} ${errors.phone ? '!border-red-400' : ''} disabled:opacity-60 disabled:bg-gray-100`} />
                {errors.phone && <p className={errCls}>{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)}
                disabled={otpStep} className={`${inputCls} ${errors.email ? '!border-red-400' : ''} disabled:opacity-60 disabled:bg-gray-100`} />
              {errors.email && <p className={errCls}>{errors.email}</p>}
            </div>

            <div>
              <label className={labelCls}>Preferred Date <span className="text-red-500">*</span></label>
              <input type="date" min={minDate} value={form.visit_date} onChange={e => update('visit_date', e.target.value)}
                disabled={otpStep} className={`${inputCls} ${errors.visit_date ? '!border-red-400' : ''} disabled:opacity-60 disabled:bg-gray-100`} />
              {errors.visit_date && <p className={errCls}>{errors.visit_date}</p>}
            </div>

            <div>
              <label className={`${labelCls} mb-2`}>Preferred Time <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {TIME_SLOTS.map(slot => (
                  <button key={slot} type="button" disabled={otpStep}
                    onClick={() => update('visit_time', slot)}
                    className={`py-2 px-3 rounded-lg text-sm border transition-colors disabled:opacity-60 ${
                      form.visit_time === slot ? 'text-white border-[#2A3887]' : 'border-gray-300 text-gray-600 hover:border-[#29A9DF]'
                    }`}
                    style={form.visit_time === slot ? { background: "#2A3887" } : {}}>{slot}</button>
                ))}
              </div>
              {errors.visit_time && <p className={errCls}>{errors.visit_time}</p>}
            </div>

            <div>
              <label className={labelCls}>What are you looking for?</label>
              <textarea rows={3} placeholder="e.g. 2BHK apartment, budget around 60 lakhs, east facing preferred..."
                value={form.notes} onChange={e => update('notes', e.target.value)}
                disabled={otpStep} className={`${inputCls} resize-none disabled:opacity-60 disabled:bg-gray-100`} />
            </div>

            {/* Consent */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.consent} onChange={e => update('consent', e.target.checked)}
                  disabled={otpStep} className="mt-0.5 w-4 h-4 accent-[#2A3887] flex-shrink-0" />
                <span className={`text-xs leading-relaxed ${errors.consent ? 'text-red-500' : 'text-gray-500'}`}>
                  I consent to Janapriya contacting me via phone calls, SMS, WhatsApp, and email regarding my site visit and property updates. I can opt out at any time.
                </span>
              </label>
              {errors.consent && <p className={`${errCls} ml-7`}>{errors.consent}</p>}
            </div>

            {/* Inline OTP */}
            {otpStep ? (
              <div className="border-t border-gray-200 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">OTP sent to <strong>+91 {cleanPhone(form.phone)}</strong></p>
                  <button type="button" onClick={() => { setOtpStep(false); setOtp(['','','','','','']); setOtpError(''); setDevOtp(null); }}
                    className="text-xs hover:underline" style={{ color: '#29A9DF' }}>Change</button>
                </div>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={el => { otpRefs.current[i] = el; }}
                      type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl focus:outline-none transition-all"
                      style={{ background: '#fff', border: `1.5px solid ${digit ? '#2A3887' : '#E2F1FC'}`, color: '#333' }} />
                  ))}
                </div>
                <button type="button" onClick={handleVerifyAndSubmit} disabled={otpLoading || otp.join('').length !== 6}
                  className="btn-primary w-full text-lg py-4 disabled:opacity-50">
                  {otpLoading ? 'Verifying...' : 'Verify & Confirm Site Visit'}
                </button>
                <div className="text-center">
                  {countdown > 0
                    ? <p className="text-xs text-gray-400">Resend OTP in {countdown}s</p>
                    : <button type="button" onClick={resendOtp} disabled={otpLoading} className="text-xs font-bold hover:underline" style={{ color: '#29A9DF' }}>Resend OTP</button>}
                </div>
              </div>
            ) : (
              <button type="submit" disabled={otpLoading}
                className="btn-primary w-full text-lg py-4 disabled:opacity-50">
                {otpLoading ? 'Sending OTP...' : 'Confirm Site Visit'}
              </button>
            )}

            <p className="text-center text-xs text-gray-400">
              By submitting, you agree to be contacted by our team regarding your visit.
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}
