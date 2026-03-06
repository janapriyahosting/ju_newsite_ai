'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })
      setAuth(res.data.access_token, res.data.customer)
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-serif font-bold text-brand-gold">
            Janapriya Upscale
          </Link>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">Get Started</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input required placeholder="Ravi Kumar"
                value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
                className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input placeholder="9876543210"
                value={form.phone}
                onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({...f, password: e.target.value}))}
                className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" required placeholder="••••••••"
                value={form.confirm}
                onChange={e => setForm(f => ({...f, confirm: e.target.value}))}
                className="input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-gold hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
