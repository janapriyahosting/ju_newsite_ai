"use client";

function MiniUnitCard({ unit: u }: { unit: any }) {
  const [sv, setSv] = useState(isSaved(u.id));
  const statusColor = u.status==="available"?"#22c55e":u.status==="booked"?"#ef4444":"#f59e0b";
  return (
    <div className="bg-white rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
      style={{ border: "1.5px solid #E2F1FC", boxShadow: "0 4px 15px rgba(42,56,135,0.07)" }}>
      <div className="h-36 p-4 flex flex-col justify-between"
        style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
        <div className="flex justify-between">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white" style={{ color: statusColor }}>
            {u.status || "available"}
          </span>
          <button onClick={()=>{toggleSaved(u.id);setSv(isSaved(u.id));}}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: sv?"rgba(239,68,68,0.9)":"rgba(255,255,255,0.2)", color:"white" }}>
            {sv?"♥":"♡"}
          </button>
        </div>
        <div>
          <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-xs">{u.unit_type}</p>
          <p className="text-white font-black">{u.unit_number}</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex gap-3 text-xs mb-3" style={{ color: "#555" }}>
          <span>🛏 {u.bedrooms} BHK</span>
          <span>📐 {u.area_sqft ? parseFloat(u.area_sqft).toFixed(0) : "—"} sqft</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-black" style={{ color: "#2A3887" }}>{formatPrice(u.base_price)}</span>
          <Link href={`/units/${u.id}`} className="px-3 py-1.5 text-xs font-bold text-white rounded-lg"
            style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>View →</Link>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompareBar from "@/components/CompareBar";
import { isSaved, toggleSaved, toggleCompare, isInCompare } from "@/lib/savedProperties";

const API = "http://173.168.0.81:8000/api/v1";

function formatPrice(p: any) {
  if (!p) return "—";
  const n = parseFloat(p);
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(0)} L`;
  return `₹${n.toLocaleString()}`;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [towers, setTowers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(""),2500); };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`${API}/projects/${id}`).then(r=>r.json() as Promise<any>),
      fetch(`${API}/projects/${id}/towers`).then(r=>r.json() as Promise<any>),
      fetch(`${API}/units?limit=100`).then(r=>r.json() as Promise<any>),
    ]).then(([p, t, u]) => {
      setProject(p);
      setTowers(Array.isArray(t) ? t : ((t as any).items || []));
      const allUnits = Array.isArray(u) ? u : ((u as any).items || []);
      const towerIds = new Set((Array.isArray(t) ? t : ((t as any).items || [])).map((x:any)=>x.id));
      setUnits(allUnits.filter((x:any) => towerIds.has(x.tower_id)));
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, [id]);

  if (loading) return (
    <main style={{ fontFamily: "'Lato',sans-serif" }}><Navbar />
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ background: "#F8F9FB" }}>
        <div className="text-center"><div className="text-4xl animate-spin mb-3">⟳</div></div>
      </div>
    </main>
  );

  if (!project) return (
    <main style={{ fontFamily: "'Lato',sans-serif" }}><Navbar />
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="text-5xl mb-4">🏗️</div>
          <p className="font-bold text-lg mb-4" style={{ color: "#2A3887" }}>Project not found</p>
          <Link href="/projects" className="px-6 py-3 text-white font-bold rounded-full"
            style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>All Projects</Link>
        </div>
      </div>
    </main>
  );

  const available = units.filter(u=>u.status==="available").length;
  const prices = units.map(u=>parseFloat(u.base_price||0)).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-16" style={{ background: "linear-gradient(135deg,#262262,#2A3887)" }}>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-2">
                {project.city || "Hyderabad"} · RERA Registered
              </p>
              <h1 className="text-4xl font-black text-white mb-2">{project.name}</h1>
              {project.address && <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-sm">📍 {project.address}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p style={{ color: "rgba(255,255,255,0.55)" }} className="text-xs mb-1">Starting From</p>
              <p className="text-2xl font-black text-white">{formatPrice(minPrice)}</p>
              {maxPrice > minPrice && <p style={{ color: "#29A9DF" }} className="text-sm">Up to {formatPrice(maxPrice)}</p>}
            </div>
          </div>
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              {label:"Total Units",value:units.length},
              {label:"Available",value:available,color:"#22c55e"},
              {label:"Towers",value:towers.length},
              {label:"RERA",value:project.rera_number||"Registered"},
            ].map(s=>(
              <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.08)" }}>
                <p className="text-xl font-black" style={{ color: s.color || "#29A9DF" }}>{s.value}</p>
                <p style={{ color: "rgba(255,255,255,0.5)" }} className="text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          {["overview","units","towers"].map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              className="px-5 py-3 text-sm font-bold capitalize transition-all border-b-2"
              style={activeTab===t?{color:"#29A9DF",borderColor:"#29A9DF"}:{color:"rgba(255,255,255,0.55)",borderColor:"transparent"}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              {project.description && (
                <div className="mb-6">
                  <h2 className="font-black text-lg mb-3" style={{ color: "#262262" }}>About the Project</h2>
                  <p style={{ color: "#555" }} className="leading-relaxed text-sm">{project.description}</p>
                </div>
              )}
              {project.amenities && project.amenities.length > 0 && (
                <div>
                  <h2 className="font-black text-lg mb-3" style={{ color: "#262262" }}>Amenities</h2>
                  <div className="flex flex-wrap gap-2">
                    {project.amenities.map((a:string,i:number)=>(
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ background: "#E2F1FC", color: "#2A3887" }}>✓ {a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)", boxShadow: "0 8px 30px rgba(42,56,135,0.2)" }}>
                <p className="text-white/70 text-sm mb-1">Price Range</p>
                <p className="text-2xl font-black text-white">{formatPrice(minPrice)} – {formatPrice(maxPrice)}</p>
                <p className="text-white/60 text-xs mt-1">{units.length} total units · {available} available</p>
                <Link href={`/contact?project=${id}`}
                  className="mt-4 block text-center py-3 bg-white font-black rounded-xl text-sm transition-all hover:scale-105"
                  style={{ color: "#2A3887" }}>
                  Enquire Now
                </Link>
              </div>
              <Link href={`/contact?project=${id}&visit=1`}
                className="block text-center py-3 font-black rounded-xl text-sm"
                style={{ border: "2px solid #2A3887", color: "#2A3887" }}>
                📅 Book Site Visit
              </Link>
            </div>
          </div>
        )}

        {activeTab === "units" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-black text-lg" style={{ color: "#262262" }}>Available Units ({units.length})</h2>
              <Link href="/store" style={{ color: "#29A9DF" }} className="text-sm font-bold hover:underline">View All →</Link>
            </div>
            {units.length === 0 ? (
              <div className="text-center py-10" style={{ color: "#999" }}>No units found for this project</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {units.map(u => <MiniUnitCard key={u.id} unit={u} />)}
              </div>
            )}
          </div>
        )}

        {activeTab === "towers" && (
          <div>
            <h2 className="font-black text-lg mb-6" style={{ color: "#262262" }}>Project Towers ({towers.length})</h2>
            {towers.length === 0 ? (
              <div className="text-center py-10" style={{ color: "#999" }}>No towers found</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {towers.map((t:any) => (
                  <div key={t.id} className="bg-white rounded-2xl p-5" style={{ border: "1.5px solid #E2F1FC" }}>
                    <h3 className="font-black text-base mb-2" style={{ color: "#2A3887" }}>{t.name || t.tower_name}</h3>
                    <div className="space-y-1 text-sm" style={{ color: "#555" }}>
                      {t.total_floors && <p>🏢 {t.total_floors} Floors</p>}
                      {t.units_per_floor && <p>🏠 {t.units_per_floor} Units/Floor</p>}
                      {t.total_units && <p>📊 {t.total_units} Total Units</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <CompareBar />
      <Footer />
    </main>
  );
}
