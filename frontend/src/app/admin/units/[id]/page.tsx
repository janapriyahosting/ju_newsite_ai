'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = 'http://173.168.0.81:8000/api/v1';
function adminFetch(path: string, opts: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  const headers: Record<string,string> = { Authorization: 'Bearer ' + token };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  return fetch(API + path, { ...opts, headers: { ...headers, ...(opts.headers as Record<string,string> || {}) } });
}

const ROOM_PRESETS = [
  'Master Bedroom','Kids Bedroom','Guest Bedroom','Living Room','Dining Room',
  'Kitchen','Balcony','Study Room','Pooja Room','Utility Room','Servant Room','Bathroom','Toilet',
];

type Dim = { room: string; width: number | string; length: number | string; unit: string };

export default function UnitDimensionsPage() {
  const params = useParams();
  const router = useRouter();
  const unitId = params?.id as string;
  const [unit, setUnit] = useState<any>(null);
  const [dims, setDims] = useState<Dim[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', ok: true });
  const [loading, setLoading] = useState(true);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 3000);
  };

  useEffect(() => {
    if (!unitId) return;
    adminFetch('/admin/units/' + unitId)
      .then(r => r.json())
      .then(d => {
        setUnit(d);
        setDims(Array.isArray(d.dimensions) && d.dimensions.length > 0 ? d.dimensions : []);
        setLoading(false);
      });
  }, [unitId]);

  const addRow = () => setDims(p => [...p, { room: '', width: '', length: '', unit: 'ft' }]);

  const updateRow = (i: number, field: keyof Dim, val: string) =>
    setDims(p => p.map((d, idx) => idx === i ? { ...d, [field]: val } : d));

  const removeRow = (i: number) => setDims(p => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    const cleaned = dims
      .filter(d => d.room.trim())
      .map(d => ({
        room: d.room.trim(),
        width: +d.width || 0,
        length: +d.length || 0,
        unit: d.unit || 'ft',
      }));
    const r = await adminFetch('/admin/units/' + unitId, {
      method: 'PATCH',
      body: JSON.stringify({ dimensions: cleaned }),
    });
    if (r.ok) notify('✅ Dimensions saved');
    else notify('❌ Save failed', false);
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2F1FC', borderTopColor: '#2A3887' }} />
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-white mb-1 flex items-center gap-1">
            ← Back
          </button>
          <h1 className="text-2xl font-black text-white">Room Dimensions</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Unit <span style={{ color: '#29A9DF' }}>{unit?.unit_number}</span>
            {unit?.unit_type && <span className="ml-2 text-gray-500">· {unit.unit_type}</span>}
            {unit?.floor_number && <span className="ml-2 text-gray-500">· Floor {unit.floor_number}</span>}
          </p>
        </div>
        <button onClick={save} disabled={saving}
          className="px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
          {saving ? 'Saving…' : '💾 Save Dimensions'}
        </button>
      </div>

      {toast.msg && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-xl"
          style={{ background: toast.ok ? '#16A34A' : '#DC2626', color: 'white' }}>
          {toast.msg}
        </div>
      )}

      {/* Dimensions table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest border-b" style={{ borderColor: '#2a2a4a' }}>
          <div className="col-span-5">Room / Space</div>
          <div className="col-span-2 text-center">Width</div>
          <div className="col-span-2 text-center">Length</div>
          <div className="col-span-2 text-center">Unit</div>
          <div className="col-span-1"></div>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: '#1f1f3a' }}>
          {dims.map((d, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 px-5 py-3 items-center">
              {/* Room name — datalist for suggestions */}
              <div className="col-span-5">
                <input
                  list="room-presets"
                  value={d.room}
                  onChange={e => updateRow(i, 'room', e.target.value)}
                  placeholder="e.g. Master Bedroom"
                  className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
                  style={{ background: '#0d0d1a', border: '1px solid #333' }}
                />
              </div>
              {/* Width */}
              <div className="col-span-2">
                <input
                  type="number"
                  value={d.width}
                  onChange={e => updateRow(i, 'width', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 rounded-xl text-sm text-white text-center focus:outline-none"
                  style={{ background: '#0d0d1a', border: '1px solid #333' }}
                />
              </div>
              {/* Length */}
              <div className="col-span-2">
                <input
                  type="number"
                  value={d.length}
                  onChange={e => updateRow(i, 'length', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 rounded-xl text-sm text-white text-center focus:outline-none"
                  style={{ background: '#0d0d1a', border: '1px solid #333' }}
                />
              </div>
              {/* Unit selector */}
              <div className="col-span-2">
                <select value={d.unit} onChange={e => updateRow(i, 'unit', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white focus:outline-none"
                  style={{ background: '#0d0d1a', border: '1px solid #333' }}>
                  <option value="ft">ft</option>
                  <option value="m">m</option>
                  <option value="inches">inches</option>
                </select>
              </div>
              {/* Delete */}
              <div className="col-span-1 flex justify-center">
                <button onClick={() => removeRow(i)}
                  className="w-8 h-8 rounded-lg text-sm font-bold transition-all hover:opacity-80"
                  style={{ background: 'rgba(220,38,38,0.15)', color: '#EF4444' }}>
                  ✕
                </button>
              </div>
            </div>
          ))}

          {dims.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-600 text-sm">
              No dimensions added yet — click "Add Room" to start
            </div>
          )}
        </div>

        {/* Add row button */}
        <div className="px-5 py-4 border-t" style={{ borderColor: '#2a2a4a' }}>
          <button onClick={addRow}
            className="px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:border-blue-400 hover:text-blue-400"
            style={{ borderColor: '#333', color: '#666' }}>
            + Add Room
          </button>
          {dims.length > 0 && (
            <span className="ml-3 text-xs text-gray-600">{dims.filter(d=>d.room).length} room{dims.filter(d=>d.room).length !== 1 ? 's' : ''} defined</span>
          )}
        </div>
      </div>

      {/* Quick-add preset buttons */}
      <div className="rounded-2xl p-4" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Add</p>
        <div className="flex flex-wrap gap-2">
          {ROOM_PRESETS.map(room => (
            <button key={room}
              onClick={() => setDims(p => [...p, { room, width: '', length: '', unit: 'ft' }])}
              className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:border-blue-400 hover:text-blue-400"
              style={{ borderColor: '#333', color: '#666' }}>
              + {room}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      {dims.filter(d => d.room && d.width && d.length).length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: '#1a1a2e', border: '1px solid #2a2a4a' }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Preview — as shown on unit detail page</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {dims.filter(d => d.room && d.width && d.length).map((d, i) => (
              <div key={i} className="rounded-xl px-4 py-3" style={{ background: '#0d0d1a', border: '1px solid #222' }}>
                <p className="text-xs text-gray-500 mb-1">{d.room}</p>
                <p className="text-lg font-black" style={{ color: '#29A9DF' }}>
                  {d.width} × {d.length}
                  <span className="text-sm font-medium text-gray-500 ml-1">{d.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Datalist for autocomplete */}
      <datalist id="room-presets">
        {ROOM_PRESETS.map(r => <option key={r} value={r} />)}
      </datalist>
    </div>
  );
}
