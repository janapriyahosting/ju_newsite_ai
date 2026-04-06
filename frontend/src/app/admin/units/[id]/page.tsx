'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
function adminFetch(path: string, opts: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  const isForm = opts.body instanceof FormData;
  return fetch(API + path, {
    ...opts,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

function fmtDim(val: string, unit: string): string {
  const str = String(val ?? '0');
  if (unit === 'ft') {
    const [feet, inches = '0'] = str.split('.');
    return `${feet}'${inches}"`;
  }
  if (unit === 'm') return `${parseFloat(str).toFixed(2)}m`;
  return `${str}"`;
}

const ROOM_PRESETS = [
  'Master Bedroom','Bedroom 2','Bedroom 3','Kids Bedroom','Guest Bedroom',
  'Living Room','Dining Room','Kitchen','Balcony','Study Room',
  'Pooja Room','Utility Room','Servant Room','Master Bathroom','Bathroom','Toilet',
  'Foyer','Corridor','Store Room',
];

const AMENITY_PRESETS = [
  'Swimming Pool','Gym','Clubhouse','Landscaped Gardens','Children Play Area',
  '24/7 Security','CCTV Surveillance','Power Backup','Rainwater Harvesting',
  'Solar Panels','EV Charging','Car Parking','Visitor Parking','Intercom',
  'Modular Kitchen','Vitrified Tiles','UPVC Windows','Wooden Flooring',
  'Air Conditioning','False Ceiling','Marble Flooring','Granite Countertops',
  'Jogging Track','Yoga Deck','Senior Citizen Zone','Indoor Games Room',
  'Amphitheatre','Multipurpose Hall','Co-working Space','Rooftop Garden',
];

type Dim = { room: string; width: string; length: string; unit: string };
type Tab = 'dimensions' | 'amenities';

export default function UnitEditorPage() {
  const params = useParams();
  const router = useRouter();
  const unitId = params?.id as string;
  const [unit, setUnit] = useState<any>(null);
  const [dims, setDims] = useState<Dim[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('dimensions');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', ok: true });
  const [loading, setLoading] = useState(true);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 3000);
  };

  useEffect(() => {
    if (!unitId) return;
    adminFetch('/admin/units/' + unitId).then(r => r.json()).then(d => {
      setUnit(d);
      const existing = Array.isArray(d.dimensions) ? d.dimensions : [];
      setDims(existing.map((x: any) => ({
        room: x.room || '', width: String(x.width || ''),
        length: String(x.length || ''), unit: x.unit || 'ft',
      })));
      setAmenities(Array.isArray(d.amenities) ? d.amenities : []);
      setLoading(false);
    });
  }, [unitId]);

  // Dimensions handlers
  const addRoom = (room = '') => setDims(p => [...p, { room, width: '', length: '', unit: 'ft' }]);
  const updateDim = (i: number, f: keyof Dim, v: string) =>
    setDims(p => p.map((d, idx) => idx === i ? { ...d, [f]: v } : d));
  const removeDim = (i: number) => setDims(p => p.filter((_, idx) => idx !== i));
  const moveDim = (i: number, dir: -1 | 1) => setDims(p => {
    const a = [...p], to = i + dir;
    if (to < 0 || to >= a.length) return a;
    [a[i], a[to]] = [a[to], a[i]]; return a;
  });

  // Amenities handlers
  const addAmenity = (a: string) => {
    const trimmed = a.trim();
    if (trimmed && !amenities.includes(trimmed))
      setAmenities(p => [...p, trimmed]);
  };
  const removeAmenity = (i: number) => setAmenities(p => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      // Save dimensions
      const dimPayload = dims.filter(d => d.room.trim()).map(d => ({
        room: d.room.trim(), width: parseFloat(d.width) || 0,
        length: parseFloat(d.length) || 0, unit: d.unit || 'ft',
      }));
      await adminFetch('/admin/units/' + unitId, {
        method: 'PATCH', body: JSON.stringify({ dimensions: dimPayload }),
      });
      // Save amenities
      await adminFetch('/admin/units/' + unitId, {
        method: 'PATCH', body: JSON.stringify({ amenities }),
      });
      notify('✅ Saved successfully');
    } catch {
      notify('❌ Save failed', false);
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2F1FC', borderTopColor: '#2A3887' }} />
    </div>
  );

  const filledDims = dims.filter(d => d.room && d.width && d.length);

  return (
    <div className="space-y-5 max-w-3xl">
      {toast.msg && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: 'white' }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => router.back()} className="text-xs text-gray-400 hover:text-[#273b84] mb-2 flex items-center gap-1">← Back to Units</button>
          <h1 className="text-2xl font-black text-[#273b84]">Unit Editor</h1>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-semibold text-[#1e293b]">{unit?.unit_number}</span>
            <span className="ml-2">{unit?.unit_type} · Floor {unit?.floor_number} · {unit?.area_sqft} sqft</span>
          </p>
        </div>
        <button onClick={save} disabled={saving}
          className="px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-40"
          style={{ background: '#273b84' }}>
          {saving ? 'Saving…' : '💾 Save All'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['dimensions', 'amenities'] as Tab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={activeTab === t
              ? { background: '#273b84', color: 'white' }
              : { background: '#fff', color: '#64748b', border: '1px solid #e4e9f2' }}>
            {t === 'dimensions' ? '📐 Dimensions' : '✨ Amenities'}
            {t === 'dimensions' && dims.length > 0 && <span className="ml-2 text-xs opacity-70">{dims.length}</span>}
            {t === 'amenities' && amenities.length > 0 && <span className="ml-2 text-xs opacity-70">{amenities.length}</span>}
          </button>
        ))}
      </div>

      {/* ── DIMENSIONS TAB ── */}
      {activeTab === 'dimensions' && (
        <>
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e4e9f2' }}>
            <div className="grid gap-3 px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest border-b"
              style={{ background: '#f4f6fb', borderColor: '#e4e9f2', gridTemplateColumns: '1fr 90px 90px 80px 70px' }}>
              <div>Room / Space</div><div className="text-center">Width</div>
              <div className="text-center">Length</div><div className="text-center">Unit</div><div></div>
            </div>
            {dims.map((d, i) => (
              <div key={i} className="grid gap-3 px-5 py-3 items-center border-b hover:bg-[#f8f9fd]"
                style={{ borderColor: '#e4e9f2', gridTemplateColumns: '1fr 90px 90px 80px 70px' }}>
                <input list="room-list" value={d.room} onChange={e => updateDim(i, 'room', e.target.value)}
                  placeholder="e.g. Master Bedroom"
                  className="w-full px-3 py-2 rounded-lg text-sm text-[#1e293b] bg-white focus:outline-none focus:border-[#273b84]"
                  style={{ border: '1px solid #d1d9f0' }} />
                <input type="number" value={d.width} onChange={e => updateDim(i, 'width', e.target.value)}
                  placeholder="W" min="0" step="0.5"
                  className="w-full px-2 py-2 rounded-lg text-sm text-[#1e293b] text-center bg-white focus:outline-none focus:border-[#273b84]"
                  style={{ border: '1px solid #d1d9f0' }} />
                <input type="number" value={d.length} onChange={e => updateDim(i, 'length', e.target.value)}
                  placeholder="L" min="0" step="0.5"
                  className="w-full px-2 py-2 rounded-lg text-sm text-[#1e293b] text-center bg-white focus:outline-none focus:border-[#273b84]"
                  style={{ border: '1px solid #d1d9f0' }} />
                <select value={d.unit} onChange={e => updateDim(i, 'unit', e.target.value)}
                  className="w-full px-2 py-2 rounded-lg text-sm text-[#1e293b] bg-white focus:outline-none"
                  style={{ border: '1px solid #d1d9f0' }}>
                  <option value="ft">ft</option>
                  <option value="m">m</option>
                  <option value="inches">in</option>
                </select>
                <div className="flex items-center gap-1">
                  <div className="flex flex-col">
                    <button onClick={() => moveDim(i, -1)} className="text-gray-400 hover:text-[#273b84] text-xs px-1">▲</button>
                    <button onClick={() => moveDim(i, 1)} className="text-gray-400 hover:text-[#273b84] text-xs px-1">▼</button>
                  </div>
                  <button onClick={() => removeDim(i)}
                    className="w-7 h-7 rounded-lg text-xs font-bold"
                    style={{ background: '#fee2e2', color: '#EF4444' }}>✕</button>
                </div>
              </div>
            ))}
            {dims.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="text-3xl mb-3">📐</p>
                <p className="text-gray-400 text-sm">No dimensions yet — use presets below or Add Room</p>
              </div>
            )}
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderTop: '1px solid #e4e9f2' }}>
              <button onClick={() => addRoom()}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all text-[#273b84]"
                style={{ border: '1px solid #d1d9f0', background: '#f4f6fb' }}>+ Add Room</button>
              {dims.length > 0 && <span className="text-xs text-gray-400">{filledDims.length} / {dims.length} complete</span>}
            </div>
          </div>

          {/* Quick Add */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e4e9f2' }}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Add Rooms</p>
            <div className="flex flex-wrap gap-2">
              {ROOM_PRESETS.map(room => {
                const already = dims.some(d => d.room === room);
                return (
                  <button key={room} onClick={() => addRoom(room)} disabled={already}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all disabled:opacity-40"
                    style={already
                      ? { borderColor: '#273b84', color: '#273b84', background: '#eef1fb' }
                      : { borderColor: '#e4e9f2', color: '#64748b', background: '#f8f9fd' }}>
                    {already ? '✓ ' : '+ '}{room}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {filledDims.length > 0 && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e4e9f2' }}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Preview</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filledDims.map((d, i) => (
                  <div key={i} className="rounded-xl px-4 py-3 bg-[#f4f6fb]" style={{ border: '1px solid #e4e9f2' }}>
                    <p className="text-xs text-gray-400 mb-1">{d.room}</p>
                    <p className="font-black text-[#273b84]">
                      {fmtDim(d.width, d.unit)} × {fmtDim(d.length, d.unit)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── AMENITIES TAB ── */}
      {activeTab === 'amenities' && (
        <>
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e4e9f2' }}>
            <div className="px-5 py-3 border-b text-xs font-bold text-gray-500 uppercase tracking-widest"
              style={{ background: '#f4f6fb', borderColor: '#e4e9f2' }}>
              Current Amenities {amenities.length > 0 && <span className="ml-2 normal-case text-gray-400 font-normal">({amenities.length} added)</span>}
            </div>
            <div className="p-4 space-y-2 min-h-[80px]">
              {amenities.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No amenities yet — add from presets below</p>
              )}
              {amenities.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#f8f9fd]"
                  style={{ border: '1px solid #e4e9f2' }}>
                  <span className="text-sm text-[#1e293b]">✓ {a}</span>
                  <button onClick={() => removeAmenity(i)}
                    className="text-xs px-2 py-1 rounded-lg font-bold ml-4 flex-shrink-0"
                    style={{ background: '#fee2e2', color: '#EF4444' }}>✕</button>
                </div>
              ))}
            </div>
            <div className="px-4 py-4 flex gap-2" style={{ borderTop: '1px solid #e4e9f2' }}>
              <input type="text" value={newAmenity}
                onChange={e => setNewAmenity(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newAmenity.trim()) { addAmenity(newAmenity); setNewAmenity(''); } }}
                placeholder="Type custom amenity and press Enter..."
                className="flex-1 px-3 py-2 rounded-lg text-sm text-[#1e293b] bg-white focus:outline-none focus:border-[#273b84]"
                style={{ border: '1px solid #d1d9f0' }} />
              <button onClick={() => { addAmenity(newAmenity); setNewAmenity(''); }}
                className="px-4 py-2 text-sm font-bold text-white rounded-lg whitespace-nowrap"
                style={{ background: '#273b84' }}>+ Add</button>
            </div>
          </div>

          {/* Quick Add presets */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e4e9f2' }}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Add Amenities</p>
            <div className="flex flex-wrap gap-2">
              {AMENITY_PRESETS.map(a => {
                const already = amenities.includes(a);
                return (
                  <button key={a} onClick={() => addAmenity(a)} disabled={already}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                    style={already
                      ? { borderColor: '#273b84', color: '#273b84', background: '#eef1fb' }
                      : { borderColor: '#e4e9f2', color: '#64748b', background: '#f8f9fd' }}>
                    {already ? '✓ ' : '+ '}{a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {amenities.length > 0 && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e4e9f2' }}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Preview — as shown on unit page</p>
              <div className="flex flex-wrap gap-2">
                {amenities.map((a, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: '#eef1fb', color: '#273b84', border: '1px solid #d1d9f0' }}>
                    ✓ {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <datalist id="room-list">
        {ROOM_PRESETS.map(r => <option key={r} value={r} />)}
      </datalist>
    </div>
  );
}
