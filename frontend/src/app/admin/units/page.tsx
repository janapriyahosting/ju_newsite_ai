'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';

const STATUS_COLORS: Record<string,string> = {
  available: 'bg-green-900/40 text-green-300',
  booked: 'bg-red-900/40 text-red-300',
  hold: 'bg-yellow-900/40 text-yellow-300',
  blocked: 'bg-gray-800 text-gray-400',
};
const UNIT_TYPES = ['1BHK','2BHK','3BHK','4BHK','villa','plot'];
const STATUSES = ['available','hold','booked','blocked'];

export default function UnitsPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string|null>(null);

  const fetchUnits = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: '15' });
    if (filterStatus) params.set('status', filterStatus);
    if (filterType) params.set('unit_type', filterType);
    const res = await adminApi(`/admin/units?${params}`);
    const data = await res.json();
    setUnits(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => { fetchUnits(); }, [page, filterStatus, filterType]);

  const updateUnit = async (id: string, field: string, value: any) => {
    setUpdating(id);
    await adminApi(`/admin/units/${id}`, { method: 'PATCH', body: JSON.stringify({ [field]: value }) });
    setUpdating(null);
    fetchUnits();
  };

  const totalPages = Math.ceil(total / 15);
  const fmt = (p: string) => p ? `₹${(+p/100000).toFixed(1)}L` : '—';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Units <span className="text-gray-500 text-lg font-normal">({total})</span></h1>
        <div className="flex gap-2">
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
            <option value="">All Types</option>
            {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Unit','Type','Floor','Facing','Area','Price','EMI','Trending','Status'].map(h => (
                <th key={h} className="text-left text-gray-400 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="text-center text-gray-500 py-10">Loading...</td></tr>}
            {!loading && units.length === 0 && <tr><td colSpan={9} className="text-center text-gray-500 py-10">No units found</td></tr>}
            {units.map(u => (
              <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{u.unit_number} <Link href={`/admin/units/${u.id}`} className="ml-1 text-xs px-1.5 py-0.5 rounded font-bold" style={{background:"rgba(41,169,223,0.12)",color:"#29A9DF"}}>📐</Link></td>
                <td className="px-4 py-3 text-gray-300">{u.unit_type}</td>
                <td className="px-4 py-3 text-gray-300">{u.floor_number}</td>
                <td className="px-4 py-3 text-gray-300">{u.facing || '—'}</td>
                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{u.area_sqft ? `${u.area_sqft} sqft` : '—'}</td>
                <td className="px-4 py-3 text-amber-400 font-medium whitespace-nowrap">{fmt(u.base_price)}</td>
                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{u.emi_estimate ? `₹${(+u.emi_estimate).toLocaleString('en-IN')}/mo` : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => updateUnit(u.id, 'is_trending', !u.is_trending)}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition
                      ${u.is_trending ? 'bg-amber-900/40 text-amber-300' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
                    {u.is_trending ? '🔥 Yes' : 'No'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <select value={u.status} disabled={updating === u.id}
                    onChange={e => updateUnit(u.id, 'status', e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[u.status] || 'bg-gray-800 text-gray-300'}`}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
