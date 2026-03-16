'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = 'http://173.168.0.81:8000/api/v1';
function adminFetch(path: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  return fetch(API + path, { headers: { Authorization: 'Bearer ' + token } });
}

export default function TowersPage() {
  const [towers, setTowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/admin/towers').then(r => r.json()).then(d => {
      setTowers(d.items || []);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2F1FC', borderTopColor: '#2A3887' }} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">Towers</h1>
        <p className="text-gray-500 text-sm mt-1">Manage amenities for each tower</p>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
        <div className="grid grid-cols-5 gap-4 px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest border-b"
          style={{ borderColor: '#2a2a4a' }}>
          <div className="col-span-2">Tower</div>
          <div className="text-center">Floors</div>
          <div className="text-center">Amenities</div>
          <div className="text-center">Actions</div>
        </div>
        {towers.map(t => (
          <div key={t.id} className="grid grid-cols-5 gap-4 px-5 py-4 items-center border-b"
            style={{ borderColor: '#131328' }}>
            <div className="col-span-2">
              <p className="text-white font-bold">{t.name}</p>
              <p className="text-xs text-gray-600">{t.total_units} units</p>
            </div>
            <div className="text-center text-sm text-gray-400">{t.total_floors}</div>
            <div className="text-center">
              <span className="text-xs px-2 py-1 rounded-full font-bold"
                style={{ background: (t.amenities?.length||0) > 0 ? 'rgba(41,169,223,0.15)' : 'rgba(100,100,100,0.15)',
                  color: (t.amenities?.length||0) > 0 ? '#29A9DF' : '#666' }}>
                {t.amenities?.length || 0} amenities
              </span>
            </div>
            <div className="text-center">
              <Link href={`/admin/towers/${t.id}`}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white inline-block"
                style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
                ✨ Edit Amenities
              </Link>
            </div>
          </div>
        ))}
        {towers.length === 0 && (
          <div className="px-5 py-10 text-center text-gray-600">No towers found</div>
        )}
      </div>
    </div>
  );
}
