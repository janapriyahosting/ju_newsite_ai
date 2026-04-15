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

interface Schedule {
  id: string;
  schedule: string;
  script: string;
  description: string;
  enabled: boolean;
  managed: boolean;
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

interface TreeEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  size_human: string;
}

const SCHEDULE_PRESETS = [
  { label: 'Every 5 minutes',    value: '*/5 * * * *' },
  { label: 'Every 15 minutes',   value: '*/15 * * * *' },
  { label: 'Every 30 minutes',   value: '*/30 * * * *' },
  { label: 'Every hour',         value: '0 * * * *' },
  { label: 'Every 6 hours',      value: '0 */6 * * *' },
  { label: 'Daily at midnight',  value: '0 0 * * *' },
  { label: 'Daily at 5 AM',      value: '0 5 * * *' },
  { label: 'Daily at noon',      value: '0 12 * * *' },
  { label: 'Weekly (Sun 5 AM)',  value: '0 5 * * 0' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function BackupsPage() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<'daily' | 'snapshot' | null>(null);
  const [toast, setToast] = useState('');
  const [logTab, setLogTab] = useState<'daily.log' | 'snapshot.log' | 'restore.log'>('daily.log');
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  // Schedule modal
  const [schEditing, setSchEditing] = useState<Schedule | null>(null);
  const [schCreating, setSchCreating] = useState(false);
  const [schForm, setSchForm] = useState({ schedule: '', script: 'snapshot_backup.sh', description: '' });
  const [schSaving, setSchSaving] = useState(false);

  // Restore modal
  const [restoreTarget, setRestoreTarget] = useState<{ type: 'snapshot' | 'daily'; name: string; label: string } | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Source browser
  const [browseBackup, setBrowseBackup] = useState<string | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browsePath, setBrowsePath] = useState<string>('');
  const [browseTree, setBrowseTree] = useState<TreeEntry[]>([]);
  const [browseSearch, setBrowseSearch] = useState('');
  const [previewFile, setPreviewFile] = useState<{ path: string; content: string; size: number } | null>(null);
  const [fileRestoreTarget, setFileRestoreTarget] = useState<{ backup: string; path: string } | null>(null);
  const [fileRestoreConfirm, setFileRestoreConfirm] = useState('');
  const [fileRestoring, setFileRestoring] = useState(false);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { loadLog(); }, [logTab]);

  async function loadAll() {
    await Promise.all([loadStatus(), loadSchedules()]);
    setLoading(false);
  }

  async function loadStatus() {
    try {
      const r = await adminApi('/admin/backups/status');
      setStatus(await r.json());
    } catch {}
  }

  async function loadSchedules() {
    try {
      const r = await adminApi('/admin/backups/schedules');
      setSchedules(await r.json());
    } catch {}
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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function triggerBackup(type: 'daily' | 'snapshot') {
    if (type === 'daily' && !confirm('Trigger a full daily backup? This can take 1-2 minutes.')) return;
    setRunning(type);
    try {
      await adminApi(`/admin/backups/run/${type}`, { method: 'POST' });
      showToast(`${type === 'daily' ? 'Daily backup' : 'Snapshot'} started`);
      setTimeout(loadStatus, type === 'snapshot' ? 5000 : 60000);
    } catch { showToast('Error starting backup'); }
    setRunning(null);
  }

  // ── Schedule CRUD ──
  function openCreateSchedule() {
    setSchForm({ schedule: '*/15 * * * *', script: 'snapshot_backup.sh', description: '' });
    setSchCreating(true);
    setSchEditing(null);
  }

  function openEditSchedule(s: Schedule) {
    setSchForm({ schedule: s.schedule, script: s.script, description: s.description });
    setSchEditing(s);
    setSchCreating(false);
  }

  async function saveSchedule() {
    setSchSaving(true);
    try {
      if (schCreating) {
        const r = await adminApi('/admin/backups/schedules', {
          method: 'POST',
          body: JSON.stringify(schForm),
        });
        if (!r.ok) {
          const err = await r.json();
          showToast(err.detail || 'Error creating schedule');
        } else {
          showToast('Schedule created');
          setSchCreating(false);
          loadSchedules();
        }
      } else if (schEditing) {
        const r = await adminApi(`/admin/backups/schedules/${schEditing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ schedule: schForm.schedule, description: schForm.description }),
        });
        if (!r.ok) {
          const err = await r.json();
          showToast(err.detail || 'Error updating');
        } else {
          showToast('Schedule updated');
          setSchEditing(null);
          loadSchedules();
        }
      }
    } catch { showToast('Error saving'); }
    setSchSaving(false);
  }

  async function toggleSchedule(s: Schedule) {
    try {
      await adminApi(`/admin/backups/schedules/${s.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !s.enabled }),
      });
      loadSchedules();
      showToast(`Schedule ${s.enabled ? 'disabled' : 'enabled'}`);
    } catch { showToast('Error'); }
  }

  async function deleteSchedule(s: Schedule) {
    if (!confirm(`Delete schedule "${s.description || s.schedule}"? Cannot be undone.`)) return;
    try {
      await adminApi(`/admin/backups/schedules/${s.id}`, { method: 'DELETE' });
      loadSchedules();
      showToast('Schedule deleted');
    } catch { showToast('Error deleting'); }
  }

  // ── Download ──
  async function downloadSnapshot(filename: string) {
    const token = localStorage.getItem('admin_token');
    try {
      const r = await fetch(`${API_URL}/admin/backups/download/snapshot/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) { showToast('Download failed'); return; }
      const blob = await r.blob();
      triggerBlobDownload(blob, filename);
    } catch { showToast('Download failed'); }
  }

  async function downloadDaily(backupName: string, type: 'db' | 'source') {
    const token = localStorage.getItem('admin_token');
    try {
      const r = await fetch(`${API_URL}/admin/backups/download/daily/${backupName}/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) { showToast('Download failed'); return; }
      const blob = await r.blob();
      const ext = type === 'db' ? 'sql' : 'tar.gz';
      triggerBlobDownload(blob, `${backupName}_${type}.${ext}`);
    } catch { showToast('Download failed'); }
  }

  function triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Restore ──
  function openRestore(type: 'snapshot' | 'daily', name: string, label: string) {
    setRestoreTarget({ type, name, label });
    setRestoreConfirm('');
  }

  async function performRestore() {
    if (!restoreTarget || restoreConfirm !== 'RESTORE') return;
    setRestoring(true);
    try {
      const r = await adminApi('/admin/backups/restore', {
        method: 'POST',
        body: JSON.stringify({
          source_type: restoreTarget.type,
          source_name: restoreTarget.name,
          confirmation: 'RESTORE',
        }),
      });
      if (r.ok) {
        showToast('Restore started. A safety backup was taken. Check restore.log for progress.');
        setRestoreTarget(null);
        setRestoreConfirm('');
        setLogTab('restore.log');
        setTimeout(() => { loadStatus(); loadLog(); }, 5000);
      } else {
        const err = await r.json();
        showToast(err.detail || 'Restore failed');
      }
    } catch { showToast('Restore failed'); }
    setRestoring(false);
  }

  // ── Source browse ──
  async function openSourceBrowser(backupName: string) {
    setBrowseBackup(backupName);
    setBrowsePath('');
    setBrowseLoading(true);
    setBrowseTree([]);
    try {
      await adminApi(`/admin/backups/daily/${backupName}/source/extract`, { method: 'POST' });
      await loadBrowseTree(backupName, '');
    } catch {
      showToast('Failed to extract source backup');
      setBrowseBackup(null);
    }
    setBrowseLoading(false);
  }

  async function loadBrowseTree(backupName: string, path: string) {
    setBrowseLoading(true);
    try {
      const r = await adminApi(
        `/admin/backups/daily/${backupName}/source/tree?path=${encodeURIComponent(path)}`
      );
      const d = await r.json();
      setBrowseTree(Array.isArray(d) ? d : []);
      setBrowsePath(path);
    } catch { showToast('Failed to list directory'); }
    setBrowseLoading(false);
  }

  async function previewBackupFile(backupName: string, path: string) {
    try {
      const r = await adminApi(
        `/admin/backups/daily/${backupName}/source/file?path=${encodeURIComponent(path)}&preview=true`
      );
      const d = await r.json();
      if (d.preview) {
        setPreviewFile({ path, content: d.content, size: d.size });
      } else {
        showToast(d.reason || 'Cannot preview file');
      }
    } catch { showToast('Preview failed'); }
  }

  async function downloadBackupFile(backupName: string, path: string) {
    const token = localStorage.getItem('admin_token');
    try {
      const r = await fetch(
        `${API_URL}/admin/backups/daily/${backupName}/source/file?path=${encodeURIComponent(path)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!r.ok) { showToast('Download failed'); return; }
      const blob = await r.blob();
      const filename = path.split('/').pop() || 'file';
      triggerBlobDownload(blob, filename);
    } catch { showToast('Download failed'); }
  }

  function openFileRestore(backup: string, path: string) {
    setFileRestoreTarget({ backup, path });
    setFileRestoreConfirm('');
  }

  async function performFileRestore() {
    if (!fileRestoreTarget || fileRestoreConfirm !== 'RESTORE_FILE') return;
    setFileRestoring(true);
    try {
      const r = await adminApi(
        `/admin/backups/daily/${fileRestoreTarget.backup}/source/restore-file`,
        {
          method: 'POST',
          body: JSON.stringify({ path: fileRestoreTarget.path, confirmation: 'RESTORE_FILE' }),
        }
      );
      const d = await r.json();
      if (r.ok) {
        showToast(`✓ Restored ${fileRestoreTarget.path}`);
        setFileRestoreTarget(null);
        setFileRestoreConfirm('');
      } else {
        showToast(d.detail || 'Restore failed');
      }
    } catch { showToast('Restore failed'); }
    setFileRestoring(false);
  }

  function browsePathBreadcrumbs(): { name: string; path: string }[] {
    if (!browsePath) return [{ name: 'root', path: '' }];
    const parts = browsePath.split('/');
    const crumbs = [{ name: 'root', path: '' }];
    for (let i = 0; i < parts.length; i++) {
      crumbs.push({ name: parts[i], path: parts.slice(0, i + 1).join('/') });
    }
    return crumbs;
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

  if (!status) return <div className="text-red-600">Failed to load backup status</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#273b84]">Backup Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage schedules · Download · Restore · Auto-refresh every 30s
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
            ↻ Refresh
          </button>
          <button onClick={() => triggerBackup('snapshot')} disabled={running !== null}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
            {running === 'snapshot' ? 'Running...' : 'Run Snapshot'}
          </button>
          <button onClick={() => triggerBackup('daily')} disabled={running !== null}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#273b84] text-white hover:bg-[#1e2d6b] disabled:opacity-40">
            {running === 'daily' ? 'Running...' : 'Run Daily Backup'}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-[#273b84] text-white text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Health banner */}
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
            {status.system_healthy ? 'All backup jobs are running normally.' : 'Check recent errors or manually trigger a backup.'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Daily Backups" value={String(status.daily_count)} sub={`${status.daily_total_size_human} total`} icon="📦" />
        <StatCard label="Snapshots" value={String(status.snapshot_count)} sub={`${status.snapshot_total_size_human} total`} icon="📸" />
        <StatCard label="Last Daily" value={status.daily_backups[0]?.age_human || 'Never'} sub={status.last_daily_at ? new Date(status.last_daily_at).toLocaleString() : '—'} icon="🕐" />
        <StatCard label="Last Snapshot" value={status.snapshots[0]?.age_human || 'Never'} sub={status.last_snapshot_at ? new Date(status.last_snapshot_at).toLocaleString() : '—'} icon="⚡" />
      </div>

      {/* ── Schedule Management ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#273b84] uppercase tracking-wide">📅 Schedules ({schedules.length})</h2>
          <button onClick={openCreateSchedule}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">
            + Add Schedule
          </button>
        </div>
        {schedules.length === 0 ? (
          <p className="text-sm text-amber-700">No schedules configured! Backups won't run automatically.</p>
        ) : (
          <div className="space-y-2">
            {schedules.map(s => (
              <div key={s.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  s.enabled ? 'bg-gray-50 border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'
                }`}>
                <code className="px-2 py-1 rounded bg-[#273b84] text-white text-xs font-mono whitespace-nowrap shrink-0">
                  {s.schedule}
                </code>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {s.description || <span className="italic text-gray-400">No description</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">→ {s.script}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleSchedule(s)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg ${
                      s.enabled ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}>
                    {s.enabled ? '● ON' : '○ OFF'}
                  </button>
                  <button onClick={() => openEditSchedule(s)}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
                    Edit
                  </button>
                  <button onClick={() => deleteSchedule(s)}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disk usage */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-[#273b84] uppercase tracking-wide mb-3">💾 Disk Usage</h2>
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

      {/* Recent errors */}
      {status.recent_errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-red-800 uppercase tracking-wide mb-3">⚠️ Recent Errors</h2>
          <div className="space-y-1 font-mono text-xs text-red-700">
            {status.recent_errors.map((err, i) => <div key={i}>{err}</div>)}
          </div>
        </div>
      )}

      {/* ── Daily Backups + Snapshots ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#273b84] uppercase tracking-wide mb-3">
            📦 Daily Backups ({status.daily_count})
          </h2>
          <p className="text-xs text-gray-500 mb-3">Full source + DB, 30-day retention</p>
          {status.daily_backups.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No daily backups yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {status.daily_backups.map(b => (
                <div key={b.name} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(b.created_at).toLocaleString()} — {b.age_human}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-white text-xs font-bold text-[#273b84] shrink-0">
                      {b.size_human}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => downloadDaily(b.name, 'db')}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
                      ⬇ DB
                    </button>
                    <button onClick={() => downloadDaily(b.name, 'source')}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
                      ⬇ Source
                    </button>
                    <button onClick={() => openSourceBrowser(b.name)}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-purple-50 text-purple-700 hover:bg-purple-100">
                      📁 Browse Source
                    </button>
                    <button onClick={() => openRestore('daily', b.name, `daily backup from ${new Date(b.created_at).toLocaleString()}`)}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-orange-50 text-orange-700 hover:bg-orange-100">
                      ↻ Restore DB
                    </button>
                  </div>
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
          <p className="text-xs text-gray-500 mb-3">DB-only, 24h rolling</p>
          {status.snapshots.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No snapshots yet</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {status.snapshots.map(s => (
                <div key={s.name} className="flex items-center gap-2 p-2 rounded-md text-xs bg-gray-50 hover:bg-gray-100">
                  <span className="font-mono text-gray-700 flex-1 truncate">
                    {s.name.replace('snapshot_','').replace('.sql.gz','')}
                  </span>
                  <span className="text-gray-500 whitespace-nowrap">{s.age_human}</span>
                  <span className="font-semibold text-[#273b84] whitespace-nowrap">{s.size_human}</span>
                  <button onClick={() => downloadSnapshot(s.name)}
                    className="px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
                    ⬇
                  </button>
                  <button onClick={() => openRestore('snapshot', s.name, `snapshot from ${new Date(s.created_at).toLocaleString()}`)}
                    className="px-2 py-0.5 text-xs font-medium rounded bg-orange-50 text-orange-700 hover:bg-orange-100">
                    ↻
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#273b84] uppercase tracking-wide">📝 Logs</h2>
          <div className="flex gap-1">
            {(['daily.log', 'snapshot.log', 'restore.log'] as const).map(name => (
              <button key={name} onClick={() => setLogTab(name)}
                className={`px-3 py-1 text-xs font-medium rounded-lg ${
                  logTab === name ? 'bg-[#273b84] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {name}
              </button>
            ))}
            <button onClick={loadLog} className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">↻</button>
          </div>
        </div>
        {logLoading ? (
          <div className="h-40 bg-gray-100 rounded animate-pulse" />
        ) : logLines.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Log is empty</p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-lg p-3 font-mono text-xs" style={{ background: '#0f172a', color: '#e2e8f0' }}>
            {logLines.map((line, i) => (
              <div key={i} className={
                line.includes('ERROR') || line.includes('FAILED') ? 'text-red-400' :
                line.includes('✓') || line.includes(' OK ') ? 'text-green-400' :
                line.includes('=====') ? 'text-cyan-400' :
                line.includes('[') ? 'text-slate-300' : 'text-slate-400'
              }>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════ Schedule Edit/Create Modal ══════════ */}
      {(schEditing || schCreating) && (
        <Modal onClose={() => { setSchEditing(null); setSchCreating(false); }}>
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-[#273b84]">
              {schCreating ? 'Create Schedule' : 'Edit Schedule'}
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cron Expression</label>
              <input value={schForm.schedule}
                onChange={e => setSchForm(f => ({ ...f, schedule: e.target.value }))}
                placeholder="0 5 * * *" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
              <div className="flex flex-wrap gap-1 mt-2">
                {SCHEDULE_PRESETS.map(p => (
                  <button key={p.value} onClick={() => setSchForm(f => ({ ...f, schedule: p.value }))}
                    className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-[#273b84] hover:text-white">
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Format: <code>minute hour day-of-month month day-of-week</code>.
                Use <a href="https://crontab.guru/" target="_blank" className="underline">crontab.guru</a> to verify.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Script</label>
              <select value={schForm.script}
                onChange={e => setSchForm(f => ({ ...f, script: e.target.value }))}
                disabled={!schCreating}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50">
                <option value="snapshot_backup.sh">snapshot_backup.sh (fast, DB only)</option>
                <option value="daily_backup.sh">daily_backup.sh (full source + DB)</option>
              </select>
              {!schCreating && <p className="text-xs text-gray-400 mt-1">Script cannot be changed — delete and recreate to switch.</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
              <input value={schForm.description}
                onChange={e => setSchForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Noon snapshot" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={() => { setSchEditing(null); setSchCreating(false); }}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
              Cancel
            </button>
            <button onClick={saveSchedule} disabled={schSaving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#273b84] text-white hover:bg-[#1e2d6b] disabled:opacity-60">
              {schSaving ? 'Saving...' : schCreating ? 'Create Schedule' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* ══════════ Restore Confirmation Modal ══════════ */}
      {restoreTarget && (
        <Modal onClose={() => { setRestoreTarget(null); setRestoreConfirm(''); }}>
          <div className="p-6 border-b border-red-100 bg-red-50">
            <h2 className="text-lg font-bold text-red-700">⚠️ Restore Database</h2>
            <p className="text-sm text-red-700 mt-1">This will REPLACE all current data.</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm font-medium text-orange-900">
                You're about to restore from:
              </p>
              <p className="text-sm font-mono text-orange-800 mt-1">{restoreTarget.label}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Safety net:</strong> A snapshot of the current database will be taken automatically BEFORE the restore runs.
                You can roll back if needed.
              </p>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <p className="font-semibold">What will happen:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>A pre-restore safety backup will be created in <code>/home/jpuser/backups/pre_restore/</code></li>
                <li>All current connections to the database will be terminated</li>
                <li>The current database will be dropped and recreated</li>
                <li>Data will be restored from the selected backup</li>
                <li>You'll need to log out and log in again (sessions cleared)</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <code className="bg-gray-100 px-1.5 py-0.5 rounded font-bold">RESTORE</code> to confirm:
              </label>
              <input value={restoreConfirm} onChange={e => setRestoreConfirm(e.target.value)}
                placeholder="Type RESTORE exactly"
                className="w-full border-2 border-orange-300 rounded-lg px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none" />
            </div>
          </div>
          <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={() => { setRestoreTarget(null); setRestoreConfirm(''); }} disabled={restoring}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-60">
              Cancel
            </button>
            <button onClick={performRestore} disabled={restoreConfirm !== 'RESTORE' || restoring}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40">
              {restoring ? 'Starting restore...' : '⚠️ Start Restore'}
            </button>
          </div>
        </Modal>
      )}

      {/* ══════════ Source File Browser Modal ══════════ */}
      {browseBackup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={() => setBrowseBackup(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col m-4"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#273b84]">📁 Browse Source Files</h2>
                <p className="text-xs text-gray-500 mt-0.5">Backup: <code className="bg-gray-100 px-1 rounded">{browseBackup}</code></p>
              </div>
              <button onClick={() => setBrowseBackup(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            {/* Breadcrumbs + search */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-sm flex-wrap">
                {browsePathBreadcrumbs().map((c, i, arr) => (
                  <span key={c.path} className="flex items-center gap-1">
                    <button onClick={() => loadBrowseTree(browseBackup, c.path)}
                      className={`px-2 py-0.5 rounded ${i === arr.length - 1 ? 'bg-[#273b84] text-white font-semibold' : 'text-[#273b84] hover:bg-blue-50'}`}>
                      {c.name}
                    </button>
                    {i < arr.length - 1 && <span className="text-gray-400">/</span>}
                  </span>
                ))}
              </div>
              <input type="text" value={browseSearch}
                onChange={e => setBrowseSearch(e.target.value)}
                placeholder="🔍 Filter in this folder..."
                className="ml-auto px-3 py-1.5 text-sm border border-gray-300 rounded-lg w-64" />
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto p-4">
              {browseLoading ? (
                <div className="space-y-1">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
                </div>
              ) : browseTree.length === 0 ? (
                <p className="text-sm text-gray-400 italic p-4 text-center">Empty directory</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {browseTree
                    .filter(e => !browseSearch || e.name.toLowerCase().includes(browseSearch.toLowerCase()))
                    .map(entry => (
                      <div key={entry.path}
                        className="flex items-center gap-3 py-1.5 px-2 hover:bg-gray-50 rounded group">
                        <span className="text-lg shrink-0">{entry.type === 'dir' ? '📁' : '📄'}</span>
                        {entry.type === 'dir' ? (
                          <button onClick={() => loadBrowseTree(browseBackup, entry.path)}
                            className="text-sm text-[#273b84] hover:underline font-medium flex-1 text-left">
                            {entry.name}
                          </button>
                        ) : (
                          <>
                            <span className="text-sm text-gray-800 flex-1 truncate">{entry.name}</span>
                            <span className="text-xs text-gray-400 shrink-0">{entry.size_human}</span>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => previewBackupFile(browseBackup, entry.path)}
                                className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                                title="Preview">
                                👁
                              </button>
                              <button onClick={() => downloadBackupFile(browseBackup, entry.path)}
                                className="px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                                title="Download">
                                ⬇
                              </button>
                              <button onClick={() => openFileRestore(browseBackup, entry.path)}
                                className="px-2 py-0.5 text-xs font-medium rounded bg-orange-50 text-orange-700 hover:bg-orange-100"
                                title="Restore this file to project">
                                ↻
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-3 border-t border-gray-100 bg-blue-50 text-xs text-blue-800">
              <strong>💡 Hover a file</strong> to see Preview / Download / Restore actions.
              Restoring a file creates a <code className="bg-white px-1 rounded">.bak</code> copy of the current version first.
            </div>
          </div>
        </div>
      )}

      {/* ══════════ File Preview Modal ══════════ */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewFile(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#273b84]">📄 Preview</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{previewFile.path}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{previewFile.size.toLocaleString()} bytes</span>
                <button onClick={() => setPreviewFile(null)}
                  className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono whitespace-pre-wrap break-all bg-slate-50 text-slate-800">
              {previewFile.content}
            </pre>
          </div>
        </div>
      )}

      {/* ══════════ File Restore Confirmation Modal ══════════ */}
      {fileRestoreTarget && (
        <Modal onClose={() => { setFileRestoreTarget(null); setFileRestoreConfirm(''); }}>
          <div className="p-6 border-b border-orange-100 bg-orange-50">
            <h2 className="text-lg font-bold text-orange-700">↻ Restore File to Project</h2>
            <p className="text-sm text-orange-700 mt-1">Overwrite the live file with the backup version.</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Will be restored from backup:</p>
              <p className="text-xs font-mono text-gray-800 break-all">{fileRestoreTarget.backup}</p>
              <p className="text-xs text-gray-500 mt-2 mb-1">Target file in project:</p>
              <p className="text-sm font-mono font-bold text-[#273b84] break-all">{fileRestoreTarget.path}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Safety net:</strong> If the file currently exists in the project, a timestamped{' '}
                <code className="bg-white px-1 rounded">.bak</code> copy will be saved first (in the same directory).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <code className="bg-gray-100 px-1.5 py-0.5 rounded font-bold">RESTORE_FILE</code> to confirm:
              </label>
              <input value={fileRestoreConfirm} onChange={e => setFileRestoreConfirm(e.target.value)}
                placeholder="Type RESTORE_FILE exactly"
                className="w-full border-2 border-orange-300 rounded-lg px-3 py-2 text-sm font-mono focus:border-orange-500 focus:outline-none" />
            </div>
          </div>
          <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={() => { setFileRestoreTarget(null); setFileRestoreConfirm(''); }} disabled={fileRestoring}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-60">
              Cancel
            </button>
            <button onClick={performFileRestore}
              disabled={fileRestoreConfirm !== 'RESTORE_FILE' || fileRestoring}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40">
              {fileRestoring ? 'Restoring...' : '↻ Restore File'}
            </button>
          </div>
        </Modal>
      )}
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

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto m-4"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
