'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Project } from '@/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data.items || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen">
      <header className="bg-brand-dark text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif font-bold text-brand-gold">Janapriya Upscale</Link>
          <nav className="hidden md:flex gap-6 text-sm">
            <Link href="/projects" className="text-brand-gold">Projects</Link>
            <Link href="/units" className="hover:text-brand-gold">Units</Link>
            <Link href="/search" className="hover:text-brand-gold">Search</Link>
          </nav>
          <div className="flex gap-3">
            <Link href="/login" className="btn-outline text-sm py-2 px-4">Login</Link>
            <Link href="/site-visit" className="btn-primary text-sm py-2 px-4">Book Visit</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-serif font-bold mb-2">Our Projects</h1>
        <p className="text-gray-500 mb-8">Explore our premium residential projects in Hyderabad</p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="bg-gray-200 h-52" />
                <div className="p-5 space-y-3">
                  <div className="bg-gray-200 h-5 rounded w-3/4" />
                  <div className="bg-gray-200 h-4 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <div className="card overflow-hidden cursor-pointer group">
                  <div className="bg-gray-100 h-52 flex items-center justify-center text-gray-300">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-lg">{p.name}</h3>
                      {p.is_featured && <span className="badge-trending text-xs">⭐ Featured</span>}
                    </div>
                    <p className="text-gray-500 text-sm mb-3">📍 {p.location}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.amenities?.slice(0, 4).map(a => (
                        <span key={a} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">{a}</span>
                      ))}
                    </div>
                    {p.rera_number && <p className="text-xs text-gray-400">RERA: {p.rera_number}</p>}
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
