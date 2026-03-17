'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = 'http://173.168.0.81:8000/api/v1';

interface Props { unitId: string; size?: 'sm' | 'md'; }

export default function AddToCartBtn({ unitId, size = 'md' }: Props) {
  const [status, setStatus] = useState<'idle'|'loading'|'added'>('idle');
  const [toast, setToast] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check login state on mount and on storage change
  useEffect(() => {
    const check = () => setIsLoggedIn(!!localStorage.getItem('jp_token'));
    check();
    window.addEventListener('storage', check);
    window.addEventListener('jp_auth_change', check);
    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener('jp_auth_change', check);
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem('jp_token');
    if (!token) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname) + '&reason=cart';
      return;
    }
    setStatus('loading');
    try {
      const r = await fetch(API + '/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ unit_id: unitId })
      });
      if (r.ok) {
        setStatus('added');
        showToast('Added to cart!');
      } else if (r.status === 400) {
        setStatus('added');
        showToast('Already in cart');
      } else {
        const err = await r.json().catch(() => ({}));
        console.error('Cart error:', r.status, err);
        setStatus('idle');
        showToast('Error: ' + (err.detail || r.status));
      }
    } catch (e) {
      console.error('Cart fetch error:', e);
      setStatus('idle');
    }
  }

  const sm = size === 'sm';

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.startsWith('Error') ? '#DC2626' : '#16A34A',
          color: 'white', padding: '12px 16px', borderRadius: '14px',
          fontWeight: 700, fontSize: '14px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span>{toast.startsWith('Error') ? '⚠️' : '✅'} {toast}</span>
          {!toast.startsWith('Error') && (
            <Link href="/cart" style={{ color: 'white', textDecoration: 'underline', fontSize: '12px', whiteSpace: 'nowrap' }}>
              View Cart →
            </Link>
          )}
        </div>
      )}
      <button
        onClick={handle}
        disabled={status === 'loading' || status === 'added'}
        title={status === 'added' ? 'In Cart' : 'Add to Cart'}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          gap: '4px',
          padding: sm ? '5px 10px' : '8px 14px',
          borderRadius: '999px',
          fontWeight: 800,
          fontSize: sm ? '11px' : '13px',
          border: '1.5px solid ' + (status === 'added' ? '#16A34A' : '#2A3887'),
          background: status === 'added' ? 'rgba(22,163,74,0.1)' : 'rgba(42,56,135,0.07)',
          color: status === 'added' ? '#16A34A' : '#2A3887',
          cursor: status === 'added' || status === 'loading' ? 'default' : 'pointer',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}>
        {status === 'loading' ? '⏳' : status === 'added' ? '✓' : '🛒'}
        {!sm && <span style={{ marginLeft: '2px' }}>{status === 'added' ? 'In Cart' : 'Add'}</span>}
      </button>
    </>
  );
}
