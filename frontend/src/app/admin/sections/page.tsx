"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/adminAuth";

const API = "http://173.168.0.81:8000/api/v1";
const ENTITIES = ["project", "tower", "unit"];

const ALL_FIELDS: Record<string, { key: string; label: string; type: string }[]> = {
  project: [
    { key: "name",            label: "Project Name",     type: "text"    },
    { key: "description",     label: "Description",      type: "text"    },
    { key: "location",        label: "Location",         type: "text"    },
    { key: "address",         label: "Address",          type: "text"    },
    { key: "city",            label: "City",             type: "text"    },
    { key: "state",           label: "State",            type: "text"    },
    { key: "pincode",         label: "Pincode",          type: "text"    },
    { key: "rera_number",     label: "RERA Number",      type: "text"    },
    { key: "amenities",       label: "Amenities",        type: "list"    },
    { key: "images",          label: "Photo Gallery",    type: "images"  },
    { key: "floor_plans",     label: "Floor Plans",      type: "images"  },
    { key: "video_url",       label: "Video",            type: "video"   },
    { key: "walkthrough_url", label: "Walkthrough",      type: "video"   },
    { key: "brochure_url",    label: "Brochure",         type: "pdf"     },
    { key: "lat",             label: "Map Location",     type: "map"     },
  ],
  tower: [
    { key: "name",            label: "Tower Name",       type: "text"    },
    { key: "description",     label: "Description",      type: "text"    },
    { key: "total_floors",    label: "Total Floors",     type: "number"  },
    { key: "total_units",     label: "Total Units",      type: "number"  },
    { key: "images",          label: "Photo Gallery",    type: "images"  },
    { key: "floor_plans",     label: "Floor Plans",      type: "images"  },
    { key: "svg_floor_plan",  label: "SVG Floor Plan",   type: "svg"     },
    { key: "video_url",       label: "Video",            type: "video"   },
    { key: "walkthrough_url", label: "Walkthrough",      type: "video"   },
  ],
  unit: [
    { key: "unit_type",       label: "Unit Type",        type: "text"    },
    { key: "bedrooms",        label: "Bedrooms",         type: "number"  },
    { key: "bathrooms",       label: "Bathrooms",        type: "number"  },
    { key: "balconies",       label: "Balconies",        type: "number"  },
    { key: "area_sqft",       label: "Area (sqft)",      type: "number"  },
    { key: "carpet_area",     label: "Carpet Area",      type: "number"  },
    { key: "base_price",      label: "Price",            type: "currency"},
    { key: "price_per_sqft",  label: "Price/sqft",       type: "currency"},
    { key: "down_payment",    label: "Down Payment",     type: "currency"},
    { key: "emi_estimate",    label: "EMI Estimate",     type: "currency"},
    { key: "floor_number",    label: "Floor",            type: "number"  },
    { key: "facing",          label: "Facing",           type: "text"    },
    { key: "status",          label: "Status",           type: "badge"   },
    { key: "amenities",       label: "Amenities",        type: "list"    },
    { key: "images",          label: "Photo Gallery",    type: "images"  },
    { key: "floor_plan_img",  label: "Floor Plan Image", type: "image"   },
    { key: "floor_plans",     label: "Floor Plans",      type: "images"  },
    { key: "video_url",       label: "Video",            type: "video"   },
    { key: "walkthrough_url", label: "Walkthrough",      type: "video"   },
  ],
};

export default function SectionsPage() {
  const [entity, setEntity] = useState("project");
  const [sections, setSections] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch(`${API}/admin/sections/${entity}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setSections(Array.isArray(d) ? d : []));
  }, [entity]);

  async function save() {
    setSaving(true);
    const token = localStorage.getItem("admin_token");
    await fetch(`${API}/admin/sections/${entity}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(sections),
    });
    setSaving(false);
    showToast("✅ Section config saved");
  }

  function toggleField(sectionKey: string, fieldKey: string) {
    setSections(prev => prev.map(s => {
      if (s.key !== sectionKey) return s;
      const fields: string[] = s.fields || [];
      return { ...s, fields: fields.includes(fieldKey) ? fields.filter((f: string) => f !== fieldKey) : [...fields, fieldKey] };
    }));
  }

  function toggleSection(sectionKey: string) {
    setSections(prev => prev.map(s => s.key === sectionKey ? { ...s, visible: !s.visible } : s));
  }

  function addSection() {
    if (!newSectionName.trim()) return;
    const key = newSectionName.toLowerCase().replace(/\s+/g, "_");
    setSections(prev => [...prev, { key, label: newSectionName, visible: true, fields: [] }]);
    setNewSectionName("");
  }

  function removeSection(key: string) {
    setSections(prev => prev.filter(s => s.key !== key));
  }

  function moveSection(idx: number, dir: -1 | 1) {
    setSections(prev => {
      const arr = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return arr;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return arr;
    });
  }

  const allFields = ALL_FIELDS[entity] || [];
  const usedFields = new Set(sections.flatMap(s => s.fields || []));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Section Builder</h1>
          <p className="text-gray-400 text-sm mt-1">Choose which fields appear on each detail page section</p>
        </div>
        <button onClick={save} disabled={saving}
          className="px-5 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
          {saving ? "Saving…" : "💾 Save Config"}
        </button>
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-lg"
          style={{ background: "#16A34A", color: "white" }}>{toast}</div>
      )}

      {/* Entity tabs */}
      <div className="flex gap-2">
        {ENTITIES.map(e => (
          <button key={e} onClick={() => setEntity(e)}
            className="px-5 py-2 text-sm font-bold rounded-xl capitalize transition-all"
            style={entity === e
              ? { background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white" }
              : { background: "#1a1a2e", color: "#888", border: "1px solid #333" }}>
            {e}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Available fields */}
        <div className="rounded-2xl p-5" style={{ background: "#1a1a2e", border: "1px solid #2a2a4a" }}>
          <h3 className="font-bold text-white text-sm mb-4">Available Fields</h3>
          <div className="space-y-1.5">
            {allFields.map(f => {
              const used = usedFields.has(f.key);
              return (
                <div key={f.key} className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ background: used ? "rgba(41,169,223,0.1)" : "#0d0d1a", border: used ? "1px solid rgba(41,169,223,0.3)" : "1px solid #222" }}>
                  <div>
                    <p className="text-xs font-bold" style={{ color: used ? "#29A9DF" : "#ccc" }}>{f.label}</p>
                    <p className="text-xs" style={{ color: "#555" }}>{f.key}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#1a1a2e", color: "#666" }}>
                    {f.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Sections config */}
        <div className="lg:col-span-2 space-y-4">
          {sections.map((section, idx) => (
            <div key={section.key} className="rounded-2xl p-5 transition-all"
              style={{ background: "#1a1a2e", border: section.visible ? "1px solid #2a2a4a" : "1px solid #1a1a1a", opacity: section.visible ? 1 : 0.5 }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Move up/down */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveSection(idx, -1)} className="text-gray-600 hover:text-white text-xs leading-none">▲</button>
                    <button onClick={() => moveSection(idx, 1)} className="text-gray-600 hover:text-white text-xs leading-none">▼</button>
                  </div>
                  <div>
                    <h4 className="font-black text-white text-sm">{section.label}</h4>
                    <p className="text-xs text-gray-500">{section.key} · {(section.fields||[]).length} fields</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleSection(section.key)}
                    className="px-3 py-1 text-xs font-bold rounded-lg transition-all"
                    style={section.visible
                      ? { background: "rgba(22,163,74,0.2)", color: "#16A34A" }
                      : { background: "rgba(107,114,128,0.2)", color: "#666" }}>
                    {section.visible ? "Visible" : "Hidden"}
                  </button>
                  <button onClick={() => removeSection(section.key)}
                    className="px-2 py-1 text-xs rounded-lg"
                    style={{ background: "rgba(220,38,38,0.15)", color: "#DC2626" }}>✕</button>
                </div>
              </div>

              {/* Field checkboxes */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {allFields.map(f => {
                  const active = (section.fields || []).includes(f.key);
                  return (
                    <button key={f.key} onClick={() => toggleField(section.key, f.key)}
                      className="text-left px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={active
                        ? { background: "rgba(41,169,223,0.2)", color: "#29A9DF", border: "1px solid rgba(41,169,223,0.4)" }
                        : { background: "#0d0d1a", color: "#666", border: "1px solid #222" }}>
                      <span className="mr-1">{active ? "✓" : "+"}</span>{f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Add new section */}
          <div className="rounded-2xl p-4 flex gap-3" style={{ background: "#1a1a2e", border: "1px dashed #2a2a4a" }}>
            <input type="text" placeholder="New section name…"
              value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addSection()}
              className="flex-1 px-3 py-2 text-sm rounded-xl text-white"
              style={{ background: "#0d0d1a", border: "1px solid #333" }} />
            <button onClick={addSection}
              className="px-4 py-2 text-xs font-bold text-white rounded-xl"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
              + Add Section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
