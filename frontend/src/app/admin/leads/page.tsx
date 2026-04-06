'use client';
import React, { useEffect, useState } from 'react';
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
  const [expandedId, setExpandedId] = useState<string|null>(null);

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

  const rescoreAll = async () => {
    await adminApi('/admin/leads/rescore', { method: 'POST' });
    fetchLeads();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#273b84]">Leads <span className="text-gray-500 text-lg font-normal">({total})</span></h1>
        <div className="flex gap-2">
          <button onClick={rescoreAll} className="bg-gray-100 border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm hover:bg-gray-100">Rescore All</button>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {['Name','Phone','Project','Score','Source','Status','Date',''].map(h => (
                <th key={h} className="text-left text-gray-500 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="text-center text-gray-500 py-10">Loading...</td></tr>}
            {!loading && leads.length === 0 && <tr><td colSpan={8} className="text-center text-gray-500 py-10">No leads found</td></tr>}
            {leads.map(lead => (
              <React.Fragment key={lead.id}>
                <tr className="border-b border-gray-200 hover:bg-gray-50/60 transition cursor-pointer"
                  onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}>
                  <td className="px-4 py-3">
                    <p className="text-gray-900 font-medium">{lead.name}</p>
                    {lead.email && <p className="text-gray-500 text-xs">{lead.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{lead.phone}</td>
                  <td className="px-4 py-3">
                    {lead.project_interest
                      ? <span className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-1 rounded-full">{lead.project_interest}</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={lead.lead_score || 0} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{lead.source || 'direct'}</span>
                    {lead.utm_source && (
                      <span className="text-xs bg-cyan-900/40 text-cyan-300 px-2 py-1 rounded-full ml-1">{lead.utm_source}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select value={lead.status} disabled={updating === lead.id}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateStatus(lead.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <span className="text-gray-500">{expandedId === lead.id ? '▲' : '▼'}</span>
                  </td>
                </tr>

                {/* Expanded Detail Row */}
                {expandedId === lead.id && (
                  <tr key={`${lead.id}-detail`} className="bg-gray-100/40">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        {/* Unit Details from extra_data */}
                        {lead.extra_data?.unit_number && (
                          <div className="col-span-2 md:col-span-4">
                            <p className="text-gray-500 font-bold uppercase tracking-wider mb-2">Unit Details</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="bg-indigo-900/40 text-indigo-300 px-2.5 py-1 rounded-lg font-medium">Unit: {lead.extra_data.unit_number}</span>
                              {lead.extra_data.unit_type && <span className="bg-indigo-900/40 text-indigo-300 px-2.5 py-1 rounded-lg">Type: {lead.extra_data.unit_type}</span>}
                              {lead.extra_data.unit_price && <span className="bg-indigo-900/40 text-indigo-300 px-2.5 py-1 rounded-lg">Price: ₹{(+lead.extra_data.unit_price/100000).toFixed(0)}L</span>}
                            </div>
                          </div>
                        )}
                        {lead.message && (
                          <div className="col-span-2 md:col-span-4">
                            <p className="text-gray-500 font-bold uppercase tracking-wider mb-1">Message</p>
                            <p className="text-gray-700 bg-white rounded-lg px-3 py-2">{lead.message}</p>
                          </div>
                        )}
                        {lead.interest && (
                          <div>
                            <p className="text-gray-500 font-bold uppercase tracking-wider mb-1">Interest</p>
                            <p className="text-gray-700">{lead.interest}</p>
                          </div>
                        )}
                        {(lead.budget_min || lead.budget_max) && (
                          <div>
                            <p className="text-gray-500 font-bold uppercase tracking-wider mb-1">Budget</p>
                            <p className="text-gray-700">
                              {lead.budget_min ? `₹${(+lead.budget_min/100000).toFixed(0)}L` : '—'} – {lead.budget_max ? `₹${(+lead.budget_max/100000).toFixed(0)}L` : '—'}
                            </p>
                          </div>
                        )}
                        {lead.assigned_to && (
                          <div>
                            <p className="text-gray-500 font-bold uppercase tracking-wider mb-1">Assigned To</p>
                            <p className="text-gray-700">{lead.assigned_to}</p>
                          </div>
                        )}
                        {lead.notes && (
                          <div className="col-span-2">
                            <p className="text-gray-500 font-bold uppercase tracking-wider mb-1">Notes</p>
                            <p className="text-gray-700">{lead.notes}</p>
                          </div>
                        )}
                        {/* UTM Tracking */}
                        {(lead.utm_source || lead.utm_medium || lead.utm_campaign) && (
                          <div className="col-span-2 md:col-span-4 border-t border-gray-300 pt-3 mt-1">
                            <p className="text-gray-500 font-bold uppercase tracking-wider mb-2">UTM Tracking</p>
                            <div className="flex flex-wrap gap-3">
                              {lead.utm_source && <span className="bg-cyan-900/30 text-cyan-300 px-2 py-1 rounded">source: {lead.utm_source}</span>}
                              {lead.utm_medium && <span className="bg-cyan-900/30 text-cyan-300 px-2 py-1 rounded">medium: {lead.utm_medium}</span>}
                              {lead.utm_campaign && <span className="bg-cyan-900/30 text-cyan-300 px-2 py-1 rounded">campaign: {lead.utm_campaign}</span>}
                            </div>
                          </div>
                        )}
                        {/* Score Breakdown */}
                        {lead.score_details && Object.keys(lead.score_details).length > 0 && (
                          <div className="col-span-2 md:col-span-4 border-t border-gray-300 pt-3 mt-1">
                            <p className="text-gray-500 font-bold uppercase tracking-wider mb-2">Score Breakdown ({lead.lead_score}/100)</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(lead.score_details).filter(([k]) => k !== 'total').map(([k, v]) => (
                                <span key={k} className={`px-2 py-1 rounded text-xs ${Number(v) > 0 ? 'bg-green-900/30 text-green-300' : 'bg-gray-100 text-gray-500'}`}>
                                  {k.replace(/_/g, ' ')}: {String(v)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {lead.sf_lead_id && (
                          <div>
                            <p className="text-gray-500 font-bold uppercase tracking-wider mb-1">Salesforce ID</p>
                            <p className="text-gray-700 font-mono">{lead.sf_lead_id}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-100">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-100">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let bg = 'bg-gray-100'; let text = 'text-gray-500';
  if (score >= 70) { bg = 'bg-green-900/50'; text = 'text-green-300'; }
  else if (score >= 40) { bg = 'bg-yellow-900/50'; text = 'text-yellow-300'; }
  else if (score >= 20) { bg = 'bg-orange-900/50'; text = 'text-orange-300'; }
  else if (score > 0) { bg = 'bg-red-900/40'; text = 'text-red-300'; }
  return (
    <div className="flex items-center gap-1.5">
      <div className={`px-2 py-1 rounded-full text-xs font-bold ${bg} ${text}`}>{score}</div>
      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{
          width: `${score}%`,
          background: score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : score >= 20 ? '#f97316' : '#ef4444',
        }} />
      </div>
    </div>
  );
}
