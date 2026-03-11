"use client";
import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompareBar from "@/components/CompareBar";
import { isSaved, toggleSaved, isInCompare, toggleCompare } from "@/lib/savedProperties";
import Link from "next/link";

const API = "http://173.168.0.81:8000/api/v1";

const FILTERS = ["All","2BHK","3BHK","4BHK","Villa","Studio"];
const STATUS_FILTERS = ["All Status","available","booked","reserved"];
const SORT_OPTIONS = [
  {label:"Price: Low to High", value:"price_asc"},
  {label:"Price: High to Low", value:"price_desc"},
  {label:"Newest First", value:"newest"},
  {label:"Area: Largest", value:"area_desc"},
];

function formatPrice(p: any) {
  if (!p) return "Price on request";
  const n = parseFloat(p);
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(0)} L`;
  return `₹${n.toLocaleString()}`;
}

function UnitCard({ unit, onCompareChange }: { unit: any; onCompareChange: () => void }) {
  const [saved, setSaved] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { setSaved(isSaved(unit.id)); setInCompare(isInCompare(unit.id)); }, [unit.id]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  function handleSave(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const added = toggleSaved(unit.id);
    setSaved(added);
    showToast(added ? "Saved! ❤️" : "Removed from saved");
    window.dispatchEvent(new Event("jp_saved_update"));
  }

  function handleCompare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const r = toggleCompare(unit.id);
    if (r.error) { showToast(r.error); return; }
    setInCompare(r.added);
    showToast(r.added ? "Added to compare ⇄" : "Removed from compare");
    window.dispatchEvent(new Event("jp_compare_update"));
    onCompareChange();
  }

  function handleShare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}/units/${unit.id}`;
    const text = `${unit.unit_number} — ${unit.unit_type}, ${unit.bedrooms}BHK, ${formatPrice(unit.base_price)} | Janapriya Upscale`;
    if (navigator.share) { navigator.share({ title: "Janapriya Upscale", text, url }).catch(() => {}); }
    else { navigator.clipboard.writeText(`${text}\n${url}`); showToast("Link copied! 📋"); }
  }

  const statusColor = unit.status === "available" ? "#22c55e" : unit.status === "booked" ? "#ef4444" : "#f59e0b";

  return (
    <div className="bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col"
      style={{ boxShadow: "0 4px 20px rgba(42,56,135,0.08)", border: "1.5px solid #E2F1FC" }}>
      {/* Card Header */}
      <div className="h-44 relative flex flex-col justify-between p-4"
        style={{ background: "linear-gradient(135deg, #2A3887 0%, #29A9DF 100%)" }}>
        {/* Status + Actions Row */}
        <div className="flex justify-between items-center">
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white" style={{ color: statusColor }}>
            ● {(unit.status || "available").charAt(0).toUpperCase() + (unit.status||"available").slice(1)}
          </span>
          <div className="flex gap-1.5">
            <button onClick={handleSave} title={saved ? "Remove saved" : "Save"}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110"
              style={{ background: saved ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.2)", color: "white" }}>
              {saved ? "♥" : "♡"}
            </button>
            <button onClick={handleCompare} title={inCompare ? "Remove compare" : "Compare"}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110"
              style={{ background: inCompare ? "rgba(245,158,11,0.9)" : "rgba(255,255,255,0.2)", color: "white" }}>
              ⇄
            </button>
            <button onClick={handleShare} title="Share"
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110"
              style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
              ↗
            </button>
          </div>
        </div>
        {/* Unit info */}
        <div>
          <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-xs uppercase tracking-wide">
            {unit.unit_type} {unit.bedrooms ? `· ${unit.bedrooms} BHK` : ""}
          </p>
          <h3 className="text-white font-black text-lg leading-tight">{unit.unit_number || "Unit"}</h3>
        </div>
        {/* Toast */}
        {toast && (
          <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-center"
            style={{ color: "#2A3887" }}>{toast}</div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { icon: "🛏", val: unit.bedrooms || "—", label: "BHK" },
            { icon: "📐", val: unit.area_sqft ? `${parseFloat(unit.area_sqft).toFixed(0)}` : "—", label: "sqft" },
            { icon: "🏢", val: unit.floor_number ?? "—", label: "Floor" },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-2 text-center" style={{ background: "#F8F9FB" }}>
              <div className="text-base">{s.icon}</div>
              <div className="font-black text-sm" style={{ color: "#2A3887" }}>{s.val}</div>
              <div className="text-xs" style={{ color: "#999" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Extra details */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {unit.bathrooms && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#F0F4FF", color: "#2A3887" }}>🚿 {unit.bathrooms} Bath</span>}
          {unit.facing && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#F0F4FF", color: "#2A3887" }}>🧭 {unit.facing}</span>}
          {unit.balconies > 0 && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#F0F4FF", color: "#2A3887" }}>🏡 {unit.balconies} Balc</span>}
        </div>

        {/* Price + CTA */}
        <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop: "1px solid #F0F4FF" }}>
          <div>
            <div className="font-black text-lg" style={{ color: "#2A3887" }}>{formatPrice(unit.base_price)}</div>
            {unit.area_sqft && unit.base_price && (
              <div className="text-xs" style={{ color: "#999" }}>
                ₹{Math.round(parseFloat(unit.base_price)/parseFloat(unit.area_sqft)).toLocaleString()}/sqft
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/contact?unit=${unit.id}`}
              className="px-3 py-1.5 text-xs font-bold rounded-xl transition-all"
              style={{ border: "1.5px solid #2A3887", color: "#2A3887" }}>
              Enquire
            </Link>
            <Link href={`/units/${unit.id}`}
              className="px-3 py-1.5 text-xs font-bold text-white rounded-xl transition-all"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
              Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StorePage() {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [total, setTotal] = useState(0);
  const [compareCount, setCompareCount] = useState(0);

  useEffect(() => { loadUnits(); }, []);

  async function loadUnits() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/units?limit=100`);
      const d = await res.json() as Promise<any>;
      const items = Array.isArray(d) ? d : ((d as any).items || []);
      setUnits(items);
      setTotal((d as any).total || items.length);
    } catch {}
    setLoading(false);
  }

  async function handleAISearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) { loadUnits(); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API}/search/nlp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: search }),
      });
      const d = await res.json() as Promise<any>;
      setUnits((d as any).items || []);
      setTotal((d as any).total || 0);
    } catch {}
    setSearching(false);
  }

  function clearSearch() { setSearch(""); loadUnits(); }

  // Filter + sort client-side
  const filtered = units
    .filter(u => {
      if (typeFilter !== "All") {
        const t = typeFilter.toLowerCase();
        const ut = (u.unit_type || "").toLowerCase();
        if (t === "villa" && !ut.includes("villa")) return false;
        if (t === "studio" && !ut.includes("studio")) return false;
        if (t.includes("bhk") && !ut.includes(t.replace("bhk","").trim() + "bhk") && u.bedrooms !== parseInt(t)) return false;
      }
      if (statusFilter !== "All Status" && u.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "price_asc") return (parseFloat(a.base_price)||0) - (parseFloat(b.base_price)||0);
      if (sort === "price_desc") return (parseFloat(b.base_price)||0) - (parseFloat(a.base_price)||0);
      if (sort === "area_desc") return (parseFloat(b.area_sqft)||0) - (parseFloat(a.area_sqft)||0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* Header */}
      <div className="pt-16" style={{ background: "linear-gradient(135deg,#262262,#2A3887)" }}>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-2">Browse Units</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Find Your Home</h1>
          <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-sm mb-6">
            {total} units available · RERA registered · Hyderabad
          </p>
          {/* AI Search */}
          <form onSubmit={handleAISearch} className="flex gap-2 max-w-2xl">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <span style={{ color: "#29A9DF" }}>✦</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="AI Search: 3BHK under 80L in Gachibowli..."
                className="flex-1 bg-transparent text-white placeholder-white/40 text-sm focus:outline-none" />
              {search && <button type="button" onClick={clearSearch} className="text-white/40 hover:text-white text-xs">✕</button>}
            </div>
            <button type="submit" disabled={searching}
              className="px-5 py-3 text-white font-bold rounded-xl text-sm disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#29A9DF,#00C2FF)" }}>
              {searching ? "⟳" : "Search"}
            </button>
          </form>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-16 z-30 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap gap-3 items-center">
          {/* Type filters */}
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all border"
                style={typeFilter===f
                  ? {background:"#2A3887",color:"white",borderColor:"#2A3887"}
                  : {background:"white",color:"#555",borderColor:"#ddd"}}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto items-center">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none"
              style={{ borderColor: "#ddd", color: "#555" }}>
              {STATUS_FILTERS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none"
              style={{ borderColor: "#ddd", color: "#555" }}>
              {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <span className="text-xs font-bold" style={{ color: "#29A9DF" }}>{filtered.length} units</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-72 rounded-2xl animate-pulse" style={{ background: "#E2F1FC" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="font-bold text-lg mb-2" style={{ color: "#2A3887" }}>No units found</p>
            <p style={{ color: "#555" }} className="text-sm mb-4">Try different filters or search terms</p>
            <button onClick={() => { setTypeFilter("All"); setStatusFilter("All Status"); clearSearch(); }}
              className="px-6 py-2.5 text-white font-bold rounded-full text-sm"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(unit => (
              <UnitCard key={unit.id} unit={unit}
                onCompareChange={() => setCompareCount(c => c+1)} />
            ))}
          </div>
        )}
      </div>

      <CompareBar />
      <Footer />
    </main>
  );
}
