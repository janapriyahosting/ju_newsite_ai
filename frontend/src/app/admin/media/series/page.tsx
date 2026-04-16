'use client';
import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/lib/adminAuth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
function adminFetch(path: string, opts: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  const isForm = opts.body instanceof FormData;
  return fetch(API + path, {
    ...opts,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  });
}

const MEDIA_TYPES = [
  { key: 'floor_plan_2d',      label: '📐 2D Floor Plan',      accept: 'image/*,application/pdf' },
  { key: 'floor_plan_3d',      label: '🏠 3D Floor Plan',      accept: 'image/*,application/pdf' },
  { key: 'model_flat_video',   label: '🎥 Model Flat Video',   accept: 'video/*' },
  { key: 'tower_elevation',    label: '🏗️ Tower Elevation',    accept: 'image/*,application/pdf' },
  { key: 'project_video',      label: '🎬 Project Video',      accept: 'video/*' },
  { key: 'project_image',      label: '🖼️ Project Image',      accept: 'image/*' },
  { key: 'walkthrough_video',  label: '🚶 Walk Through Video', accept: 'video/*,image/*' },
  { key: 'brochure',           label: '📄 Brochure (PDF)',     accept: 'application/pdf' },
  { key: 'unit_image',         label: '📷 Unit Photo',         accept: 'image/*' },
];

const FACINGS = ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'];

function isImage(url: string) { return /\.(jpg|jpeg|png|webp|gif)$/i.test(url); }
function isPdf(url: string)   { return /\.pdf$/i.test(url); }
function isVideo(url: string) { return /\.(mp4|webm|mov)$/i.test(url); }

export default function SeriesMediaPage() {
  const [projects, setProjects]   = useState<any[]>([]);
  const [towers, setTowers]       = useState<any[]>([]);
  const [allItems, setAllItems]   = useState<any[]>([]);
  const [filterProject, setFilterProject] = useState('');
  const [filterTower, setFilterTower]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState('');

  // Upload form state
  const [form, setForm] = useState({
    project_id:  '',
    tower_id:    '',
    series_code: '',
    media_type:  'floor_plan_2d',
    facing:      '',
    area_sqft:   '',
    label:       '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [matched, setMatched]       = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  useEffect(() => { loadProjects(); loadItems(); }, []);

  async function loadProjects() {
    const res = await adminFetch('/admin/projects');
    const data = await res.json();
    setProjects(data.items || []);
  }

  async function loadTowers(projectId: string) {
    if (!projectId) { setTowers([]); return; }
    const res = await adminFetch(`/admin/towers?project_id=${projectId}&page_size=100`);
    const data = await res.json();
    setTowers(data.items || []);
  }

  async function loadItems() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterProject) params.set('project_id', filterProject);
    if (filterTower)   params.set('tower_id',   filterTower);
    const res = await adminFetch(`/admin/series-media?${params}`);
    const data = await res.json();
    setAllItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { loadItems(); }, [filterProject, filterTower]);

  async function previewMatch() {
    if (!form.tower_id || !form.series_code) return;
    setPreviewLoading(true);
    const params = new URLSearchParams({
      tower_id:    form.tower_id,
      series_code: form.series_code,
      facing:      form.facing,
      area_sqft:   form.area_sqft,
    });
    const res = await adminFetch(`/admin/series-media/preview-units?${params}`);
    const data = await res.json();
    setMatched(data.matched || []);
    setPreviewLoading(false);
  }

  useEffect(() => {
    if (form.tower_id && form.series_code) previewMatch();
    else setMatched([]);
  }, [form.tower_id, form.series_code, form.facing, form.area_sqft]);

  async function upload() {
    if (!uploadFile || !form.project_id || !form.tower_id || !form.series_code) {
      showToast('Please fill Project, Tower, Series Code and select a file');
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('file',        uploadFile);
    fd.append('project_id',  form.project_id);
    fd.append('tower_id',    form.tower_id);
    fd.append('series_code', form.series_code);
    fd.append('media_type',  form.media_type);
    fd.append('facing',      form.facing);
    fd.append('area_sqft',   form.area_sqft);
    fd.append('label',       form.label);
    const res = await adminFetch('/admin/series-media/upload', { method: 'POST', body: fd });
    if (res.ok) {
      showToast('✅ Uploaded successfully');
      setUploadFile(null);
      if (fileRef.current) fileRef.current.value = '';
      loadItems();
    } else {
      const d = await res.json();
      showToast(`❌ ${d.detail || 'Upload failed'}`);
    }
    setUploading(false);
  }

  async function deleteItem(id: string, label: string) {
    if (!confirm(`Delete "${label}"?`)) return;
    const res = await adminFetch(`/admin/series-media/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast('Deleted'); loadItems(); }
    else showToast('❌ Delete failed');
  }

  // Group list by project → tower → series
  const grouped = allItems.reduce((acc: any, item: any) => {
    const pk = item.project_name;
    const tk = item.tower_name;
    const sk = item.series_code;
    acc[pk] = acc[pk] || {};
    acc[pk][tk] = acc[pk][tk] || {};
    acc[pk][tk][sk] = acc[pk][tk][sk] || [];
    acc[pk][tk][sk].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-6xl">
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-xl text-white"
          style={{ background: toast.startsWith('❌') ? '#DC2626' : '#16A34A' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#273b84]">Series Media</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload floor plans, 3D views, videos, and brochures once per unit series — shared across all floors automatically.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-[#eef1fb] rounded-2xl p-5" style={{ border: '1px solid #d1d9f0' }}>
        <p className="font-bold text-[#273b84] text-sm mb-2">How Series Media Works</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #e4e9f2' }}>
            <p className="font-bold text-[#273b84] mb-1">1. Identify the series</p>
            <p>Units 101, 201, 301… share the last 2 digits <strong>"01"</strong>. That's the series code. Units 102, 202, 302 → series <strong>"02"</strong>.</p>
          </div>
          <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #e4e9f2' }}>
            <p className="font-bold text-[#273b84] mb-1">2. Upload once</p>
            <p>Upload the 2D plan, 3D render, brochure etc. for series <strong>"01 · East · 1025 sqft"</strong>. One file covers all 20 floors.</p>
          </div>
          <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #e4e9f2' }}>
            <p className="font-bold text-[#273b84] mb-1">3. Auto-resolved</p>
            <p>When a buyer views unit 1501, the system finds its series "01" and serves the right floor plan, video, and brochure automatically.</p>
          </div>
        </div>
      </div>

      {/* Upload form */}
      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e4e9f2' }}>
        <h2 className="font-bold text-[#273b84] text-base mb-5">Upload Series Media</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Project */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Project *</label>
            <select value={form.project_id}
              onChange={e => {
                setForm(f => ({ ...f, project_id: e.target.value, tower_id: '' }));
                loadTowers(e.target.value);
              }}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900">
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Tower */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tower / Block *</label>
            <select value={form.tower_id}
              onChange={e => setForm(f => ({ ...f, tower_id: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900"
              disabled={!form.project_id}>
              <option value="">Select tower…</option>
              {towers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Series code */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Series Code *
              <span className="ml-1 font-normal text-gray-400 normal-case">(last 2 digits — e.g. 01, 02, 05)</span>
            </label>
            <input value={form.series_code}
              onChange={e => setForm(f => ({ ...f, series_code: e.target.value }))}
              placeholder="01"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-mono" />
          </div>

          {/* Media type */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Media Type *</label>
            <select value={form.media_type}
              onChange={e => setForm(f => ({ ...f, media_type: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900">
              {MEDIA_TYPES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>

          {/* Facing (optional) */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Facing <span className="font-normal text-gray-400 normal-case">(optional — blank = any facing)</span>
            </label>
            <select value={form.facing}
              onChange={e => setForm(f => ({ ...f, facing: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900">
              <option value="">Any facing</option>
              {FACINGS.map(fc => <option key={fc} value={fc}>{fc}</option>)}
            </select>
          </div>

          {/* Area (optional) */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Area (sqft) <span className="font-normal text-gray-400 normal-case">(optional — blank = any area)</span>
            </label>
            <input type="number" value={form.area_sqft}
              onChange={e => setForm(f => ({ ...f, area_sqft: e.target.value }))}
              placeholder="e.g. 1025"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900" />
          </div>

          {/* Label (optional) */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Label (optional)</label>
            <input value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Series 01 East 1025sqft 2D Plan"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900" />
          </div>
        </div>

        {/* Matched units preview */}
        {form.tower_id && form.series_code && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm"
            style={{ background: '#f4f6fb', border: '1px solid #e4e9f2' }}>
            {previewLoading ? (
              <span className="text-gray-500 text-xs">Checking matching units…</span>
            ) : matched.length > 0 ? (
              <div>
                <span className="font-bold text-[#273b84] text-xs">
                  ✅ This media will apply to {matched.length} unit{matched.length !== 1 ? 's' : ''}:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {matched.map(u => (
                    <span key={u.id} className="px-2 py-0.5 rounded-full text-xs font-mono"
                      style={{ background: '#eef1fb', color: '#273b84', border: '1px solid #d1d9f0' }}>
                      {u.unit_number} F{u.floor}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-amber-600 text-xs">No units found matching this series in the selected tower.</span>
            )}
          </div>
        )}

        {/* File upload */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-[#f4f6fb] mb-4 transition-colors"
          style={{ borderColor: '#d1d9f0' }}>
          <p className="text-3xl mb-2">📁</p>
          {uploadFile
            ? <p className="text-[#273b84] font-bold text-sm">{uploadFile.name}</p>
            : <p className="text-gray-500 text-sm">Click or drag & drop — image, PDF, or video</p>
          }
          <input ref={fileRef} type="file"
            accept={MEDIA_TYPES.find(m => m.key === form.media_type)?.accept || '*'}
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
        </div>

        <button onClick={upload} disabled={uploading || !uploadFile}
          className="px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-40"
          style={{ background: '#273b84' }}>
          {uploading ? 'Uploading…' : '⬆ Upload Series Media'}
        </button>
      </div>

      {/* Library */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e4e9f2' }}>
        <div className="px-5 py-3 flex items-center justify-between flex-wrap gap-3"
          style={{ background: '#f4f6fb', borderBottom: '1px solid #e4e9f2' }}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Series Media Library{allItems.length > 0 ? ` — ${allItems.length} files` : ''}
          </p>
          <div className="flex gap-2">
            <select value={filterProject}
              onChange={e => { setFilterProject(e.target.value); setFilterTower(''); }}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900">
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Loading…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl mb-3">🗂️</p>
            <p className="text-gray-500 text-sm">No series media yet. Upload your first file above.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#e4e9f2' }}>
            {Object.entries(grouped).map(([projName, towers]: any) =>
              Object.entries(towers).map(([towerName, series]: any) => (
                <div key={`${projName}-${towerName}`} className="p-5">
                  {/* Project / Tower header */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{ background: '#eef1fb', color: '#273b84' }}>{projName}</span>
                    <span className="text-gray-400 text-xs">›</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{ background: '#f0fdf4', color: '#16a34a' }}>{towerName}</span>
                  </div>

                  {/* Series groups */}
                  {Object.entries(series).map(([seriesCode, items]: any) => (
                    <div key={seriesCode} className="mb-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Series <span className="font-mono text-[#273b84]">{seriesCode}</span>
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {items.map((item: any) => (
                          <div key={item.id} className="rounded-xl overflow-hidden"
                            style={{ border: '1px solid #e4e9f2' }}>
                            {/* Thumbnail */}
                            <div className="h-24 bg-[#f4f6fb] flex items-center justify-center overflow-hidden">
                              {isImage(item.file_url) ? (
                                <img src={item.file_url} alt={item.label}
                                  className="w-full h-full object-cover" />
                              ) : isPdf(item.file_url) ? (
                                <div className="text-center">
                                  <p className="text-2xl">📄</p>
                                  <p className="text-xs text-gray-500 mt-1">PDF</p>
                                </div>
                              ) : isVideo(item.file_url) ? (
                                <div className="text-center">
                                  <p className="text-2xl">🎬</p>
                                  <p className="text-xs text-gray-500 mt-1">Video</p>
                                </div>
                              ) : (
                                <p className="text-2xl">📁</p>
                              )}
                            </div>
                            {/* Info */}
                            <div className="p-2">
                              <p className="text-xs font-bold text-[#273b84] truncate">
                                {MEDIA_TYPES.find(m => m.key === item.media_type)?.label || item.media_type}
                              </p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {[item.facing, item.area_sqft ? `${item.area_sqft} sqft` : ''].filter(Boolean).join(' · ') || 'Any facing/area'}
                              </p>
                              <div className="flex items-center justify-between mt-1.5">
                                <a href={item.file_url} target="_blank" rel="noreferrer"
                                  className="text-xs text-[#273b84] hover:underline">View</a>
                                <button onClick={() => deleteItem(item.id, item.file_name)}
                                  className="text-xs px-1.5 py-0.5 rounded font-bold"
                                  style={{ background: '#fee2e2', color: '#DC2626' }}>✕</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
