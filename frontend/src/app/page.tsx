"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);

  useEffect(() => {
    // Fetch trending units
    fetch("http://173.168.0.81:8000/api/v1/units/trending?limit=8")
      .then(r => r.json() as Promise<any>)
      .then(d => setTrending(Array.isArray(d) ? d : (d.items || [])))
      .catch(() => {});

    fetch("http://173.168.0.81:8000/api/v1/projects")
      .then(r => r.json())
      .then(d => setProjects(Array.isArray(d) ? d.slice(0,3) : (d.items||[]).slice(0,3)))
      .catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setSearched(false);
    try {
      const res = await fetch(`http://173.168.0.81:8000/api/v1/search/nlp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const d = await res.json();
      setResults(d.items || d.results || []);
    } catch { setResults([]); }
    finally { setSearching(false); setSearched(true); }
  }

  function formatPrice(p: any) {
    if (!p) return "Price on request";
    const n = parseFloat(p);
    if (n >= 10000000) return `₹${(n/10000000).toFixed(1)} Cr`;
    if (n >= 100000) return `₹${(n/100000).toFixed(0)} L`;
    return `₹${n.toLocaleString()}`;
  }

  const PROJECTS = [
    {name:"Janapriya Heights",loc:"Gachibowli",type:"2 & 3 BHK",price:"From ₹45L",status:"Ready to Move",statusColor:"#22c55e"},
    {name:"Janapriya Meadows",loc:"Kompally",type:"Villas & Row Houses",price:"From ₹85L",status:"Under Construction",statusColor:"#f59e0b"},
    {name:"Janapriya Elite",loc:"Banjara Hills",type:"Luxury Apartments",price:"From ₹1.2Cr",status:"New Launch",statusColor:"#29A9DF"},
  ];

  const WHYUS = [
    {icon:"🏆",title:"40 Years of Trust",desc:"Four decades of delivering quality homes on time"},
    {icon:"🔒",title:"RERA Registered",desc:"All projects fully RERA compliant — no legal hassles"},
    {icon:"🌿",title:"Eco-Friendly Homes",desc:"IGBC certified green buildings with sustainability"},
    {icon:"💎",title:"Premium Finishes",desc:"Imported marble, branded fittings throughout"},
    {icon:"📱",title:"Smart Home Ready",desc:"Pre-wired for automation and EV charging"},
    {icon:"🤝",title:"Transparent Pricing",desc:"Zero hidden costs — what you see is what you pay"},
  ];

  return (
    <main style={{ fontFamily: "'Lato', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #262262 0%, #2A3887 50%, #1a5f8a 100%)" }}>
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #29A9DF, transparent)" }} />
        <div className="absolute bottom-20 left-10 w-72 h-72 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #00C2FF, transparent)" }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.3) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8 border"
            style={{ background: "rgba(41,169,223,0.15)", borderColor: "rgba(41,169,223,0.4)", color: "#29A9DF" }}>
            ✦ RERA Registered · 40 Years of Excellence · Hyderabad
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-4">
            Ask More<br />
            <span style={{ color: "#29A9DF" }}>of Life.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)" }} className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Premium apartments, villas and plots crafted for families who believe home is more than just a place — it's where life truly begins.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/projects"
              className="px-8 py-4 text-white font-bold rounded-full text-sm tracking-wide transition-all hover:scale-105 hover:shadow-2xl"
              style={{ background: "linear-gradient(135deg, #29A9DF, #00C2FF)", boxShadow: "0 8px 30px rgba(41,169,223,0.4)" }}>
              Explore Projects →
            </Link>
            <Link href="/contact"
              className="px-8 py-4 font-bold rounded-full text-sm tracking-wide transition-all hover:bg-white"
              style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "2px solid rgba(255,255,255,0.3)" }}>
              Book a Site Visit
            </Link>
          </div>

          {/* ── AI Search ────────────────────────────────────────────────── */}
          <div className="w-full max-w-2xl mx-auto">
            <div className="rounded-2xl p-1.5" style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: "#29A9DF" }}>✦</span>
                  <input value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Try: 3BHK under 80 lakhs in Gachibowli..."
                    className="w-full bg-transparent text-white placeholder-white/40 text-sm pl-10 pr-4 py-3.5 focus:outline-none" />
                </div>
                <button type="submit" disabled={searching}
                  className="px-6 py-3 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg, #2A3887, #29A9DF)" }}>
                  {searching ? "⟳" : "🔍"} AI Search
                </button>
              </form>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)" }} className="text-xs mt-2">Powered by AI · Search in plain English</p>

            {/* Results */}
            {searched && (
              <div className="mt-4 text-left space-y-2 max-h-64 overflow-y-auto">
                {(Array.isArray(results) ? results : []).length === 0 ? (
                  <div className="rounded-xl p-4 text-center text-sm" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                    No results. <Link href="/store" style={{ color: "#29A9DF" }} className="underline">Browse all →</Link>
                  </div>
                ) : (Array.isArray(results) ? results : []).map((r: any, i: number) => (
                  <Link key={i} href={`/units/${r.id}`}
                    className="flex items-center gap-4 rounded-xl p-4 transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: "rgba(41,169,223,0.2)", color: "#29A9DF" }}>🏠</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{r.unit_number || r.name}</p>
                      <p style={{ color: "rgba(255,255,255,0.5)" }} className="text-xs">{r.unit_type} · {r.bedrooms} BHK · {r.area_sqft} sqft</p>
                    </div>
                    <div className="font-bold text-sm" style={{ color: "#29A9DF" }}>{formatPrice(r.base_price)}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scroll */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ color: "rgba(255,255,255,0.35)" }}>
          <span className="text-xs tracking-widest">SCROLL</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <section className="py-12" style={{ background: "#2A3887" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[["40+","Years of Experience"],["40K+","Dream Homes"],["70K+","Happy Families"],["20M+","Sq Ft Delivered"]].map(([v,l]) => (
              <div key={l}>
                <div className="text-3xl md:text-4xl font-black text-white">{v}</div>
                <div style={{ color: "#29A9DF" }} className="text-sm font-semibold mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Trending Units ───────────────────────────────────────────────────── */}
      {trending.length > 0 && (
        <section className="py-20" style={{ background: "#F8F9FB" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-2">Hot Properties</p>
                <h2 className="text-4xl md:text-5xl font-black" style={{ color: "#262262" }}>Trending Now</h2>
              </div>
              <Link href="/store" className="hidden md:flex items-center gap-2 font-bold text-sm"
                style={{ color: "#2A3887" }}>View All <span>→</span></Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {trending.map((u: any) => (
                <Link key={u.id} href={`/units/${u.id}`}
                  className="bg-white rounded-2xl overflow-hidden group transition-all duration-200 hover:-translate-y-1"
                  style={{ boxShadow: "0 4px 20px rgba(42,56,135,0.08)", border: "1.5px solid #E2F1FC" }}>
                  {/* Card top */}
                  <div className="h-36 relative flex flex-col justify-between p-4"
                    style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white" style={{ color: "#22c55e" }}>
                        ● Available
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-bold"
                        style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
                        🔥 Trending
                      </span>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.65)" }}>
                        {u.unit_type}{u.bedrooms ? ` · ${u.bedrooms} BHK` : ""}
                      </p>
                      <p className="text-white font-black text-base">{u.unit_number}</p>
                    </div>
                  </div>
                  {/* Card body */}
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex gap-3 text-xs" style={{ color: "#555" }}>
                        {u.bedrooms && <span>🛏 {u.bedrooms} BHK</span>}
                        {u.area_sqft && <span>📐 {parseFloat(u.area_sqft).toFixed(0)} sqft</span>}
                        {u.floor_number != null && <span>🏢 Fl {u.floor_number}</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-base" style={{ color: "#2A3887" }}>{formatPrice(u.base_price)}</p>
                        {u.area_sqft && u.base_price && (
                          <p className="text-xs" style={{ color: "#999" }}>
                            ₹{Math.round(parseFloat(u.base_price)/parseFloat(u.area_sqft)).toLocaleString()}/sqft
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-bold px-3 py-1.5 rounded-xl text-white group-hover:scale-105 transition-all"
                        style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                        View →
                      </span>
                    </div>
                  </div>
                
                  <div className="mt-3 flex justify-end" onClick={e=>e.preventDefault()}>
                    <AddToCartBtn unitId={u.id} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8 md:hidden">
              <Link href="/store" className="inline-block px-8 py-3 font-bold rounded-full text-white"
                style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                View All Units →
              </Link>
            </div>
          </div>
        </section>
      )}

      
      {/* ── Featured Projects ──────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">Our Portfolio</p>
            <h2 className="text-4xl md:text-5xl font-black" style={{ color: "#262262" }}>Featured Projects</h2>
            <p style={{ color: "#555A5C" }} className="mt-3 max-w-xl mx-auto">Premium residential communities across Hyderabad — crafted to the highest standards.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {projects.length > 0 ? projects.map((p: any) => (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="group bg-white rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300 block"
                style={{ boxShadow: "0 4px 20px rgba(42,56,135,0.1)", border: "1px solid #E2F1FC" }}>
                <div className="h-52 flex flex-col justify-between p-5"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                  <span className="self-start px-3 py-1 rounded-full text-xs font-bold bg-white"
                    style={{ color: p.status === "ready" ? "#22c55e" : p.status === "upcoming" ? "#f59e0b" : "#2A3887" }}>
                    {p.status === "ready" ? "✓ Ready to Move" : p.status === "upcoming" ? "⏳ Upcoming" : "🏗 Under Construction"}
                  </span>
                  <div>
                    <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-xs mb-1">{p.project_type || "Residential"}</p>
                    <h3 className="text-white font-black text-xl">{p.name}</h3>
                    {p.address && <p style={{ color: "rgba(255,255,255,0.55)" }} className="text-xs mt-1">📍 {p.address}</p>}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base" style={{ color: "#2A3887" }}>
                      {p.min_price ? formatPrice(p.min_price) : "Price on request"}
                    </span>
                    <span className="text-sm font-bold transition-colors" style={{ color: "#29A9DF" }}>View Details →</span>
                  </div>
                </div>
              </Link>
            )) : [1,2,3].map(i => (
              <div key={i} className="h-72 rounded-2xl animate-pulse" style={{ background: "#E2F1FC" }} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/projects" className="inline-flex items-center gap-2 px-8 py-3.5 font-bold rounded-full transition-all hover:scale-105"
              style={{ border: "2px solid #2A3887", color: "#2A3887" }}>
              View All Projects →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">Why Choose Us</p>
            <h2 className="text-4xl md:text-5xl font-black" style={{ color: "#262262" }}>Built on Trust,<br />Crafted for Life.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {WHYUS.map(w => (
              <div key={w.title} className="rounded-2xl p-6 transition-all hover:-translate-y-1 cursor-default"
                style={{ background: "#F8F9FB", border: "1px solid #E2F1FC" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor="#29A9DF"; (e.currentTarget as HTMLDivElement).style.boxShadow="0 8px 24px rgba(41,169,223,0.15)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor="#E2F1FC"; (e.currentTarget as HTMLDivElement).style.boxShadow="none"; }}>
                <div className="text-3xl mb-3">{w.icon}</div>
                <h4 className="font-bold text-sm mb-1" style={{ color: "#2A3887" }}>{w.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: "#555A5C" }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: "#262262" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">Happy Families</p>
            <h2 className="text-4xl font-black text-white">What Our Customers Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {name:"Rajesh Kumar",role:"Software Engineer, Hyderabad",text:"Excellent construction quality and transparent process. Janapriya delivered exactly what they promised. Highly recommended!",rating:5},
              {name:"Priya Sharma",role:"Doctor, Secunderabad",text:"Bought a 3BHK in Janapriya Heights. The team was professional at every step. Best decision of my life!",rating:5},
              {name:"Venkat Reddy",role:"Business Owner, Hyderabad",text:"Invested in Janapriya Meadows villa. Superb quality, premium location. Great ROI and an even better living experience.",rating:5},
            ].map(t => (
              <div key={t.name} className="rounded-2xl p-6 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="flex gap-0.5 mb-4">{Array(t.rating).fill(0).map((_,i)=><span key={i} style={{ color: "#29A9DF" }}>★</span>)}</div>
                <p style={{ color: "rgba(255,255,255,0.75)" }} className="text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div>
                  <div className="font-bold text-white text-sm">{t.name}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)" }} className="text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: "linear-gradient(135deg, #29A9DF, #2A3887)" }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to Find Your Dream Home?</h2>
          <p style={{ color: "rgba(255,255,255,0.8)" }} className="mb-8">Talk to our experts today. Site visits available 7 days a week.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="px-8 py-4 bg-white font-bold rounded-full transition-all hover:scale-105 hover:shadow-xl"
              style={{ color: "#2A3887" }}>Schedule a Visit</Link>
            <Link href="/projects" className="px-8 py-4 font-bold rounded-full transition-all"
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "2px solid rgba(255,255,255,0.4)" }}>
              Browse Projects
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
