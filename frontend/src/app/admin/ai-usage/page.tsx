'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';

interface GroqStatus {
  configured: boolean;
  model: string;
  limit_requests: number | null;
  remaining_requests: number | null;
  limit_tokens: number | null;
  remaining_tokens: number | null;
  reset_requests: string | null;
  reset_tokens: string | null;
  last_updated: string | null;
  last_error: string | null;
  last_error_at: string | null;
  source: string;
}

interface GeminiStatus {
  configured: boolean;
  model: string;
  fallback_model: string | null;
  daily_limit: number;
  calls_today: number;
  calls_ok_today: number;
  calls_failed_today: number;
  remaining_today: number;
  last_updated: string | null;
  last_error: string | null;
  last_error_at: string | null;
  source: string;
}

interface LiveResp {
  groq: GroqStatus;
  gemini: GeminiStatus;
  utc_now: string;
}

function agoText(iso: string | null): string {
  if (!iso) return '—';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Bar({ used, limit, color }: { used: number; limit: number; color: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
      <div className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function AIUsagePage() {
  const [data, setData] = useState<LiveResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await adminApi('/admin/ai-usage/live');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setErr(null);
    } catch (e: any) {
      setErr(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading AI usage…</div>;
  if (err || !data) return <div className="p-6 text-red-600">Error: {err || 'No data'}</div>;

  const { groq, gemini } = data;
  const groqLimit = groq.limit_requests || 14400;
  const groqUsed  = groq.remaining_requests !== null ? groqLimit - groq.remaining_requests : 0;
  const groqPct   = groq.remaining_requests !== null ? Math.round((groqUsed / groqLimit) * 100) : null;

  const geminiPct = Math.round((gemini.calls_today / gemini.daily_limit) * 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#273b84]">AI Usage</h1>
          <p className="text-sm text-gray-500 mt-1">
            Live status from the assistant's two free-tier providers · auto-refreshes every 15s
          </p>
        </div>
        <button onClick={load}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
          ↻ Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── Groq ──────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h2 className="font-bold text-gray-900">Groq <span className="text-xs font-normal text-gray-500">(primary)</span></h2>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${groq.configured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {groq.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">Model: <code className="text-[#273b84]">{groq.model}</code></p>

          {groq.remaining_requests === null ? (
            <p className="text-sm text-gray-500 italic">No calls yet since last restart — open the chat once and usage will appear here.</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm text-gray-600">Requests (current window)</span>
                <span className="text-sm font-bold text-gray-900">
                  {groqUsed.toLocaleString()} / {groqLimit.toLocaleString()}
                  <span className="text-xs font-normal text-gray-500 ml-1">({groqPct}%)</span>
                </span>
              </div>
              <Bar used={groqUsed} limit={groqLimit} color={groqPct! >= 90 ? '#dc2626' : groqPct! >= 70 ? '#f59e0b' : '#22c55e'} />
              <p className="text-[11px] text-gray-400 mt-1">Resets in {groq.reset_requests || '—'}</p>

              {groq.limit_tokens && groq.remaining_tokens !== null && (
                <div className="mt-4">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm text-gray-600">Tokens (per minute)</span>
                    <span className="text-sm font-bold text-gray-900">
                      {(groq.limit_tokens - groq.remaining_tokens).toLocaleString()} / {groq.limit_tokens.toLocaleString()}
                    </span>
                  </div>
                  <Bar used={groq.limit_tokens - groq.remaining_tokens} limit={groq.limit_tokens} color="#29A9DF" />
                  <p className="text-[11px] text-gray-400 mt-1">Resets in {groq.reset_tokens || '—'}</p>
                </div>
              )}
            </>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <div>Last successful call: <span className="text-gray-700">{agoText(groq.last_updated)}</span></div>
            {groq.last_error && (
              <div className="mt-1 text-red-600 truncate" title={groq.last_error}>
                Last error ({agoText(groq.last_error_at)}): {groq.last_error}
              </div>
            )}
          </div>
        </div>

        {/* ── Gemini ──────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌀</span>
              <h2 className="font-bold text-gray-900">Gemini <span className="text-xs font-normal text-gray-500">(fallback)</span></h2>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gemini.configured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {gemini.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Model: <code className="text-[#273b84]">{gemini.model}</code>
            {gemini.fallback_model && (
              <> · fallback: <code className="text-[#273b84]">{gemini.fallback_model}</code></>
            )}
          </p>

          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm text-gray-600">Requests today (UTC)</span>
            <span className="text-sm font-bold text-gray-900">
              {gemini.calls_today.toLocaleString()} / {gemini.daily_limit.toLocaleString()}
              <span className="text-xs font-normal text-gray-500 ml-1">({geminiPct}%)</span>
            </span>
          </div>
          <Bar used={gemini.calls_today} limit={gemini.daily_limit}
            color={geminiPct >= 90 ? '#dc2626' : geminiPct >= 70 ? '#f59e0b' : '#22c55e'} />
          <p className="text-[11px] text-gray-400 mt-1">
            {gemini.calls_ok_today} succeeded · {gemini.calls_failed_today} failed · {gemini.remaining_today.toLocaleString()} remaining
          </p>

          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <div>Last call: <span className="text-gray-700">{agoText(gemini.last_updated)}</span></div>
            {gemini.last_error && (
              <div className="mt-1 text-red-600 truncate" title={gemini.last_error}>
                Last error ({agoText(gemini.last_error_at)}): {gemini.last_error}
              </div>
            )}
            <div className="mt-2 italic text-gray-400">
              Gemini doesn't expose quota; counts only calls made from this server since last restart.
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Server UTC now: {new Date(data.utc_now).toLocaleString()}
      </div>
    </div>
  );
}
