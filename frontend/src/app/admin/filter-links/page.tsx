'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const FACINGS = ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'];
const FLOORS = ['Ground', 'Low', 'Mid', 'High'];
const SORTS = [
  { label: 'Newest First', value: 'newest' }, { label: 'Price: Low → High', value: 'price_asc' },
  { label: 'Price: High → Low', value: 'price_desc' }, { label: 'Area: Largest', value: 'area_desc' },
];

function fmtPrice(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(0)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export default function FilterLinksPage() {
  const [filters, setFilters] = useState({
    min_price: '', max_price: '', min_area: '', max_area: '',
    max_emi: '', max_down_payment: '', unit_type: '', bedrooms: '',
    facing: '', sort: '', floor: '', trending: '', status: '', label: '',
  });
  const [savedLinks, setSavedLinks] = useState<any[]>([]);
  const [copied, setCopied] = useState('');
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load filter settings for hints
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/cms/public/settings`).then(r => r.json()).then(d => setSettings(d)).catch(() => {});
    // Load saved links
    loadLinks();
  }, []);

  async function loadLinks() {
    try {
      const r = await adminApi('/admin/cms/filter-links');
      const d = await r.json();
      setSavedLinks(Array.isArray(d) ? d : []);
    } catch { setSavedLinks([]); }
  }

  function buildUrl() {
    const params = new URLSearchParams();
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    if (filters.min_area) params.set('min_area', filters.min_area);
    if (filters.max_area) params.set('max_area', filters.max_area);
    if (filters.max_emi) params.set('max_emi', filters.max_emi);
    if (filters.max_down_payment) params.set('max_down_payment', filters.max_down_payment);
    if (filters.unit_type) params.set('unit_type', filters.unit_type);
    if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);
    if (filters.facing) params.set('facing', filters.facing);
    if (filters.floor) params.set('floor', filters.floor);
    if (filters.trending === '1') params.set('trending', '1');
    if (filters.status) params.set('status', filters.status);
    if (filters.sort) params.set('sort', filters.sort);
    const qs = params.toString();
    return qs ? `${SITE_URL}/store?${qs}` : `${SITE_URL}/store`;
  }

  function buildLabel() {
    if (filters.label) return filters.label;
    const parts: string[] = [];
    if (filters.max_price) parts.push(`Budget ${fmtPrice(Number(filters.max_price))}`);
    if (filters.max_emi) parts.push(`EMI ₹${Number(filters.max_emi).toLocaleString('en-IN')}`);
    if (filters.max_down_payment) parts.push(`DP ${fmtPrice(Number(filters.max_down_payment))}`);
    if (filters.unit_type) parts.push(filters.unit_type);
    if (filters.bedrooms) parts.push(`${filters.bedrooms} BHK+`);
    if (filters.min_area) parts.push(`${filters.min_area}+ sqft`);
    if (filters.facing) parts.push(filters.facing);
    if (filters.floor) parts.push(`${filters.floor} Floor`);
    if (filters.trending === '1') parts.push('Trending');
    if (filters.status) parts.push(filters.status);
    return parts.join(' | ') || 'All Properties';
  }

  async function saveLink() {
    const url = buildUrl();
    const label = buildLabel();
    try {
      await adminApi('/admin/cms/filter-links', {
        method: 'POST',
        body: JSON.stringify({ label, url, filters }),
      });
      loadLinks();
      setFilters({ min_price: '', max_price: '', min_area: '', max_area: '', max_emi: '', max_down_payment: '', unit_type: '', bedrooms: '', facing: '', sort: '', floor: '', trending: '', status: '', label: '' });
    } catch {}
  }

  async function deleteLink(id: string) {
    await adminApi(`/admin/cms/filter-links/${id}`, { method: 'DELETE' });
    loadLinks();
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(''), 2000);
  }

  const up = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v }));
  const url = buildUrl();
  const priceMax = Number(settings.filter_price_max) || 50000000;
  const unitTypes = (settings.filter_unit_types || '2BHK,3BHK,4BHK,Villa,Plot,Studio').split(',').map(s => s.trim());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#273b84]">Filter Link Generator</h1>
        <p className="text-sm text-gray-500 mt-1">Create shareable links with pre-applied store filters for campaigns, social media, and the homepage.</p>
      </div>

      {/* Builder */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#273b84] uppercase tracking-wide">Build a Filter Link</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Min Price (₹)</label>
            <input type="number" value={filters.min_price} onChange={e => up('min_price', e.target.value)}
              placeholder="e.g. 5000000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Max Price (₹) <span className="text-gray-400">max {fmtPrice(priceMax)}</span></label>
            <input type="number" value={filters.max_price} onChange={e => up('max_price', e.target.value)}
              placeholder="e.g. 20000000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Max EMI (₹/month)</label>
            <input type="number" value={filters.max_emi} onChange={e => up('max_emi', e.target.value)}
              placeholder="e.g. 30000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Max Down Payment (₹)</label>
            <input type="number" value={filters.max_down_payment} onChange={e => up('max_down_payment', e.target.value)}
              placeholder="e.g. 1000000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Unit Type</label>
            <select value={filters.unit_type} onChange={e => up('unit_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Any</option>
              {unitTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Min Bedrooms</label>
            <select value={filters.bedrooms} onChange={e => up('bedrooms', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Any</option>
              {[1,2,3,4].map(n => <option key={n} value={String(n)}>{n}+</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Min Area (sqft)</label>
            <input type="number" value={filters.min_area} onChange={e => up('min_area', e.target.value)}
              placeholder="e.g. 2000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Facing</label>
            <select value={filters.facing} onChange={e => up('facing', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Any</option>
              {FACINGS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Floor Level</label>
            <select value={filters.floor} onChange={e => up('floor', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Any</option>
              {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={filters.status} onChange={e => up('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">All</option>
              <option value="available">Available</option>
              <option value="booked">Booked</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sort</label>
            <select value={filters.sort} onChange={e => up('sort', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Default</option>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input type="checkbox" checked={filters.trending === '1'} onChange={e => up('trending', e.target.checked ? '1' : '')}
                className="accent-green-600 w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">Trending Only</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Custom Label (optional — auto-generated if empty)</label>
          <input type="text" value={filters.label} onChange={e => up('label', e.target.value)}
            placeholder="e.g. 50L Budget 3BHK" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        {/* Preview */}
        <div className="rounded-lg p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <p className="text-xs font-medium text-gray-400 mb-1">Preview URL</p>
          <p className="text-sm text-[#273b84] font-mono break-all">{url}</p>
          <p className="text-xs text-gray-500 mt-1">Label: <strong>{buildLabel()}</strong></p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => copyUrl(url)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#273b84] text-white hover:bg-[#1e2d6b]">
            {copied === url ? '✓ Copied!' : '📋 Copy URL'}
          </button>
          <button onClick={saveLink}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">
            💾 Save Link
          </button>
        </div>
      </div>

      {/* Saved Links */}
      {savedLinks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-[#273b84] uppercase tracking-wide mb-4">Saved Filter Links ({savedLinks.length})</h2>
          <div className="space-y-3">
            {savedLinks.map((link: any) => (
              <div key={link.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">{link.label}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">{link.url}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => copyUrl(link.url)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
                    {copied === link.url ? '✓' : '📋 Copy'}
                  </button>
                  <button onClick={() => deleteLink(link.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
