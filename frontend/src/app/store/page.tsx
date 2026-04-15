"use client";
import AddToCartBtn from '@/components/AddToCartBtn';
import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";
import CompareBar from "@/components/CompareBar";
import { isSaved, toggleSaved, isInCompare, toggleCompare } from "@/lib/savedProperties";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://173.168.0.81/api/v1";

function formatPrice(p: any) {
  if (!p) return "Price on request";
  const n = parseFloat(p);
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(0)} L`;
  return `₹${n.toLocaleString()}`;
}

// ── Unit Card ────────────────────────────────────────────────────────────────
function UnitCard({ unit, isTrending, onCompareChange }: { unit: any; isTrending?: boolean; onCompareChange: () => void }) {
  const [saved, setSaved] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => { setSaved(isSaved(unit.id)); setInCompare(isInCompare(unit.id)); }, [unit.id]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  function handleSave(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setSaved(toggleSaved(unit.id));
    showToast(isSaved(unit.id) ? "Saved ❤️" : "Removed");
    window.dispatchEvent(new Event("jp_saved_update"));
  }
  function handleCompare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const r = toggleCompare(unit.id);
    if (r.error) { showToast(r.error); return; }
    setInCompare(r.added);
    showToast(r.added ? "Added to compare ⇄" : "Removed");
    window.dispatchEvent(new Event("jp_compare_update"));
    onCompareChange();
  }
  function fallbackCopy(text: string) {
    if (navigator.clipboard) { navigator.clipboard.writeText(text).then(() => showToast("Link copied! 📋")).catch(() => showToast("Could not copy")); return; }
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast("Link copied! 📋");
  }
  function handleShare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}/units/${unit.id}`;
    const text = `${unit.unit_number} — ${unit.unit_type}, ${formatPrice(unit.base_price)} | Janapriya Upscale`;
    if (navigator.share) navigator.share({ title: "Janapriya Upscale", text, url }).catch(() => {});
    else { fallbackCopy(`${text}\n${url}`); }
  }
  const statusColor = unit.status === "available" ? "#22c55e" : unit.status === "booked" ? "#ef4444" : "#f59e0b";
  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1"
      style={{ boxShadow: "0 4px 20px rgba(42,56,135,0.08)", border: "1.5px solid #E2F1FC" }}>
      <div className="h-44 relative flex flex-col justify-between p-4"
        style={{ background: "linear-gradient(135deg,#2A3887 0%,#29A9DF 100%)" }}>
        <div className="flex justify-between items-center">
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white" style={{ color: statusColor }}>
            ● {(unit.status||"available").charAt(0).toUpperCase()+(unit.status||"available").slice(1)}
          </span>
          <div className="flex gap-1.5">
            {[
              { fn: handleSave, icon: saved?"♥":"♡", bg: saved?"rgba(239,68,68,0.9)":"rgba(255,255,255,0.2)" },
              { fn: handleCompare, icon: "⇄", bg: inCompare?"rgba(245,158,11,0.85)":"rgba(255,255,255,0.2)" },
              { fn: handleShare, icon: "↗", bg: "rgba(255,255,255,0.2)" },
            ].map((btn,i) => (
              <button key={i} onClick={btn.fn}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm transition-all hover:scale-110"
                style={{ background: btn.bg }}>{btn.icon}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.65)" }}>
              {unit.unit_type}{unit.bedrooms ? ` · ${unit.bedrooms} BHK` : ""}
            </p>
            {isTrending && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background:"rgba(245,158,11,0.9)",color:"white" }}>🔥</span>}
          </div>
          <h3 className="text-white font-black text-lg leading-tight">{unit.unit_number||"Unit"}</h3>
        </div>
        {toast && (
          <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-center"
            style={{ color: "#2A3887" }}>{toast}</div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { icon: "🛏", val: unit.bedrooms||"—", label: "BHK" },
            { icon: "📐", val: unit.area_sqft ? `${parseFloat(unit.area_sqft).toFixed(0)}` : "—", label: "sqft" },
            { icon: "🏢", val: unit.floor_number??  "—", label: "Floor" },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-2 text-center" style={{ background: "#F8F9FB" }}>
              <div className="text-base">{s.icon}</div>
              <div className="font-black text-sm" style={{ color: "#2A3887" }}>{s.val}</div>
              <div className="text-xs" style={{ color: "#999" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {unit.bathrooms && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background:"#F0F4FF",color:"#2A3887" }}>🚿 {unit.bathrooms} Bath</span>}
          {unit.facing && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background:"#F0F4FF",color:"#2A3887" }}>🧭 {unit.facing}</span>}
          {unit.balconies > 0 && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background:"#F0F4FF",color:"#2A3887" }}>🏡 {unit.balconies} Balc</span>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop:"1px solid #F0F4FF" }}>
          <div>
            <div className="font-black text-lg" style={{ color: "#2A3887" }}>{formatPrice(unit.base_price)}</div>
            {unit.area_sqft && unit.base_price && (
              <div className="text-xs" style={{ color: "#999" }}>
                ₹{Math.round(parseFloat(unit.base_price)/parseFloat(unit.area_sqft)).toLocaleString()}/sqft
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <div onClick={e=>{e.preventDefault();e.stopPropagation();}}>
              <AddToCartBtn unitId={unit.id} status={unit.status} size="sm" />
            </div>
            <Link href={`/contact?unit=${unit.id}`}
              className="px-3 py-1.5 text-xs font-bold rounded-xl"
              style={{ border:"1.5px solid #2A3887",color:"#2A3887" }}>Enquire</Link>
            <Link href={`/units/${unit.id}`}
              className="px-3 py-1.5 text-xs font-bold text-white rounded-xl"
              style={{ background:"linear-gradient(135deg,#2A3887,#29A9DF)" }}>Details →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Range Slider ─────────────────────────────────────────────────────────────
function RangeSlider({ label, min, max, value, onChange, format }: {
  label: string; min: number; max: number; value: [number,number];
  onChange: (v:[number,number])=>void; format: (n:number)=>string;
}) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-black" style={{ color:"#2A3887" }}>{label}</span>
        <span className="text-xs font-bold" style={{ color:"#29A9DF" }}>{format(value[0])} – {format(value[1])}</span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute w-full h-1.5 rounded-full" style={{ background:"#E2F1FC" }} />
        <div className="absolute h-1.5 rounded-full" style={{
          background:"linear-gradient(90deg,#2A3887,#29A9DF)",
          left:`${((value[0]-min)/(max-min))*100}%`,
          right:`${100-((value[1]-min)/(max-min))*100}%`
        }} />
        {[0,1].map(idx => (
          <input key={idx} type="range" min={min} max={max}
            value={value[idx]}
            onChange={e => {
              const v = parseInt(e.target.value);
              const next:[number,number] = [...value] as [number,number];
              if (idx===0) next[0] = Math.min(v, value[1]-1);
              else next[1] = Math.max(v, value[0]+1);
              onChange(next);
            }}
            className="absolute w-full appearance-none bg-transparent cursor-pointer"
            style={{ zIndex: idx===1 ? 3 : 2, height:"20px" }} />
        ))}
      </div>
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────
interface FilterConfig {
  id: string;
  filter_key: string;
  filter_label: string;
  filter_type: string;
  field_name: string | null;
  options: { value: string; label: string; min?: number; max?: number }[] | null;
  config: Record<string, any> | null;
  is_quick_filter: boolean;
  sort_order: number;
}

// Helper: get unit field value — checks built-in fields, then custom_fields
function getUnitFieldValue(unit: any, fieldName: string): any {
  // Check direct column first
  if (unit[fieldName] !== undefined) return unit[fieldName];
  // Check custom_fields dict
  if (unit.custom_fields && unit.custom_fields[fieldName] !== undefined) {
    return unit.custom_fields[fieldName];
  }
  return undefined;
}

// ── Fallback defaults (used only if API fails) ──────────────────────────────
const FALLBACK_FILTERS: FilterConfig[] = [
  { id:'1', filter_key:'unit_type', filter_label:'Unit Type', filter_type:'pills', field_name:'unit_type', options:[{value:"All",label:"All"},{value:"2BHK",label:"2BHK"},{value:"3BHK",label:"3BHK"},{value:"4BHK",label:"4BHK"},{value:"Villa",label:"Villa"},{value:"Plot",label:"Plot"},{value:"Studio",label:"Studio"}], config:{default_value:"All"}, is_quick_filter:true, sort_order:1 },
  { id:'2', filter_key:'trending', filter_label:'Trending', filter_type:'checkbox', field_name:'is_trending', options:null, config:{label:"🔥 Trending"}, is_quick_filter:true, sort_order:2 },
  { id:'3', filter_key:'status', filter_label:'Status', filter_type:'select', field_name:'status', options:[{value:"All Status",label:"All Status"},{value:"available",label:"Available"},{value:"booked",label:"Booked"},{value:"reserved",label:"Reserved"}], config:{default_value:"All Status"}, is_quick_filter:true, sort_order:3 },
  { id:'4', filter_key:'sort', filter_label:'Sort By', filter_type:'select', field_name:null, options:[{value:"newest",label:"Newest First"},{value:"price_asc",label:"Price: Low → High"},{value:"price_desc",label:"Price: High → Low"},{value:"area_desc",label:"Area: Largest"},{value:"floor_asc",label:"Floor: Lowest"},{value:"floor_desc",label:"Floor: Highest"}], config:{default_value:"newest"}, is_quick_filter:true, sort_order:4 },
  { id:'5', filter_key:'price_range', filter_label:'Price Range', filter_type:'range_slider', field_name:'base_price', options:null, config:{min:0,max:20000000,format:"price"}, is_quick_filter:false, sort_order:5 },
  { id:'6', filter_key:'area_range', filter_label:'Area (sqft)', filter_type:'range_slider', field_name:'area_sqft', options:null, config:{min:0,max:5000,format:"area"}, is_quick_filter:false, sort_order:6 },
  { id:'7', filter_key:'facing', filter_label:'Facing', filter_type:'pills', field_name:'facing', options:[{value:"Any",label:"Any"},{value:"East",label:"East"},{value:"West",label:"West"},{value:"North",label:"North"},{value:"South",label:"South"},{value:"North-East",label:"North-East"},{value:"North-West",label:"North-West"},{value:"South-East",label:"South-East"},{value:"South-West",label:"South-West"}], config:{default_value:"Any"}, is_quick_filter:false, sort_order:7 },
  { id:'8', filter_key:'floor_level', filter_label:'Floor Level', filter_type:'pills', field_name:'floor_number', options:[{value:"any",label:"Any Floor",min:0,max:999},{value:"ground",label:"Ground (0-2)",min:0,max:2},{value:"low",label:"Low (3-7)",min:3,max:7},{value:"mid",label:"Mid (8-15)",min:8,max:15},{value:"high",label:"High (16+)",min:16,max:999}], config:{default_value:"any"}, is_quick_filter:false, sort_order:8 },
  { id:'9', filter_key:'bedrooms', filter_label:'Min Bedrooms', filter_type:'button_group', field_name:'bedrooms', options:[{value:"0",label:"Any"},{value:"1",label:"1+"},{value:"2",label:"2+"},{value:"3",label:"3+"},{value:"4",label:"4+"}], config:{default_value:"0"}, is_quick_filter:false, sort_order:9 },
];

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StorePage() {
  const [units, setUnits] = useState<any[]>([]);
  const [trendingIds, setTrendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Dynamic filter config from admin
  const [filterConfigs, setFilterConfigs] = useState<FilterConfig[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Dynamic filter values — keyed by filter_key
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  // Configurable max values (loaded from admin settings, may be overridden by filter config)
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  const [aiQuery, setAiQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [aiActive, setAiActive] = useState(false);

  // Helper to get a filter value with its default
  const getVal = useCallback((key: string) => {
    if (filterValues[key] !== undefined) return filterValues[key];
    const cfg = filterConfigs.find(f => f.filter_key === key);
    return cfg?.config?.default_value ?? "";
  }, [filterValues, filterConfigs]);

  const setVal = (key: string, val: any) => {
    setFilterValues(prev => ({ ...prev, [key]: val }));
  };

  // Get max for range sliders (from filter config, overridden by site setting if configured)
  const getRangeMax = useCallback((key: string) => {
    const cfg = filterConfigs.find(f => f.filter_key === key);
    if (!cfg?.config) return 0;
    const settingKey = cfg.config.setting_key;
    if (settingKey && siteSettings[settingKey]) return Number(siteSettings[settingKey]);
    return cfg.config.max ?? 0;
  }, [filterConfigs, siteSettings]);

  const getRangeMin = useCallback((key: string) => {
    const cfg = filterConfigs.find(f => f.filter_key === key);
    return cfg?.config?.min ?? 0;
  }, [filterConfigs]);

  // Load filter configs + settings + apply URL params
  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/cms/public/store-filters`).then(r => r.json()).catch(() => null),
      fetch(`${API}/admin/cms/public/settings`).then(r => r.json()).catch(() => ({})),
    ]).then(([filtersData, settings]) => {
      const configs: FilterConfig[] = Array.isArray(filtersData) && filtersData.length > 0
        ? filtersData
        : FALLBACK_FILTERS;
      setFilterConfigs(configs);
      setSiteSettings(settings || {});

      // Initialize default values
      const defaults: Record<string, any> = {};
      for (const cfg of configs) {
        if (cfg.config?.default_value !== undefined) {
          defaults[cfg.filter_key] = cfg.config.default_value;
        }
        // Initialize range sliders with full range
        if (cfg.filter_type === 'range_slider') {
          const min = cfg.config?.min ?? 0;
          const settingKey = cfg.config?.setting_key;
          const max = (settingKey && settings?.[settingKey]) ? Number(settings[settingKey]) : (cfg.config?.max ?? 0);
          defaults[cfg.filter_key] = [min, max];
        }
      }

      // Apply URL params dynamically from filter configs
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        let hasAdvancedParam = false;

        for (const cfg of configs) {
          if (cfg.filter_type === 'range_slider') {
            // Range sliders: read min_{key}/max_{key} (strip _range suffix for param name)
            const paramBase = cfg.filter_key.replace(/_range$/, '');
            const minParam = sp.get(`min_${paramBase}`);
            const maxParam = sp.get(`max_${paramBase}`);
            if (minParam || maxParam) {
              const rMin = cfg.config?.min ?? 0;
              const settingKey = cfg.config?.setting_key;
              const rMax = (settingKey && settings?.[settingKey]) ? Number(settings[settingKey]) : (cfg.config?.max ?? 0);
              defaults[cfg.filter_key] = [
                Number(minParam) || rMin,
                Math.min(Number(maxParam) || rMax, rMax),
              ];
              if (!cfg.is_quick_filter) hasAdvancedParam = true;
            }
          } else if (cfg.filter_type === 'checkbox') {
            // Checkbox: read filter_key=1
            if (sp.get(cfg.filter_key) === '1') {
              defaults[cfg.filter_key] = true;
              if (!cfg.is_quick_filter) hasAdvancedParam = true;
            }
          } else if (cfg.filter_key !== 'sort') {
            // Pills, select, button_group: read filter_key directly
            const paramVal = sp.get(cfg.filter_key);
            if (paramVal) {
              defaults[cfg.filter_key] = paramVal;
              if (!cfg.is_quick_filter) hasAdvancedParam = true;
            }
          }
          // Sort
          if (cfg.filter_key === 'sort' && sp.get('sort')) {
            defaults['sort'] = sp.get('sort')!;
          }
        }

        if (hasAdvancedParam) {
          setFiltersOpen(true);
        }
      }

      setFilterValues(defaults);
      setFiltersLoaded(true);
    });
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [allRes, trendRes] = await Promise.all([
        fetch(`${API}/units?page_size=200`),
        fetch(`${API}/units/trending?limit=50`),
      ]);
      const allData = await allRes.json() as any;
      const trendData = await trendRes.json() as any;
      setUnits(Array.isArray(allData) ? allData : (allData.items || []));
      const tItems = Array.isArray(trendData) ? trendData : (trendData.items || []);
      setTrendingIds(new Set(tItems.map((u: any) => u.id)));
    } catch {}
    setLoading(false);
  }

  async function handleAISearch(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuery.trim()) { setAiActive(false); loadAll(); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API}/search/nlp`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ query: aiQuery }),
      });
      const d = await res.json() as any;
      setUnits(d.items || []);
      setAiActive(true);
    } catch {}
    setSearching(false);
  }

  function clearAI() { setAiQuery(""); setAiActive(false); loadAll(); }

  function resetFilters() {
    const defaults: Record<string, any> = {};
    for (const cfg of filterConfigs) {
      if (cfg.config?.default_value !== undefined) {
        defaults[cfg.filter_key] = cfg.config.default_value;
      }
      if (cfg.filter_type === 'range_slider') {
        defaults[cfg.filter_key] = [getRangeMin(cfg.filter_key), getRangeMax(cfg.filter_key)];
      }
      if (cfg.filter_type === 'checkbox') {
        defaults[cfg.filter_key] = false;
      }
    }
    setFilterValues(defaults);
  }

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filtered = units.filter(u => {
    for (const cfg of filterConfigs) {
      const val = getVal(cfg.filter_key);
      const defaultVal = cfg.config?.default_value;
      const fieldName = cfg.field_name;

      // Skip sort (not a data filter) and filters at default value
      if (!fieldName) continue;

      // ── Checkbox (boolean fields like is_trending) ──
      if (cfg.filter_type === 'checkbox') {
        if (val === true) {
          // Special: trending uses trendingIds set for performance
          if (fieldName === 'is_trending') {
            if (!trendingIds.has(u.id)) return false;
          } else {
            if (!getUnitFieldValue(u, fieldName)) return false;
          }
        }
        continue;
      }

      // ── Range slider (numeric fields) ──
      if (cfg.filter_type === 'range_slider') {
        if (Array.isArray(val)) {
          const num = parseFloat(getUnitFieldValue(u, fieldName) || 0);
          if (num > 0 && (num < val[0] || num > val[1])) return false;
        }
        continue;
      }

      // ── At default value → skip (no filtering) ──
      if (!val || val === defaultVal) continue;

      // ── Button group with numeric "min" semantics (e.g. bedrooms: "2+" means >=2) ──
      if (cfg.filter_type === 'button_group') {
        const minVal = parseInt(val) || 0;
        if (minVal > 0) {
          const unitNum = parseInt(getUnitFieldValue(u, fieldName)) || 0;
          if (unitNum < minVal) return false;
        }
        continue;
      }

      // ── Pills/select with options that have min/max (e.g. floor_level ranges) ──
      const selectedOpt = cfg.options?.find(o => o.value === val);
      if (selectedOpt && selectedOpt.min !== undefined && selectedOpt.max !== undefined) {
        const unitNum = parseFloat(getUnitFieldValue(u, fieldName) ?? 0);
        if (unitNum < selectedOpt.min || unitNum > selectedOpt.max) return false;
        continue;
      }

      // ── Generic exact match: compare selected value against unit field ──
      const unitVal = getUnitFieldValue(u, fieldName);
      if (unitVal !== undefined && unitVal !== null) {
        if (String(unitVal).toLowerCase() !== String(val).toLowerCase()) return false;
      }
    }
    return true;
  }).sort((a,b) => {
    const sortVal = getVal('sort') || 'newest';
    if (sortVal === "price_asc") return (parseFloat(a.base_price)||0)-(parseFloat(b.base_price)||0);
    if (sortVal === "price_desc") return (parseFloat(b.base_price)||0)-(parseFloat(a.base_price)||0);
    if (sortVal === "area_desc") return (parseFloat(b.area_sqft)||0)-(parseFloat(a.area_sqft)||0);
    if (sortVal === "floor_asc") return (a.floor_number??0)-(b.floor_number??0);
    if (sortVal === "floor_desc") return (b.floor_number??0)-(a.floor_number??0);
    return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();
  });

  // Active filter count (advanced filters only)
  const activeCount = filterConfigs.filter(cfg => {
    if (cfg.is_quick_filter && cfg.filter_key !== 'trending') return false;
    const val = getVal(cfg.filter_key);
    if (cfg.filter_type === 'checkbox') return val === true;
    if (cfg.filter_type === 'range_slider') {
      if (!Array.isArray(val)) return false;
      return val[0] > getRangeMin(cfg.filter_key) || val[1] < getRangeMax(cfg.filter_key);
    }
    return val && val !== cfg.config?.default_value;
  }).length;

  const formatPriceShort = (n:number) => n>=10000000?`₹${(n/10000000).toFixed(1)}Cr`:n>=100000?`₹${(n/100000).toFixed(0)}L`:`₹${n.toLocaleString()}`;

  const quickFilters = filterConfigs.filter(f => f.is_quick_filter);
  const advancedFilters = filterConfigs.filter(f => !f.is_quick_filter);

  // ── Render a single filter by config ──
  function renderFilter(cfg: FilterConfig, isQuickBar: boolean) {
    const val = getVal(cfg.filter_key);

    switch (cfg.filter_type) {
      case 'pills':
        if (isQuickBar) {
          return (
            <div key={cfg.filter_key} className="flex items-center gap-2">
              <span className="text-xs font-bold shrink-0" style={{ color:"#2A3887" }}>{cfg.filter_label}</span>
              <div className="flex gap-1.5 flex-wrap">
                {(cfg.options || []).map(opt => (
                  <button key={opt.value} onClick={() => setVal(cfg.filter_key, opt.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                    style={val===opt.value?{background:"#2A3887",color:"white",borderColor:"#2A3887"}:{background:"white",color:"#666",borderColor:"#ddd"}}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div key={cfg.filter_key} className="mb-5">
            <p className="text-xs font-black mb-2" style={{ color:"#2A3887" }}>{cfg.filter_label}</p>
            <div className="flex flex-wrap gap-1.5">
              {(cfg.options || []).map(opt => (
                <button key={opt.value} onClick={() => setVal(cfg.filter_key, opt.value)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                  style={val===opt.value?{background:"#2A3887",color:"white",borderColor:"#2A3887"}:{background:"#F8F9FB",color:"#555",borderColor:"#E2F1FC"}}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'select':
        if (isQuickBar) {
          return (
            <div key={cfg.filter_key} className="flex items-center gap-1.5">
              <span className="text-xs font-bold shrink-0" style={{ color:"#2A3887" }}>{cfg.filter_label}</span>
              <select value={val || ''} onChange={e => setVal(cfg.filter_key, e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none"
                style={{ borderColor:"#ddd",color:"#555" }}>
                {(cfg.options || []).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          );
        }
        return (
          <div key={cfg.filter_key} className="mb-5">
            <p className="text-xs font-black mb-2" style={{ color:"#2A3887" }}>{cfg.filter_label}</p>
            <select value={val || ''} onChange={e => setVal(cfg.filter_key, e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none"
              style={{ borderColor:"#E2F1FC",color:"#555",background:"#F8F9FB" }}>
              {(cfg.options || []).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <button key={cfg.filter_key} onClick={() => setVal(cfg.filter_key, !val)}
            className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1"
            style={val?{background:"#f59e0b",color:"white",borderColor:"#f59e0b"}:{background:"white",color:"#666",borderColor:"#ddd"}}>
            {cfg.config?.label || cfg.filter_label}
          </button>
        );

      case 'range_slider': {
        const rMin = getRangeMin(cfg.filter_key);
        const rMax = getRangeMax(cfg.filter_key);
        const rangeVal = Array.isArray(val) ? val as [number,number] : [rMin, rMax] as [number,number];
        const fmt = cfg.config?.format === 'price'
          ? formatPriceShort
          : cfg.config?.format === 'area'
            ? (n:number) => `${n.toLocaleString()} sqft`
            : (n:number) => n.toLocaleString();
        return (
          <RangeSlider key={cfg.filter_key} label={cfg.filter_label}
            min={rMin} max={rMax} value={rangeVal}
            onChange={v => setVal(cfg.filter_key, v)} format={fmt} />
        );
      }

      case 'button_group':
        if (isQuickBar) {
          return (
            <div key={cfg.filter_key} className="flex items-center gap-2">
              <span className="text-xs font-bold shrink-0" style={{ color:"#2A3887" }}>{cfg.filter_label}</span>
              <div className="flex gap-1.5">
                {(cfg.options || []).map(opt => (
                  <button key={opt.value} onClick={() => setVal(cfg.filter_key, opt.value)}
                    className="px-2.5 py-1 rounded-full text-xs font-bold border transition-all"
                    style={val===opt.value?{background:"#2A3887",color:"white",borderColor:"#2A3887"}:{background:"white",color:"#666",borderColor:"#ddd"}}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div key={cfg.filter_key} className="mb-5">
            <p className="text-xs font-black mb-2" style={{ color:"#2A3887" }}>{cfg.filter_label}</p>
            <div className="flex flex-wrap gap-1.5">
              {(cfg.options || []).map(opt => (
                <button key={opt.value} onClick={() => setVal(cfg.filter_key, opt.value)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                  style={val===opt.value?{background:"#2A3887",color:"white",borderColor:"#2A3887"}:{background:"#F8F9FB",color:"#555",borderColor:"#E2F1FC"}}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <main style={{ fontFamily:"'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-16"><BackButton /></div>

      {/* ── Header ── */}
      <div className="pt-16" style={{ background:"linear-gradient(135deg,#262262,#2A3887)" }}>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <p style={{ color:"#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-2">Browse Properties</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Find Your Home</h1>
          <p style={{ color:"rgba(255,255,255,0.55)" }} className="text-sm mb-6">
            {units.length} properties · RERA registered · Hyderabad
          </p>
          {/* AI Search */}
          <form onSubmit={handleAISearch} className="flex gap-2 max-w-2xl">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)" }}>
              <span style={{ color:"#29A9DF" }}>✦</span>
              <input value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                placeholder="AI Search: 3BHK under ₹80L facing East..."
                className="flex-1 bg-transparent text-white placeholder-white/40 text-sm focus:outline-none" />
              {aiQuery && <button type="button" onClick={clearAI} className="text-white/40 hover:text-white">✕</button>}
            </div>
            <button type="submit" disabled={searching}
              className="px-5 py-3 text-white font-bold rounded-xl text-sm disabled:opacity-60 whitespace-nowrap"
              style={{ background:"linear-gradient(135deg,#29A9DF,#00C2FF)" }}>
              {searching ? "⟳" : "✦ AI Search"}
            </button>
          </form>
          {aiActive && (
            <div className="mt-2 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background:"rgba(41,169,223,0.2)", color:"#29A9DF", border:"1px solid rgba(41,169,223,0.3)" }}>
                ✦ AI results for "{aiQuery}" — {filtered.length} found
              </span>
              <button onClick={clearAI} className="text-xs text-white/50 hover:text-white underline">Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="sticky top-16 z-30 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          {/* Quick filters row */}
          <div className="flex flex-wrap gap-3 items-center">
            {quickFilters.map(cfg => renderFilter(cfg, true))}

            {/* Separator + controls */}
            <div className="flex gap-2 ml-auto items-center shrink-0">
              {advancedFilters.length > 0 && (
                <button onClick={() => setFiltersOpen(o => !o)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all"
                  style={filtersOpen||activeCount>0?{background:"#2A3887",color:"white",borderColor:"#2A3887"}:{background:"white",color:"#555",borderColor:"#ddd"}}>
                  ⚙ Filters {activeCount > 0 && <span className="w-4 h-4 rounded-full bg-white text-xs font-black flex items-center justify-center" style={{ color:"#2A3887" }}>{activeCount}</span>}
                </button>
              )}
              <span className="text-xs font-bold" style={{ color:"#29A9DF" }}>{filtered.length} units</span>
            </div>
          </div>

          {/* ── Advanced Filter Panel ── */}
          {filtersOpen && advancedFilters.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor:"#E2F1FC" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2">
                {advancedFilters.map(cfg => renderFilter(cfg, false))}
              </div>
              {activeCount > 0 && (
                <div className="flex justify-end pb-2">
                  <button onClick={resetFilters}
                    className="px-4 py-1.5 text-xs font-bold rounded-full"
                    style={{ background:"#FEE2E2",color:"#DC2626" }}>
                    ✕ Reset all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-72 rounded-2xl animate-pulse" style={{ background:"#E2F1FC" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="font-bold text-lg mb-2" style={{ color:"#2A3887" }}>No units match your filters</p>
            <p style={{ color:"#555" }} className="text-sm mb-5">Try adjusting your filters or search terms</p>
            <button onClick={() => { resetFilters(); clearAI(); }}
              className="px-6 py-2.5 text-white font-bold rounded-full text-sm"
              style={{ background:"linear-gradient(135deg,#2A3887,#29A9DF)" }}>
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(unit => (
              <UnitCard key={unit.id} unit={unit} isTrending={trendingIds.has(unit.id)} onCompareChange={() => {}} />
            ))}
          </div>
        )}
      </div>

      <CompareBar />
      <Footer />
    </main>
  );
}
