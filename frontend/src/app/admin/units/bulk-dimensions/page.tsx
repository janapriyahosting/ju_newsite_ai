'use client';
import { useState, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
function adminFetch(path: string, opts: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  return fetch(API + path, {
    ...opts,
    headers: { Authorization: 'Bearer ' + token, ...(opts.headers || {}) },
  });
}

function fmtDim(val: string, unit: string): string {
  const str = String(val ?? '0');
  if (unit === 'ft' || !unit) {
    const [feet, inches = '0'] = str.split('.');
    return `${feet}'${inches}"`;
  }
  if (unit === 'm') return `${parseFloat(str).toFixed(2)}m`;
  return `${str}"`;
}

type ParsedRow = {
  project_name: string; tower_name: string; unit_number: string;
  room: string; width: string; length: string; unit: string;
};
type GroupedUnit = {
  key: string; project_name: string; tower_name: string;
  unit_number: string; dims: ParsedRow[];
};

const REQUIRED_COLS = ['project_name', 'tower_name', 'unit_number', 'room', 'width', 'length'];

function parseCSVText(text: string): { rows: ParsedRow[]; error: string } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], error: 'File has no data rows' };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const missing = REQUIRED_COLS.filter(c => !headers.includes(c));
  if (missing.length) return { rows: [], error: `Missing columns: ${missing.join(', ')}` };

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (vals.every(v => !v)) continue;
    const row: any = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
    if (!row.project_name || !row.tower_name || !row.unit_number || !row.room) continue;
    rows.push({
      project_name: row.project_name,
      tower_name:   row.tower_name,
      unit_number:  row.unit_number,
      room:         row.room,
      width:        row.width  || '0',
      length:       row.length || '0',
      unit:         row.unit   || 'ft',
    });
  }
  return { rows, error: '' };
}

function groupRows(rows: ParsedRow[]): GroupedUnit[] {
  const map = new Map<string, GroupedUnit>();
  for (const r of rows) {
    const key = `${r.project_name}|${r.tower_name}|${r.unit_number}`;
    if (!map.has(key)) {
      map.set(key, {
        key, project_name: r.project_name, tower_name: r.tower_name,
        unit_number: r.unit_number, dims: [],
      });
    }
    map.get(key)!.dims.push(r);
  }
  return Array.from(map.values());
}

export default function BulkDimensionsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName]     = useState('');
  const [rows, setRows]             = useState<ParsedRow[]>([]);
  const [groups, setGroups]         = useState<GroupedUnit[]>([]);
  const [parseError, setParseError] = useState('');
  const [uploading, setUploading]   = useState(false);
  const [result, setResult]         = useState<any>(null);
  const [file, setFile]             = useState<File | null>(null);

  function handleFile(f: File) {
    setResult(null); setParseError('');
    setFile(f); setFileName(f.name);
    if (f.name.endsWith('.xlsx')) {
      setRows([]); setGroups([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const { rows: parsed, error } = parseCSVText(e.target?.result as string);
      if (error) { setParseError(error); setRows([]); setGroups([]); return; }
      setRows(parsed);
      setGroups(groupRows(parsed));
    };
    reader.readAsText(f);
  }

  async function downloadTemplate() {
    const res = await adminFetch('/admin/units/bulk-dimensions/template');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dimensions_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function upload() {
    if (!file) return;
    setUploading(true); setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await adminFetch('/admin/units/bulk-dimensions', { method: 'POST', body: form });
      const data = await res.json();
      setResult({ ok: res.ok, ...data, error: res.ok ? undefined : (data.detail || 'Upload failed') });
    } catch (e: any) {
      setResult({ ok: false, error: e.message });
    }
    setUploading(false);
  }

  const isXlsx    = fileName.endsWith('.xlsx');
  const hasPreview = rows.length > 0;
  const canUpload  = !!file && !parseError;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#273b84]">Bulk Upload Dimensions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload CSV or Excel — dimensions are matched by <strong>Project → Tower → Unit Number</strong> to avoid duplicates across towers.
        </p>
      </div>

      {/* Format guide */}
      <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e4e9f2' }}>
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-bold text-[#273b84] text-sm">Required Columns</p>
            <p className="text-gray-500 text-xs mt-0.5">
              <span className="font-mono text-red-600">project_name, tower_name, unit_number, room, width, length</span>
              {' '}— Optional: <span className="font-mono text-[#273b84]">unit</span> (ft / m / in, defaults to ft)
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Dimensions are entered as <span className="font-mono">feet.inches</span> — e.g. <span className="font-mono">10.6</span> displays as <strong>10'6"</strong>
            </p>
          </div>
        </div>
        <div className="bg-[#f4f6fb] rounded-xl p-4 overflow-x-auto mb-4" style={{ border: '1px solid #e4e9f2' }}>
          <table className="text-xs font-mono w-full text-left whitespace-nowrap">
            <thead>
              <tr className="text-[#273b84] font-bold">
                {['project_name','tower_name','unit_number','room','width','length','unit'].map(h => (
                  <td key={h} className="pr-5 pb-1.5">{h}</td>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {[
                ['Janapriya Heights','Tower A','A101','Master Bedroom','12.6','14.0','ft'],
                ['Janapriya Heights','Tower A','A101','Living Room','16.0','20.3','ft'],
                ['Janapriya Heights','Tower A','A102','Master Bedroom','12.6','14.0','ft'],
                ['Janapriya Heights','Tower B','A101','Master Bedroom','11.6','13.0','ft'],
              ].map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => <td key={j} className="pr-5 py-0.5">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: '#273b84' }}>
          ⬇ Download Template CSV
        </button>
      </div>

      {/* Upload zone */}
      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e4e9f2' }}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Upload File</p>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors hover:bg-[#f4f6fb]"
          style={{ borderColor: '#d1d9f0' }}>
          <p className="text-4xl mb-3">📁</p>
          {fileName
            ? <p className="text-[#273b84] font-bold text-sm">{fileName}</p>
            : <p className="text-gray-500 text-sm">Click or drag & drop a <strong>.csv</strong> or <strong>.xlsx</strong> file here</p>
          }
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
        {parseError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
            {parseError}
          </div>
        )}
      </div>

      {/* CSV Preview */}
      {hasPreview && !parseError && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e4e9f2' }}>
          <div className="px-5 py-3" style={{ background: '#f4f6fb', borderBottom: '1px solid #e4e9f2' }}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Preview — {groups.length} unit{groups.length !== 1 ? 's' : ''} · {rows.length} dimension rows
            </p>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {groups.map(g => (
              <div key={g.key} className="px-5 py-3 border-b" style={{ borderColor: '#e4e9f2' }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{ background: '#eef1fb', color: '#273b84' }}>{g.project_name}</span>
                  <span className="text-gray-400 text-xs">›</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{ background: '#f0fdf4', color: '#16a34a' }}>{g.tower_name}</span>
                  <span className="text-gray-400 text-xs">›</span>
                  <span className="font-bold text-[#273b84] text-sm">{g.unit_number}</span>
                  <span className="text-xs text-gray-400">{g.dims.length} room{g.dims.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.dims.map((d, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs"
                      style={{ background: '#f4f6fb', color: '#1e293b', border: '1px solid #e4e9f2' }}>
                      {d.room}: <strong>{fmtDim(d.width, d.unit)}</strong> × <strong>{fmtDim(d.length, d.unit)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XLSX note */}
      {isXlsx && file && (
        <div className="bg-[#eef1fb] rounded-xl px-4 py-3 text-sm text-[#273b84]" style={{ border: '1px solid #d1d9f0' }}>
          Excel file selected — preview not available for .xlsx. Click Upload to process on the server.
        </div>
      )}

      {/* Upload button */}
      {canUpload && (
        <button onClick={upload} disabled={uploading}
          className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
          style={{ background: '#273b84' }}>
          {uploading ? 'Uploading…' : `Upload & Apply Dimensions${hasPreview ? ` (${groups.length} unit${groups.length !== 1 ? 's' : ''})` : ''}`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl p-5 ${result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {result.ok ? (
            <div className="space-y-3">
              <p className="font-bold text-green-700 text-sm">
                ✅ {result.updated} unit{result.updated !== 1 ? 's' : ''} updated
                {result.total_rows ? ` · ${result.total_rows} dimension rows applied` : ''}
              </p>
              {result.not_found?.length > 0 && (
                <div>
                  <p className="text-amber-700 text-xs font-bold mb-1.5">Not found / skipped:</p>
                  <div className="space-y-1">
                    {result.not_found.map((u: string, i: number) => (
                      <div key={i} className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-mono">{u}</div>
                    ))}
                  </div>
                </div>
              )}
              {result.row_errors?.length > 0 && (
                <div>
                  <p className="text-red-600 text-xs font-bold mb-1.5">Row errors:</p>
                  <div className="space-y-1">
                    {result.row_errors.map((e: string, i: number) => (
                      <div key={i} className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{e}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-600 font-medium text-sm">❌ {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
