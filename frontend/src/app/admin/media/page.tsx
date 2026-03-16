"use client";
import { useState, useEffect, useRef } from "react";
import { adminApi } from "@/lib/adminAuth";

const API = "http://173.168.0.81:8000/api/v1";

const ENTITIES = [
  { key: "project", label: "Projects" },
  { key: "tower",   label: "Towers"   },
  { key: "unit",    label: "Units"    },
];

const MEDIA_TYPES: Record<string, { key: string; label: string; multi: boolean; accept: string }[]> = {
  project: [
    { key: "images",          label: "Photos",           multi: true,  accept: "image/*" },
    { key: "floor_plans",     label: "Floor Plans",      multi: true,  accept: "image/*,application/pdf" },
    { key: "video_url",       label: "Video URL",        multi: false, accept: "" },
    { key: "walkthrough_url", label: "Walkthrough URL",  multi: false, accept: "" },
    { key: "brochure_url",    label: "Brochure (PDF)",   multi: false, accept: "application/pdf" },
  ],
  tower: [
    { key: "images",          label: "Photos",           multi: true,  accept: "image/*" },
    { key: "floor_plans",     label: "Floor Plans",      multi: true,  accept: "image/*,application/pdf" },
    { key: "video_url",       label: "Video URL",        multi: false, accept: "" },
    { key: "walkthrough_url", label: "Walkthrough URL",  multi: false, accept: "" },
    { key: "brochure_url",    label: "Brochure (PDF)",   multi: false, accept: "application/pdf" },
  ],
  unit: [
    { key: "images",          label: "Photos",           multi: true,  accept: "image/*" },
    { key: "floor_plan_img",  label: "Floor Plan Image", multi: false, accept: "image/*" },
    { key: "floor_plans",     label: "Floor Plans",      multi: true,  accept: "image/*,application/pdf" },
    { key: "video_url",       label: "Video URL",        multi: false, accept: "" },
    { key: "walkthrough_url", label: "Walkthrough URL",  multi: false, accept: "" },
    { key: "brochure_url",    label: "Brochure (PDF)",   multi: false, accept: "application/pdf" },
  ],
};

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
}
function isPdfUrl(url: string) {
  return /\.pdf$/i.test(url);
}

export default function MediaManagerPage() {
  const [entity, setEntity] = useState("project");
  const [records, setRecords] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  // Fetch records for selected entity
  useEffect(() => {
    setSelectedId(""); setSelectedRecord(null);
    const endpoints: Record<string, string> = {
      project: "/admin/projects/list?page_size=100",
      tower:   "/admin/towers/list?page_size=100",
      unit:    "/admin/units/all?page_size=100",
    };
    adminApi(endpoints[entity]).then(r => r.json()).then(d => setRecords(d.items || []));
  }, [entity]);

  // Load selected record
  useEffect(() => {
    if (!selectedId) { setSelectedRecord(null); return; }
    const endpoints: Record<string, string> = {
      project: `/admin/projects/${selectedId}`,
      tower:   `/admin/towers/${selectedId}`,
      unit:    `/admin/units/${selectedId}`,
    };
    adminApi(endpoints[entity]).then(r => r.json()).then(d => setSelectedRecord(d));
  }, [selectedId, entity]);

  async function uploadFile(mediaType: string, file: File) {
    setUploading(mediaType);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("entity", entity);
      form.append("entity_id", selectedId);
      form.append("media_type", mediaType);
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API}/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(`Upload failed: ${err.detail || "Unknown error"}`);
        return;
      }
      showToast("✅ Uploaded successfully");
      // Reload record
      const endpoints: Record<string, string> = {
        project: `/admin/projects/${selectedId}`,
        tower:   `/admin/towers/${selectedId}`,
        unit:    `/admin/units/${selectedId}`,
      };
      const updated = await adminApi(endpoints[entity]).then(r => r.json());
      setSelectedRecord(updated);
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    }
    setUploading(null);
  }

  async function saveUrl(mediaType: string) {
    const url = urlInputs[mediaType]?.trim();
    if (!url) return;
    setUploading(mediaType);
    const endpoints: Record<string, string> = {
      project: `/admin/projects/${selectedId}`,
      tower:   `/admin/towers/${selectedId}`,
      unit:    `/admin/units/${selectedId}`,
    };
    await adminApi(endpoints[entity], {
      method: "PATCH",
      body: JSON.stringify({ [mediaType]: url }),
    });
    setUrlInputs(p => ({ ...p, [mediaType]: "" }));
    const updated = await adminApi(endpoints[entity]).then(r => r.json());
    setSelectedRecord(updated);
    showToast("✅ URL saved");
    setUploading(null);
  }

  async function deleteMedia(mediaType: string, url: string) {
    if (!confirm("Delete this media?")) return;
    const token = localStorage.getItem("admin_token");
    await fetch(`${API}/admin/upload?entity=${entity}&entity_id=${selectedId}&media_type=${mediaType}&url=${encodeURIComponent(url)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const endpoints: Record<string, string> = {
      project: `/admin/projects/${selectedId}`,
      tower:   `/admin/towers/${selectedId}`,
      unit:    `/admin/units/${selectedId}`,
    };
    const updated = await adminApi(endpoints[entity]).then(r => r.json());
    setSelectedRecord(updated);
    showToast("🗑️ Deleted");
  }

  const mediaTypes = MEDIA_TYPES[entity] || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Media Manager</h1>
          <p className="text-gray-400 text-sm mt-1">Upload photos, floor plans, videos & walkthroughs</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-lg"
          style={{ background: toast.includes("✅") ? "#16A34A" : "#DC2626", color: "white" }}>
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left: Entity + Record selector */}
        <div className="lg:col-span-1 space-y-4">
          {/* Entity type */}
          <div className="rounded-2xl p-4" style={{ background: "#1a1a2e", border: "1px solid #2a2a4a" }}>
            <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">Entity Type</p>
            {ENTITIES.map(e => (
              <button key={e.key} onClick={() => setEntity(e.key)}
                className="w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm font-bold transition-all"
                style={entity === e.key
                  ? { background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white" }
                  : { color: "#888", background: "transparent" }}>
                {e.label}
              </button>
            ))}
          </div>

          {/* Record selector */}
          <div className="rounded-2xl p-4" style={{ background: "#1a1a2e", border: "1px solid #2a2a4a" }}>
            <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">Select Record</p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {records.map(r => (
                <button key={r.id} onClick={() => setSelectedId(r.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium truncate transition-all"
                  style={selectedId === r.id
                    ? { background: "rgba(41,169,223,0.2)", color: "#29A9DF", border: "1px solid rgba(41,169,223,0.3)" }
                    : { color: "#aaa", border: "1px solid transparent" }}>
                  {r.name || r.unit_number || r.id.slice(0, 8)}
                </button>
              ))}
              {records.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No records</p>}
            </div>
          </div>
        </div>

        {/* Right: Media panels */}
        <div className="lg:col-span-3">
          {!selectedId ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: "#1a1a2e", border: "1px solid #2a2a4a" }}>
              <p className="text-4xl mb-3">🖼️</p>
              <p className="text-gray-400 font-bold">Select a record to manage its media</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mediaTypes.map(mt => {
                const isUrl = !mt.accept || mt.key.endsWith("_url");
                const currentVal = selectedRecord?.[mt.key];
                const items: string[] = mt.multi
                  ? (Array.isArray(currentVal) ? currentVal : [])
                  : (currentVal ? [currentVal] : []);

                return (
                  <div key={mt.key} className="rounded-2xl p-5" style={{ background: "#1a1a2e", border: "1px solid #2a2a4a" }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-white text-sm">{mt.label}</h3>
                      <span className="text-xs text-gray-500">{items.length} {mt.multi ? "files" : "set"}</span>
                    </div>

                    {/* URL input (for video_url, walkthrough_url) */}
                    {isUrl && (
                      <div className="flex gap-2 mb-4">
                        <input
                          type="url"
                          placeholder={`Enter ${mt.label} URL (YouTube, Matterport, etc.)`}
                          value={urlInputs[mt.key] || ""}
                          onChange={e => setUrlInputs(p => ({ ...p, [mt.key]: e.target.value }))}
                          className="flex-1 px-3 py-2 text-sm rounded-xl text-white"
                          style={{ background: "#0d0d1a", border: "1px solid #333" }}
                        />
                        <button onClick={() => saveUrl(mt.key)} disabled={uploading === mt.key}
                          className="px-4 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                          {uploading === mt.key ? "Saving…" : "Save"}
                        </button>
                      </div>
                    )}

                    {/* File upload area */}
                    {!isUrl && (
                      <div
                        className="border-2 border-dashed rounded-xl p-6 text-center mb-4 cursor-pointer transition-all hover:border-blue-400"
                        style={{ borderColor: "#333" }}
                        onClick={() => fileRefs.current[mt.key]?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                          e.preventDefault();
                          const files = Array.from(e.dataTransfer.files);
                          files.forEach(f => uploadFile(mt.key, f));
                        }}>
                        <input
                          type="file"
                          ref={el => { fileRefs.current[mt.key] = el; }}
                          className="hidden"
                          accept={mt.accept}
                          multiple={mt.multi}
                          onChange={e => {
                            Array.from(e.target.files || []).forEach(f => uploadFile(mt.key, f));
                            e.target.value = "";
                          }}
                        />
                        {uploading === mt.key ? (
                          <p className="text-blue-400 text-sm font-bold">Uploading…</p>
                        ) : (
                          <>
                            <p className="text-2xl mb-2">📁</p>
                            <p className="text-gray-400 text-sm">Click or drag & drop</p>
                            <p className="text-gray-600 text-xs mt-1">{mt.accept.replace(/\*/g, "all")}</p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Preview existing items */}
                    {items.length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {items.map((url, i) => (
                          <div key={i} className="relative group rounded-xl overflow-hidden"
                            style={{ background: "#0d0d1a", border: "1px solid #333" }}>
                            {isImageUrl(url) ? (
                              <img src={url.startsWith("/media") ? `http://173.168.0.81:8000${url}` : url}
                                alt="" className="w-full h-24 object-cover" />
                            ) : isPdfUrl(url) ? (
                              <div className="w-full h-24 flex items-center justify-center">
                                <span className="text-3xl">📄</span>
                              </div>
                            ) : (
                              <div className="w-full h-24 flex flex-col items-center justify-center gap-1">
                                <span className="text-2xl">🎥</span>
                                <p className="text-xs text-gray-500 truncate w-full px-2 text-center">{url.substring(0, 30)}...</p>
                              </div>
                            )}
                            {/* Delete button */}
                            <button
                              onClick={() => deleteMedia(mt.key, url)}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: "rgba(220,38,38,0.9)", color: "white" }}>
                              ✕
                            </button>
                            {/* Open link */}
                            <a href={url.startsWith("/media") ? `http://173.168.0.81:8000${url}` : url}
                              target="_blank" rel="noopener noreferrer"
                              className="absolute bottom-1 left-1 px-2 py-0.5 rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: "rgba(42,56,135,0.9)", color: "white" }}>
                              Open
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {items.length === 0 && !isUrl && (
                      <p className="text-center text-gray-600 text-xs py-2">No {mt.label.toLowerCase()} uploaded yet</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
