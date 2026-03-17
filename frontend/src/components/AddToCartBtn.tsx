'use client';
import { useState, useEffect } from 'react';

const API = 'http://173.168.0.81:8000/api/v1';

interface Props {
  unitId: string;
  size?: 'sm' | 'md';
}

export default function AddToCartBtn({ unitId, size = 'md' }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'added'>('idle');
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const token = localStorage.getItem('jp_token');
    if (!token) {
      window.location.href = '/login?redirect=' + encodeURIComponent('/units/' + unitId) + '&reason=cart';
      return;
    }
    setState('loading');
    try {
      const r = await fetch(`${API}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ unit_id: unitId })
      });
      if (r.ok) {
        setState('added');
        showToast('✅ Added to cart!');
      } else if (r.status === 400) {
        setState('added');
        showToast('Already in your cart 🛒');
      } else {
        setState('idle');
      }
    } catch { setState('idle'); }
  }

  const isSmall = size === 'sm';

  return (
    <>
      {toast && (
        <div className="fixed top-20 right-5 z-[9999] px-4 py-3 rounded-xl text-sm font-bold shadow-2xl flex items-center gap-2"
          style={{ background: '#16A34A', color: 'white', animation: 'fadeIn 0.2s ease' }}>
          {toast}
          <a href="/cart" className="underline text-xs ml-1">View Cart →</a>
        </div>
      )}
      <button
        onClick={handleAdd}
        disabled={state === 'loading' || state === 'added'}
        title={state === 'added' ? 'In Cart' : 'Add to Cart'}
        className={`flex items-center justify-center font-black transition-all rounded-full
          ${isSmall ? 'w-8 h-8 text-sm' : 'px-4 py-2 gap-1.5 text-sm'}`}
        style={{
          background: state === 'added' ? 'rgba(22,163,74,0.12)' : 'rgba(42,56,135,0.08)',
          color: state === 'added' ? '#16A34A' : '#2A3887',
          border: `1.5px solid ${state === 'added' ? '#16A34A' : '#2A3887'}`,
        }}>
        {state === 'loading' ? '⏳' : state === 'added' ? '✓' : '🛒'}
        {!isSmall && (state === 'added' ? ' In Cart' : ' Add')}
      </button>
    </>
  );
}
