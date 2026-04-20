'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';

interface SessionRow {
  session_id: string;
  visitor_id: string | null;
  turn_count: number;
  first_at: string | null;
  last_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  latest_page: string | null;
  preview: string;
}

interface TranscriptRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent: string | null;
  provider: string | null;
  page: string | null;
  page_entity_id: string | null;
  action_type: string | null;
  action_url: string | null;
  latency_ms: number | null;
  created_at: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: color + '22', color }}>{children}</span>
  );
}

export default function AssistantChatsPage() {
  const [items, setItems] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [intentFilter, setIntentFilter] = useState('');
  const [pageFilter, setPageFilter] = useState('');

  const [openSession, setOpenSession] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ session: any; transcript: TranscriptRow[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (intentFilter) params.set('intent', intentFilter);
    if (pageFilter) params.set('page_filter', pageFilter);
    if (q.trim()) params.set('q', q.trim());
    const res = await adminApi(`/assistant/admin/chats/sessions?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, intentFilter, pageFilter]);  // eslint-disable-line

  const loadDetail = async (sid: string) => {
    setOpenSession(sid);
    setDetailLoading(true);
    setDetail(null);
    const res = await adminApi(`/assistant/admin/chats/sessions/${encodeURIComponent(sid)}`);
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#273b84]">Assistant Chats <span className="text-gray-500 text-lg font-normal">({total})</span></h1>
          <p className="text-sm text-gray-500 mt-1">Every visitor conversation with the AI assistant · click a session to see the full transcript, cookies and attribution.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setPage(1), load())}
          placeholder="Search message text…"
          className="bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" />
        <select value={intentFilter} onChange={e => { setIntentFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm">
          <option value="">All intents</option>
          <option value="find_units">Find units</option>
          <option value="brochure">Brochure</option>
          <option value="site_visit">Site visit</option>
          <option value="riseup">RiseUp</option>
          <option value="general">General</option>
        </select>
        <select value={pageFilter} onChange={e => { setPageFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm">
          <option value="">All pages</option>
          <option value="home">Home</option>
          <option value="store">Store</option>
          <option value="project">Project</option>
          <option value="tower">Tower</option>
          <option value="unit">Unit</option>
        </select>
        <button onClick={() => { setPage(1); load(); }}
          className="px-4 py-2 text-sm bg-[#273b84] text-white rounded-lg font-medium hover:bg-[#1e2d6b]">Apply</button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {['Preview', 'Turns', 'Page', 'UTM', 'IP', 'Last activity'].map(h => (
                <th key={h} className="text-left text-gray-500 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center text-gray-500 py-10">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-10">No chats yet — visitors' conversations will show up here.</td></tr>}
            {items.map(s => (
              <tr key={s.session_id} onClick={() => loadDetail(s.session_id)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 max-w-sm">
                  <p className="text-gray-900 truncate">{s.preview || '—'}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Visitor {s.visitor_id?.slice(-8) || '—'} · Session {s.session_id.slice(-8)}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{s.turn_count}</td>
                <td className="px-4 py-3">{s.latest_page ? <Badge color="#273b84">{s.latest_page}</Badge> : '—'}</td>
                <td className="px-4 py-3 text-[11px] text-gray-500">
                  {s.utm_source ? `${s.utm_source}${s.utm_medium ? ' / ' + s.utm_medium : ''}` : 'direct'}
                </td>
                <td className="px-4 py-3 text-[11px] text-gray-500">{s.ip_address || '—'}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{timeAgo(s.last_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {openSession && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end"
          onClick={() => { setOpenSession(null); setDetail(null); }}>
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-[#273b84]">Session transcript</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">{openSession}</p>
              </div>
              <button onClick={() => { setOpenSession(null); setDetail(null); }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500">✕</button>
            </div>

            {detailLoading && <div className="p-6 text-gray-500">Loading…</div>}

            {detail && (
              <div className="p-5 space-y-5">
                {/* Visitor meta */}
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Visitor</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div><span className="text-gray-500">Visitor ID:</span> <code>{detail.session.visitor_id?.slice(-16) || '—'}</code></div>
                    <div><span className="text-gray-500">Turns:</span> {detail.session.turn_count}</div>
                    <div><span className="text-gray-500">First:</span> {detail.session.first_at ? new Date(detail.session.first_at).toLocaleString() : '—'}</div>
                    <div><span className="text-gray-500">Last:</span> {detail.session.last_at ? new Date(detail.session.last_at).toLocaleString() : '—'}</div>
                    <div><span className="text-gray-500">IP:</span> {detail.session.ip_address || '—'}</div>
                    <div className="col-span-2 truncate"><span className="text-gray-500">UA:</span> {detail.session.user_agent || '—'}</div>
                    <div className="col-span-2"><span className="text-gray-500">Referrer:</span> {detail.session.referrer || 'direct'}</div>
                    <div className="col-span-2"><span className="text-gray-500">Landing:</span> {detail.session.landing_page || '—'}</div>
                    <div><span className="text-gray-500">UTM source:</span> {detail.session.utm_source || '—'}</div>
                    <div><span className="text-gray-500">UTM medium:</span> {detail.session.utm_medium || '—'}</div>
                    <div><span className="text-gray-500">UTM campaign:</span> {detail.session.utm_campaign || '—'}</div>
                    <div><span className="text-gray-500">UTM content:</span> {detail.session.utm_content || '—'}</div>
                  </div>
                  {detail.session.cookies && Object.keys(detail.session.cookies).length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs font-bold uppercase tracking-wider text-gray-500 cursor-pointer">Captured cookies ({Object.keys(detail.session.cookies).length})</summary>
                      <div className="mt-2 text-[11px] font-mono bg-white p-2 rounded border border-gray-200 max-h-40 overflow-y-auto">
                        {Object.entries(detail.session.cookies).map(([k, v]) => (
                          <div key={k} className="truncate"><strong>{k}:</strong> {String(v)}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>

                {/* Transcript */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Conversation</h3>
                  <div className="space-y-3">
                    {detail.transcript.map(t => (
                      <div key={t.id} className={`rounded-xl p-3 border ${t.role === 'user' ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-2 mb-1 text-[11px] text-gray-500">
                          <strong className="uppercase">{t.role}</strong>
                          <span>· {new Date(t.created_at).toLocaleTimeString()}</span>
                          {t.intent && <Badge color="#2A3887">{t.intent}</Badge>}
                          {t.provider && <Badge color="#29A9DF">{t.provider}</Badge>}
                          {t.action_type && <Badge color="#f59e0b">{t.action_type}</Badge>}
                          {t.page && <span className="ml-auto">{t.page}{t.page_entity_id ? ` · ${t.page_entity_id.slice(-8)}` : ''}</span>}
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{t.content}</p>
                        {t.action_url && (
                          <p className="text-[11px] mt-1"><span className="text-gray-500">→</span> <a href={t.action_url} target="_blank" rel="noreferrer" className="text-[#29A9DF] underline truncate">{t.action_url}</a></p>
                        )}
                        {t.latency_ms != null && t.role === 'assistant' && (
                          <p className="text-[10px] text-gray-400 mt-1">{t.latency_ms}ms</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
