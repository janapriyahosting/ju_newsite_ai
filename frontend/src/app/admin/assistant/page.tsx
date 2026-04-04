'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminAuth';

const API_BASE = 'http://173.168.0.81:8000/api/v1';

const TRIGGERS = [
  { value: 'on_open',      label: 'On widget open',         desc: 'Auto-launches every time someone opens the chat' },
  { value: 'on_no_results',label: 'After 0 search results', desc: 'Launches when search returns nothing' },
  { value: 'manual',       label: 'Manual (Guide tab only)', desc: 'Only shown in the Guide tab, not auto-launched' },
];

const STEP_TYPES = [
  { value: 'message',      label: '💬 Message',       desc: 'Bot says something, user taps Continue' },
  { value: 'options',      label: '🔘 Options',        desc: 'Multiple choice buttons' },
  { value: 'input',        label: '⌨️ Text Input',     desc: 'User types a free response' },
  { value: 'collect_lead', label: '📋 Collect Lead',   desc: 'Input that also triggers lead creation' },
  { value: 'show_units',   label: '🏠 Show Units',     desc: 'Search and display matching units' },
  { value: 'end',          label: '🏁 End',            desc: 'End the flow' },
];

const DEFAULT_FLOW_STEPS = [
  { id: 'start', type: 'options', text: "Welcome! What are you looking for today?",
    options: [
      { label: 'Buy a flat',          value: 'buy',      next: 'budget' },
      { label: 'Learn about RiseUp',  value: 'riseup',   next: 'riseup_info' },
      { label: 'Get a brochure',      value: 'brochure', next: 'brochure_req' },
      { label: 'Talk to an advisor',  value: 'callback', next: 'collect_phone' },
    ]
  },
  { id: 'budget', type: 'options', text: "What's your budget?", field: 'budget',
    options: [
      { label: 'Under ₹50L',   value: '5000000',  next: 'bhk' },
      { label: '₹50L – ₹80L', value: '8000000',  next: 'bhk' },
      { label: '₹80L – ₹1Cr', value: '10000000', next: 'bhk' },
      { label: 'Above ₹1Cr',  value: '15000000', next: 'bhk' },
    ]
  },
  { id: 'bhk', type: 'options', text: "How many bedrooms?", field: 'bhk',
    options: [
      { label: '1 BHK', value: '1', next: 'results' },
      { label: '2 BHK', value: '2', next: 'results' },
      { label: '3 BHK', value: '3', next: 'results' },
      { label: '4 BHK', value: '4', next: 'results' },
    ]
  },
  { id: 'results',      type: 'show_units',   text: "Here are the best matches for you!", next: 'after_results' },
  { id: 'after_results',type: 'options',      text: "Would you like to take it further?",
    options: [
      { label: 'Request callback',  value: 'cb',  next: 'collect_phone' },
      { label: 'Book site visit',   value: 'sv',  next: 'end' },
    ]
  },
  { id: 'riseup_info',   type: 'message',      text: "With RiseUp, you pay only 80% now and 20% at possession. It lets you own a bigger home on a smaller budget!", next: 'collect_phone' },
  { id: 'brochure_req',  type: 'input',        text: "Which project or unit would you like the brochure for?", field: 'brochure_query', placeholder: 'e.g. Janapriya Heights or unit A-502', next: 'collect_phone' },
  { id: 'collect_phone', type: 'collect_lead', text: "Great! What's your phone number so our advisor can assist you?", field: 'phone', placeholder: 'Your phone number', next: 'end' },
  { id: 'end',           type: 'end',          text: "Thank you! Our team will reach out shortly. 🙏" },
];

function uid() { return Math.random().toString(36).slice(2, 8); }

// ── Step Editor ───────────────────────────────────────────────────────────────
function StepEditor({ step, steps, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  step: any; steps: any[]; onChange: (s: any) => void;
  onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
  isFirst: boolean; isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const allIds = steps.map(s => s.id);

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden mb-3">
      {/* Step header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <span className="text-gray-400 text-xs font-mono">{step.id}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
          {STEP_TYPES.find(t => t.value === step.type)?.label || step.type}
        </span>
        <span className="flex-1 text-sm text-white truncate">{step.text}</span>
        <div className="flex gap-1">
          {!isFirst && <button onClick={e => { e.stopPropagation(); onMoveUp(); }} className="text-gray-500 hover:text-white text-xs px-1">↑</button>}
          {!isLast  && <button onClick={e => { e.stopPropagation(); onMoveDown(); }} className="text-gray-500 hover:text-white text-xs px-1">↓</button>}
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="text-red-500 hover:text-red-300 text-xs px-1">✕</button>
          <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="p-4 bg-gray-900 space-y-3">
          {/* ID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Step ID (unique)</label>
              <input value={step.id} onChange={e => onChange({ ...step, id: e.target.value.replace(/\s/g, '_') })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select value={step.type} onChange={e => onChange({ ...step, type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Text */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Bot message</label>
            <textarea value={step.text} onChange={e => onChange({ ...step, text: e.target.value })} rows={2}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          {/* Field (for input / options with data collection) */}
          {['input', 'collect_lead', 'options'].includes(step.type) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Save answer as field</label>
                <input value={step.field || ''} onChange={e => onChange({ ...step, field: e.target.value })}
                  placeholder="e.g. budget, bhk, phone"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              {(step.type === 'input' || step.type === 'collect_lead') && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Placeholder text</label>
                  <input value={step.placeholder || ''} onChange={e => onChange({ ...step, placeholder: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
            </div>
          )}

          {/* Next step (non-options) */}
          {!['options'].includes(step.type) && step.type !== 'end' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Next step</label>
              <select value={step.next || ''} onChange={e => onChange({ ...step, next: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">— select —</option>
                <option value="end">🏁 end</option>
                {allIds.filter(id => id !== step.id).map(id => <option key={id} value={id}>{id}</option>)}
              </select>
            </div>
          )}

          {/* Options editor */}
          {step.type === 'options' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400">Options</label>
                <button onClick={() => onChange({ ...step, options: [...(step.options || []), { label: 'New option', value: uid(), next: 'end' }] })}
                  className="text-xs text-blue-400 hover:text-blue-300">+ Add option</button>
              </div>
              {(step.options || []).map((opt: any, i: number) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <input value={opt.label} onChange={e => {
                    const opts = [...step.options]; opts[i] = { ...opts[i], label: e.target.value };
                    onChange({ ...step, options: opts });
                  }} placeholder="Label" className="col-span-4 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs" />
                  <input value={opt.value} onChange={e => {
                    const opts = [...step.options]; opts[i] = { ...opts[i], value: e.target.value };
                    onChange({ ...step, options: opts });
                  }} placeholder="Value" className="col-span-3 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs font-mono" />
                  <select value={opt.next || ''} onChange={e => {
                    const opts = [...step.options]; opts[i] = { ...opts[i], next: e.target.value };
                    onChange({ ...step, options: opts });
                  }} className="col-span-4 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs">
                    <option value="">next →</option>
                    <option value="end">🏁 end</option>
                    {allIds.filter(id => id !== step.id).map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                  <button onClick={() => { const opts = step.options.filter((_: any, j: number) => j !== i); onChange({ ...step, options: opts }); }}
                    className="col-span-1 text-red-500 hover:text-red-300 text-sm text-center">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AssistantAdminPage() {
  const [flows, setFlows]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState<any | null>(null);   // flow being edited
  const [saving, setSaving]       = useState(false);
  const [preview, setPreview]     = useState(false);
  const [previewStepId, setPreviewStepId] = useState('');

  async function loadFlows() {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/assistant/admin/flows`);
      const d = await r.json();
      setFlows(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadFlows(); }, []);

  function newFlow() {
    setEditing({
      id: null, name: 'New Flow', description: '', trigger: 'on_open',
      is_active: true, steps: JSON.parse(JSON.stringify(DEFAULT_FLOW_STEPS)),
    });
  }

  function updateStep(idx: number, updated: any) {
    const steps = [...editing.steps];
    steps[idx] = updated;
    setEditing({ ...editing, steps });
  }

  function deleteStep(idx: number) {
    const steps = editing.steps.filter((_: any, i: number) => i !== idx);
    setEditing({ ...editing, steps });
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const steps = [...editing.steps];
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    setEditing({ ...editing, steps });
  }

  function addStep() {
    const newStep = { id: `step_${uid()}`, type: 'message', text: 'New step', next: 'end' };
    setEditing({ ...editing, steps: [...editing.steps, newStep] });
  }

  async function saveFlow() {
    setSaving(true);
    try {
      const payload = { name: editing.name, description: editing.description, trigger: editing.trigger, is_active: editing.is_active, steps: editing.steps };
      if (editing.id) {
        await fetch(`${API_BASE}/assistant/admin/flows/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        await fetch(`${API_BASE}/assistant/admin/flows`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      await loadFlows();
      setEditing(null);
    } catch {}
    setSaving(false);
  }

  async function deleteFlow(id: string) {
    if (!confirm('Delete this flow?')) return;
    await fetch(`${API_BASE}/assistant/admin/flows/${id}`, { method: 'DELETE' });
    loadFlows();
  }

  async function toggleActive(flow: any) {
    await fetch(`${API_BASE}/assistant/admin/flows/${flow.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !flow.is_active }),
    });
    loadFlows();
  }

  // ── Preview logic ──
  const previewStep = editing?.steps?.find((s: any) => s.id === previewStepId) || editing?.steps?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Assistant Flows</h1>
          <p className="text-gray-400 text-sm mt-1">Build guided conversation flows for the chatbot widget</p>
        </div>
        <button onClick={newFlow} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-sm">
          + New Flow
        </button>
      </div>

      {/* ── Flow list ── */}
      {!editing && (
        loading ? (
          <div className="text-gray-400 text-sm">Loading…</div>
        ) : flows.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-4xl mb-4">🤖</div>
            <p className="text-white font-bold text-lg mb-2">No flows yet</p>
            <p className="text-gray-400 text-sm mb-6">Create your first guided conversation flow for the AI assistant widget.</p>
            <button onClick={newFlow} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-sm">
              Create Default Flow
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {flows.map(flow => (
              <div key={flow.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-white font-bold">{flow.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${flow.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {flow.is_active ? '● Active' : '○ Inactive'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">
                      {TRIGGERS.find(t => t.value === flow.trigger)?.label || flow.trigger}
                    </span>
                  </div>
                  {flow.description && <p className="text-gray-400 text-sm">{flow.description}</p>}
                  <p className="text-gray-600 text-xs mt-1">{flow.steps?.length || 0} steps</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(flow)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${flow.is_active ? 'border-gray-600 text-gray-400 hover:text-white' : 'border-green-700 text-green-400 hover:bg-green-900/30'}`}>
                    {flow.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => setEditing({ ...flow, steps: JSON.parse(JSON.stringify(flow.steps)) })}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-white hover:bg-gray-700">
                    Edit
                  </button>
                  <button onClick={() => deleteFlow(flow.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-900/20 border border-red-900/50">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Flow editor ── */}
      {editing && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: builder */}
          <div className="xl:col-span-2 space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-white font-bold text-lg mb-4">{editing.id ? 'Edit Flow' : 'New Flow'}</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Flow name</label>
                  <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Trigger</label>
                  <select value={editing.trigger} onChange={e => setEditing({ ...editing, trigger: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                    {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <p className="text-gray-600 text-xs mt-1">{TRIGGERS.find(t => t.value === editing.trigger)?.desc}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
                <input value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })}
                  placeholder="e.g. Home buyer qualification flow"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                  className={`relative inline-flex h-5 w-10 rounded-full transition-colors ${editing.is_active ? 'bg-green-500' : 'bg-gray-600'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow mt-0.5 transition-transform ${editing.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-gray-300">{editing.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            {/* Steps */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Steps ({editing.steps.length})</h3>
                <div className="flex gap-2">
                  <button onClick={() => setPreview(!preview)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${preview ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'border-gray-700 text-gray-400'}`}>
                    {preview ? '✓ Preview on' : '👁 Preview'}
                  </button>
                  <button onClick={addStep}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold border border-gray-700">
                    + Add Step
                  </button>
                </div>
              </div>

              {editing.steps.map((step: any, i: number) => (
                <StepEditor key={step.id + i} step={step} steps={editing.steps}
                  onChange={updated => updateStep(i, updated)}
                  onDelete={() => deleteStep(i)}
                  onMoveUp={() => moveStep(i, -1)}
                  onMoveDown={() => moveStep(i, 1)}
                  isFirst={i === 0} isLast={i === editing.steps.length - 1} />
              ))}

              {editing.steps.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No steps yet. Click "+ Add Step" to start building.
                </div>
              )}
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-3">
              <button onClick={saveFlow} disabled={saving}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-lg text-sm">
                {saving ? 'Saving…' : editing.id ? '💾 Save Changes' : '✓ Create Flow'}
              </button>
              <button onClick={() => setEditing(null)} className="px-6 py-2.5 bg-gray-800 text-gray-300 hover:text-white rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>

          {/* Right: preview */}
          <div>
            <div className="sticky top-6">
              <h3 className="text-white font-bold mb-3 text-sm">Live Preview</h3>
              <div style={{ background: "linear-gradient(135deg,#0f0f1a,#1a1a2e)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", maxWidth: 320 }}>
                {/* Fake header */}
                <div style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "white" }}>✦</div>
                  <div>
                    <div style={{ color: "white", fontWeight: 900, fontSize: 13 }}>Janapriya AI</div>
                    <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>Online · Guided flow</div>
                  </div>
                </div>

                {/* Step selector */}
                <div style={{ padding: "8px 12px", background: "#111", borderBottom: "1px solid #222" }}>
                  <select value={previewStepId || editing.steps[0]?.id || ''} onChange={e => setPreviewStepId(e.target.value)}
                    style={{ width: "100%", background: "#222", border: "1px solid #333", color: "white", borderRadius: 8, padding: "5px 8px", fontSize: 11 }}>
                    {editing.steps.map((s: any) => <option key={s.id} value={s.id}>{s.id} — {STEP_TYPES.find(t => t.value === s.type)?.label}</option>)}
                  </select>
                </div>

                {/* Preview step */}
                {previewStep && (
                  <div style={{ padding: 14, background: "white", minHeight: 180 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#2A3887,#29A9DF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", flexShrink: 0 }}>✦</div>
                      <div style={{ background: "#F0F4FF", borderRadius: "0 10px 10px 10px", padding: "8px 12px", fontSize: 12, color: "#333", lineHeight: 1.5 }}>
                        {previewStep.text}
                      </div>
                    </div>
                    {previewStep.type === 'options' && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 32 }}>
                        {(previewStep.options || []).map((opt: any) => (
                          <span key={opt.value} style={{ background: "white", border: "1.5px solid #2A3887", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: "#2A3887" }}>
                            {opt.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {(previewStep.type === 'input' || previewStep.type === 'collect_lead') && (
                      <div style={{ paddingLeft: 32 }}>
                        <div style={{ border: "1.5px solid #E2F1FC", borderRadius: 20, padding: "7px 14px", fontSize: 12, color: "#aaa" }}>
                          {previewStep.placeholder || 'Type here…'}
                        </div>
                      </div>
                    )}
                    {previewStep.type === 'end' && (
                      <div style={{ paddingLeft: 32, fontSize: 12, color: "#22c55e", fontWeight: 700 }}>✓ Flow ends here</div>
                    )}
                  </div>
                )}
              </div>

              {/* Step map */}
              <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h4 className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wide">Step Map</h4>
                <div className="space-y-1.5">
                  {editing.steps.map((s: any, i: number) => (
                    <button key={s.id} onClick={() => setPreviewStepId(s.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${previewStepId === s.id || (!previewStepId && i === 0) ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                      <span className="text-xs font-mono">{i + 1}.</span>
                      <span className="text-xs truncate flex-1">{s.id}</span>
                      <span className="text-xs text-gray-600">{STEP_TYPES.find(t => t.value === s.type)?.label?.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
