'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Unit, Project } from '@/types'

function formatPrice(price: string | undefined) {
  if (!price) return 'Price on request'
  const num = parseFloat(price)
  if (num >= 10000000) return `₹${(num/10000000).toFixed(1)} Cr`
  if (num >= 100000) return `₹${(num/100000).toFixed(1)} L`
  return `₹${num.toLocaleString()}`
}

function UnitCard({ unit }: { unit: Unit }) {
  return (
    <Link href={`/units/${unit.id}`}>
      <div className="card p-5 cursor-pointer group">
        <div className="relative bg-gray-100 rounded-xl h-44 mb-4 overflow-hidden">
          {unit.images?.[0] ? (
            <img src={unit.images[0]} alt={unit.unit_number}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            {unit.is_trending && <span className="badge-trending">🔥 Trending</span>}
            <span className="badge-available">{unit.status}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-900">{unit.unit_type} — {unit.unit_number}</h3>
            <span className="text-brand-gold font-bold">{formatPrice(unit.base_price)}</span>
          </div>
          <div className="flex gap-4 text-sm text-gray-500">
            {unit.bedrooms && <span>🛏 {unit.bedrooms} Bed</span>}
            {unit.bathrooms && <span>🚿 {unit.bathrooms} Bath</span>}
            {unit.area_sqft && <span>📐 {unit.area_sqft} sqft</span>}
          </div>
          {unit.facing && (
            <p className="text-xs text-gray-400">{unit.facing} facing · Floor {unit.floor_number}</p>
          )}
          <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500">
            <span>Down payment: {formatPrice(unit.down_payment)}</span>
            <span>EMI: {formatPrice(unit.emi_estimate)}/mo</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="card overflow-hidden cursor-pointer group">
        <div className="bg-gray-100 h-48 overflow-hidden">
          {project.images?.[0] ? (
            <img src={project.images[0]} alt={project.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-semibold text-lg text-gray-900 mb-1">{project.name}</h3>
          <p className="text-gray-500 text-sm mb-3">{project.location}</p>
          {project.amenities?.slice(0, 3).map((a) => (
            <span key={a} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded mr-1 mb-1">{a}</span>
          ))}
          {project.rera_number && (
            <p className="text-xs text-gray-400 mt-2">RERA: {project.rera_number}</p>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [trending, setTrending] = useState<Unit[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Unit[] | null>(null)
  const [searchMessage, setSearchMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/projects'),
      api.get('/units/trending?limit=6'),
    ]).then(([p, u]) => {
      setProjects(p.data.items)
      setTrending(u.data.items)
    }).finally(() => setLoading(false))
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await api.post('/search/nlp', { query: searchQuery })
      setSearchResults(res.data.items)
      setSearchMessage(res.data.message || `Found ${res.data.total} units`)
    } catch {
      setSearchMessage('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-brand-dark text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif font-bold text-brand-gold">
            Janapriya Upscale
          </Link>
          <nav className="hidden md:flex gap-6 text-sm">
            <Link href="/projects" className="hover:text-brand-gold transition-colors">Projects</Link>
            <Link href="/units" className="hover:text-brand-gold transition-colors">Units</Link>
            <Link href="/search" className="hover:text-brand-gold transition-colors">Search</Link>
            <Link href="/contact" className="hover:text-brand-gold transition-colors">Contact</Link>
          </nav>
          <div className="flex gap-3">
            <Link href="/login" className="btn-outline text-sm py-2 px-4">Login</Link>
            <Link href="/site-visit" className="btn-primary text-sm py-2 px-4">Book Visit</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-dark via-gray-900 to-brand-dark text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-4">
            Find Your <span className="text-brand-gold">Dream Home</span>
          </h1>
          <p className="text-gray-300 text-xl mb-10">
            Premium apartments, villas and plots in Hyderabad
          </p>

          {/* NLP Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Try "2BHK under 60 lakhs east facing" or "3BHK with gym near Kondapur"'
              className="flex-1 input text-gray-900 text-sm"
            />
            <button type="submit" disabled={searching}
              className="btn-primary whitespace-nowrap">
              {searching ? 'Searching...' : '🔍 Search'}
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-3 mt-6 text-sm">
            {['2BHK under 60L', '3BHK east facing', 'Plots in Shamshabad', '4BHK with pool'].map((s) => (
              <button key={s} onClick={() => setSearchQuery(s)}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">

        {/* Search Results */}
        {searchResults && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold">Search Results</h2>
                {searchMessage && <p className="text-gray-500 text-sm mt-1">{searchMessage}</p>}
              </div>
              <button onClick={() => setSearchResults(null)}
                className="text-sm text-gray-400 hover:text-gray-600">
                Clear ✕
              </button>
            </div>
            {searchResults.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-xl">No units found</p>
                <p className="text-sm mt-2">Try a different search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((u) => <UnitCard key={u.id} unit={u} />)}
              </div>
            )}
          </section>
        )}

        {/* Trending Units */}
        {!searchResults && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold">🔥 Trending Units</h2>
              <Link href="/units?trending=true" className="text-brand-gold text-sm hover:underline">
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card p-5 animate-pulse">
                    <div className="bg-gray-200 h-44 rounded-xl mb-4" />
                    <div className="space-y-2">
                      <div className="bg-gray-200 h-4 rounded w-3/4" />
                      <div className="bg-gray-200 h-4 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trending.map((u) => <UnitCard key={u.id} unit={u} />)}
              </div>
            )}
          </section>
        )}

        {/* Projects */}
        {!searchResults && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold">Our Projects</h2>
              <Link href="/projects" className="text-brand-gold text-sm hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          </section>
        )}

        {/* Lead Capture */}
        {!searchResults && (
          <section className="bg-brand-dark text-white rounded-3xl p-10 text-center">
            <h2 className="text-3xl font-serif font-bold mb-3">
              Can't find what you're looking for?
            </h2>
            <p className="text-gray-300 mb-8">
              Tell us your requirements — our team will find the perfect unit for you
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
              <Link href="/contact" className="btn-primary text-center flex-1">
                📞 Talk to an Expert
              </Link>
              <Link href="/site-visit" className="btn-outline text-center flex-1">
                🏠 Book a Site Visit
              </Link>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-brand-dark text-gray-400 py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-serif text-brand-gold text-xl mb-2">Janapriya Upscale</p>
          <p className="text-sm">Premium Real Estate · Hyderabad</p>
          <p className="text-xs mt-4">© 2026 Janapriya Upscale. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
