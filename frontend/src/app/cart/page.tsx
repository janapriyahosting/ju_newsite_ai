'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const API = 'http://173.168.0.81:8000/api/v1';
const MEDIA = 'http://173.168.0.81:8000';

function formatPrice(p: any) {
  if (!p) return 'Price on request';
  const n = parseFloat(p);
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function CartPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string|null>(null);
  const [removing, setRemoving] = useState<string|null>(null);

  useEffect(() => {
    const t = localStorage.getItem('jp_token');
    setToken(t);
    if (!t) { setLoading(false); return; }
    fetchCart(t);
  }, []);

  async function fetchCart(t: string) {
    setLoading(true);
    try {
      const r = await fetch(`${API}/cart/units`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const d = await r.json();
      setItems(d.items || []);
    } catch {}
    setLoading(false);
  }

  async function removeItem(cartItemId: string) {
    if (!token) return;
    setRemoving(cartItemId);
    await fetch(`${API}/cart/${cartItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setItems(p => p.filter(i => i.cart_item_id !== cartItemId));
    setRemoving(null);
  }

  if (!token) return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-16"
        style={{ background: 'linear-gradient(135deg,#F8F9FB,#E2F1FC)' }}>
        <div className="text-center px-6">
          <div className="text-7xl mb-5">🛒</div>
          <h2 className="text-2xl font-black mb-3" style={{ color: '#2A3887' }}>Sign in to view your cart</h2>
          <p className="text-gray-500 mb-6">Save units and manage your property shortlist</p>
          <Link href="/login?redirect=/cart"
            className="px-8 py-3.5 rounded-full font-black text-white text-sm"
            style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
            Sign In / Register
          </Link>
        </div>
      </div>
    </main>
  );

  return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black" style={{ color: '#262262' }}>My Cart</h1>
              <p className="text-gray-500 mt-1 text-sm">{items.length} {items.length === 1 ? 'unit' : 'units'} saved</p>
            </div>
            {items.length > 0 && (
              <Link href="/store"
                className="px-5 py-2.5 rounded-full text-sm font-bold border-2 transition-all hover:bg-gray-50"
                style={{ borderColor: '#2A3887', color: '#2A3887' }}>
                + Add More Units
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-10 h-10 border-4 rounded-full animate-spin"
                style={{ borderColor: '#E2F1FC', borderTopColor: '#2A3887' }} />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-7xl mb-5">🏠</div>
              <h3 className="text-xl font-black mb-3" style={{ color: '#2A3887' }}>Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Browse our properties and add units you're interested in</p>
              <Link href="/store"
                className="px-8 py-3.5 rounded-full font-black text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
                Browse Properties
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {items.map((unit: any) => (
                <div key={unit.cart_item_id}
                  className="rounded-2xl overflow-hidden flex flex-col md:flex-row"
                  style={{ border: '1px solid #E2F1FC', boxShadow: '0 4px 20px rgba(42,56,135,0.07)' }}>
                  
                  {/* Image */}
                  <div className="md:w-64 flex-shrink-0 relative"
                    style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)', minHeight: '180px' }}>
                    {unit.images?.[0] ? (
                      <img src={MEDIA + unit.images[0]} alt={unit.unit_number}
                        className="w-full h-full object-cover absolute inset-0" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl">🏢</span>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-black"
                      style={{
                        background: unit.status === 'available' ? '#16A34A' : '#F59E0B',
                        color: 'white'
                      }}>
                      ● {unit.status?.charAt(0).toUpperCase() + unit.status?.slice(1)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{unit.unit_type}</p>
                          <h3 className="text-xl font-black" style={{ color: '#262262' }}>{unit.unit_number}</h3>
                        </div>
                        <button onClick={() => removeItem(unit.cart_item_id)}
                          disabled={removing === unit.cart_item_id}
                          className="text-xs px-3 py-1.5 rounded-full font-bold flex-shrink-0"
                          style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                          {removing === unit.cart_item_id ? '...' : '✕ Remove'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                        {unit.bedrooms && <span>🛏 {unit.bedrooms} Bed</span>}
                        {unit.bathrooms && <span>🚿 {unit.bathrooms} Bath</span>}
                        {unit.area_sqft && <span>📐 {parseFloat(unit.area_sqft).toFixed(0)} sqft</span>}
                        {unit.floor_number && <span>🏢 Floor {unit.floor_number}</span>}
                        {unit.facing && <span>🧭 {unit.facing}</span>}
                      </div>
                      <p className="text-2xl font-black" style={{ color: '#2A3887' }}>
                        {formatPrice(unit.base_price)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-4 flex-wrap">
                      <Link href={`/booking/${unit.id}`}
                        className="px-6 py-2.5 rounded-full font-black text-white text-sm flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
                        🏷️ Book Now
                      </Link>
                      <Link href={`/units/${unit.id}`}
                        className="px-5 py-2.5 rounded-full font-bold text-sm border-2 transition-all hover:bg-gray-50"
                        style={{ borderColor: '#E2F1FC', color: '#2A3887' }}>
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="rounded-2xl p-6 mt-2" style={{ background: '#F8F9FB', border: '1px solid #E2F1FC' }}>
                <h3 className="font-black mb-4" style={{ color: '#262262' }}>Summary</h3>
                <div className="space-y-2 text-sm">
                  {items.map(u => (
                    <div key={u.id} className="flex justify-between">
                      <span className="text-gray-600">{u.unit_number} ({u.unit_type})</span>
                      <span className="font-bold" style={{ color: '#2A3887' }}>{formatPrice(u.base_price)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E2F1FC' }}>
                  <p className="text-xs text-gray-500">* Booking amount is 10% of unit price. Full payment as per payment plan.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
