'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';

interface FilterOption {
  value: string;
  label: string;
  [key: string]: any;
}

interface StoreFilter {
  id: string;
  filter_key: string;
  filter_label: string;
  filter_type: string;
  field_name: string | null;
  options: FilterOption[] | null;
  config: Record<string, any> | null;
  is_active: boolean;
  is_quick_filter: boolean;
  sort_order: number;
}

interface UnitField {
  field: string;
  label: string;
  type: string;
  suggested_filter: string;
  computed?: boolean;
  custom?: boolean;
  predefined_options?: string[];
}

const FILTER_TYPES = [
  { value: 'pills', label: 'Pills (button row)' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'range_slider', label: 'Range Slider' },
  { value: 'button_group', label: 'Button Group' },
  { value: 'checkbox', label: 'Checkbox Toggle' },
];

export default function StoreFiltersPage() {
  const [filters, setFilters] = useState<StoreFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StoreFilter | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Unit fields from backend
  const [unitFields, setUnitFields] = useState<UnitField[]>([]);

  // New filter form
  const [newFilter, setNewFilter] = useState({
    filter_key: '', filter_label: '', filter_type: 'pills',
    field_name: '', is_active: true, is_quick_filter: false,
  });

  // Options editor
  const [editOptions, setEditOptions] = useState<FilterOption[]>([]);
  const [editConfig, setEditConfig] = useState<Record<string, any>>({});
  const [editFieldName, setEditFieldName] = useState('');
  const [populating, setPopulating] = useState(false);

  useEffect(() => {
    loadFilters();
    loadUnitFields();
  }, []);

  async function loadFilters() {
    setLoading(true);
    try {
      const r = await adminApi('/admin/cms/store-filters');
      const d = await r.json();
      setFilters(Array.isArray(d) ? d : []);
    } catch { setFilters([]); }
    setLoading(false);
  }

  async function loadUnitFields() {
    try {
      const r = await adminApi('/admin/cms/store-filters/unit-fields');
      const d = await r.json();
      setUnitFields(Array.isArray(d) ? d : []);
    } catch { setUnitFields([]); }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  // ── Auto-populate options from DB for a field ──
  async function autoPopulateOptions(fieldName: string) {
    if (!fieldName) return;
    setPopulating(true);
    try {
      const r = await adminApi(`/admin/cms/store-filters/field-values?field=${fieldName}`);
      const d = await r.json();
      const meta = unitFields.find(f => f.field === fieldName);

      if (meta?.type === 'numeric' && d.min !== undefined) {
        // For numeric fields, set range config
        setEditConfig(c => ({ ...c, min: d.min, max: d.max }));
        showToast(`Range set: ${d.min} - ${d.max}`);
      } else if (d.values && d.values.length > 0) {
        // For discrete fields, create options from distinct values
        const opts: FilterOption[] = [
          { value: 'All', label: 'All' },
          ...d.values.map((v: any) => ({ value: String(v), label: String(v) })),
        ];
        setEditOptions(opts);
        setEditConfig(c => ({ ...c, default_value: 'All' }));
        showToast(`${d.values.length} values loaded from database`);
      } else if (d.predefined_options && d.predefined_options.length > 0) {
        // Use predefined options from field_config
        const opts: FilterOption[] = [
          { value: 'All', label: 'All' },
          ...d.predefined_options.map((v: any) => ({ value: String(v), label: String(v) })),
        ];
        setEditOptions(opts);
        setEditConfig(c => ({ ...c, default_value: 'All' }));
        showToast(`${d.predefined_options.length} predefined options loaded`);
      } else {
        showToast('No values found for this field');
      }
    } catch {
      showToast('Error fetching field values');
    }
    setPopulating(false);
  }

  // ── When field selection changes, auto-fill key/label/type ──
  function onFieldSelect(fieldName: string, isCreate: boolean) {
    const meta = unitFields.find(f => f.field === fieldName);
    if (!meta) return;

    if (isCreate) {
      setNewFilter(f => ({
        ...f,
        field_name: fieldName,
        filter_key: fieldName,
        filter_label: meta.label,
        filter_type: meta.suggested_filter,
      }));
    } else {
      setEditFieldName(fieldName);
    }
  }

  // ── Toggle Active ──
  async function toggleActive(f: StoreFilter) {
    await adminApi(`/admin/cms/store-filters/${f.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !f.is_active }),
    });
    loadFilters();
    showToast(`${f.filter_label} ${f.is_active ? 'hidden' : 'shown'}`);
  }

  // ── Toggle Quick/Advanced ──
  async function toggleQuick(f: StoreFilter) {
    await adminApi(`/admin/cms/store-filters/${f.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_quick_filter: !f.is_quick_filter }),
    });
    loadFilters();
    showToast(`${f.filter_label} moved to ${f.is_quick_filter ? 'advanced' : 'quick bar'}`);
  }

  // ── Move Up/Down ──
  async function moveFilter(idx: number, direction: 'up' | 'down') {
    const arr = [...filters];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= arr.length) return;
    [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
    const order = arr.map((f, i) => ({ id: f.id, sort_order: i }));
    await adminApi('/admin/cms/store-filters-reorder', {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    });
    loadFilters();
  }

  // ── Start Edit ──
  function startEdit(f: StoreFilter) {
    setEditing(f);
    setEditOptions(f.options ? [...f.options] : []);
    setEditConfig(f.config ? { ...f.config } : {});
    setEditFieldName(f.field_name || '');
    setCreating(false);
  }

  // ── Save Edit ──
  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    await adminApi(`/admin/cms/store-filters/${editing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        filter_label: editing.filter_label,
        filter_type: editing.filter_type,
        field_name: editFieldName || null,
        options: editOptions.length > 0 ? editOptions : null,
        config: Object.keys(editConfig).length > 0 ? editConfig : null,
        is_quick_filter: editing.is_quick_filter,
      }),
    });
    setSaving(false);
    setEditing(null);
    loadFilters();
    showToast('Filter updated');
  }

  // ── Create New ──
  async function createFilter() {
    if (!newFilter.filter_key || !newFilter.filter_label) return;
    setSaving(true);
    const res = await adminApi('/admin/cms/store-filters', {
      method: 'POST',
      body: JSON.stringify({
        ...newFilter,
        field_name: newFilter.field_name || null,
        options: editOptions.length > 0 ? editOptions : null,
        config: Object.keys(editConfig).length > 0 ? editConfig : null,
        sort_order: filters.length,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setCreating(false);
      setNewFilter({ filter_key: '', filter_label: '', filter_type: 'pills', field_name: '', is_active: true, is_quick_filter: false });
      setEditOptions([]);
      setEditConfig({});
      loadFilters();
      showToast('Filter created');
    } else {
      const err = await res.json();
      showToast(err.detail || 'Error creating filter');
    }
  }

  // ── Delete ──
  async function deleteFilter(f: StoreFilter) {
    if (!confirm(`Delete filter "${f.filter_label}"? This cannot be undone.`)) return;
    await adminApi(`/admin/cms/store-filters/${f.id}`, { method: 'DELETE' });
    loadFilters();
    showToast('Filter deleted');
  }

  // ── Options helpers ──
  function addOption() {
    setEditOptions([...editOptions, { value: '', label: '' }]);
  }
  function updateOption(idx: number, key: string, val: string) {
    const arr = [...editOptions];
    arr[idx] = { ...arr[idx], [key]: val };
    setEditOptions(arr);
  }
  function removeOption(idx: number) {
    setEditOptions(editOptions.filter((_, i) => i !== idx));
  }
  function moveOption(idx: number, dir: 'up' | 'down') {
    const arr = [...editOptions];
    const t = dir === 'up' ? idx - 1 : idx + 1;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    setEditOptions(arr);
  }

  const typeLabel = (t: string) => FILTER_TYPES.find(ft => ft.value === t)?.label || t;
  const fieldLabel = (fname: string | null) => {
    if (!fname) return null;
    const uf = unitFields.find(f => f.field === fname);
    return uf?.label || fname;
  };

  // Current field name (for create vs edit)
  const currentFieldName = creating ? newFilter.field_name : editFieldName;
  const currentFilterType = creating ? newFilter.filter_type : editing?.filter_type;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#273b84]">Store Filters</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage filters on the store page. Pick a unit field, auto-populate options from data, and configure display.
          </p>
        </div>
        <button onClick={() => { setCreating(true); setEditing(null); setEditOptions([]); setEditConfig({}); setEditFieldName(''); }}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">
          + Add Filter
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-[#273b84] text-white text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Filter List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filters.map((f, idx) => (
            <div key={f.id}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all ${
                f.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
              }`}>
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveFilter(idx, 'up')} disabled={idx === 0}
                  className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20">▲</button>
                <button onClick={() => moveFilter(idx, 'down')} disabled={idx === filters.length - 1}
                  className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20">▼</button>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{f.filter_label}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {typeLabel(f.filter_type)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    f.is_quick_filter ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {f.is_quick_filter ? 'Quick Bar' : 'Advanced'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {f.field_name
                    ? <>Field: <code className="bg-purple-50 text-purple-700 px-1 rounded">{f.field_name}</code></>
                    : <span className="text-gray-300">No field linked</span>
                  }
                  {' · '}Key: <code className="bg-gray-100 px-1 rounded">{f.filter_key}</code>
                  {f.options && ` · ${f.options.length} options`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleQuick(f)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                  title={f.is_quick_filter ? 'Move to Advanced Panel' : 'Move to Quick Bar'}>
                  {f.is_quick_filter ? '↓ Advanced' : '↑ Quick'}
                </button>
                <button onClick={() => toggleActive(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                    f.is_active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}>
                  {f.is_active ? '● Visible' : '○ Hidden'}
                </button>
                <button onClick={() => startEdit(f)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
                  Edit
                </button>
                <button onClick={() => deleteFilter(f)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {filters.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No filters configured. Click "Add Filter" to create one.
            </div>
          )}
        </div>
      )}

      {/* ── Edit / Create Modal ── */}
      {(editing || creating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setEditing(null); setCreating(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#273b84]">
                {creating ? 'Create New Filter' : `Edit: ${editing?.filter_label}`}
              </h2>
            </div>
            <div className="p-6 space-y-5">

              {/* ── Step 1: Pick a Unit Field ── */}
              <div className="rounded-lg p-4" style={{ background: '#f0f4ff', border: '1px solid #d4deff' }}>
                <label className="text-xs font-bold text-[#273b84] uppercase tracking-wide mb-2 block">
                  1. Select Unit Field
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Pick which unit data field this filter should work on. Options will be auto-populated from the database.
                </p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <select
                      value={currentFieldName || ''}
                      onChange={e => {
                        onFieldSelect(e.target.value, creating);
                        if (!creating) setEditFieldName(e.target.value);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">-- Select a unit field --</option>
                      {unitFields.map(uf => (
                        <option key={uf.field} value={uf.field}>
                          {uf.label} ({uf.field}){uf.custom ? ' [custom]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => autoPopulateOptions(currentFieldName || '')}
                    disabled={!currentFieldName || populating}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[#273b84] text-white hover:bg-[#1e2d6b] disabled:opacity-40 whitespace-nowrap">
                    {populating ? 'Loading...' : 'Auto-populate Options'}
                  </button>
                </div>
              </div>

              {/* ── Step 2: Basic Config ── */}
              <div>
                <label className="text-xs font-bold text-[#273b84] uppercase tracking-wide mb-2 block">
                  2. Filter Config
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {creating && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Filter Key (unique ID)</label>
                      <input value={newFilter.filter_key}
                        onChange={e => setNewFilter(f => ({ ...f, filter_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                        placeholder="e.g. plan_series" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Display Label</label>
                    <input value={creating ? newFilter.filter_label : (editing?.filter_label || '')}
                      onChange={e => creating ? setNewFilter(f => ({ ...f, filter_label: e.target.value })) : setEditing(ed => ed ? { ...ed, filter_label: e.target.value } : null)}
                      placeholder="e.g. Plan Series" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Filter Type</label>
                    <select value={creating ? newFilter.filter_type : (editing?.filter_type || 'pills')}
                      onChange={e => creating ? setNewFilter(f => ({ ...f, filter_type: e.target.value })) : setEditing(ed => ed ? { ...ed, filter_type: e.target.value } : null)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {FILTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {creating && (
                    <div className="flex items-end gap-4">
                      <label className="flex items-center gap-2 cursor-pointer pb-2">
                        <input type="checkbox" checked={newFilter.is_quick_filter}
                          onChange={e => setNewFilter(f => ({ ...f, is_quick_filter: e.target.checked }))}
                          className="accent-[#273b84] w-4 h-4" />
                        <span className="text-sm text-gray-700">Show in Quick Bar</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Step 3: Options (for pills, select, button_group) ── */}
              {(currentFilterType === 'pills' || currentFilterType === 'select' || currentFilterType === 'button_group') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[#273b84] uppercase tracking-wide">3. Options</label>
                    <div className="flex gap-2">
                      <button onClick={() => autoPopulateOptions(currentFieldName || '')}
                        disabled={!currentFieldName || populating}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-40">
                        {populating ? '...' : 'Refresh from DB'}
                      </button>
                      <button onClick={addOption} className="px-3 py-1 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100">
                        + Add Option
                      </button>
                    </div>
                  </div>
                  {editOptions.length === 0 && (
                    <p className="text-xs text-gray-400 italic">
                      No options yet. Select a unit field above and click "Auto-populate Options", or add manually.
                    </p>
                  )}
                  <div className="space-y-2">
                    {editOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveOption(i, 'up')} disabled={i === 0}
                            className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20">▲</button>
                          <button onClick={() => moveOption(i, 'down')} disabled={i === editOptions.length - 1}
                            className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20">▼</button>
                        </div>
                        <input value={opt.value} onChange={e => updateOption(i, 'value', e.target.value)}
                          placeholder="Value" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                        <input value={opt.label} onChange={e => updateOption(i, 'label', e.target.value)}
                          placeholder="Label" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                        <button onClick={() => removeOption(i)}
                          className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Range slider config ── */}
              {currentFilterType === 'range_slider' && (
                <div>
                  <label className="text-xs font-bold text-[#273b84] uppercase tracking-wide mb-2 block">3. Range Config</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Min Value</label>
                      <input type="number" value={editConfig.min ?? 0}
                        onChange={e => setEditConfig(c => ({ ...c, min: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max Value</label>
                      <input type="number" value={editConfig.max ?? 0}
                        onChange={e => setEditConfig(c => ({ ...c, max: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Format</label>
                      <select value={editConfig.format ?? 'number'}
                        onChange={e => setEditConfig(c => ({ ...c, format: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="price">Price (Lakhs/Cr)</option>
                        <option value="area">Area (sqft)</option>
                        <option value="number">Number</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-1">Settings Key Override (optional — pulls max from site settings)</label>
                    <input value={editConfig.setting_key ?? ''}
                      onChange={e => setEditConfig(c => ({ ...c, setting_key: e.target.value || undefined }))}
                      placeholder="e.g. filter_price_max" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <button onClick={() => autoPopulateOptions(currentFieldName || '')}
                    disabled={!currentFieldName || populating}
                    className="mt-3 px-4 py-2 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-40">
                    {populating ? 'Loading...' : 'Auto-detect Range from Data'}
                  </button>
                </div>
              )}

              {/* ── Checkbox config ── */}
              {currentFilterType === 'checkbox' && (
                <div>
                  <label className="text-xs font-bold text-[#273b84] uppercase tracking-wide mb-2 block">3. Checkbox Config</label>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Checkbox Label</label>
                    <input value={editConfig.label ?? ''}
                      onChange={e => setEditConfig(c => ({ ...c, label: e.target.value }))}
                      placeholder="e.g. Trending" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {/* Default Value */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Default Value</label>
                <input value={editConfig.default_value ?? ''}
                  onChange={e => setEditConfig(c => ({ ...c, default_value: e.target.value || undefined }))}
                  placeholder="e.g. All, Any, 0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setEditing(null); setCreating(false); }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={creating ? createFilter : saveEdit} disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#273b84] text-white hover:bg-[#1e2d6b] disabled:opacity-60">
                {saving ? 'Saving...' : creating ? 'Create Filter' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
