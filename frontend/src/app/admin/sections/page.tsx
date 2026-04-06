"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/adminAuth";

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
  const [customFields, setCustomFields] = useState<{ key: string; label: string; type: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    adminApi(`/admin/sections/${entity}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setSections(Array.isArray(d) ? d : []));

    // Fetch custom fields for this entity
    adminApi(`/admin/fields/${entity}`)
      .then(r => r.ok ? r.json() : [])
      .then((configs: any[]) => {
        if (!Array.isArray(configs)) return;
        setCustomFields(
          configs
            .filter((c: any) => c.is_custom && c.is_visible)
            .map((c: any) => ({ key: c.field_key, label: c.label, type: c.field_type }))
        );
      })
      .catch(() => setCustomFields([]));
  }, [entity]);

  async function save() {
    setSaving(true);
    try {
      const r = await adminApi(`/admin/sections/${entity}`, {
        method: "POST",
        body: JSON.stringify(sections),
      });
      if (r.ok) {
        showToast("✅ Section config saved");
      } else {
        const err = await r.json().catch(() => ({}));
        showToast(`❌ Save failed: ${err.detail || r.statusText}`);
      }
    } catch (e) {
      showToast("❌ Network error — could not save");
    }
    setSaving(false);
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

  // Merge hardcoded schema fields with custom fields (avoid duplicates by key)
  const schemaFields = ALL_FIELDS[entity] || [];
  const schemaKeys = new Set(schemaFields.map(f => f.key));
  const allFields = [
    ...schemaFields,
    ...customFields.filter(f => !schemaKeys.has(f.key)),
  ];
  const usedFields = new Set(sections.flatMap(s => s.fields || []));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#273b84]">Section Builder</h1>
          <p className="text-gray-500 text-sm mt-1">Choose which fields appear on each detail page section</p>
        </div>
        <button onClick={save} disabled={saving}
          className="px-5 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50"
          style={{ background: "#273b84" }}>
          {saving ? "Saving…" : "💾 Save Config"}
        </button>
      </div>

      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-lg"
          style={{ background: toast.startsWith("❌") ? "#DC2626" : "#16A34A", color: "white" }}>{toast}</div>
      )}

      {/* Entity tabs */}
      <div className="flex gap-2">
        {ENTITIES.map(e => (
          <button key={e} onClick={() => setEntity(e)}
            className="px-5 py-2 text-sm font-bold rounded-xl capitalize transition-all"
            style={entity === e
              ? { background: "#273b84", color: "white" }
              : { background: "#fff", color: "#64748b", border: "1px solid #e4e9f2" }}>
            {e}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Available fields */}
        <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid #e4e9f2" }}>
          <h3 className="font-bold text-[#273b84] text-sm mb-4">Available Fields</h3>
          <div className="space-y-1.5">
            {allFields.map(f => {
              const used = usedFields.has(f.key);
              return (
                <div key={f.key} className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{
                    background: used ? "#eef1fb" : "#f8f9fd",
                    border: used ? "1px solid #d1d9f0" : "1px solid #e4e9f2"
                  }}>
                  <div>
                    <p className="text-xs font-bold" style={{ color: used ? "#273b84" : "#1e293b" }}>{f.label}</p>
                    <p className="text-xs text-gray-400">{f.key}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">
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
            <div key={section.key} className="bg-white rounded-2xl p-5 transition-all"
              style={{ border: "1px solid #e4e9f2", opacity: section.visible ? 1 : 0.6 }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveSection(idx, -1)} className="text-gray-400 hover:text-[#273b84] text-xs leading-none">▲</button>
                    <button onClick={() => moveSection(idx, 1)} className="text-gray-400 hover:text-[#273b84] text-xs leading-none">▼</button>
                  </div>
                  <div>
                    <h4 className="font-black text-[#273b84] text-sm">{section.label}</h4>
                    <p className="text-xs text-gray-400">{section.key} · {(section.fields||[]).length} fields</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleSection(section.key)}
                    className="px-3 py-1 text-xs font-bold rounded-lg transition-all"
                    style={section.visible
                      ? { background: "#dcfce7", color: "#16A34A" }
                      : { background: "#f1f5f9", color: "#64748b" }}>
                    {section.visible ? "Visible" : "Hidden"}
                  </button>
                  <button onClick={() => removeSection(section.key)}
                    className="px-2 py-1 text-xs rounded-lg"
                    style={{ background: "#fee2e2", color: "#DC2626" }}>✕</button>
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
                        ? { background: "#eef1fb", color: "#273b84", border: "1px solid #d1d9f0" }
                        : { background: "#f8f9fd", color: "#64748b", border: "1px solid #e4e9f2" }}>
                      <span className="mr-1">{active ? "✓" : "+"}</span>{f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Add new section */}
          <div className="bg-white rounded-2xl p-4 flex gap-3" style={{ border: "1px dashed #d1d9f0" }}>
            <input type="text" placeholder="New section name…"
              value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addSection()}
              className="flex-1 px-3 py-2 text-sm rounded-xl text-gray-900 bg-white"
              style={{ border: "1px solid #d1d9f0" }} />
            <button onClick={addSection}
              className="px-4 py-2 text-xs font-bold text-white rounded-xl"
              style={{ background: "#273b84" }}>
              + Add Section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
