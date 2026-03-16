"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { isSaved, toggleSaved, toggleCompare, isInCompare } from "@/lib/savedProperties";

const API = "http://173.168.0.81:8000/api/v1";

function formatPrice(p: any) {
  if (!p) return "Price on request";
  const n = parseFloat(p);
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(0)} L`;
  return `₹${n.toLocaleString()}`;
}


function toFtIn(val: any, unit: string): string {
  const n = parseFloat(val) || 0;
  if (unit === 'ft') {
    const feet = Math.floor(n);
    const inches = Math.round((n - feet) * 12);
    return `${feet}'${inches.toString().padStart(2,'0')}"`;
  }
  if (unit === 'm') return `${n.toFixed(2)}m`;
  return `${n}"`;
}

export default function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [tower, setTower] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [toast, setToast] = useState("");
  const [enquireOpen, setEnquireOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API}/units/${id}`)
      .then(r => r.json() as Promise<any>)
      .then(async u => {
        setUnit(u);
        setSaved(isSaved(u.id));
        setInCompare(isInCompare(u.id));
        // Load tower
        if (u.tower_id) {
          const t = await fetch(`${API}/units?tower_id=${u.tower_id}&limit=1`).then(r=>r.json() as Promise<any>).catch(()=>null);
          // Try to get project from projects API
          try {
            const projects = await fetch(`${API}/projects`).then(r=>r.json() as Promise<any>);
            const projectList = Array.isArray(projects) ? projects : (projects as any).items || [];
            // find project that has this tower
            setProject(projectList[0] || null);
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [id]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  function handleSave() {
    const added = toggleSaved(id as string);
    setSaved(added);
    showToast(added ? "Saved to favourites ❤️" : "Removed from saved");
  }

  function handleCompare() {
    const r = toggleCompare(id as string);
    if (r.error) { showToast(r.error); return; }
    setInCompare(r.added);
    showToast(r.added ? "Added to compare ⇄" : "Removed from compare");
    window.dispatchEvent(new Event("jp_compare_update"));
  }

  function handleShare() {
    const url = window.location.href;
    const text = unit ? `Check out: ${unit.unit_number} — ${unit.unit_type}, ${formatPrice(unit.base_price)} | Janapriya Upscale` : "Janapriya Upscale Property";
    if (navigator.share) { navigator.share({ title: "Janapriya Upscale", text, url }).catch(() => {}); }
    else { navigator.clipboard.writeText(`${text}\n${url}`); showToast("Link copied! 📋"); }
  }

  async function handleEnquire(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`${API}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, unit_id: id, source: "unit_detail" }),
      });
      setSubmitted(true);
    } catch {}
    setSubmitting(false);
  }

  if (loading) return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F9FB" }}>
        <div className="text-center">
          <div className="text-4xl animate-spin mb-3">⟳</div>
          <p style={{ color: "#555" }}>Loading unit details...</p>
        </div>
      </div>
    </main>
  );

  if (!unit) return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F9FB" }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🏠</div>
          <p className="font-bold text-lg mb-4" style={{ color: "#2A3887" }}>Unit not found</p>
          <Link href="/store" className="px-6 py-3 text-white font-bold rounded-full"
            style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>Browse All Units</Link>
        </div>
      </div>
    </main>
  );

  const statusColor = unit.status === "available" ? "#22c55e" : unit.status === "booked" ? "#ef4444" : "#f59e0b";

  return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* Breadcrumb */}
      <div className="pt-16 bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-xs" style={{ color: "#999" }}>
          <Link href="/" className="hover:text-[#2A3887]">Home</Link>
          <span>›</span>
          <Link href="/store" className="hover:text-[#2A3887]">Store</Link>
          <span>›</span>
          <span style={{ color: "#2A3887" }} className="font-bold">{unit.unit_number}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Card */}
            <div className="rounded-3xl overflow-hidden" style={{ boxShadow: "0 8px 40px rgba(42,56,135,0.15)" }}>
              <div className="h-64 relative flex flex-col justify-between p-6"
                style={{ background: "linear-gradient(135deg,#262262 0%,#2A3887 50%,#29A9DF 100%)" }}>
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1.5 rounded-full text-sm font-black bg-white" style={{ color: statusColor }}>
                    ● {(unit.status || "available").charAt(0).toUpperCase() + (unit.status||"").slice(1)}
                  </span>
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {[
                      { fn: handleSave, icon: saved ? "♥" : "♡", bg: saved ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.2)", title: "Save" },
                      { fn: handleCompare, icon: "⇄", bg: inCompare ? "rgba(245,158,11,0.9)" : "rgba(255,255,255,0.2)", title: "Compare" },
                      { fn: handleShare, icon: "↗", bg: "rgba(255,255,255,0.2)", title: "Share" },
                    ].map((btn, i) => (
                      <button key={i} onClick={btn.fn} title={btn.title}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base transition-all hover:scale-110"
                        style={{ background: btn.bg }}>
                        {btn.icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-sm uppercase tracking-wider mb-1">
                    {unit.unit_type && unit.unit_type.includes("BHK") ? unit.unit_type : `${unit.unit_type}${unit.bedrooms ? " · " + unit.bedrooms + " BHK" : ""}`}
                  </p>
                  <h1 className="text-3xl font-black text-white">{unit.unit_number}</h1>
                  {project && <p style={{ color: "rgba(255,255,255,0.7)" }} className="text-sm mt-1">📍 {project.name}</p>}
                </div>
                {toast && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white rounded-full text-sm font-bold shadow-xl"
                    style={{ color: "#2A3887" }}>{toast}</div>
                )}
              </div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: "🛏", label: "Bedrooms", value: unit.bedrooms || "—" },
                { icon: "🚿", label: "Bathrooms", value: unit.bathrooms || "—" },
                { icon: "📐", label: "Super Area", value: unit.area_sqft ? `${parseFloat(unit.area_sqft).toFixed(0)} sqft` : "—" },
                { icon: "🏠", label: "Carpet Area", value: unit.carpet_area ? `${parseFloat(unit.carpet_area).toFixed(0)} sqft` : "—" },
                { icon: "🏢", label: "Floor", value: unit.floor_number ?? "—" },
                { icon: "🧭", label: "Facing", value: unit.facing || "—" },
                { icon: "🏡", label: "Balconies", value: unit.balconies ?? "—" },
                { icon: "🌱", label: "Plot Area", value: unit.plot_area ? `${parseFloat(unit.plot_area).toFixed(0)} sqft` : "—" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: "#F8F9FB", border: "1px solid #E2F1FC" }}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="font-black text-sm" style={{ color: "#2A3887" }}>{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#999" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="rounded-2xl p-6" style={{ background: "#F8F9FB", border: "1px solid #E2F1FC" }}>
              <h2 className="font-black text-lg mb-4" style={{ color: "#262262" }}>Price Details</h2>
              <div className="space-y-3">
                {[
                  { label: "Base Price", value: formatPrice(unit.base_price), highlight: true },
                  { label: "Price per sqft", value: unit.area_sqft && unit.base_price ? `₹${Math.round(parseFloat(unit.base_price)/parseFloat(unit.area_sqft)).toLocaleString()}` : "—" },
                  { label: "Floor Premium", value: unit.floor_premium ? formatPrice(unit.floor_premium) : "Nil" },
                  { label: "Parking", value: unit.parking_price ? formatPrice(unit.parking_price) : "Included" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-2"
                    style={{ borderBottom: "1px solid #E2F1FC" }}>
                    <span className="text-sm" style={{ color: "#555" }}>{row.label}</span>
                    <span className={`font-black text-sm ${row.highlight ? "text-2xl" : ""}`}
                      style={{ color: row.highlight ? "#2A3887" : "#333" }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            {(unit.amenities || unit.description) && (
              <div className="rounded-2xl p-6" style={{ background: "#F8F9FB", border: "1px solid #E2F1FC" }}>
                <h2 className="font-black text-lg mb-4" style={{ color: "#262262" }}>About This Unit</h2>
                {unit.description && <p style={{ color: "#555" }} className="text-sm leading-relaxed mb-4">{unit.description}</p>}
                {unit.amenities && Array.isArray(unit.amenities) && unit.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {unit.amenities.map((a: string, i: number) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ background: "#E2F1FC", color: "#2A3887" }}>✓ {a}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

              {/* ── Room Dimensions ── */}
              {unit.dimensions && unit.dimensions.length > 0 && (
                <div className="mt-8 pt-6 border-t" style={{borderColor:"#e2e8f0"}}>
                  <h3 className="text-lg font-black mb-4" style={{color:"#262262"}}>
                    📐 Room Dimensions
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {unit.dimensions.map((d: any, idx: number) => (
                      <div key={idx} className="rounded-xl px-4 py-3 border"
                        style={{borderColor:"#e2e8f0", background:"#f8fafc"}}>
                        <p className="text-xs font-bold uppercase tracking-wide mb-1"
                          style={{color:"#94a3b8"}}>{d.room}</p>
                        <p className="text-base font-black" style={{color:"#2A3887"}}>
                          {d.width}
                          <span className="mx-1 font-normal text-sm" style={{color:"#cbd5e1"}}>×</span>
                          {d.length}
                          <span className="text-xs font-medium ml-1" style={{color:"#94a3b8"}}>{d.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

          {/* Right: Sticky CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Price Card */}
              <div className="rounded-2xl p-6" style={{ boxShadow: "0 8px 30px rgba(42,56,135,0.15)", border: "1px solid #E2F1FC" }}>
                <p style={{ color: "#999" }} className="text-xs uppercase tracking-wide mb-1">Starting from</p>
                <p className="text-3xl font-black mb-1" style={{ color: "#2A3887" }}>{formatPrice(unit.base_price)}</p>
                {unit.area_sqft && unit.base_price && (
                  <p style={{ color: "#29A9DF" }} className="text-sm font-semibold mb-5">
                    ₹{Math.round(parseFloat(unit.base_price)/parseFloat(unit.area_sqft)).toLocaleString()}/sqft
                  </p>
                )}
                <button onClick={() => setEnquireOpen(true)}
                  className="w-full py-3.5 text-white font-black rounded-xl text-sm mb-3 transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                  Enquire Now
                </button>
                <Link href={`/contact?unit=${unit.id}&visit=1`}
                  className="block w-full py-3.5 text-center font-black rounded-xl text-sm transition-all"
                  style={{ border: "2px solid #2A3887", color: "#2A3887" }}>
                  📅 Book Site Visit
                </Link>
              </div>

              {/* Share Card */}
              <div className="rounded-2xl p-5" style={{ background: "#F8F9FB", border: "1px solid #E2F1FC" }}>
                <p className="text-xs font-black mb-3" style={{ color: "#2A3887" }}>Share this property</p>
                <div className="flex gap-2">
                  {[
                    { label: "WhatsApp", icon: "📱", color: "#25D366",
                      fn: () => window.open(`https://wa.me/?text=${encodeURIComponent(`${unit.unit_number} — ${formatPrice(unit.base_price)}\n${window.location.href}`)}`) },
                    { label: "Copy Link", icon: "🔗", color: "#2A3887",
                      fn: () => { navigator.clipboard.writeText(window.location.href); showToast("Copied!"); } },
                    { label: "Email", icon: "✉️", color: "#29A9DF",
                      fn: () => window.open(`mailto:?subject=Property: ${unit.unit_number}&body=${window.location.href}`) },
                  ].map(btn => (
                    <button key={btn.label} onClick={btn.fn}
                      className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                      style={{ background: `${btn.color}15`, color: btn.color }}>
                      <span className="text-lg">{btn.icon}</span>
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compare + Save */}
              <div className="flex gap-3">
                <button onClick={handleSave}
                  className="flex-1 py-3 font-bold rounded-xl text-sm transition-all"
                  style={{ background: saved ? "#FEE2E2" : "#F8F9FB", color: saved ? "#DC2626" : "#555", border: "1.5px solid #E2F1FC" }}>
                  {saved ? "♥ Saved" : "♡ Save"}
                </button>
                <button onClick={handleCompare}
                  className="flex-1 py-3 font-bold rounded-xl text-sm transition-all"
                  style={{ background: inCompare ? "#FEF3C7" : "#F8F9FB", color: inCompare ? "#D97706" : "#555", border: "1.5px solid #E2F1FC" }}>
                  {inCompare ? "⇄ In Compare" : "⇄ Compare"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enquire Modal */}
      {enquireOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md" style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
            {submitted ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="font-black text-xl mb-2" style={{ color: "#2A3887" }}>Enquiry Submitted!</h3>
                <p style={{ color: "#555" }} className="text-sm mb-4">Our team will contact you shortly.</p>
                <button onClick={() => { setEnquireOpen(false); setSubmitted(false); }}
                  className="px-6 py-2.5 text-white font-bold rounded-full"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>Close</button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="font-black text-lg" style={{ color: "#2A3887" }}>Enquire About This Unit</h3>
                    <p style={{ color: "#555" }} className="text-sm">{unit.unit_number} · {formatPrice(unit.base_price)}</p>
                  </div>
                  <button onClick={() => setEnquireOpen(false)} style={{ color: "#999" }} className="hover:text-gray-600">✕</button>
                </div>
                <form onSubmit={handleEnquire} className="space-y-3">
                  {[
                    {key:"name",label:"Your Name",type:"text",req:true},
                    {key:"phone",label:"Phone Number",type:"tel",req:true},
                    {key:"email",label:"Email Address",type:"email",req:false},
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold mb-1" style={{ color: "#2A3887" }}>{f.label}</label>
                      <input type={f.type} required={f.req} value={(form as any)[f.key]}
                        onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                        className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                        style={{ background: "#F8F9FB", border: "1.5px solid #E2F1FC" }}
                        onFocus={e => e.target.style.borderColor="#29A9DF"}
                        onBlur={e => e.target.style.borderColor="#E2F1FC"} />
                    </div>
                  ))}
                  <textarea value={(form as any).message} onChange={e => setForm(p => ({...p, message: e.target.value}))}
                    placeholder="Any specific questions? (optional)"
                    rows={2} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
                    style={{ background: "#F8F9FB", border: "1.5px solid #E2F1FC" }} />
                  <button type="submit" disabled={submitting}
                    className="w-full py-3 text-white font-black rounded-xl transition-all disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                    {submitting ? "Submitting..." : "Submit Enquiry"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
