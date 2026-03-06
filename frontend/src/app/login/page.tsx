'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', form)
      setAuth(res.data.access_token, res.data.customer)
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
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
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">Welcome Back</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
                className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({...f, password: e.target.value}))}
                className="input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-brand-gold hover:underline font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
