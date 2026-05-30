'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';

interface TokenStatus {
  configured: boolean;
  last_updated: string | null;
  preview: string | null;
  username: string;
  path: string;
}

export default function OpsPage() {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    const res = await adminApi('/admin/ops/github-token');
    if (res.ok) {
      const data: TokenStatus = await res.json();
      setStatus(data);
      if (!username) setUsername(data.username);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!token.trim()) {
      setToast({ kind: 'err', text: 'Paste a token first.' });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      const res = await adminApi('/admin/ops/github-token', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim(), username: username.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ kind: 'err', text: data.detail || 'Failed to save token.' });
      } else {
        setToast({ kind: 'ok', text: 'GitHub token updated.' });
        setToken('');
        setStatus(data);
      }
    } catch (e: any) {
      setToast({ kind: 'err', text: e?.message || 'Network error.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Ops Credentials</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage credentials used by server-side operations (deployments, git pushes). The app itself does
          not consume these — they're written to a file the shell tools read.
        </p>
      </header>

      <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">GitHub Personal Access Token</h2>
            <p className="text-sm text-slate-500 mt-1">Used by <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">git push</code> from the server shell.</p>
          </div>
          <div className="text-right text-xs">
            {status?.configured ? (
              <>
                <div className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Configured
                </div>
                <div className="text-slate-400 mt-1">{status.preview}</div>
                {status.last_updated && (
                  <div className="text-slate-400">Updated {new Date(status.last_updated).toLocaleString()}</div>
                )}
              </>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Not configured
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">GitHub username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="janapriyahosting"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              New token <span className="text-slate-400 font-normal">(ghp_…, github_pat_…)</span>
            </label>
            <div className="flex gap-2">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Paste a freshly-generated token"
                className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken(s => !s)}
                className="px-3 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Create one at <a className="text-blue-600 hover:underline" href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">github.com/settings/tokens</a>.
              Needs <code className="bg-slate-100 px-1 rounded">repo</code> scope. Stored at <code className="bg-slate-100 px-1 rounded">{status?.path || '/home/jpuser/.github-token.env'}</code> (mode 600).
            </p>
          </div>

          {toast && (
            <div className={`text-sm px-3 py-2 rounded-md border ${
              toast.kind === 'ok'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {toast.text}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={save}
              disabled={saving || !token.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save token'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
