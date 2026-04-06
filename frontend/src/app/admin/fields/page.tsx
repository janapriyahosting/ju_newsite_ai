"use client";
/**
 * Admin Fields & Labels Manager
 * File: frontend/src/app/admin/fields/page.tsx
 *
 * Features:
 *  - Tabs per entity (Project, Tower, Unit, Lead, Site Visit, Booking)
 *  - Drag-to-reorder rows (HTML5 drag-and-drop, no extra library)
 *  - Toggle visible / required / show_on_customer / show_on_admin
 *  - Inline label editing
 *  - Add custom field modal (all field types)
 *  - Delete custom fields (superadmin only)
 *  - Auto-save on every change
 */

import { useEffect, useState, useRef } from "react";
import { useAdminStore, adminApi } from "@/lib/adminAuth";

// ── Types ──────────────────────────────────────────────────────────────────────
type FieldType = "text"|"number"|"decimal"|"boolean"|"select"|"multiselect"|
                 "date"|"textarea"|"email"|"phone"|"url"|"currency";

interface FieldConfig {
  id:               string;
  entity:           string;
  field_key:        string;
  label:            string;
  field_type:       FieldType;
  is_visible:       boolean;
  is_required:      boolean;
  is_custom:        boolean;
  sort_order:       number;
  placeholder:      string | null;
  help_text:        string | null;
  field_options:    string[] | null;
  show_on_customer: boolean;
  show_on_admin:    boolean;
}

const ENTITIES = [
  { key: "unit",       label: "Units",       icon: "🏠" },
  { key: "project",    label: "Projects",    icon: "🏗️" },
  { key: "tower",      label: "Towers",      icon: "🗼" },
  { key: "lead",       label: "Leads",       icon: "👤" },
  { key: "site_visit", label: "Site Visits", icon: "📅" },
  { key: "booking",    label: "Bookings",    icon: "📋" },
];

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text",        label: "Text" },
  { value: "textarea",    label: "Long Text" },
  { value: "number",      label: "Number (integer)" },
  { value: "decimal",     label: "Decimal" },
  { value: "currency",    label: "Currency (₹)" },
  { value: "email",       label: "Email" },
  { value: "phone",       label: "Phone" },
  { value: "url",         label: "URL" },
  { value: "boolean",     label: "Yes / No" },
  { value: "select",      label: "Dropdown" },
  { value: "multiselect", label: "Multi-Select" },
  { value: "date",        label: "Date" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function FieldsManagerPage() {
  const { role } = useAdminStore();
  
  const isSuperadmin = role === "superadmin";

  const [optionsField, setOptionsField] = useState<any|null>(null);
  const [activeEntity, setActiveEntity] = useState("unit");
  const [fieldsByEntity, setFieldsByEntity] = useState<Record<string, FieldConfig[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // field id being saved
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Drag state
  const dragItem     = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // ── Load all fields ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadFields();
  }, []);

  async function loadFields() {
    setLoading(true);
    try {
      const res = await adminApi("/admin/fields");
      if (!res.ok) throw new Error("Failed to load fields");
      const data = await res.json();
      // Sort each entity's fields by sort_order
      const sorted: Record<string, FieldConfig[]> = {};
      for (const [entity, fields] of Object.entries(data)) {
        sorted[entity] = (fields as FieldConfig[]).sort((a, b) => a.sort_order - b.sort_order);
      }
      setFieldsByEntity(sorted);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const currentFields = fieldsByEntity[activeEntity] || [];

  // ── Update a field (optimistic) ───────────────────────────────────────────
  async function updateField(field: FieldConfig, patch: Partial<FieldConfig>) {
    // Optimistic update
    setFieldsByEntity(prev => ({
      ...prev,
      [activeEntity]: prev[activeEntity].map(f =>
        f.id === field.id ? { ...f, ...patch } : f
      ),
    }));

    setSaving(field.id);
    try {
      const res = await adminApi(`/admin/fields/${field.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Update failed");
      }
    } catch (e: any) {
      setError(e.message);
      await loadFields(); // revert
    } finally {
      setSaving(null);
    }
  }

  // ── Drag & drop reorder ───────────────────────────────────────────────────
  function handleDragStart(index: number) {
    dragItem.current = index;
  }
  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }
  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const fields = [...currentFields];
    const [moved] = fields.splice(dragItem.current, 1);
    fields.splice(dragOverItem.current, 0, moved);

    // Assign new sort_orders
    const reordered = fields.map((f, i) => ({ ...f, sort_order: i + 1 }));

    setFieldsByEntity(prev => ({ ...prev, [activeEntity]: reordered }));
    dragItem.current = null;
    dragOverItem.current = null;

    // Persist to backend
    saveReorder(reordered);
  }

  async function saveReorder(fields: FieldConfig[]) {
    setSaving("reorder");
    try {
      const res = await adminApi("/admin/fields/reorder", {
        method: "POST",
        body: JSON.stringify({
          items: fields.map(f => ({ id: f.id, sort_order: f.sort_order })),
        }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  // ── Delete custom field ───────────────────────────────────────────────────
  async function deleteField(field: FieldConfig) {
    if (!confirm(`Delete custom field "${field.label}"? All stored values will also be deleted.`)) return;
    try {
      const res = await adminApi(`/admin/fields/${field.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Delete failed");
      }
      setFieldsByEntity(prev => ({
        ...prev,
        [activeEntity]: prev[activeEntity].filter(f => f.id !== field.id),
      }));
    } catch (e: any) {
      setError(e.message);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 text-sm animate-pulse">Loading field configurations…</div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fields & Labels Manager</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control which fields appear, their labels, and order — for all forms and pages.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#273b84] text-white rounded-lg text-sm font-medium hover:bg-[#1e2d6b] transition"
        >
          <span>＋</span> Add Custom Field
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Entity tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {ENTITIES.map(e => (
          <button
            key={e.key}
            onClick={() => setActiveEntity(e.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition ${
              activeEntity === e.key
                ? "bg-white border border-b-white border-gray-200 text-[#273b84] -mb-px"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {e.icon} {e.label}
            <span className="ml-1 text-xs text-gray-500">
              ({(fieldsByEntity[e.key] || []).length})
            </span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-[#273b84] inline-block" /> Custom field
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Schema field (label/visibility only)
        </span>
        <span>⠿ Drag rows to reorder</span>
        {saving === "reorder" && <span className="text-[#273b84] animate-pulse">Saving order…</span>}
      </div>

      {/* Fields table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
              <th className="w-8 px-3 py-3" />
              <th className="px-4 py-3 text-left">Label</th>
              <th className="px-4 py-3 text-left">Field Key</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-3 py-3 text-center">Visible</th>
              <th className="px-3 py-3 text-center">Required</th>
              <th className="px-3 py-3 text-center">Customer</th>
              <th className="px-3 py-3 text-center">Admin</th>
              <th className="px-4 py-3 text-center">Status</th>
              {isSuperadmin && <th className="px-3 py-3 text-center">Del</th>}
            </tr>
          </thead>
          <tbody>
            {currentFields.length === 0 ? (
              <tr>
                <td colSpan={isSuperadmin ? 10 : 9} className="px-4 py-8 text-center text-gray-500">
                  No fields configured for this entity yet.
                </td>
              </tr>
            ) : (
              currentFields.map((field, index) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  index={index}
                  isSuperadmin={isSuperadmin}
                  saving={saving === field.id}
                  onOptionsClick={(f: any) => setOptionsField(f)}
                  onUpdate={(patch) => updateField(field, patch)}
                  onDelete={() => deleteField(field)}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        {currentFields.length} fields — {currentFields.filter(f => f.is_visible).length} visible, {currentFields.filter(f => f.is_custom).length} custom
      </p>

      {/* Add custom field modal */}
      {showAddModal && (
        <AddFieldModal
          entity={activeEntity}
          adminApi={adminApi}
          onClose={() => setShowAddModal(false)}
          onCreated={(newField) => {
            setFieldsByEntity(prev => ({
              ...prev,
              [activeEntity]: [...(prev[activeEntity] || []), newField],
            }));
            setShowAddModal(false);
          }}
        />
      )}

      {/* Options Manager Modal */}
      {optionsField && (
        <OptionsModal
          field={optionsField}
          onClose={() => setOptionsField(null)}
          onSaved={(updated) => {
            setOptionsField(null);
            setFieldsByEntity((prev: any) => ({
              ...prev,
              [activeEntity]: (prev[activeEntity] || []).map((f: any) => f.id === updated.id ? updated : f)
            }));
          }}
        />
      )}
    </div>
  );
}

// ── FieldRow ──────────────────────────────────────────────────────────────────
function FieldRow({
  field, index, isSuperadmin, saving, onOptionsClick, onUpdate, onDelete,
  onDragStart, onDragEnter, onDragEnd,
}: {
  field: FieldConfig; index: number; isSuperadmin: boolean; saving: boolean;
  onOptionsClick: (field: any) => void;
  onUpdate: (patch: Partial<FieldConfig>) => void;
  onDelete: () => void;
  onDragStart: () => void; onDragEnter: () => void; onDragEnd: () => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelVal, setLabelVal] = useState(field.label);
  const labelRef = useRef<HTMLInputElement>(null);

  function commitLabel() {
    setEditingLabel(false);
    if (labelVal.trim() && labelVal !== field.label) {
      onUpdate({ label: labelVal.trim() });
    }
  }

  const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";

  return (
    <tr
      className={`${rowBg} border-b border-gray-100 hover:bg-[#273b84] transition-colors`}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Drag handle */}
      <td className="px-3 py-3 text-gray-700 cursor-grab select-none text-center">⠿</td>

      {/* Label — inline editable */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {field.is_custom && (
            <span className="w-2 h-2 rounded-full bg-[#273b84] flex-shrink-0" title="Custom field" />
          )}
          {editingLabel ? (
            <input
              ref={labelRef}
              value={labelVal}
              onChange={e => setLabelVal(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={e => { if (e.key === "Enter") commitLabel(); if (e.key === "Escape") { setEditingLabel(false); setLabelVal(field.label); } }}
              className="border border-[#273b84] rounded px-2 py-0.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#273b84]"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setEditingLabel(true); setLabelVal(field.label); }}
              className="text-left font-medium text-gray-800 hover:text-[#273b84] hover:underline"
              title="Click to edit label"
            >
              {field.label}
            </button>
          )}
        </div>
      </td>

      {/* Field key */}
      <td className="px-4 py-3">
        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{field.field_key}</code>
      </td>

      {/* Field type */}
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500 capitalize">{field.field_type}</span>
                        {(field.field_type === 'select' || field.field_type === 'multiselect') && (
                          <button onClick={() => onOptionsClick(field)}
                            className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 font-medium">
                            ⚙ {(field.field_options||[]).length > 0 ? `${(field.field_options||[]).length} opts` : 'add opts'}
                          </button>
                        )}
      </td>

      {/* Visible toggle */}
      <td className="px-3 py-3 text-center">
        <Toggle checked={field.is_visible} onChange={v => onUpdate({ is_visible: v })} color="green" />
      </td>

      {/* Required toggle */}
      <td className="px-3 py-3 text-center">
        <Toggle checked={field.is_required} onChange={v => onUpdate({ is_required: v })} color="red" />
      </td>

      {/* Show on customer */}
      <td className="px-3 py-3 text-center">
        <Toggle checked={field.show_on_customer} onChange={v => onUpdate({ show_on_customer: v })} color="blue" />
      </td>

      {/* Show on admin */}
      <td className="px-3 py-3 text-center">
        <Toggle checked={field.show_on_admin} onChange={v => onUpdate({ show_on_admin: v })} color="purple" />
      </td>

      {/* Save status */}
      <td className="px-4 py-3 text-center">
        {saving ? (
          <span className="text-xs text-[#273b84] animate-pulse">Saving…</span>
        ) : (
          <span className="text-xs text-green-500">✓</span>
        )}
      </td>

      {/* Delete (superadmin + custom only) */}
      {isSuperadmin && (
        <td className="px-3 py-3 text-center">
          {field.is_custom ? (
            <button
              onClick={onDelete}
              className="text-red-400 hover:text-red-600 text-sm"
              title="Delete custom field"
            >
              🗑
            </button>
          ) : (
            <span className="text-gray-200 text-sm" title="Schema fields cannot be deleted">🔒</span>
          )}
        </td>
      )}
    </tr>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, color = "green" }: {
  checked: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  const colors: Record<string, string> = {
    green:  "bg-green-500",
    red:    "bg-red-500",
    blue:   "bg-blue-500",
    purple: "bg-purple-500",
  };
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? colors[color] || colors.green : "bg-gray-200"
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-4" : "translate-x-0.5"
      }`} />
    </button>
  );
}

// ── Add Custom Field Modal ────────────────────────────────────────────────────
function AddFieldModal({ entity, adminApi, onClose, onCreated }: {
  entity: string;
  adminApi: (url: string, opts?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onCreated: (field: FieldConfig) => void;
}) {
  const [form, setForm] = useState({
    label: "",
    field_key: "",
    field_type: "text" as FieldType,
    is_required: false,
    placeholder: "",
    help_text: "",
    field_options: "",       // comma-separated for select types
    show_on_customer: true,
    show_on_admin: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate field_key from label
  function handleLabelChange(val: string) {
    const key = val.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "_");
    setForm(f => ({ ...f, label: val, field_key: key }));
  }

  async function handleSubmit() {
    if (!form.label.trim()) { setError("Label is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const body: any = {
        entity,
        label: form.label.trim(),
        field_key: form.field_key.trim(),
        field_type: form.field_type,
        is_required: form.is_required,
        is_custom: true,
        placeholder: form.placeholder || null,
        help_text: form.help_text || null,
        show_on_customer: form.show_on_customer,
        show_on_admin: form.show_on_admin,
      };
      // Parse select options
      if (["select", "multiselect"].includes(form.field_type) && form.field_options) {
        body.field_options = ( form.field_options || "" ).split(",").map(s => s.trim()).filter(Boolean);
      }

      const res = await adminApi("/admin/fields", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create field");
      }
      const created: FieldConfig = await res.json();
      onCreated(created);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const needsOptions = ["select", "multiselect"].includes(form.field_type);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Add Custom Field</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity</label>
            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 capitalize">
              {entity.replace("_", " ")}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.label}
              onChange={e => handleLabelChange(e.target.value)}
              placeholder="e.g. Parking Slots"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#273b84]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Key (auto-generated)</label>
            <input
              type="text"
              value={form.field_key}
              onChange={e => setForm(f => ({ ...f, field_key: e.target.value }))}
              placeholder="e.g. parking_slots"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#273b84]"
            />
            <p className="text-xs text-gray-500 mt-1">Unique identifier — used in API and DB. Cannot be changed after creation.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
            <select
              value={form.field_type}
              onChange={e => setForm(f => ({ ...f, field_type: e.target.value as FieldType }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#273b84]"
            >
              {FIELD_TYPES.map(ft => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
          </div>

          {needsOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Options (comma-separated)</label>
              <input
                type="text"
                value={form.field_options}
                onChange={e => setForm(f => ({ ...f, field_options: e.target.value }))}
                placeholder="Option 1, Option 2, Option 3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#273b84]"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder Text</label>
            <input
              type="text"
              value={form.placeholder}
              onChange={e => setForm(f => ({ ...f, placeholder: e.target.value }))}
              placeholder="Optional hint shown inside the field"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#273b84]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Help Text</label>
            <input
              type="text"
              value={form.help_text}
              onChange={e => setForm(f => ({ ...f, help_text: e.target.value }))}
              placeholder="Optional helper shown below the field"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#273b84]"
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { key: "is_required",      label: "Required" },
              { key: "show_on_customer", label: "Customer forms" },
              { key: "show_on_admin",    label: "Admin panel" },
            ].map(item => (
              <label key={item.key} className="flex flex-col items-center gap-1 cursor-pointer">
                <span className="text-xs text-gray-500">{item.label}</span>
                <div
                  onClick={() => setForm(f => ({ ...f, [item.key]: !(f as any)[item.key] }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                    (form as any)[item.key] ? "bg-[#273b84]" : "bg-gray-200"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    (form as any)[item.key] ? "translate-x-4" : "translate-x-0.5"
                  }`} />
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm bg-[#273b84] text-white rounded-lg hover:bg-[#1e2d6b] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? "Creating…" : "Create Custom Field"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Options Manager Modal ──────────────────────────────────────────────────────
function OptionsModal({ field, onClose, onSaved }: {
  field: any; onClose: () => void; onSaved: (f: any) => void;
}) {
  // field_options can be null, a JSON array, or a comma-string — normalize to string[]
  const parseOptions = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p.map(String) : raw.split(',').map(s=>s.trim()).filter(Boolean); }
      catch { return raw.split(',').map(s => s.trim()).filter(Boolean); }
    }
    return [];
  };
  const existing: string[] = parseOptions(field.field_options);
  const [options, setOptions] = useState<string[]>(existing);
  const [newOption, setNewOption] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addOption() {
    const val = newOption.trim();
    if (!val) return;
    if (options.includes(val)) { setErr("Option already exists"); return; }
    setOptions([...options, val]);
    setNewOption("");
    setErr(null);
  }

  function removeOption(idx: number) {
    setOptions(options.filter((_, i) => i !== idx));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const arr = [...options];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setOptions(arr);
  }

  function moveDown(idx: number) {
    if (idx === options.length - 1) return;
    const arr = [...options];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    setOptions(arr);
  }

  async function handleSave() {
    setSaving(true); setErr(null);
    try {
      const res = await adminApi(`/admin/fields/${field.id}`, {
        method: "PATCH",
        body: JSON.stringify({ field_options: options }),
      });
      if (!res.ok) throw new Error("Failed to save options");
      const updated = await res.json();
      onSaved(updated);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manage Options</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="font-mono bg-gray-100 px-1 rounded">{field.field_key}</span>
              <span className="mx-1">·</span>
              {field.label} · {field.field_type}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-3">
          {err && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{err}</div>}

          {/* Add new option */}
          <div className="flex gap-2">
            <input
              value={newOption}
              onChange={e => setNewOption(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addOption(); }}
              placeholder="Type new option and press Enter or +"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#273b84]"
            />
            <button onClick={addOption}
              className="px-3 py-2 bg-[#273b84] text-white rounded-lg text-sm font-bold hover:bg-[#1e2d6b]">
              +
            </button>
          </div>

          {/* Options list */}
          {options.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg">
              No options yet. Add your first option above.
            </div>
          ) : (
            <div className="space-y-1">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg group hover:border-[#273b84]">
                  <span className="text-gray-500 text-xs w-5 text-right">{idx + 1}.</span>
                  <span className="flex-1 text-sm text-gray-800">{opt}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0}
                      className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-600 disabled:opacity-30">↑</button>
                    <button onClick={() => moveDown(idx)} disabled={idx === options.length - 1}
                      className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-600 disabled:opacity-30">↓</button>
                    <button onClick={() => removeOption(idx)}
                      className="px-1.5 py-0.5 text-xs text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500">
            💡 Drag ↑↓ to reorder · Options appear in dropdowns and multi-select lists across all forms
          </p>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
          <span className="text-xs text-gray-500">{options.length} option{options.length !== 1 ? "s" : ""}</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-sm bg-[#273b84] text-white rounded-lg hover:bg-[#1e2d6b] disabled:opacity-50 font-medium">
              {saving ? "Saving…" : "Save Options"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
