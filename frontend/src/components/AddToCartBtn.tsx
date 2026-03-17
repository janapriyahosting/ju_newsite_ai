'use client';
import { useState } from 'react';
import Link from 'next/link';

const API = 'http://173.168.0.81:8000/api/v1';

interface Props {
  unitId: string;
  status?: string;
  size?: 'sm' | 'md';
}

export default function AddToCartBtn({ unitId, status = 'available', size = 'md' }: Props) {
  const [state, setState] = useState<'idle'|'loading'|'added'>('idle');
  const [toast, setToast] = useState('');

  if (status && status !== 'available') return null;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (state !== 'idle') return;

    const token = localStorage.getItem('jp_token');
    if (!token) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname) + '&reason=cart';
      return;
    }
    setState('loading');
    fetch(API + '/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ unit_id: unitId })
    }).then(r => {
      if (r.ok) { setState('added'); showToast('Added to cart!'); }
      else if (r.status === 400) { setState('added'); showToast('Already in cart'); }
      else setState('idle');
    }).catch(() => setState('idle'));
  }

  const sm = size === 'sm';
  const bg = state === 'added' ? 'rgba(22,163,74,0.12)' : 'rgba(42,56,135,0.09)';
  const border = state === 'added' ? '#16A34A' : '#2A3887';
  const color = state === 'added' ? '#16A34A' : '#2A3887';

  return (
    <>
      {toast && (
        <div style={{
          position:'fixed', top:'80px', right:'20px', zIndex:9999,
          background:'#16A34A', color:'white',
          padding:'12px 16px', borderRadius:'14px',
          fontWeight:700, fontSize:'14px',
          boxShadow:'0 8px 30px rgba(0,0,0,0.15)',
          display:'flex', alignItems:'center', gap:'10px',
          pointerEvents: 'none',
        }}>
          <span>✅ {toast}</span>
          <a href="/cart" style={{color:'white', textDecoration:'underline', fontSize:'12px', pointerEvents:'all'}}>
            View Cart →
          </a>
        </div>
      )}
      <button
        onMouseDown={handle}
        onClick={handle}
        disabled={state === 'loading' || state === 'added'}
        title={state === 'added' ? 'In Cart' : 'Add to Cart'}
        style={{
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          gap:'4px',
          padding: sm ? '7px 12px' : '9px 16px',
          borderRadius:'999px',
          fontWeight:800,
          fontSize: sm ? '12px' : '14px',
          border:'2px solid ' + border,
          background: bg,
          color: color,
          cursor: state !== 'idle' ? 'default' : 'pointer',
          transition:'all 0.15s',
          whiteSpace:'nowrap',
          position:'relative',
          zIndex: 10,
          pointerEvents: 'all',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          minHeight: sm ? '32px' : '38px',
          minWidth: sm ? '40px' : '80px',
        }}>
        <span style={{fontSize: sm ? '14px' : '16px'}}>
          {state === 'loading' ? '⏳' : state === 'added' ? '✓' : '🛒'}
        </span>
        {!sm && (
          <span>{state === 'added' ? ' In Cart' : ' Add'}</span>
        )}
      </button>
    </>
  );
}
