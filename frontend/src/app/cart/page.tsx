'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Unit } from '@/types'

function formatPrice(price: string | undefined) {
  if (!price) return 'POA'
  const num = parseFloat(price)
  if (num >= 10000000) return `₹${(num/10000000).toFixed(2)} Cr`
  if (num >= 100000) return `₹${(num/100000).toFixed(2)} L`
  return `₹${num.toLocaleString()}`
}

interface CartItem {
  id: string
  unit_id: string
  customer_id: string
  unit?: Unit
  created_at: string
  updated_at: string
}

export default function CartPage() {
  const router = useRouter()
  const { isLoggedIn, loadFromStorage } = useAuthStore()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFromStorage()
  }, [])

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login?redirect=/cart')
      return
    }
    api.get('/cart').then(r => {
      setItems(r.data.items || [])
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [isLoggedIn])

  const removeItem = async (itemId: string) => {
    try {
      await api.delete(`/cart/${itemId}`)
      setItems(prev => prev.filter(i => i.id !== itemId))
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full" />
    </div>
  )

  return (
    <main className="min-h-screen bg-brand-light">
      <header className="bg-brand-dark text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif font-bold text-brand-gold">Janapriya Upscale</Link>
          <Link href="/units" className="text-sm text-gray-300 hover:text-brand-gold">← Continue Browsing</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-serif font-bold mb-2">Your Shortlist</h1>
        <p className="text-gray-500 mb-8">{items.length} unit{items.length !== 1 ? 's' : ''} saved</p>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏠</div>
            <p className="text-2xl text-gray-400 mb-3">Your shortlist is empty</p>
            <p className="text-gray-400 text-sm mb-8">Browse units and save the ones you like</p>
            <Link href="/units" className="btn-primary">Browse Units</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="card p-6">
                {item.unit ? (
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="bg-gray-100 rounded-xl w-24 h-24 flex items-center justify-center text-gray-300 shrink-0">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {item.unit.unit_type} — {item.unit.unit_number}
                        </h3>
                        <div className="flex gap-3 text-sm text-gray-500 mt-1">
                          {item.unit.bedrooms && <span>🛏 {item.unit.bedrooms} Bed</span>}
                          {item.unit.area_sqft && <span>📐 {item.unit.area_sqft} sqft</span>}
                          {item.unit.facing && <span>🧭 {item.unit.facing}</span>}
                          <span>Floor {item.unit.floor_number}</span>
                        </div>
                        <div className="mt-3 flex gap-6 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs">Price</p>
                            <p className="font-bold text-brand-gold">{formatPrice(item.unit.base_price)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Down Payment</p>
                            <p className="font-semibold">{formatPrice(item.unit.down_payment)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">EMI/month</p>
                            <p className="font-semibold">{formatPrice(item.unit.emi_estimate)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Link href={`/booking/${item.unit_id}`} className="btn-primary text-sm py-2 px-4 text-center">
                        Book Now
                      </Link>
                      <Link href={`/units/${item.unit_id}`} className="btn-outline text-sm py-2 px-4 text-center">
                        View Details
                      </Link>
                      <button onClick={() => removeItem(item.id)}
                        className="text-xs text-red-400 hover:text-red-600 text-center py-1">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-gray-500">Unit {item.unit_id}</p>
                    <Link href={`/booking/${item.unit_id}`} className="btn-primary text-sm">Book Now</Link>
                  </div>
                )}
              </div>
            ))}

            <div className="card p-6 bg-brand-dark text-white text-center">
              <p className="font-serif font-bold text-xl text-brand-gold mb-2">Ready to move forward?</p>
              <p className="text-gray-300 text-sm mb-4">
                Book a site visit to see the properties in person before you decide.
              </p>
              <Link href="/site-visit" className="btn-primary">🏠 Schedule a Site Visit</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
