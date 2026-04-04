"use client";
import AddToCartBtn from '@/components/AddToCartBtn';
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompareBar from "@/components/CompareBar";
import ProactiveAssistant from "@/components/ProactiveAssistant";
import { isSaved, toggleSaved, isInCompare, toggleCompare } from "@/lib/savedProperties";
import Link from "next/link";

const API = "http://173.168.0.81:8000/api/v1";
const MEDIA_BASE = "http://173.168.0.81:8000";

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
  function handleShare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}/units/${unit.id}`;
    const text = `${unit.unit_number} — ${unit.unit_type}, ${formatPrice(unit.base_price)} | Janapriya Upscale`;
    if (navigator.share) navigator.share({ title: "Janapriya Upscale", text, url }).catch(() => {});
    else { navigator.clipboard.writeText(`${text}\n${url}`); showToast("Link copied! 📋"); }
  }
  const statusColor = unit.status === "available" ? "#22c55e" : unit.status === "booked" ? "#ef4444" : "#f59e0b";
  const firstImage = Array.isArray(unit.images) && unit.images.length > 0
    ? `${MEDIA_BASE}${unit.images[0]}`
    : null;
  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1"
      style={{ boxShadow: "0 4px 20px rgba(42,56,135,0.08)", border: "1.5px solid #E2F1FC" }}>
      <div className="h-48 relative flex flex-col justify-between p-4"
        style={{ background: "linear-gradient(135deg,#2A3887 0%,#29A9DF 100%)" }}>
        {/* Unit image */}
        {firstImage && (
          <img
            src={firstImage}
            alt={unit.unit_number || "Unit"}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 0 }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        {/* Gradient overlay so text stays readable */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.55) 100%)", zIndex: 1 }} />

        <div className="relative flex justify-between items-center" style={{ zIndex: 2 }}>
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
        <div className="relative" style={{ zIndex: 2 }}>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.85)" }}>
              {unit.unit_type}{unit.bedrooms ? ` · ${unit.bedrooms} BHK` : ""}
            </p>
            {isTrending && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background:"rgba(245,158,11,0.9)",color:"white" }}>🔥</span>}
          </div>
          <h3 className="text-white font-black text-lg leading-tight">{unit.unit_number||"Unit"}</h3>
        </div>
        {toast && (
          <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-center"
            style={{ color: "#2A3887", zIndex: 3 }}>{toast}</div>
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
            {unit.base_price && parseFloat(unit.base_price) > 0 && (
              <div className="text-xs font-bold mt-0.5" style={{ color: "#29A9DF" }}>
                🚀 {formatPrice(parseFloat(unit.base_price) * 0.8)} via RiseUp
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <div onClick={e=>{e.preventDefault();e.stopPropagation();}}>
              <AddToCartBtn unitId={unit.id} status={unit.status} size="sm" />
            </div>
            <Link href={`/units/${unit.id}?enquire=true`}
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

// ── Main Page ────────────────────────────────────────────────────────────────
const UNIT_TYPES = ["All","2BHK","3BHK","4BHK","Villa","Plot","Studio"];
const FACING_OPTIONS = ["Any","East","West","North","South"];
const FLOOR_OPTIONS = [
  { label:"Any Floor", min:0, max:999 },
  { label:"Ground (0-2)", min:0, max:2 },
  { label:"Low (3-7)", min:3, max:7 },
  { label:"Mid (8-15)", min:8, max:15 },
  { label:"High (16+)", min:16, max:999 },
];
const SORT_OPTIONS = [
  { label:"Newest First", value:"newest" },
  { label:"Price: Low → High", value:"price_asc" },
  { label:"Price: High → Low", value:"price_desc" },
  { label:"Area: Largest", value:"area_desc" },
  { label:"Floor: Lowest", value:"floor_asc" },
  { label:"Floor: Highest", value:"floor_desc" },
];
const STATUS_OPTS = ["All Status","available","booked","reserved"];

export default function StorePage() {
  const searchParams = useSearchParams();
  const [units, setUnits] = useState<any[]>([]);
  const [trendingIds, setTrendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Quick filters
  const [showTrendingOnly, setShowTrendingOnly] = useState(false);
  const [unitType, setUnitType] = useState("All");
  const [status, setStatus] = useState("All Status");
  const [sort, setSort] = useState("newest");
  const [aiQuery, setAiQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [aiActive, setAiActive] = useState(false);

  // Proactive assistant tracking
  const [searchCount, setSearchCount] = useState(0);
  const [lastResultsCount, setLastResultsCount] = useState(-1);
  const [lastBudget, setLastBudget] = useState(0);

  // Advanced filters
  const [priceRange, setPriceRange]   = useState<[number,number]>([0, 20000000]);
  const [emiRange, setEmiRange]       = useState<[number,number]>([0, 100000]);
  const [dpRange, setDpRange]         = useState<[number,number]>([0, 2000000]);
  const [areaRange, setAreaRange]     = useState<[number,number]>([0, 5000]);
  const [facing, setFacing]           = useState("Any");
  const [floorIdx, setFloorIdx]       = useState(0);
  const [minBeds, setMinBeds]         = useState(0);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTower, setSelectedTower]     = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  // Towers / Projects meta (loaded once)
  const [allTowers, setAllTowers]     = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);

  // Active filter count
  const activeCount = [
    priceRange[0]>0||priceRange[1]<20000000,
    emiRange[0]>0||emiRange[1]<100000,
    dpRange[0]>0||dpRange[1]<2000000,
    areaRange[0]>0||areaRange[1]<5000,
    facing!=="Any",
    floorIdx!==0,
    minBeds>0,
    showTrendingOnly,
    !!selectedProject,
    !!selectedTower,
    !!selectedLocation,
  ].filter(Boolean).length;

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setAiQuery(q);
      runAISearch(q);
    } else {
      loadAll();
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    setLoading(true);
    try {
      const [allRes, trendRes, towerRes, projRes] = await Promise.all([
        fetch(`${API}/units?page_size=200`),
        fetch(`${API}/units/trending?limit=50`),
        fetch(`${API}/projects/towers/all`),
        fetch(`${API}/projects?page_size=50`),
      ]);
      const allData   = await allRes.json()   as any;
      const trendData = await trendRes.json() as any;
      const towerData = await towerRes.json() as any;
      const projData  = await projRes.json()  as any;
      setUnits(Array.isArray(allData) ? allData : (allData.items || []));
      const tItems = Array.isArray(trendData) ? trendData : (trendData.items || []);
      setTrendingIds(new Set(tItems.map((u: any) => u.id)));
      setAllTowers(Array.isArray(towerData) ? towerData : []);
      const projects = Array.isArray(projData) ? projData : (projData.items || []);
      setAllProjects(projects.filter((p: any) => p.is_active !== false));
    } catch {}
    setLoading(false);
  }

  async function runAISearch(q: string) {
    setSearching(true);
    try {
      const res = await fetch(`${API}/search/nlp`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ query: q }),
      });
      const d = await res.json() as any;
      const items = d.items || [];
      setUnits(items);
      setAiActive(true);
      // Track for proactive assistant
      setSearchCount(c => c + 1);
      setLastResultsCount(items.length);
      // Extract budget from interpreted filters
      const budget = d.interpreted_as?.max_price || d.interpreted_as?.min_price || 0;
      if (budget) setLastBudget(budget);
    } catch {}
    setSearching(false);
    setLoading(false);
  }

  async function handleAISearch(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuery.trim()) { setAiActive(false); loadAll(); return; }
    await runAISearch(aiQuery);
  }

  function clearAI() { setAiQuery(""); setAiActive(false); loadAll(); }

  function resetFilters() {
    setPriceRange([0,20000000]); setEmiRange([0,100000]); setDpRange([0,2000000]);
    setAreaRange([0,5000]); setFacing("Any"); setFloorIdx(0); setMinBeds(0);
    setUnitType("All"); setStatus("All Status"); setShowTrendingOnly(false);
    setSelectedProject(""); setSelectedTower(""); setSelectedLocation("");
  }

  // Towers filtered by selected project
  const towersForProject = selectedProject
    ? allTowers.filter(t => t.project_id === selectedProject)
    : allTowers;

  // Unique locations from projects
  const locations = Array.from(new Set(
    allProjects.map((p: any) => p.location).filter(Boolean)
  )).sort() as string[];

  // Build set of tower_ids that match project/location filter
  const allowedTowerIds: Set<string> | null = (() => {
    if (!selectedProject && !selectedLocation && !selectedTower) return null;
    let towers = allTowers;
    if (selectedLocation) {
      const projIds = new Set(allProjects.filter((p: any) => p.location === selectedLocation).map((p: any) => p.id));
      towers = towers.filter(t => projIds.has(t.project_id));
    }
    if (selectedProject) towers = towers.filter(t => t.project_id === selectedProject);
    if (selectedTower)   towers = towers.filter(t => t.id === selectedTower);
    return new Set(towers.map(t => t.id));
  })();

  // Client-side filtering
  const filtered = units.filter(u => {
    // Trending only
    if (showTrendingOnly && !trendingIds.has(u.id)) return false;
    // Project / Tower / Location
    if (allowedTowerIds && !allowedTowerIds.has(u.tower_id)) return false;
    // Unit type
    if (unitType !== "All") {
      const t = unitType.toLowerCase();
      const ut = (u.unit_type||"").toLowerCase();
      if (!ut.includes(t.replace("bhk","")) && ut !== t) {
        if (t === "villa" && !ut.includes("villa")) return false;
        if (t === "plot" && !ut.includes("plot")) return false;
        if (t === "studio" && !ut.includes("studio")) return false;
        if (t.includes("bhk")) {
          const beds = parseInt(t);
          if (u.bedrooms !== beds) return false;
        }
      }
    }
    // Status
    if (status !== "All Status" && u.status !== status) return false;
    // Price
    const price = parseFloat(u.base_price||0);
    if (price > 0 && (price < priceRange[0] || price > priceRange[1])) return false;
    // EMI
    const emi = parseFloat(u.emi_estimate||0);
    if (emi > 0 && emiRange[1] < 100000 && emi > emiRange[1]) return false;
    if (emi > 0 && emiRange[0] > 0 && emi < emiRange[0]) return false;
    // Down payment
    const dp = parseFloat(u.down_payment||0);
    if (dp > 0 && dpRange[1] < 2000000 && dp > dpRange[1]) return false;
    if (dp > 0 && dpRange[0] > 0 && dp < dpRange[0]) return false;
    // Area
    const area = parseFloat(u.area_sqft||0);
    if (area > 0 && (area < areaRange[0] || area > areaRange[1])) return false;
    // Facing
    if (facing !== "Any" && u.facing && u.facing !== facing) return false;
    // Floor
    if (floorIdx !== 0) {
      const f = FLOOR_OPTIONS[floorIdx];
      const floor = u.floor_number ?? 0;
      if (floor < f.min || floor > f.max) return false;
    }
    // Min bedrooms
    if (minBeds > 0 && (u.bedrooms||0) < minBeds) return false;
    return true;
  }).sort((a,b) => {
    if (sort === "price_asc") return (parseFloat(a.base_price)||0)-(parseFloat(b.base_price)||0);
    if (sort === "price_desc") return (parseFloat(b.base_price)||0)-(parseFloat(a.base_price)||0);
    if (sort === "area_desc") return (parseFloat(b.area_sqft)||0)-(parseFloat(a.area_sqft)||0);
    if (sort === "floor_asc") return (a.floor_number??0)-(b.floor_number??0);
    if (sort === "floor_desc") return (b.floor_number??0)-(a.floor_number??0);
    return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();
  });

  const formatPriceShort = (n:number) => n>=10000000?`₹${(n/10000000).toFixed(1)}Cr`:n>=100000?`₹${(n/100000).toFixed(0)}L`:`₹${n.toLocaleString()}`;

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

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
          <div className="flex flex-wrap gap-2 items-center">
            {/* Type pills */}
            <div className="flex gap-1.5 flex-wrap">
              {UNIT_TYPES.map(t => (
                <button key={t} onClick={() => setUnitType(t)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                  style={unitType===t?{background:"#2A3887",color:"white",borderColor:"#2A3887"}:{background:"white",color:"#666",borderColor:"#ddd"}}>
                  {t}
                </button>
              ))}
              <button onClick={() => setShowTrendingOnly(o => !o)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1"
                style={showTrendingOnly?{background:"#f59e0b",color:"white",borderColor:"#f59e0b"}:{background:"white",color:"#666",borderColor:"#ddd"}}>
                🔥 Trending
              </button>
            </div>

            <div className="flex gap-2 ml-auto items-center flex-wrap">
              {/* Status */}
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none"
                style={{ borderColor:"#ddd",color:"#555" }}>
                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
              {/* Sort */}
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none"
                style={{ borderColor:"#ddd",color:"#555" }}>
                {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {/* Advanced filters toggle */}
              <button onClick={() => setFiltersOpen(o => !o)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all"
                style={filtersOpen||activeCount>0?{background:"#2A3887",color:"white",borderColor:"#2A3887"}:{background:"white",color:"#555",borderColor:"#ddd"}}>
                ⚙ Filters {activeCount > 0 && <span className="w-4 h-4 rounded-full bg-white text-xs font-black flex items-center justify-center" style={{ color:"#2A3887" }}>{activeCount}</span>}
              </button>
              <span className="text-xs font-bold" style={{ color:"#29A9DF" }}>{filtered.length} units</span>
            </div>
          </div>

          {/* ── Advanced Filter Panel ── */}
          {filtersOpen && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor:"#E2F1FC" }}>

              {/* Row 1: Price, EMI, Down Payment, Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2">
                <RangeSlider label="Price Range" min={0} max={20000000}
                  value={priceRange} onChange={setPriceRange} format={formatPriceShort} />
                <RangeSlider label="EMI (per month)" min={0} max={100000}
                  value={emiRange} onChange={setEmiRange}
                  format={n => n===0?"Any":`₹${(n/1000).toFixed(0)}K`} />
                <RangeSlider label="Down Payment" min={0} max={2000000}
                  value={dpRange} onChange={setDpRange} format={formatPriceShort} />
                <RangeSlider label="Area (sqft)" min={0} max={5000}
                  value={areaRange} onChange={setAreaRange}
                  format={n => `${n.toLocaleString()} sqft`} />
              </div>

              {/* Row 2: Location, Project, Tower, Facing */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4 mt-2">
                {/* Location */}
                <div className="mb-4">
                  <p className="text-xs font-black mb-2" style={{ color:"#2A3887" }}>Location</p>
                  <select value={selectedLocation} onChange={e => { setSelectedLocation(e.target.value); setSelectedProject(""); setSelectedTower(""); }}
                    className="w-full rounded-lg px-3 py-2 text-xs font-bold border focus:outline-none"
                    style={{ borderColor:"#E2F1FC", color: selectedLocation?"#2A3887":"#999", background:"#F8F9FB" }}>
                    <option value="">All Locations</option>
                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Project */}
                <div className="mb-4">
                  <p className="text-xs font-black mb-2" style={{ color:"#2A3887" }}>Project</p>
                  <select value={selectedProject} onChange={e => { setSelectedProject(e.target.value); setSelectedTower(""); setSelectedLocation(""); }}
                    className="w-full rounded-lg px-3 py-2 text-xs font-bold border focus:outline-none"
                    style={{ borderColor:"#E2F1FC", color: selectedProject?"#2A3887":"#999", background:"#F8F9FB" }}>
                    <option value="">All Projects</option>
                    {allProjects.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Tower */}
                <div className="mb-4">
                  <p className="text-xs font-black mb-2" style={{ color:"#2A3887" }}>Tower / Block</p>
                  <select value={selectedTower} onChange={e => setSelectedTower(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-xs font-bold border focus:outline-none"
                    style={{ borderColor:"#E2F1FC", color: selectedTower?"#2A3887":"#999", background:"#F8F9FB" }}>
                    <option value="">All Towers</option>
                    {towersForProject.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.project_name} — {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Facing */}
                <div className="mb-4">
                  <p className="text-xs font-black mb-2" style={{ color:"#2A3887" }}>Facing</p>
                  <div className="flex flex-wrap gap-1.5">
                    {FACING_OPTIONS.map(f => (
                      <button key={f} onClick={() => setFacing(f)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                        style={facing===f?{background:"#2A3887",color:"white",borderColor:"#2A3887"}:{background:"#F8F9FB",color:"#555",borderColor:"#E2F1FC"}}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Floor + Bedrooms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mt-1 mb-3">
                <div>
                  <p className="text-xs font-black mb-2" style={{ color:"#2A3887" }}>Floor Level</p>
                  <div className="flex flex-wrap gap-1.5">
                    {FLOOR_OPTIONS.map((f,i) => (
                      <button key={f.label} onClick={() => setFloorIdx(i)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                        style={floorIdx===i?{background:"#2A3887",color:"white",borderColor:"#2A3887"}:{background:"#F8F9FB",color:"#555",borderColor:"#E2F1FC"}}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black mb-2" style={{ color:"#2A3887" }}>Min Bedrooms</p>
                  <div className="flex gap-1.5">
                    {[0,1,2,3,4].map(n => (
                      <button key={n} onClick={() => setMinBeds(n)}
                        className="w-8 h-8 rounded-lg text-xs font-bold border transition-all"
                        style={minBeds===n?{background:"#2A3887",color:"white",borderColor:"#2A3887"}:{background:"#F8F9FB",color:"#555",borderColor:"#E2F1FC"}}>
                        {n===0?"Any":n+"+"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active filter chips + reset */}
              {activeCount > 0 && (
                <div className="flex items-center justify-between pb-2 pt-1 border-t" style={{ borderColor:"#E2F1FC" }}>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLocation && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background:"#E0F2FE",color:"#0369a1" }}>📍 {selectedLocation} <button onClick={()=>setSelectedLocation("")} className="ml-1 opacity-60 hover:opacity-100">✕</button></span>}
                    {selectedProject && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background:"#EDE9FE",color:"#6d28d9" }}>🏗 {allProjects.find((p:any)=>p.id===selectedProject)?.name} <button onClick={()=>{setSelectedProject("");setSelectedTower("");}} className="ml-1 opacity-60 hover:opacity-100">✕</button></span>}
                    {selectedTower && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background:"#FEF3C7",color:"#92400E" }}>🏢 {allTowers.find(t=>t.id===selectedTower)?.name} <button onClick={()=>setSelectedTower("")} className="ml-1 opacity-60 hover:opacity-100">✕</button></span>}
                    {(emiRange[1]<100000) && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background:"#DCFCE7",color:"#166534" }}>EMI ≤ ₹{(emiRange[1]/1000).toFixed(0)}K</span>}
                    {(dpRange[1]<2000000) && <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background:"#DCFCE7",color:"#166534" }}>DP ≤ {formatPriceShort(dpRange[1])}</span>}
                  </div>
                  <button onClick={resetFilters}
                    className="px-4 py-1.5 text-xs font-bold rounded-full flex-shrink-0"
                    style={{ background:"#FEE2E2",color:"#DC2626" }}>
                    ✕ Reset all
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
      <ProactiveAssistant
        searchCount={searchCount}
        lastResultsCount={lastResultsCount}
        lastQuery={aiQuery}
        budget={lastBudget}
      />
    </main>
  );
}
