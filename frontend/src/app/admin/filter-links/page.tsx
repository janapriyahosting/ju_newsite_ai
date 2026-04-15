'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface FilterConfig {
  id: string;
  filter_key: string;
  filter_label: string;
  filter_type: string;
  field_name: string | null;
  options: { value: string; label: string }[] | null;
  config: Record<string, any> | null;
  is_quick_filter: boolean;
  sort_order: number;
}

function fmtPrice(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(0)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export default function FilterLinksPage() {
  const [filterConfigs, setFilterConfigs] = useState<FilterConfig[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [customLabel, setCustomLabel] = useState('');
  const [savedLinks, setSavedLinks] = useState<any[]>([]);
  const [copied, setCopied] = useState('');
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load store filter configs
    adminApi('/admin/cms/store-filters').then(r => r.json()).then(d => {
      setFilterConfigs(Array.isArray(d) ? d : []);
    }).catch(() => {});
    // Load site settings for range hints
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

  function up(key: string, val: string) {
    setFilterValues(f => ({ ...f, [key]: val }));
  }

  function getRangeMax(cfg: FilterConfig): number {
    const settingKey = cfg.config?.setting_key;
    if (settingKey && settings[settingKey]) return Number(settings[settingKey]);
    return cfg.config?.max ?? 0;
  }

  function buildUrl() {
    const params = new URLSearchParams();
    for (const cfg of filterConfigs) {
      if (cfg.filter_type === 'range_slider') {
        const paramBase = cfg.filter_key.replace(/_range$/, '');
        const minVal = filterValues[`min_${paramBase}`];
        const maxVal = filterValues[`max_${paramBase}`];
        if (minVal) params.set(`min_${paramBase}`, minVal);
        if (maxVal) params.set(`max_${paramBase}`, maxVal);
      } else if (cfg.filter_type === 'checkbox') {
        if (filterValues[cfg.filter_key] === '1') params.set(cfg.filter_key, '1');
      } else {
        const val = filterValues[cfg.filter_key];
        if (val) params.set(cfg.filter_key, val);
      }
    }
    const qs = params.toString();
    return qs ? `${SITE_URL}/store?${qs}` : `${SITE_URL}/store`;
  }

  function buildLabel() {
    if (customLabel) return customLabel;
    const parts: string[] = [];
    for (const cfg of filterConfigs) {
      if (cfg.filter_type === 'range_slider') {
        const paramBase = cfg.filter_key.replace(/_range$/, '');
        const maxVal = filterValues[`max_${paramBase}`];
        const minVal = filterValues[`min_${paramBase}`];
        if (maxVal && cfg.config?.format === 'price') parts.push(`Budget ${fmtPrice(Number(maxVal))}`);
        else if (maxVal) parts.push(`${cfg.filter_label} ≤${Number(maxVal).toLocaleString()}`);
        if (minVal && !maxVal) parts.push(`${cfg.filter_label} ≥${Number(minVal).toLocaleString()}`);
      } else if (cfg.filter_type === 'checkbox') {
        if (filterValues[cfg.filter_key] === '1') parts.push(cfg.filter_label);
      } else {
        const val = filterValues[cfg.filter_key];
        if (val) parts.push(val);
      }
    }
    return parts.join(' | ') || 'All Properties';
  }

  async function saveLink() {
    const url = buildUrl();
    const label = buildLabel();
    try {
      await adminApi('/admin/cms/filter-links', {
        method: 'POST',
        body: JSON.stringify({ label, url, filters: filterValues }),
      });
      loadLinks();
      setFilterValues({});
      setCustomLabel('');
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

  const url = buildUrl();

  // ── Render input for a filter config ──
  function renderFilterInput(cfg: FilterConfig) {
    if (cfg.filter_type === 'range_slider') {
      const paramBase = cfg.filter_key.replace(/_range$/, '');
      const maxHint = getRangeMax(cfg);
      const formatHint = cfg.config?.format === 'price' ? ` (max ${fmtPrice(maxHint)})` : maxHint ? ` (max ${maxHint.toLocaleString()})` : '';
      return (
        <div key={cfg.filter_key} className="col-span-2 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Min {cfg.filter_label}</label>
            <input type="number" value={filterValues[`min_${paramBase}`] || ''}
              onChange={e => up(`min_${paramBase}`, e.target.value)}
              placeholder="e.g. 0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Max {cfg.filter_label}{formatHint && <span className="text-gray-400">{formatHint}</span>}</label>
            <input type="number" value={filterValues[`max_${paramBase}`] || ''}
              onChange={e => up(`max_${paramBase}`, e.target.value)}
              placeholder={maxHint ? String(maxHint) : ''} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      );
    }

    if (cfg.filter_type === 'checkbox') {
      return (
        <div key={cfg.filter_key} className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <input type="checkbox" checked={filterValues[cfg.filter_key] === '1'}
              onChange={e => up(cfg.filter_key, e.target.checked ? '1' : '')}
              className="accent-green-600 w-4 h-4" />
            <span className="text-sm font-medium text-gray-700">{cfg.config?.label || cfg.filter_label}</span>
          </label>
        </div>
      );
    }

    // pills, select, button_group → all render as a dropdown select in the link builder
    const defaultVal = cfg.config?.default_value;
    const options = cfg.options || [];
    return (
      <div key={cfg.filter_key}>
        <label className="block text-xs font-medium text-gray-500 mb-1">{cfg.filter_label}</label>
        <select value={filterValues[cfg.filter_key] || ''}
          onChange={e => up(cfg.filter_key, e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Any</option>
          {options.filter(o => o.value !== defaultVal).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

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
          {filterConfigs.map(cfg => renderFilterInput(cfg))}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Custom Label (optional — auto-generated if empty)</label>
          <input type="text" value={customLabel} onChange={e => setCustomLabel(e.target.value)}
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
            {copied === url ? '✓ Copied!' : 'Copy URL'}
          </button>
          <button onClick={saveLink}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">
            Save Link
          </button>
          <button onClick={() => { setFilterValues({}); setCustomLabel(''); }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
            Reset
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
                    {copied === link.url ? '✓' : 'Copy'}
                  </button>
                  <button onClick={() => deleteLink(link.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                    Delete
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
