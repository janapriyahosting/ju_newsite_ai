"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { isSaved, toggleSaved } from "@/lib/savedProperties";

const API = "http://173.168.0.81:8000/api/v1";

function fmtPrice(p: any) {
  if (!p) return "On Request";
  const n = parseFloat(p);
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(0)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function TowerDetailPage() {
  const { id, towerId } = useParams<{ id: string; towerId: string }>();
  const [project, setProject] = useState<any>(null);
  const [tower, setTower] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!id || !towerId) return;
    (async () => {
      // Resolve project slug to object
      const pd = await fetch(`${API}/projects?limit=50`).then(r=>r.json());
      const proj = (pd.items||[]).find((p:any) => p.slug===id || p.id===id);
      if (proj) setProject(proj);

      // Fetch towers to find this tower
      const td = await fetch(`${API}/projects/${proj?.id}/towers`).then(r=>r.json());
      const tw = (td.items||td||[]).find((t:any) => t.id===towerId);
      if (tw) setTower(tw);

      // Fetch units for this tower
      const ud = await fetch(`${API}/units?tower_id=${towerId}&limit=500`).then(r=>r.json());
      setUnits(ud.items || []);
      setLoading(false);
    })();
  }, [id, towerId]);

  if (loading) return (
    <main style={{ fontFamily:"'Lato',sans-serif" }}><Navbar />
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ background:"#F8F9FB" }}>
        <div className="text-center"><div className="text-4xl animate-spin mb-3">⟳</div></div>
      </div>
    </main>
  );

  const floors = [...new Set(units.map(u => u.floor_number).filter(f=>f!=null))].sort((a,b)=>a-b);
  const displayUnits = units.filter(u => {
    const floorOk = activeFloor === null || u.floor_number === activeFloor;
    const statusOk = statusFilter === "all" || u.status === statusFilter;
    return floorOk && statusOk;
  });

  const available = units.filter(u=>u.status==="available").length;
  const booked = units.filter(u=>u.status==="booked").length;
  const prices = units.map(u=>parseFloat(u.base_price||0)).filter(Boolean);

  const STATUS_COLOR: Record<string,{bg:string;color:string}> = {
    available: {bg:"#DCFCE7",color:"#16A34A"},
    booked:    {bg:"#FEE2E2",color:"#DC2626"},
    hold:      {bg:"#FEF3C7",color:"#D97706"},
    sold:      {bg:"#F0F4FF",color:"#2A3887"},
  };

  return (
    <main style={{ fontFamily:"'Lato',sans-serif", minHeight:"100vh", background:"#F8F9FB" }}>
      <Navbar />

      {/* Hero */}
      <div className="pt-16" style={{ background:"linear-gradient(135deg,#262262,#2A3887)" }}>
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-xs" style={{ color:"rgba(255,255,255,0.55)" }}>
            <Link href="/projects" style={{ color:"rgba(255,255,255,0.55)", textDecoration:"none" }}>Projects</Link>
            <span>›</span>
            <Link href={`/projects/${id}`} style={{ color:"rgba(255,255,255,0.55)", textDecoration:"none" }}>
              {project?.name || id}
            </Link>
            <span>›</span>
            <span style={{ color:"#29A9DF" }}>{tower?.name || "Tower"}</span>
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p style={{ color:"#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-2">
                {project?.city || "Hyderabad"} · {project?.name}
              </p>
              <h1 className="text-4xl font-black text-white mb-2">{tower?.name || "Tower"}</h1>
              {tower?.description && (
                <p style={{ color:"rgba(255,255,255,0.65)" }} className="text-sm max-w-xl">{tower.description}</p>
              )}
            </div>
            <Link href={`/contact?project=${id}&tower=${towerId}`}
              className="px-6 py-3 font-bold text-sm rounded-xl"
              style={{ background:"white", color:"#262262", textDecoration:"none" }}>
              📋 Enquire Now
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              {label:"Total Units",  value: units.length,       color:"#29A9DF"},
              {label:"Available",    value: available,           color:"#22c55e"},
              {label:"Booked",       value: booked,              color:"#ef4444"},
              {label:"Floors",       value: tower?.total_floors||floors.length, color:"#29A9DF"},
            ].map(s => (
              <div key={s.label} className="rounded-xl px-4 py-3" style={{ background:"rgba(255,255,255,0.08)" }}>
                <p className="text-xl font-black" style={{ color:s.color }}>{s.value}</p>
                <p style={{ color:"rgba(255,255,255,0.5)" }} className="text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          {prices.length > 0 && (
            <p className="mt-4 text-sm font-bold" style={{ color:"rgba(255,255,255,0.7)" }}>
              Price Range: <span style={{ color:"white" }}>{fmtPrice(Math.min(...prices))} – {fmtPrice(Math.max(...prices))}</span>
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3 items-center mb-6">
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm font-bold" style={{ color:"#555" }}>Floor:</span>
            <button onClick={()=>setActiveFloor(null)}
              className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
              style={activeFloor===null?{background:"#2A3887",color:"white",border:"1px solid #2A3887"}:{background:"white",color:"#555",border:"1px solid #ddd"}}>
              All
            </button>
            {floors.map(f => (
              <button key={f} onClick={()=>setActiveFloor(activeFloor===f?null:f)}
                className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                style={activeFloor===f?{background:"#2A3887",color:"white",border:"1px solid #2A3887"}:{background:"white",color:"#555",border:"1px solid #ddd"}}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto flex-wrap">
            {["all","available","booked","hold"].map(s => (
              <button key={s} onClick={()=>setStatusFilter(s)}
                className="px-3 py-1 rounded-full text-xs font-bold capitalize transition-all"
                style={statusFilter===s
                  ? {background:s==="available"?"#16A34A":s==="booked"?"#DC2626":s==="hold"?"#D97706":"#2A3887",color:"white"}
                  : {background:"white",color:"#555",border:"1px solid #ddd"}}>
                {s === "all" ? `All Units (${units.length})` : `${s} (${units.filter(u=>u.status===s).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Units Grid */}
        {displayUnits.length === 0 ? (
          <div className="text-center py-16" style={{ color:"#ccc" }}>
            <p className="text-4xl mb-3">🏠</p>
            <p className="font-bold">No units match the selected filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayUnits.map(u => {
              const sc = STATUS_COLOR[u.status] || {bg:"#F0F4FF",color:"#555"};
              const [sv, setSv] = useState(isSaved(u.id));
              return (
                <div key={u.id} className="bg-white rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
                  style={{ border:"1.5px solid #E2F1FC", boxShadow:"0 4px 15px rgba(42,56,135,0.07)" }}>
                  {/* Card Header */}
                  <div className="h-28 p-4 flex flex-col justify-between"
                    style={{ background:"linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                    <div className="flex justify-between">
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-white capitalize" style={{ color:sc.color }}>
                        {u.status || "available"}
                      </span>
                      <button onClick={()=>{toggleSaved(u.id);setSv(isSaved(u.id));}}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                        style={{ background:sv?"rgba(239,68,68,0.9)":"rgba(255,255,255,0.2)", color:"white" }}>
                        {sv?"♥":"♡"}
                      </button>
                    </div>
                    <div>
                      <p style={{ color:"rgba(255,255,255,0.65)" }} className="text-xs">{u.unit_type}</p>
                      <p className="text-white font-black">{u.unit_number}</p>
                    </div>
                  </div>
                  {/* Card Body */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-1 text-xs mb-3" style={{ color:"#666" }}>
                      <span>🛏 {u.bedrooms} BHK</span>
                      <span>🏢 Floor {u.floor_number}</span>
                      <span>📐 {u.area_sqft ? parseFloat(u.area_sqft).toFixed(0) : "—"} sqft</span>
                      {u.facing && <span>🧭 {u.facing}</span>}
                    </div>
                    <div className="flex items-center justify-between pt-3" style={{ borderTop:"1px solid #F0F4FF" }}>
                      <span className="font-black text-sm" style={{ color:"#2A3887" }}>{fmtPrice(u.base_price)}</span>
                      <Link href={`/units/${u.id}`}
                        className="px-3 py-1.5 text-xs font-bold text-white rounded-lg"
                        style={{ background:"linear-gradient(135deg,#2A3887,#29A9DF)", textDecoration:"none" }}>
                        View →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
