'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { Project, Tower, Unit } from '@/types'

function formatPrice(price: string | undefined) {
  if (!price) return 'POA'
  const num = parseFloat(price)
  if (num >= 10000000) return `₹${(num/10000000).toFixed(1)} Cr`
  if (num >= 100000) return `₹${(num/100000).toFixed(1)} L`
  return `₹${num.toLocaleString()}`
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [towers, setTowers] = useState<Tower[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview'|'units'|'towers'>('overview')

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/towers`),
      api.get('/units', { params: { project_id: id, page_size: 50 } }),
    ]).then(([p, t, u]) => {
      setProject(p.data)
      setTowers(t.data.items || [])
      setUnits(u.data.items || [])
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full" />
    </div>
  )

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-xl">Project not found</p>
    </div>
  )

  const availableUnits = units.filter(u => u.status === 'available')

  return (
    <main className="min-h-screen">
      <header className="bg-brand-dark text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif font-bold text-brand-gold">Janapriya Upscale</Link>
          <nav className="hidden md:flex gap-6 text-sm">
            <Link href="/projects" className="hover:text-brand-gold">← Projects</Link>
          </nav>
          <div className="flex gap-3">
            <Link href="/login" className="btn-outline text-sm py-2 px-4">Login</Link>
            <Link href="/site-visit" className="btn-primary text-sm py-2 px-4">Book Visit</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-dark to-gray-800 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-sm text-gray-400 mb-4 flex gap-2">
            <Link href="/" className="hover:text-brand-gold">Home</Link>
            <span>/</span>
            <Link href="/projects" className="hover:text-brand-gold">Projects</Link>
            <span>/</span>
            <span>{project.name}</span>
          </div>
          <h1 className="text-4xl font-serif font-bold mb-2">{project.name}</h1>
          <p className="text-gray-300 text-lg mb-4">{project.location}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            {project.rera_number && (
              <span className="bg-white/10 px-3 py-1 rounded-full">RERA: {project.rera_number}</span>
            )}
            <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full">
              {availableUnits.length} units available
            </span>
            <span className="bg-white/10 px-3 py-1 rounded-full">
              {towers.length} tower{towers.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {(['overview','towers','units'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-brand-gold text-brand-gold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab} {tab === 'units' && `(${units.length})`}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {project.description && (
                <div className="card p-6">
                  <h2 className="font-semibold text-lg mb-3">About This Project</h2>
                  <p className="text-gray-600 leading-relaxed">{project.description}</p>
                </div>
              )}
              {project.amenities?.length > 0 && (
                <div className="card p-6">
                  <h2 className="font-semibold text-lg mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {project.amenities.map(a => (
                      <div key={a} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-brand-gold">✓</span> {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {project.address && (
                <div className="card p-6">
                  <h2 className="font-semibold text-lg mb-3">Location</h2>
                  <p className="text-gray-600">{project.address}</p>
                  <p className="text-gray-500 text-sm mt-1">{project.city}, {project.state} — {project.pincode}</p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="card p-6">
                <h3 className="font-semibold mb-4">Quick Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">City</span>
                    <span className="font-medium">{project.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Towers</span>
                    <span className="font-medium">{towers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Units</span>
                    <span className="font-medium">{units.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Available</span>
                    <span className="font-medium text-green-600">{availableUnits.length}</span>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <Link href="/site-visit" className="btn-primary w-full text-center block">🏠 Book Site Visit</Link>
                  <Link href="/contact" className="btn-outline w-full text-center block">📞 Contact Us</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Towers Tab */}
        {activeTab === 'towers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {towers.map(tower => (
              <div key={tower.id} className="card p-6">
                <h3 className="font-semibold text-lg mb-2">{tower.name}</h3>
                {tower.description && <p className="text-gray-500 text-sm mb-4">{tower.description}</p>}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Floors</p>
                    <p className="font-semibold">{tower.total_floors}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Total Units</p>
                    <p className="font-semibold">{tower.total_units}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Units Tab */}
        {activeTab === 'units' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {units.map(unit => (
              <Link key={unit.id} href={`/units/${unit.id}`}>
                <div className="card p-5 cursor-pointer hover:border hover:border-brand-gold transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{unit.unit_type} — {unit.unit_number}</h3>
                      <p className="text-gray-400 text-xs">Floor {unit.floor_number} · {unit.facing}</p>
                    </div>
                    <span className={unit.status === 'available' ? 'badge-available' : 'badge-booked'}>
                      {unit.status}
                    </span>
                  </div>
                  <div className="flex gap-3 text-sm text-gray-500 mb-3">
                    {unit.bedrooms && <span>🛏 {unit.bedrooms}</span>}
                    {unit.area_sqft && <span>📐 {unit.area_sqft} sqft</span>}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-gold font-bold">{formatPrice(unit.base_price)}</span>
                    <span className="text-xs text-gray-400">EMI {formatPrice(unit.emi_estimate)}/mo</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
