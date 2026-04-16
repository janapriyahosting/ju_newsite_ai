'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Unit } from '@/types'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

function formatPrice(price: string | undefined) {
  if (!price) return 'POA'
  const num = parseFloat(price)
  if (num >= 10000000) return `₹${(num/10000000).toFixed(1)} Cr`
  if (num >= 100000) return `₹${(num/100000).toFixed(1)} L`
  return `₹${num.toLocaleString()}`
}

function UnitCard({ unit }: { unit: Unit }) {
  return (
    <Link href={`/units/${unit.id}`}>
      <div className="card p-5 cursor-pointer group h-full">
        <div className="relative bg-gray-100 rounded-xl h-44 mb-4 overflow-hidden flex items-center justify-center text-gray-300">
          {(unit as any).thumbnail || (Array.isArray(unit.images) && unit.images.length > 0) ? (
            <img src={((unit as any).thumbnail || unit.images[0]).split('/').map((s: string) => encodeURIComponent(s)).join('/')}
              alt={unit.unit_number} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
          )}
          <div className="absolute top-3 left-3 flex gap-2 flex-wrap" style={{ zIndex: 2 }}>
            {unit.is_trending && <span className="badge-trending">🔥 Trending</span>}
            <span className={unit.status === 'available' ? 'badge-available' : 'badge-booked'}>
              {unit.status}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-900">{unit.unit_type} · {unit.unit_number}</h3>
            <span className="text-brand-gold font-bold text-sm">{formatPrice((unit as any).custom_fields?.total_amount || unit.base_price)}</span>
          </div>
          <div className="flex gap-3 text-sm text-gray-500">
            {unit.bedrooms && <span>🛏 {unit.bedrooms}</span>}
            {unit.bathrooms && <span>🚿 {unit.bathrooms}</span>}
            {unit.area_sqft && <span>📐 {unit.area_sqft} sqft</span>}
            {unit.facing && <span>🧭 {unit.facing}</span>}
          </div>
          <p className="text-xs text-gray-400">Floor {unit.floor_number}</p>
          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-1 text-xs text-gray-500">
            <span>DP: {formatPrice(unit.down_payment)}</span>
            <span>EMI: {formatPrice(unit.emi_estimate)}/mo</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

const UNIT_TYPES = ['1BHK','2BHK','3BHK','4BHK','villa','plot']
const FACINGS = ['East','West','North','South']

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [filters, setFilters] = useState({
    unit_type: '',
    bedrooms: '',
    min_price: '',
    max_price: '',
    max_emi: '',
    max_down_payment: '',
    facing: '',
    status: 'available',
    is_trending: '',
  })

  const fetchUnits = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), page_size: '12' }
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const res = await api.get('/units', { params })
      setUnits(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { fetchUnits() }, [fetchUnits])

  const updateFilter = (key: string, value: string) => {
    setPage(1)
    setFilters(f => ({ ...f, [key]: value }))
  }

  const clearFilters = () => {
    setPage(1)
    setFilters({ unit_type:'', bedrooms:'', min_price:'', max_price:'',
      max_emi:'', max_down_payment:'', facing:'', status:'available', is_trending:'' })
  }

  const totalPages = Math.ceil(total / 12)

  return (
    <main className="min-h-screen">
      <Navbar />
      {/* Header */}
      <header className="pt-16 bg-brand-dark text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif font-bold text-brand-gold">Janapriya Upscale</Link>
          <nav className="hidden md:flex gap-6 text-sm">
            <Link href="/projects" className="hover:text-brand-gold transition-colors">Projects</Link>
            <Link href="/units" className="text-brand-gold">Units</Link>
            <Link href="/search" className="hover:text-brand-gold transition-colors">Search</Link>
            <Link href="/contact" className="hover:text-brand-gold transition-colors">Contact</Link>
          </nav>
          <div className="flex gap-3">
            <Link href="/login" className="btn-outline text-sm py-2 px-4">Login</Link>
            <Link href="/site-visit" className="btn-primary text-sm py-2 px-4">Book Visit</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold">Available Units</h1>
            <p className="text-gray-500 text-sm mt-1">{total} units found</p>
          </div>
          <Link href="/search" className="btn-primary text-sm py-2 px-4">🔍 NLP Search</Link>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="w-64 shrink-0 space-y-6">
            <div className="card p-5 space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Filters</h3>
                <button onClick={clearFilters} className="text-xs text-brand-gold hover:underline">Clear all</button>
              </div>

              {/* Unit Type */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit Type</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {UNIT_TYPES.map(t => (
                    <button key={t} onClick={() => updateFilter('unit_type', filters.unit_type === t ? '' : t)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        filters.unit_type === t
                          ? 'bg-brand-gold text-white border-brand-gold'
                          : 'border-gray-300 text-gray-600 hover:border-brand-gold'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price Range</label>
                <div className="space-y-2 mt-2">
                  <input type="number" placeholder="Min price (₹)"
                    value={filters.min_price}
                    onChange={e => updateFilter('min_price', e.target.value)}
                    className="input text-sm" />
                  <input type="number" placeholder="Max price (₹)"
                    value={filters.max_price}
                    onChange={e => updateFilter('max_price', e.target.value)}
                    className="input text-sm" />
                </div>
              </div>

              {/* Max EMI */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Max EMI / month</label>
                <input type="number" placeholder="e.g. 50000"
                  value={filters.max_emi}
                  onChange={e => updateFilter('max_emi', e.target.value)}
                  className="input text-sm mt-2" />
              </div>

              {/* Max Down Payment */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Max Down Payment</label>
                <input type="number" placeholder="e.g. 500000"
                  value={filters.max_down_payment}
                  onChange={e => updateFilter('max_down_payment', e.target.value)}
                  className="input text-sm mt-2" />
              </div>

              {/* Facing */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Facing</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {FACINGS.map(f => (
                    <button key={f} onClick={() => updateFilter('facing', filters.facing === f ? '' : f)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        filters.facing === f
                          ? 'bg-brand-gold text-white border-brand-gold'
                          : 'border-gray-300 text-gray-600 hover:border-brand-gold'
                      }`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trending */}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="trending"
                  checked={filters.is_trending === 'true'}
                  onChange={e => updateFilter('is_trending', e.target.checked ? 'true' : '')}
                  className="rounded" />
                <label htmlFor="trending" className="text-sm text-gray-700">🔥 Trending only</label>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}
                  className="input text-sm mt-2">
                  <option value="available">Available</option>
                  <option value="">All</option>
                  <option value="booked">Booked</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Units Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="card p-5 animate-pulse">
                    <div className="bg-gray-200 h-44 rounded-xl mb-4" />
                    <div className="space-y-2">
                      <div className="bg-gray-200 h-4 rounded w-3/4" />
                      <div className="bg-gray-200 h-4 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : units.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-2xl mb-2">No units found</p>
                <p className="text-sm">Try adjusting your filters</p>
                <button onClick={clearFilters} className="btn-primary mt-4 text-sm">Clear Filters</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {units.map(u => <UnitCard key={u.id} unit={u} />)}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:border-brand-gold">
                      ← Prev
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:border-brand-gold">
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
