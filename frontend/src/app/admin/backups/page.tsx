'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';

interface BackupFile {
  name: string;
  path: string;
  size_bytes: number;
  size_human: string;
  created_at: string;
  age_seconds: number;
  age_human: string;
}

interface CronJob {
  schedule: string;
  command: string;
  description: string;
}

interface DiskUsage {
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent_used: number;
  backup_size_human: string;
}

interface BackupStatus {
  cron_jobs: CronJob[];
  daily_backups: BackupFile[];
  snapshots: BackupFile[];
  daily_count: number;
  snapshot_count: number;
  daily_total_size_human: string;
  snapshot_total_size_human: string;
  recent_errors: string[];
  disk: DiskUsage;
  system_healthy: boolean;
  last_daily_at: string | null;
  last_snapshot_at: string | null;
}

export default function BackupsPage() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<'daily' | 'snapshot' | null>(null);
  const [toast, setToast] = useState('');
  const [logTab, setLogTab] = useState<'daily.log' | 'snapshot.log'>('daily.log');
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    loadStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadLog();
  }, [logTab]);

  async function loadStatus() {
    try {
      const r = await adminApi('/admin/backups/status');
      const d = await r.json();
      setStatus(d);
    } catch {}
    setLoading(false);
  }

  async function loadLog() {
    setLogLoading(true);
    try {
      const r = await adminApi(`/admin/backups/logs/${logTab}?lines=100`);
      const d = await r.json();
      setLogLines(d.lines || []);
    } catch {}
    setLogLoading(false);
  }

  async function triggerBackup(type: 'daily' | 'snapshot') {
    if (type === 'daily' && !confirm('Trigger a full daily backup? This can take 1-2 minutes.')) return;
    setRunning(type);
    try {
      await adminApi(`/admin/backups/run/${type}`, { method: 'POST' });
      showToast(`${type === 'daily' ? 'Daily backup' : 'Snapshot'} started in background`);
      // Refresh after delay
      setTimeout(loadStatus, type === 'snapshot' ? 5000 : 60000);
    } catch {
      showToast('Error starting backup');
    }
    setRunning(null);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!status) {
    return <div className="text-red-600">Failed to load backup status</div>;
  }

  const healthColor = status.system_healthy ? 'green' : 'amber';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#273b84]">Backup Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Automated backups — daily at 5 AM + snapshots every 15 min. Auto-refresh every 30s.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadStatus}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
            ↻ Refresh
          </button>
          <button onClick={() => triggerBackup('snapshot')} disabled={running !== null}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
            {running === 'snapshot' ? 'Running...' : 'Run Snapshot Now'}
          </button>
          <button onClick={() => triggerBackup('daily')} disabled={running !== null}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#273b84] text-white hover:bg-[#1e2d6b] disabled:opacity-40">
            {running === 'daily' ? 'Running...' : 'Run Daily Backup Now'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-[#273b84] text-white text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Health Banner */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${
        status.system_healthy
          ? 'bg-green-50 border border-green-200'
          : 'bg-amber-50 border border-amber-200'
      }`}>
        <div className={`w-3 h-3 rounded-full ${status.system_healthy ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
        <div className="flex-1">
          <p className={`text-sm font-bold ${status.system_healthy ? 'text-green-800' : 'text-amber-800'}`}>
            {status.system_healthy ? 'System Healthy' : 'Attention Needed'}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {status.system_healthy
              ? 'All backup jobs are running normally.'
              : 'Check recent errors or manually trigger a backup below.'}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Daily Backups"
          value={String(status.daily_count)}
          sub={`${status.daily_total_size_human} total`}
          icon="📦"
        />
        <StatCard
          label="Snapshots"
          value={String(status.snapshot_count)}
          sub={`${status.snapshot_total_size_human} total (24h)`}
          icon="📸"
        />
        <StatCard
          label="Last Daily"
          value={status.daily_backups[0]?.age_human || 'Never'}
          sub={status.last_daily_at ? new Date(status.last_daily_at).toLocaleString() : '—'}
          icon="🕐"
        />
        <StatCard
          label="Last Snapshot"
          value={status.snapshots[0]?.age_human || 'Never'}
          sub={status.last_snapshot_at ? new Date(status.last_snapshot_at).toLocaleString() : '—'}
          icon="⚡"
        />
      </div>

      {/* Cron Schedule */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-[#273b84] uppercase tracking-wide mb-3">📅 Scheduled Jobs</h2>
        {status.cron_jobs.length === 0 ? (
          <p className="text-sm text-red-600">No cron jobs found! Check crontab configuration.</p>
        ) : (
          <div className="space-y-2">
            {status.cron_jobs.map((job, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <code className="px-2 py-1 rounded bg-[#273b84] text-white text-xs font-mono whitespace-nowrap">
                  {job.schedule}
                </code>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{job.description}</p>
                  <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{job.command}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disk Usage */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-[#273b84] uppercase tracking-wide mb-3">💾 Disk Usage</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">
                {status.disk.used_gb.toFixed(1)} GB used of {status.disk.total_gb.toFixed(1)} GB
              </span>
              <span className="text-gray-500">{status.disk.percent_used.toFixed(1)}% full</span>
            </div>
            <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full transition-all ${
                status.disk.percent_used > 90 ? 'bg-red-500' :
                status.disk.percent_used > 70 ? 'bg-amber-500' : 'bg-green-500'
              }`} style={{ width: `${status.disk.percent_used}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Free: <strong>{status.disk.free_gb.toFixed(1)} GB</strong> · Backup dir: <strong>{status.disk.backup_size_human}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      {status.recent_errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-red-800 uppercase tracking-wide mb-3">⚠️ Recent Errors</h2>
          <div className="space-y-1 font-mono text-xs text-red-700">
            {status.recent_errors.map((err, i) => <div key={i}>{err}</div>)}
          </div>
        </div>
      )}

      {/* Two-column: Daily Backups + Snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Backups */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#273b84] uppercase tracking-wide mb-3">
            📦 Daily Backups ({status.daily_count})
          </h2>
          <p className="text-xs text-gray-500 mb-3">Full source + DB, 30-day retention</p>
          {status.daily_backups.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No daily backups yet</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {status.daily_backups.map(b => (
                <div key={b.name} className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(b.created_at).toLocaleString()} — {b.age_human}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-white text-xs font-bold text-[#273b84] shrink-0">
                    {b.size_human}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Snapshots */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#273b84] uppercase tracking-wide mb-3">
            📸 Snapshots ({status.snapshot_count})
          </h2>
          <p className="text-xs text-gray-500 mb-3">DB-only, 24h rolling retention (every 15 min)</p>
          {status.snapshots.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No snapshots yet</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {status.snapshots.map(s => (
                <div key={s.name} className="flex justify-between items-center p-2 rounded-md text-xs bg-gray-50 hover:bg-gray-100">
                  <span className="font-mono text-gray-700 truncate">{s.name.replace('snapshot_','').replace('.sql.gz','')}</span>
                  <span className="flex gap-2 shrink-0">
                    <span className="text-gray-500">{s.age_human}</span>
                    <span className="font-semibold text-[#273b84]">{s.size_human}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Viewer */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#273b84] uppercase tracking-wide">📝 Logs</h2>
          <div className="flex gap-1">
            {(['daily.log', 'snapshot.log'] as const).map(name => (
              <button key={name} onClick={() => setLogTab(name)}
                className={`px-3 py-1 text-xs font-medium rounded-lg ${
                  logTab === name ? 'bg-[#273b84] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {name}
              </button>
            ))}
            <button onClick={loadLog}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
              ↻
            </button>
          </div>
        </div>
        {logLoading ? (
          <div className="h-40 bg-gray-100 rounded animate-pulse" />
        ) : logLines.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Log is empty</p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-lg p-3 font-mono text-xs"
            style={{ background: '#0f172a', color: '#e2e8f0' }}>
            {logLines.map((line, i) => (
              <div key={i} className={
                line.includes('ERROR') || line.includes('FAILED') ? 'text-red-400' :
                line.includes('✓') ? 'text-green-400' :
                line.includes('=====') ? 'text-cyan-400' :
                line.includes('[') ? 'text-slate-300' : 'text-slate-400'
              }>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-2">💡 Need to Restore?</h2>
        <p className="text-xs text-blue-700 mb-3">
          Backups are stored at <code className="bg-white px-1.5 py-0.5 rounded">/home/jpuser/backups/</code>.
          Refer to <code className="bg-white px-1.5 py-0.5 rounded">/home/jpuser/backups/README.md</code> for full restore instructions.
        </p>
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-blue-800">Quick restore commands</summary>
          <div className="mt-3 space-y-2 font-mono bg-white p-3 rounded-lg border border-blue-100">
            <div>
              <p className="text-gray-500 mb-1"># Restore latest snapshot (≤15 min old DB)</p>
              <p className="text-[#273b84]">LATEST=$(ls -t /home/jpuser/backups/snapshots/*.sql.gz | head -1)</p>
              <p className="text-[#273b84]">gunzip {'<'} "$LATEST" | docker exec -i jpus_postgres psql -U janapriya_user -d janapriya_db</p>
            </div>
            <div className="pt-2 border-t border-blue-100">
              <p className="text-gray-500 mb-1"># Restore from a specific daily backup</p>
              <p className="text-[#273b84]">cat /home/jpuser/backups/daily/backup_YYYYMMDD_HHMMSS/db_dump.sql | docker exec -i jpus_postgres psql -U janapriya_user -d janapriya_db</p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-black text-[#273b84]">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>
    </div>
  );
}
