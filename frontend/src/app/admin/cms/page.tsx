"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { adminApi } from "@/lib/adminAuth";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "seo" | "sections" | "settings";
type SettingsGroup = "general" | "contact" | "social" | "seo";

const PAGE_LABELS: Record<string, string> = {
  home: "🏠 Homepage", projects: "📋 Projects Listing",
  units: "🏢 Units / Search", project_detail: "📄 Individual Project Pages",
};
const GROUP_LABELS: Record<SettingsGroup, string> = {
  general: "⚙️ General", contact: "📞 Contact", social: "🔗 Social Media", seo: "🔍 SEO & Analytics",
};
const GROUP_ICONS: Record<string, string> = {
  general: "⚙️", contact: "📞", social: "🔗", seo: "🔍",
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CmsPage() {
  const [tab, setTab] = useState<Tab>("settings");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function flash(msg: string) { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); }
  function flashErr(msg: string) { setError(msg); setTimeout(() => setError(null), 5000); }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CMS Panel</h1>
        <p className="text-sm text-gray-500 mt-1">Manage site content, SEO metadata, and global settings</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between"><span>{error}</span><button onClick={() => setError(null)}>✕</button></div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">✓ {success}</div>}

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["settings", "seo", "sections"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition ${tab === t ? "bg-white border border-b-white border-gray-200 text-amber-600 -mb-px" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "settings" ? "⚙️ Site Settings" : t === "seo" ? "🔍 SEO / Pages" : "📝 Content Sections"}
          </button>
        ))}
      </div>

      {tab === "settings" && <SettingsPanel onSuccess={flash} onError={flashErr} />}
      {tab === "seo" && <SeoPanel onSuccess={flash} onError={flashErr} />}
      {tab === "sections" && <SectionsPanel onSuccess={flash} onError={flashErr} />}
    </div>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────
function SettingsPanel({ onSuccess, onError }: { onSuccess: (m: string) => void; onError: (m: string) => void }) {
  const [settings, setSettings] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeGroup, setActiveGroup] = useState<SettingsGroup>("general");
  const [saving, setSaving] = useState(false);
  const groups: SettingsGroup[] = ["general", "contact", "social", "seo"];

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const r = await adminApi("/admin/cms/settings");
      const d = await r.json();
      setSettings(d);
      const v: Record<string, string> = {};
      d.forEach((s: any) => { v[s.setting_key] = s.setting_value || ""; });
      setValues(v);
    } catch (e: any) { onError(e.message); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await adminApi("/admin/cms/settings", { method: "PATCH", body: JSON.stringify({ settings: values }) });
      if (!res.ok) throw new Error("Save failed");
      onSuccess("Settings saved successfully");
    } catch (e: any) { onError(e.message); }
    finally { setSaving(false); }
  }

  const grouped = settings.filter(s => s.group_key === activeGroup);

  return (
    <div className="flex gap-6">
      <div className="w-44 shrink-0">
        <div className="space-y-1">
          {groups.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${activeGroup === g ? "bg-amber-50 text-amber-700 font-medium border border-amber-200" : "text-gray-600 hover:bg-gray-50"}`}>
              {GROUP_ICONS[g]} {GROUP_LABELS[g].split(" ").slice(1).join(" ")}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h3 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">{GROUP_LABELS[activeGroup]}</h3>
          {grouped.map(s => (
            <div key={s.setting_key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{s.setting_label}</label>
              {s.setting_type === "textarea" ? (
                <textarea rows={3} value={values[s.setting_key] || ""} onChange={e => setValues(v => ({ ...v, [s.setting_key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              ) : s.setting_type === "color" ? (
                <div className="flex gap-3 items-center">
                  <input type="color" value={values[s.setting_key] || "#000000"} onChange={e => setValues(v => ({ ...v, [s.setting_key]: e.target.value }))}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer" />
                  <input type="text" value={values[s.setting_key] || ""} onChange={e => setValues(v => ({ ...v, [s.setting_key]: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              ) : (
                <input type={s.setting_type === "email" ? "email" : s.setting_type === "phone" ? "tel" : "text"}
                  value={values[s.setting_key] || ""} onChange={e => setValues(v => ({ ...v, [s.setting_key]: e.target.value }))}
                  placeholder={s.setting_type === "url" ? "https://..." : ""}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              )}
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100">
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
              {saving ? "Saving…" : "💾 Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SEO Panel ─────────────────────────────────────────────────────────────────
function SeoPanel({ onSuccess, onError }: { onSuccess: (m: string) => void; onError: (m: string) => void }) {
  const [pages, setPages] = useState<any[]>([]);
  const [activePage, setActivePage] = useState("home");
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPages(); }, []);
  useEffect(() => { if (pages.length) loadPage(activePage); }, [activePage, pages]);

  async function loadPages() {
    try { const r = await adminApi("/admin/cms/pages"); setPages(await r.json()); } catch {}
  }
  async function loadPage(key: string) {
    try { const r = await adminApi(`/admin/cms/pages/${key}`); setForm(await r.json()); } catch {}
  }
  async function handleSave() {
    setSaving(true);
    try {
      const res = await adminApi(`/admin/cms/pages/${activePage}`, { method: "PATCH", body: JSON.stringify({
        seo_title: form.seo_title, seo_description: form.seo_description, seo_keywords: form.seo_keywords,
        og_title: form.og_title, og_description: form.og_description, og_image_url: form.og_image_url, canonical_url: form.canonical_url,
      })});
      if (!res.ok) throw new Error("Save failed");
      onSuccess(`SEO saved for ${PAGE_LABELS[activePage] || activePage}`);
    } catch (e: any) { onError(e.message); }
    finally { setSaving(false); }
  }

  const seoScore = () => {
    let s = 0;
    if (form.seo_title?.length >= 30 && form.seo_title?.length <= 60) s += 25;
    if (form.seo_description?.length >= 120 && form.seo_description?.length <= 160) s += 25;
    if (form.seo_keywords) s += 15;
    if (form.og_title) s += 20;
    if (form.og_image_url) s += 15;
    return s;
  };
  const score = seoScore();
  const scoreColor = score >= 75 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-500";
  const scoreBar = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex gap-6">
      <div className="w-44 shrink-0 space-y-1">
        {pages.map(p => (
          <button key={p.page_key} onClick={() => setActivePage(p.page_key)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${activePage === p.page_key ? "bg-amber-50 text-amber-700 font-medium border border-amber-200" : "text-gray-600 hover:bg-gray-50"}`}>
            {PAGE_LABELS[p.page_key] || p.page_label}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-4">
        {/* SEO Score */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">SEO Score</span>
            <span className={`text-lg font-bold ${scoreColor}`}>{score}/100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`${scoreBar} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{score >= 75 ? "Great SEO!" : score >= 50 ? "Needs improvement" : "Poor SEO — fill in all fields"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Basic SEO</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title <span className="text-gray-400 font-normal">({form.seo_title?.length || 0}/60 chars)</span></label>
            <input value={form.seo_title || ""} onChange={e => setForm((f: any) => ({ ...f, seo_title: e.target.value }))}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${form.seo_title?.length > 60 ? "border-red-300" : "border-gray-300"}`} />
            {form.seo_title?.length > 60 && <p className="text-xs text-red-500 mt-1">Too long — Google truncates after 60 chars</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description <span className="text-gray-400 font-normal">({form.seo_description?.length || 0}/160 chars)</span></label>
            <textarea rows={3} value={form.seo_description || ""} onChange={e => setForm((f: any) => ({ ...f, seo_description: e.target.value }))}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${form.seo_description?.length > 160 ? "border-red-300" : "border-gray-300"}`} />
            {form.seo_description?.length > 160 && <p className="text-xs text-red-500 mt-1">Too long — aim for 120–160 chars</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keywords <span className="text-gray-400 font-normal">(comma separated)</span></label>
            <input value={form.seo_keywords || ""} onChange={e => setForm((f: any) => ({ ...f, seo_keywords: e.target.value }))}
              placeholder="real estate hyderabad, apartments, villas" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Canonical URL</label>
            <input value={form.canonical_url || ""} onChange={e => setForm((f: any) => ({ ...f, canonical_url: e.target.value }))}
              placeholder="https://janapriyaupscale.com/..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pt-2 border-t border-gray-100">Open Graph (Social Sharing)</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OG Title</label>
            <input value={form.og_title || ""} onChange={e => setForm((f: any) => ({ ...f, og_title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OG Description</label>
            <textarea rows={2} value={form.og_description || ""} onChange={e => setForm((f: any) => ({ ...f, og_description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OG Image URL</label>
            <input value={form.og_image_url || ""} onChange={e => setForm((f: any) => ({ ...f, og_image_url: e.target.value }))}
              placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            {form.og_image_url && <img src={form.og_image_url} alt="OG preview" className="mt-2 rounded border w-full max-h-32 object-cover" onError={e => (e.currentTarget.style.display = "none")} />}
          </div>
          {/* Preview */}
          {form.seo_title && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Google Preview</p>
              <p className="text-blue-600 text-sm font-medium truncate">{form.seo_title}</p>
              <p className="text-green-700 text-xs">janapriyaupscale.com › {activePage}</p>
              <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">{form.seo_description}</p>
            </div>
          )}
          <div className="pt-2 border-t border-gray-100">
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
              {saving ? "Saving…" : "💾 Save SEO"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sections Panel ─────────────────────────────────────────────────────────────
function SectionsPanel({ onSuccess, onError }: { onSuccess: (m: string) => void; onError: (m: string) => void }) {
  const [sections, setSections] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { const r = await adminApi("/admin/cms/sections"); setSections(await r.json()); } catch {}
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await adminApi(`/admin/cms/sections/${editing.section_key}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editing.title, subtitle: editing.subtitle, body: editing.body, cta_text: editing.cta_text, cta_url: editing.cta_url, extra_data: editing.extra_data, is_active: editing.is_active }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      setSections(prev => prev.map(s => s.section_key === updated.section_key ? updated : s));
      setEditing(null);
      onSuccess(`Section "${editing.section_label}" saved`);
    } catch (e: any) { onError(e.message); }
    finally { setSaving(false); }
  }

  const sectionsByPage: Record<string, any[]> = {};
  sections.forEach(s => { if (!sectionsByPage[s.page_key]) sectionsByPage[s.page_key] = []; sectionsByPage[s.page_key].push(s); });

  return (
    <div className="space-y-6">
      {Object.entries(sectionsByPage).map(([pageKey, pageSections]) => (
        <div key={pageKey} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">{PAGE_LABELS[pageKey] || pageKey}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {pageSections.map(s => (
              <div key={s.section_key} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 text-sm">{s.section_label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{s.is_active ? "Active" : "Hidden"}</span>
                  </div>
                  {s.title && <p className="text-xs text-gray-500 mt-0.5 truncate">{s.title}</p>}
                  {s.body && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1" dangerouslySetInnerHTML={{ __html: s.body.replace(/<[^>]+>/g, " ").substring(0, 80) + "…" }} />}
                </div>
                <button onClick={() => setEditing({ ...s })}
                  className="px-3 py-1.5 text-xs border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 shrink-0">✏️ Edit</button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {editing && <SectionEditModal section={editing} onChange={setEditing} onSave={handleSave} onClose={() => setEditing(null)} saving={saving} />}
    </div>
  );
}

// ── Section Edit Modal ────────────────────────────────────────────────────────
function SectionEditModal({ section, onChange, onSave, onClose, saving }: {
  section: any; onChange: (s: any) => void; onSave: () => void; onClose: () => void; saving: boolean;
}) {
  const editorRef = useRef<any>(null);
  const [quillReady, setQuillReady] = useState(false);
  const hasRichText = ["why_us", "about", "hero"].includes(section.section_key);
  const hasStats = section.section_key === "stats";
  const hasTestimonials = section.section_key === "testimonials";
  const hasPoints = section.extra_data?.points !== undefined;

  useEffect(() => {
    if (!hasRichText) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
    script.onload = () => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css";
      document.head.appendChild(link);
      setTimeout(() => {
        const el = document.getElementById("quill-editor");
        if (el && (window as any).Quill && !editorRef.current) {
          editorRef.current = new (window as any).Quill("#quill-editor", { theme: "snow", modules: { toolbar: [[{ header: [2, 3, false] }], ["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]] } });
          editorRef.current.root.innerHTML = section.body || "";
          editorRef.current.on("text-change", () => { onChange((s: any) => ({ ...s, body: editorRef.current.root.innerHTML })); });
          setQuillReady(true);
        }
      }, 100);
    };
    document.head.appendChild(script);
    return () => { editorRef.current = null; };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold">{section.section_label}</h2>
            <p className="text-xs text-gray-400 mt-0.5">page: {section.page_key} · key: {section.section_key}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={section.is_active} onChange={e => onChange({ ...section, is_active: e.target.checked })} className="accent-amber-500" />
              <span>Active</span>
            </label>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Core fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={section.title || ""} onChange={e => onChange({ ...section, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <input value={section.subtitle || ""} onChange={e => onChange({ ...section, subtitle: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          {hasRichText && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Content (Rich Text)</label>
              <div id="quill-editor" className="border border-gray-300 rounded-lg min-h-32 bg-white" />
              {!quillReady && <p className="text-xs text-gray-400 mt-1 animate-pulse">Loading editor…</p>}
            </div>
          )}
          {!hasRichText && !hasStats && !hasTestimonials && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea rows={4} value={section.body || ""} onChange={e => onChange({ ...section, body: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
              <input value={section.cta_text || ""} onChange={e => onChange({ ...section, cta_text: e.target.value })}
                placeholder="Explore Projects" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA URL</label>
              <input value={section.cta_url || ""} onChange={e => onChange({ ...section, cta_url: e.target.value })}
                placeholder="/projects" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>

          {/* Stats editor */}
          {hasStats && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stats</label>
              <div className="space-y-2">
                {(section.extra_data?.stats || []).map((stat: any, i: number) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={stat.value} onChange={e => { const s = [...section.extra_data.stats]; s[i] = { ...s[i], value: e.target.value }; onChange({ ...section, extra_data: { ...section.extra_data, stats: s } }); }}
                      placeholder="50+" className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <input value={stat.label} onChange={e => { const s = [...section.extra_data.stats]; s[i] = { ...s[i], label: e.target.value }; onChange({ ...section, extra_data: { ...section.extra_data, stats: s } }); }}
                      placeholder="Projects Delivered" className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <button onClick={() => { const s = section.extra_data.stats.filter((_: any, idx: number) => idx !== i); onChange({ ...section, extra_data: { ...section.extra_data, stats: s } }); }}
                      className="text-red-400 hover:text-red-600 text-sm px-2">✕</button>
                  </div>
                ))}
                <button onClick={() => { const s = [...(section.extra_data?.stats || []), { label: "", value: "" }]; onChange({ ...section, extra_data: { ...section.extra_data, stats: s } }); }}
                  className="text-sm text-amber-600 hover:text-amber-700">+ Add Stat</button>
              </div>
            </div>
          )}

          {/* Points editor (Why Us) */}
          {hasPoints && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Key Points</label>
              <div className="space-y-2">
                {(section.extra_data?.points || []).map((point: string, i: number) => (
                  <div key={i} className="flex gap-2">
                    <input value={point} onChange={e => { const p = [...section.extra_data.points]; p[i] = e.target.value; onChange({ ...section, extra_data: { ...section.extra_data, points: p } }); }}
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <button onClick={() => { const p = section.extra_data.points.filter((_: any, idx: number) => idx !== i); onChange({ ...section, extra_data: { ...section.extra_data, points: p } }); }}
                      className="text-red-400 hover:text-red-600 px-2">✕</button>
                  </div>
                ))}
                <button onClick={() => { const p = [...(section.extra_data?.points || []), ""]; onChange({ ...section, extra_data: { ...section.extra_data, points: p } }); }}
                  className="text-sm text-amber-600 hover:text-amber-700">+ Add Point</button>
              </div>
            </div>
          )}

          {/* Testimonials editor */}
          {hasTestimonials && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Testimonials</label>
              <div className="space-y-3">
                {(section.extra_data?.items || []).map((item: any, i: number) => (
                  <div key={i} className="p-3 border border-gray-200 rounded-lg space-y-2 bg-gray-50">
                    <div className="flex gap-2">
                      <input value={item.name} onChange={e => { const it = [...section.extra_data.items]; it[i] = { ...it[i], name: e.target.value }; onChange({ ...section, extra_data: { ...section.extra_data, items: it } }); }}
                        placeholder="Customer Name" className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none" />
                      <input value={item.role} onChange={e => { const it = [...section.extra_data.items]; it[i] = { ...it[i], role: e.target.value }; onChange({ ...section, extra_data: { ...section.extra_data, items: it } }); }}
                        placeholder="Role / Designation" className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none" />
                      <select value={item.rating} onChange={e => { const it = [...section.extra_data.items]; it[i] = { ...it[i], rating: Number(e.target.value) }; onChange({ ...section, extra_data: { ...section.extra_data, items: it } }); }}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                        {[5,4,3,2,1].map(r => <option key={r} value={r}>{r}★</option>)}
                      </select>
                    </div>
                    <textarea rows={2} value={item.text} onChange={e => { const it = [...section.extra_data.items]; it[i] = { ...it[i], text: e.target.value }; onChange({ ...section, extra_data: { ...section.extra_data, items: it } }); }}
                      placeholder="Testimonial text…" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none" />
                    <button onClick={() => { const it = section.extra_data.items.filter((_: any, idx: number) => idx !== i); onChange({ ...section, extra_data: { ...section.extra_data, items: it } }); }}
                      className="text-xs text-red-500 hover:text-red-700">✕ Remove</button>
                  </div>
                ))}
                <button onClick={() => { const it = [...(section.extra_data?.items || []), { name: "", role: "", text: "", rating: 5 }]; onChange({ ...section, extra_data: { ...section.extra_data, items: it } }); }}
                  className="text-sm text-amber-600 hover:text-amber-700">+ Add Testimonial</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button>
          <button onClick={onSave} disabled={saving} className="px-5 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium">
            {saving ? "Saving…" : "💾 Save Section"}
          </button>
        </div>
      </div>
    </div>
  );
}
