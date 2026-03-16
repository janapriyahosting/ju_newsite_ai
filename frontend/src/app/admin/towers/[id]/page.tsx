'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = 'http://173.168.0.81:8000/api/v1';
function adminFetch(path: string, opts: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  return fetch(API + path, {
    ...opts,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json',
      ...(opts.headers as Record<string,string> || {}) },
  });
}

const AMENITY_PRESETS = [
  'Swimming Pool','Gym','Clubhouse','Landscaped Gardens','Children Play Area',
  '24/7 Security','CCTV Surveillance','Power Backup','Rainwater Harvesting',
  'Solar Panels','EV Charging','Car Parking','Visitor Parking','Intercom',
  'Modular Kitchen','Vitrified Tiles','UPVC Windows','Wooden Flooring',
  'Air Conditioning','False Ceiling','Marble Flooring','Granite Countertops',
  'Jogging Track','Yoga Deck','Senior Citizen Zone','Indoor Games Room',
  'Amphitheatre','Multipurpose Hall','Co-working Space','Rooftop Garden',
  'Lift','Fire Safety Systems','Water Softener Plant','STP Plant',
];

export default function TowerAmenitiesPage() {
  const params = useParams();
  const router = useRouter();
  const towerId = params?.id as string;
  const [tower, setTower] = useState<any>(null);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', ok: true });
  const [loading, setLoading] = useState(true);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 3000);
  };

  useEffect(() => {
    if (!towerId) return;
    adminFetch('/admin/towers/' + towerId).then(r => r.json()).then(d => {
      setTower(d);
      setAmenities(Array.isArray(d.amenities) ? d.amenities : []);
      setLoading(false);
    });
  }, [towerId]);

  const add = (a: string) => {
    const t = a.trim();
    if (t && !amenities.includes(t)) setAmenities(p => [...p, t]);
  };
  const remove = (i: number) => setAmenities(p => p.filter((_, idx) => idx !== i));
  const moveUp = (i: number) => setAmenities(p => { const a=[...p]; if(i>0){[a[i-1],a[i]]=[a[i],a[i-1]];} return a; });
  const moveDown = (i: number) => setAmenities(p => { const a=[...p]; if(i<a.length-1){[a[i],a[i+1]]=[a[i+1],a[i]];} return a; });

  const save = async () => {
    setSaving(true);
    const r = await adminFetch('/admin/towers/' + towerId, {
      method: 'PATCH', body: JSON.stringify({ amenities }),
    });
    if (r.ok) notify('✅ Amenities saved');
    else notify('❌ Save failed', false);
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2F1FC', borderTopColor: '#2A3887' }} />
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      {toast.msg && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: 'white' }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => router.back()} className="text-xs text-gray-600 hover:text-gray-400 mb-2 flex items-center gap-1">← Back</button>
          <h1 className="text-2xl font-black text-white">Tower Amenities</h1>
          <p className="text-sm mt-1" style={{ color: '#29A9DF' }}>
            {tower?.name}
            <span className="text-gray-500 ml-2">· {tower?.total_floors} floors · {tower?.total_units} units</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">These amenities will be shown on all unit pages for this tower</p>
        </div>
        <button onClick={save} disabled={saving}
          className="px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
          {saving ? 'Saving…' : '💾 Save Amenities'}
        </button>
      </div>

      {/* Current amenities */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: '#2a2a4a' }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Current Amenities
          </p>
          {amenities.length > 0 && (
            <span className="text-xs text-gray-600">{amenities.length} amenities</span>
          )}
        </div>
        <div className="p-4 space-y-2 min-h-[80px]">
          {amenities.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-6">
              No amenities yet — add from presets below or type a custom one
            </p>
          )}
          {amenities.map((a, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{ background: '#0d0d1a', border: '1px solid #1f1f3a' }}>
              <div className="flex flex-col mr-1">
                <button onClick={() => moveUp(i)} className="text-gray-700 hover:text-white text-xs leading-none">▲</button>
                <button onClick={() => moveDown(i)} className="text-gray-700 hover:text-white text-xs leading-none">▼</button>
              </div>
              <span className="text-sm text-white flex-1">✓ {a}</span>
              <button onClick={() => remove(i)}
                className="text-xs px-2 py-1 rounded-lg font-bold flex-shrink-0"
                style={{ background: 'rgba(220,38,38,0.15)', color: '#EF4444' }}>✕</button>
            </div>
          ))}
        </div>
        {/* Custom input */}
        <div className="px-4 py-4 border-t flex gap-2" style={{ borderColor: '#2a2a4a' }}>
          <input type="text" value={newAmenity}
            onChange={e => setNewAmenity(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newAmenity.trim()) { add(newAmenity); setNewAmenity(''); } }}
            placeholder="Type custom amenity and press Enter..."
            className="flex-1 px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
            style={{ background: '#0d0d1a', border: '1px solid #333' }} />
          <button onClick={() => { add(newAmenity); setNewAmenity(''); }}
            className="px-4 py-2 text-sm font-bold text-white rounded-xl whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>+ Add</button>
        </div>
      </div>

      {/* Quick Add Presets */}
      <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Add</p>
        <div className="flex flex-wrap gap-2">
          {AMENITY_PRESETS.map(a => {
            const added = amenities.includes(a);
            return (
              <button key={a} onClick={() => add(a)} disabled={added}
                className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                style={added
                  ? { borderColor: '#29A9DF', color: '#29A9DF', background: 'rgba(41,169,223,0.1)' }
                  : { borderColor: '#2a2a4a', color: '#666' }}>
                {added ? '✓ ' : '+ '}{a}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      {amenities.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Preview — as shown on unit pages</p>
          <div className="flex flex-wrap gap-2">
            {amenities.map((a, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(42,56,135,0.15)', color: '#29A9DF', border: '1px solid rgba(41,169,223,0.2)' }}>
                ✓ {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
