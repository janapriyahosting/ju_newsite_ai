'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Fact {
  id: string;
  project_id: string | null;
  project_name: string | null;
  topic: string;
  content: string;
  is_active: boolean;
  sort_order: number;
}

interface ProjectLite { id: string; name: string }

const TOPIC_SUGGESTIONS = [
  'pricing', 'gst', 'amenities', 'possession', 'legal',
  'payment_plan', 'parking', 'maintenance', 'general',
];

const BLANK_DRAFT = {
  project_id: '' as string,
  topic: 'pricing',
  content: '',
  is_active: true,
};

export default function AssistantKnowledgePage() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [filter, setFilter] = useState<string>('');   // '' = all, 'site' = global only, or project id
  const [draft, setDraft] = useState({ ...BLANK_DRAFT });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { loadProjects(); loadFacts(); }, []);

  async function loadProjects() {
    try {
      const r = await fetch(`${API}/projects?page_size=100`);
      const d = await r.json();
      const items = Array.isArray(d) ? d : (d.items || []);
      setProjects(items.map((p: any) => ({ id: p.id, name: p.name })));
    } catch { setProjects([]); }
  }

  async function loadFacts() {
    setLoading(true);
    try {
      const r = await adminApi('/admin/cms/assistant-facts');
      const d = await r.json();
      setFacts(Array.isArray(d) ? d : []);
    } catch { setFacts([]); }
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  }

  function startEdit(f: Fact) {
    setEditingId(f.id);
    setDraft({
      project_id: f.project_id || '',
      topic: f.topic || 'general',
      content: f.content,
      is_active: f.is_active,
    });
  }

  function resetDraft() {
    setEditingId(null);
    setDraft({ ...BLANK_DRAFT });
  }

  async function save() {
    if (!draft.content.trim()) { showToast('Content is empty'); return; }
    setSaving(true);
    const body = JSON.stringify({
      project_id: draft.project_id || null,
      topic: draft.topic.trim() || 'general',
      content: draft.content.trim(),
      is_active: draft.is_active,
    });
    try {
      if (editingId) {
        await adminApi(`/admin/cms/assistant-facts/${editingId}`, { method: 'PATCH', body });
        showToast('Fact updated');
      } else {
        await adminApi('/admin/cms/assistant-facts', { method: 'POST', body });
        showToast('Fact added');
      }
      resetDraft();
      await loadFacts();
    } catch { showToast('Save failed'); }
    setSaving(false);
  }

  async function toggleActive(f: Fact) {
    await adminApi(`/admin/cms/assistant-facts/${f.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !f.is_active }),
    });
    loadFacts();
  }

  async function remove(f: Fact) {
    if (!confirm(`Delete this fact?\n\n"${f.content.slice(0, 80)}…"`)) return;
    await adminApi(`/admin/cms/assistant-facts/${f.id}`, { method: 'DELETE' });
    if (editingId === f.id) resetDraft();
    loadFacts();
    showToast('Fact deleted');
  }

  const visibleFacts = facts.filter(f => {
    if (filter === '') return true;
    if (filter === 'site') return f.project_id === null;
    return f.project_id === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#273b84]">Assistant Knowledge</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Free-form facts the chat assistant treats as the source of truth.
            Use site-wide facts for things that apply to every project (e.g.
            "Listed price includes GST and amenities"), and per-project facts
            for exceptions ("Bahiti has no GST"). Active facts are loaded on
            every chat call — no redeploy needed.
          </p>
        </div>
      </div>

      {toast && (
        <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium w-fit">
          {toast}
        </div>
      )}

      {/* Editor */}
      <div className="bg-white border rounded-xl p-5 space-y-3">
        <div className="font-bold text-[#273b84]">{editingId ? 'Edit fact' : 'Add a new fact'}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-600">Scope</label>
            <select value={draft.project_id} onChange={e => setDraft(d => ({ ...d, project_id: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Site-wide (applies to every project)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600">Topic</label>
            <input list="topic-suggestions" value={draft.topic}
              onChange={e => setDraft(d => ({ ...d, topic: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            <datalist id="topic-suggestions">
              {TOPIC_SUGGESTIONS.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.is_active}
                onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))} />
              Active (sent to the LLM)
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600">Content</label>
          <textarea value={draft.content} onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
            rows={4} placeholder='e.g. "The total amount includes GST, club house, parking, utilities and documentation. Bahiti is the exception — no GST is charged."'
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-[ui-monospace,SFMono-Regular,Menlo,Consolas,monospace]" />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-[#273b84] text-white disabled:opacity-50">
            {saving ? 'Saving…' : (editingId ? 'Save changes' : 'Add fact')}
          </button>
          {editingId && (
            <button onClick={resetDraft}
              className="px-4 py-2 text-sm font-bold rounded-lg bg-gray-100 text-gray-700">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-600">Show:</span>
        <button onClick={() => setFilter('')}
          className={`px-3 py-1 rounded-full text-xs font-bold border ${filter === '' ? 'bg-[#273b84] text-white border-[#273b84]' : 'bg-white text-gray-600'}`}>
          All ({facts.length})
        </button>
        <button onClick={() => setFilter('site')}
          className={`px-3 py-1 rounded-full text-xs font-bold border ${filter === 'site' ? 'bg-[#273b84] text-white border-[#273b84]' : 'bg-white text-gray-600'}`}>
          Site-wide ({facts.filter(f => f.project_id === null).length})
        </button>
        {projects.map(p => {
          const n = facts.filter(f => f.project_id === p.id).length;
          if (!n) return null;
          return (
            <button key={p.id} onClick={() => setFilter(p.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold border ${filter === p.id ? 'bg-[#273b84] text-white border-[#273b84]' : 'bg-white text-gray-600'}`}>
              {p.name} ({n})
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="bg-white border rounded-xl divide-y">
        {loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
        ) : visibleFacts.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No facts yet — add one above.</div>
        ) : visibleFacts.map(f => (
          <div key={f.id} className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${f.project_id ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                  {f.project_name || 'Site-wide'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{f.topic}</span>
                {!f.is_active && <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">inactive</span>}
              </div>
              <div className={`text-sm whitespace-pre-wrap ${f.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{f.content}</div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => startEdit(f)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                Edit
              </button>
              <button onClick={() => toggleActive(f)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                {f.is_active ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => remove(f)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-50 text-red-700 hover:bg-red-100">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
