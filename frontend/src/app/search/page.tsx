'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Unit } from '@/types'

function formatPrice(price: string | undefined) {
  if (!price) return 'POA'
  const num = parseFloat(price)
  if (num >= 10000000) return `₹${(num/10000000).toFixed(1)} Cr`
  if (num >= 100000) return `₹${(num/100000).toFixed(1)} L`
  return `₹${num.toLocaleString()}`
}

const SUGGESTIONS = [
  '2BHK under 60 lakhs east facing',
  '3BHK with gym and swimming pool',
  'Affordable 1BHK under 35 lakhs',
  'Luxury 4BHK on high floor',
  'Plot in Shamshabad under 50 lakhs',
  '3BHK with EMI under 50000',
  '2BHK with down payment under 6 lakhs',
  'North facing 3BHK above 10th floor',
]

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Unit[] | null>(null)
  const [total, setTotal] = useState(0)
  const [message, setMessage] = useState('')
  const [interpreted, setInterpreted] = useState<Record<string,any> | null>(null)
  const [hasApiKey, setHasApiKey] = useState(true)

  const search = async (q: string) => {
    if (!q.trim()) return
    setQuery(q)
    setLoading(true)
    setResults(null)
    setMessage('')
    setInterpreted(null)
    try {
      const res = await api.post('/search/nlp', { query: q })
      setResults(res.data.items || [])
      setTotal(res.data.total || 0)
      setMessage(res.data.message || '')
      setInterpreted(res.data.interpreted_as || null)
    } catch (err: any) {
      if (err.response?.status === 500) {
        setHasApiKey(false)
        setMessage('Claude API key not configured. Using filter search instead.')
        // Fallback to filter search
        try {
          const fallback = await api.post('/search/filter', {})
          setResults(fallback.data.items || [])
          setTotal(fallback.data.total || 0)
        } catch {}
      } else {
        setMessage('Search failed. Please try again.')
        setResults([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    search(query)
  }

  return (
    <main className="min-h-screen">
      <header className="bg-brand-dark text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif font-bold text-brand-gold">Janapriya Upscale</Link>
          <nav className="hidden md:flex gap-6 text-sm">
            <Link href="/units" className="hover:text-brand-gold">Units</Link>
            <Link href="/projects" className="hover:text-brand-gold">Projects</Link>
            <Link href="/search" className="text-brand-gold">Search</Link>
          </nav>
          <div className="flex gap-3">
            <Link href="/login" className="btn-outline text-sm py-2 px-4">Login</Link>
            <Link href="/site-visit" className="btn-primary text-sm py-2 px-4">Book Visit</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-3">
        <button onClick={() => router.back()}
          className="text-xs font-semibold flex items-center gap-1 transition-colors hover:text-[#2A3887]"
          style={{ color: '#94a3b8' }}>
          ← Back
        </button>
      </div>

      {/* Search Hero */}
      <section className="bg-gradient-to-br from-brand-dark to-gray-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-4xl mb-3">🤖</div>
          <h1 className="text-4xl font-serif font-bold mb-3">
            AI-Powered Search
          </h1>
          <p className="text-gray-300 mb-8">
            Describe your dream home in plain English — our AI understands you
          </p>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='e.g. "2BHK under 60 lakhs east facing with gym"'
              className="flex-1 input text-gray-900"
              autoFocus
            />
            <button type="submit" disabled={loading || !query.trim()}
              className="btn-primary whitespace-nowrap px-8">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Searching...
                </span>
              ) : 'Search'}
            </button>
          </form>

          {!hasApiKey && (
            <div className="mt-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 text-sm text-yellow-200">
              ⚠️ Add your ANTHROPIC_API_KEY to .env to enable AI search
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Suggestions */}
        {results === null && !loading && (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Try these searches:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => search(s)}
                  className="text-left p-4 bg-white rounded-xl border border-gray-200
                             hover:border-brand-gold hover:shadow-md transition-all group">
                  <span className="text-brand-gold mr-2 group-hover:mr-3 transition-all">→</span>
                  <span className="text-gray-700 text-sm">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">AI is analyzing your query...</p>
          </div>
        )}

        {/* Results */}
        {results !== null && !loading && (
          <div>
            {/* Result Header */}
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {total} units found
                    {query && <span className="text-gray-400 font-normal text-base ml-2">for "{query}"</span>}
                  </h2>
                  {message && (
                    <p className="text-gray-500 text-sm mt-1 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 inline-block mt-2">
                      🤖 {message}
                    </p>
                  )}
                </div>
                <button onClick={() => { setResults(null); setQuery('') }}
                  className="text-sm text-gray-400 hover:text-gray-600">
                  New Search
                </button>
              </div>

              {/* Interpreted Filters */}
              {interpreted && Object.keys(interpreted).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-400">Understood:</span>
                  {Object.entries(interpreted).map(([k, v]) => v && (
                    <span key={k} className="bg-brand-gold/10 text-brand-gold text-xs px-2 py-1 rounded-full">
                      {k.replace(/_/g, ' ')}: {String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-2xl text-gray-300 mb-3">No units found</p>
                <p className="text-gray-400 mb-6">Try a different search or browse all units</p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => { setResults(null); setQuery('') }}
                    className="btn-primary">Try Again</button>
                  <Link href="/units" className="btn-outline">Browse All Units</Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.map(unit => (
                  <Link key={unit.id} href={`/units/${unit.id}`}>
                    <div className="card p-5 cursor-pointer group">
                      <div className="bg-gray-100 rounded-xl h-40 mb-4 flex items-center justify-center text-gray-300 relative">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                        </svg>
                        <div className="absolute top-3 left-3 flex gap-1">
                          {unit.is_trending && <span className="badge-trending text-xs">🔥</span>}
                          <span className="badge-available text-xs">{unit.status}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{unit.unit_type} · {unit.unit_number}</h3>
                          <span className="text-brand-gold font-bold text-sm">{formatPrice(unit.base_price)}</span>
                        </div>
                        <div className="flex gap-3 text-sm text-gray-500 mb-2">
                          {unit.bedrooms && <span>🛏 {unit.bedrooms}</span>}
                          {unit.area_sqft && <span>📐 {unit.area_sqft} sqft</span>}
                          {unit.facing && <span>🧭 {unit.facing}</span>}
                        </div>
                        <div className="text-xs text-gray-400">
                          Floor {unit.floor_number} · EMI {formatPrice(unit.emi_estimate)}/mo
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
