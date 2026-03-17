'use client';
import { useState } from 'react';
import Link from 'next/link';

const API = 'http://173.168.0.81:8000/api/v1';

interface Props { unitId: string; size?: 'sm' | 'md'; }

export default function AddToCartBtn({ unitId, size = 'md' }: Props) {
  const [state, setState] = useState<'idle'|'loading'|'added'>('idle');
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function handle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const token = typeof window !== 'undefined' ? localStorage.getItem('jp_token') : null;
    if (!token) {
      window.location.href = '/login?redirect=' + encodeURIComponent('/units/' + unitId) + '&reason=cart';
      return;
    }
    setState('loading');
    try {
      const r = await fetch(API + '/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ unit_id: unitId })
      });
      if (r.ok) { setState('added'); showToast('Added to cart!'); }
      else if (r.status === 400) { setState('added'); showToast('Already in cart'); }
      else setState('idle');
    } catch { setState('idle'); }
  }

  const sm = size === 'sm';
  return (
    <>
      {toast && (
        <div style={{ position:'fixed', top:'80px', right:'20px', zIndex:9999, background:'#16A34A', color:'white', padding:'12px 18px', borderRadius:'14px', fontWeight:700, fontSize:'14px', boxShadow:'0 8px 30px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', gap:'10px' }}>
          <span>✅ {toast}</span>
          <Link href="/cart" style={{ color:'white', textDecoration:'underline', fontSize:'12px' }}>View Cart →</Link>
        </div>
      )}
      <button onClick={handle} disabled={state === 'loading' || state === 'added'}
        title={state === 'added' ? 'In Cart' : 'Add to Cart'}
        style={{
          display:'flex', alignItems:'center', justifyContent:'center', gap:'4px',
          padding: sm ? '6px 10px' : '8px 14px',
          borderRadius:'999px', fontWeight:800, fontSize: sm ? '12px' : '13px',
          border: '1.5px solid ' + (state === 'added' ? '#16A34A' : '#2A3887'),
          background: state === 'added' ? 'rgba(22,163,74,0.1)' : 'rgba(42,56,135,0.07)',
          color: state === 'added' ? '#16A34A' : '#2A3887',
          cursor: state === 'added' ? 'default' : 'pointer',
          transition:'all 0.2s',
        }}>
        {state === 'loading' ? '⏳' : state === 'added' ? '✓' : '🛒'}
        {!sm && <span>{state === 'added' ? ' In Cart' : ' Add'}</span>}
      </button>
    </>
  );
}
