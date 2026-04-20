"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const FILTERS = ["All","Ready to Move","Under Construction","New Launch"];

function statusColor(s: string) {
  if (s?.toLowerCase().includes("ready")) return "#22c55e";
  if (s?.toLowerCase().includes("new")) return "#29A9DF";
  return "#f59e0b";
}
function statusBg(s: string) {
  if (s?.toLowerCase().includes("ready")) return "#f0fdf4";
  if (s?.toLowerCase().includes("new")) return "#eff6ff";
  return "#fffbeb";
}
function stageLabel(s: string) {
  if (!s) return "—";
  return String(s).replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
}
function fmtPrice(p: number) {
  if (!p) return "On Request";
  if (p >= 10000000) return `₹${(p/10000000).toFixed(1)}Cr`;
  if (p >= 100000) return `₹${(p/100000).toFixed(0)}L`;
  return `₹${p.toLocaleString("en-IN")}`;
}

export default function ProjectsPage() {
  const [filter, setFilter] = useState("All");
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/projects?limit=50`)
      .then(r => r.json())
      .then(d => { setAllProjects(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = allProjects.filter(p => {
    if (filter === "All") return true;
    const stage = (p.construction_stage || "").toString().replace(/_/g, " ").toLowerCase();
    return stage === filter.toLowerCase();
  });

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-16"><BackButton /></div>

      {/* Header */}
      <div className="pt-20 py-16" style={{ background:"linear-gradient(135deg,#262262,#2A3887)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <p style={{ color:"#29A9DF" }} className="text-xs font-bold tracking-widest uppercase mb-3">Our Portfolio</p>
          <h1 className="text-5xl font-black text-white">Our Projects</h1>
          <p style={{ color:"rgba(255,255,255,0.7)" }} className="mt-3 max-w-xl">Explore premium residential communities built for every aspiration — from affordable homes to ultra-luxury living.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-30 bg-white border-b py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-3 items-center">
          <span style={{ color:"#555" }} className="text-sm font-semibold mr-2">Filter:</span>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all"
              style={filter===f
                ? { background:"#2A3887", color:"white", borderColor:"#2A3887" }
                : { background:"white", color:"#555", borderColor:"#ddd" }}>
              {f}
            </button>
          ))}
          <span style={{ color:"#29A9DF" }} className="ml-auto text-sm font-bold">{filtered.length} Projects</span>
        </div>
      </div>

      <section className="py-16 max-w-7xl mx-auto px-6">
  {loading ? (
    <div className="text-center py-20">
      <div className="text-4xl animate-spin mb-3">⟳</div>
      <p style={{ color: "#999" }}>Loading projects...</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {filtered.map((p) => (
        <div
          key={p.id}
          className="bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
          style={{
            boxShadow: "0 4px 24px rgba(42,56,135,0.10)",
            border: "1.5px solid #E2F1FC",
          }}
        >
          {/* ── Top bar: status + units count ── */}
          <div className="px-4 pt-4 pb-2 flex justify-between items-center">
            <span
              className="px-3 py-1 rounded-full text-xs font-black"
              style={{
                color: statusColor(p.construction_stage),
                background: statusBg(p.construction_stage),
              }}
            >
              ● {stageLabel(p.construction_stage) || "—"}
            </span>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: "#F8F9FB", color: "#2A3887" }}
            >
              🏠 {p.total_units || "—"} units
            </span>
          </div>

          {/* ── Project image ── */}
          <div className="px-3 pb-1">
            <Link href={`/projects/${p.slug}`} className="block">
              <div
                className="relative rounded-xl overflow-hidden w-full cursor-pointer"
                style={{ height: "220px", background: "#F4F6FB" }}
              >
                {/* Image */}
                {(p.thumbnail || (p.images && p.images[0])) ? (
                  <img
                    src={(p.thumbnail || p.images[0])
                      .split("/")
                      .map((s: string) => encodeURIComponent(s))
                      .join("/")}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e: any) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  /* Placeholder */
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-2"
                    style={{
                      background:
                        "linear-gradient(135deg,#eef2ff 0%,#e0f2fe 100%)",
                    }}
                  >
                    <span style={{ fontSize: 48, opacity: 0.2 }}>🏗️</span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "#aac" }}
                    >
                      Image coming soon
                    </span>
                  </div>
                )}

                {/* Subtle bottom fade for name overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-3 py-2"
                  style={{
                    background:
                      "linear-gradient(0deg,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0) 100%)",
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: "#888" }}>
                    {p.property_type || p.unit_types || "Residential"}
                  </p>
                  <h3
                    className="font-black text-base leading-tight"
                    style={{ color: "#2A3887" }}
                  >
                    {p.name}
                  </h3>
                </div>
              </div>
            </Link>
          </div>

          {/* ── Card body ── */}
          <div className="p-4 flex flex-col gap-3">
            {/* Location */}
            <p className="text-sm" style={{ color: "#555A5C" }}>
              📍 {p.location || p.city},{" "}
              {p.city !== p.location ? p.city : "Hyderabad"}
            </p>

            {/* Description */}
            <p
              className="text-xs leading-relaxed"
              style={{ color: "#777" }}
            >
              {p.description?.substring(0, 100)}
              {p.description?.length > 100 ? "..." : ""}
            </p>

            {/* Price */}
            <div
              className="flex items-center justify-between pt-2"
              style={{ borderTop: "1px solid #F0F4FF" }}
            >
              <div>
                <div
                  className="font-black text-lg"
                  style={{ color: "#2A3887" }}
                >
                  {p.min_price && p.max_price
                    ? `${fmtPrice(p.min_price)} – ${fmtPrice(p.max_price)}`
                    : "On Request"}
                </div>
                {p.min_price && (
                  <div className="text-xs" style={{ color: "#999" }}>
                    Starting price
                  </div>
                )}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex gap-2">
              <Link
                href={`/projects/${p.slug}`}
                className="flex-1 text-center py-2.5 text-white text-sm font-bold rounded-xl transition-colors"
                style={{
                  background: "linear-gradient(135deg,#2A3887,#29A9DF)",
                }}
              >
                View Details
              </Link>
              <Link
                href={`/projects/${p.slug}#enquire`}
                className="flex-1 text-center py-2.5 text-sm font-bold rounded-xl transition-colors"
                style={{ border: "1.5px solid #2A3887", color: "#2A3887" }}
              >
                Enquire
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Empty state */}
      {filtered.length === 0 && !loading && (
        <div
          className="col-span-3 text-center py-20"
          style={{ color: "#999" }}
        >
          <p className="text-4xl mb-3">🏗️</p>
          <p className="font-bold">No projects found for this filter</p>
        </div>
      )}
    </div>
  )}
</section>

      {/* CTA */}
      <section className="py-16" style={{ background:"#F8F9FB" }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black mb-3" style={{ color:"#262262" }}>Can't Find What You're Looking For?</h2>
          <p style={{ color:"#555A5C" }} className="mb-8">Talk to our project advisors — we'll match you with the perfect home.</p>
          <Link href="/contact" className="inline-block px-8 py-4 text-white font-bold rounded-full transition-all hover:scale-105"
            style={{ background:"linear-gradient(135deg,#2A3887,#29A9DF)" }}>Talk to an Advisor</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
