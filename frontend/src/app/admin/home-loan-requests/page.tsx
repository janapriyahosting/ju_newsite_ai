'use client';
import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};
const STATUSES = ['new', 'contacted', 'processing', 'approved', 'rejected'];

function fmtCurrency(v: number | null) {
  if (!v) return '—';
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}</span>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
      📄 {label}
    </a>
  );
}

export default function HomeLoanRequestsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: '15' });
    if (filterStatus) params.set('status', filterStatus);
    const res = await adminApi(`/admin/home-loan-requests?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page, filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await adminApi(`/admin/home-loan-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setUpdating(null);
    fetchData();
  };

  const updateRemarks = async (id: string, admin_remarks: string) => {
    await adminApi(`/admin/home-loan-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ admin_remarks }) });
    fetchData();
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#273b84]">
          Home Loan Requests <span className="text-gray-500 text-lg font-normal">({total})</span>
        </h1>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {['Applicant', 'Phone', 'Property', 'Employment', 'Co-Applicant', 'Status', 'Applied On'].map(h => (
                <th key={h} className="text-left text-gray-500 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center text-gray-500 py-10">Loading...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-10">No home loan requests found</td></tr>}
            {items.map(r => (
              <React.Fragment key={r.id}>
                <tr className="border-b border-gray-200 hover:bg-gray-50/60 transition cursor-pointer"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                  <td className="px-4 py-3">
                    <p className="text-gray-900 font-medium">{r.name}</p>
                    <p className="text-gray-500 text-xs">{r.email || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.phone}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900 text-xs font-medium">{r.unit_number || '—'}</p>
                    <p className="text-gray-400 text-xs">{[r.tower_name, r.project_name].filter(Boolean).join(' / ') || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 capitalize">{r.employment_type?.replace('_', ' ') || '—'}</td>
                  <td className="px-4 py-3">
                    {r.has_co_applicant
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Yes — {r.co_applicant?.name || '—'}</span>
                      : <span className="text-xs text-gray-400">No</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select value={r.status} disabled={updating === r.id}
                      onChange={e => { e.stopPropagation(); updateStatus(r.id, e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr key={r.id + '-detail'} className="border-b border-gray-200 bg-gray-50">
                    <td colSpan={7} className="px-6 py-5">
                      {/* Applicant Details */}
                      <h4 className="text-xs font-bold text-[#273b84] uppercase tracking-wide mb-2">Applicant Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                        <InfoRow label="PAN" value={r.pan} />
                        <InfoRow label="Aadhar" value={r.aadhar} />
                        <InfoRow label="DOB" value={r.dob} />
                        <InfoRow label="City" value={r.city} />
                        <InfoRow label="State" value={r.state} />
                        <InfoRow label="Pincode" value={r.pincode} />
                        <InfoRow label="Organisation" value={r.organisation} />
                        <InfoRow label="Work Exp" value={r.work_experience ? `${r.work_experience} yrs` : null} />
                        <InfoRow label="Obligations" value={fmtCurrency(r.current_obligations)} />
                        <InfoRow label="Property Value" value={fmtCurrency(r.property_value)} />
                        <InfoRow label="Address" value={[r.address_line1, r.address_line2].filter(Boolean).join(', ') || null} />
                      </div>
                      <div className="flex gap-2 mb-4">
                        <DocLink label="Pay Slips" url={r.payslips_url} />
                        <DocLink label="Form 16" url={r.form16_url} />
                      </div>

                      {/* Co-Applicant Details */}
                      {r.has_co_applicant && r.co_applicant && (
                        <>
                          <h4 className="text-xs font-bold text-[#273b84] uppercase tracking-wide mb-2 mt-4 pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>Co-Applicant Details</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                            <InfoRow label="Name" value={r.co_applicant.name} />
                            <InfoRow label="Phone" value={r.co_applicant.phone} />
                            <InfoRow label="Email" value={r.co_applicant.email} />
                            <InfoRow label="PAN" value={r.co_applicant.pan} />
                            <InfoRow label="Aadhar" value={r.co_applicant.aadhar} />
                            <InfoRow label="DOB" value={r.co_applicant.dob} />
                            <InfoRow label="City" value={r.co_applicant.city} />
                            <InfoRow label="State" value={r.co_applicant.state} />
                            <InfoRow label="Employment" value={r.co_applicant.employment_type} />
                            <InfoRow label="Income" value={r.co_applicant.gross_monthly_income ? fmtCurrency(parseFloat(r.co_applicant.gross_monthly_income)) : null} />
                            <InfoRow label="Organisation" value={r.co_applicant.organisation} />
                            <InfoRow label="Work Exp" value={r.co_applicant.work_experience ? `${r.co_applicant.work_experience} yrs` : null} />
                          </div>
                          <div className="flex gap-2 mb-4">
                            <DocLink label="Co-Applicant Pay Slips" url={r.co_applicant.payslips_url} />
                            <DocLink label="Co-Applicant Form 16" url={r.co_applicant.form16_url} />
                          </div>
                        </>
                      )}

                      {/* Admin Remarks */}
                      <div className="mt-4 pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
                        <label className="text-gray-400 text-xs block mb-1">Admin Remarks</label>
                        <textarea
                          defaultValue={r.admin_remarks || ''}
                          onBlur={e => { if (e.target.value !== (r.admin_remarks || '')) updateRemarks(r.id, e.target.value); }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          rows={2} placeholder="Add remarks..." />
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-200">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-200">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
