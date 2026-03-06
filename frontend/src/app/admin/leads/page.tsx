'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';

const STATUS_COLORS: Record<string,string> = {
  new: 'bg-blue-900/40 text-blue-300',
  contacted: 'bg-yellow-900/40 text-yellow-300',
  qualified: 'bg-purple-900/40 text-purple-300',
  converted: 'bg-green-900/40 text-green-300',
  lost: 'bg-red-900/40 text-red-300',
};
const STATUSES = ['new','contacted','qualified','converted','lost'];

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string|null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: '15' });
    if (filterStatus) params.set('status', filterStatus);
    const res = await adminApi(`/admin/leads?${params}`);
    const data = await res.json();
    setLeads(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [page, filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await adminApi(`/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setUpdating(null);
    fetchLeads();
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Leads <span className="text-gray-500 text-lg font-normal">({total})</span></h1>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Name','Phone','Interest','Budget','Source','Status','Date'].map(h => (
                <th key={h} className="text-left text-gray-400 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center text-gray-500 py-10">Loading...</td></tr>}
            {!loading && leads.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">No leads found</td></tr>}
            {leads.map(lead => (
              <tr key={lead.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{lead.name}</p>
                  <p className="text-gray-500 text-xs">{lead.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">{lead.phone}</td>
                <td className="px-4 py-3 text-gray-300">{lead.interest || '—'}</td>
                <td className="px-4 py-3 text-gray-300 text-xs">
                  {lead.budget_max ? `₹${(+lead.budget_max/100000).toFixed(0)}L` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full">{lead.source || 'direct'}</span>
                </td>
                <td className="px-4 py-3">
                  <select value={lead.status} disabled={updating === lead.id}
                    onChange={e => updateStatus(lead.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[lead.status] || 'bg-gray-800 text-gray-300'}`}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN') : '—'}
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
