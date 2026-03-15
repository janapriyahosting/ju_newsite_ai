"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://173.168.0.81:8000/api/v1";

function fmtPrice(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

interface Project {
  id: string; name: string; slug: string; description: string;
  location: string; address: string; city: string; state: string;
  pincode: string; rera_number: string; amenities: string[];
  images: string[]; brochure_url: string | null; video_url: string | null;
  status: string; is_featured: boolean;
}
interface Unit {
  id: string; unit_type: string; unit_number: string; floor: number;
  area_sqft: number; price: number; status: string; facing: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "units" | "amenities">("overview");
  const [enquireOpen, setEnquireOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/projects?limit=50`);
        const data = await res.json();
        const proj = (data.items || []).find((p: Project) => p.slug === slug);
        if (!proj) { router.push("/projects"); return; }
        setProject(proj);
        const uRes = await fetch(`${API}/units?project_id=${proj.id}&limit=100`);
        const uData = await uRes.json();
        setUnits(uData.items || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [slug, router]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Lato',sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "4px solid #29A9DF", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#666" }}>Loading project...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (!project) return null;

  const availableUnits = units.filter(u => u.status === "available");
  const prices = units.map(u => u.price).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const unitTypes = Array.from(new Set(units.map(u => u.unit_type).filter(Boolean))];

  const STATUS: Record<string, { bg: string; color: string }> = {
    available: { bg: "#DCFCE7", color: "#16A34A" },
    booked:    { bg: "#FEE2E2", color: "#DC2626" },
    hold:      { bg: "#FEF3C7", color: "#D97706" },
    sold:      { bg: "#F0F4FF", color: "#2A3887" },
  };

  return (
    <div style={{ fontFamily: "'Lato',sans-serif", minHeight: "100vh", background: "#F8F9FB" }}>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#262262 0%,#2A3887 50%,#29A9DF 100%)", padding: "24px 0 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <Link href="/projects" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "white", background: "rgba(255,255,255,0.15)", padding: "8px 16px", borderRadius: 12, textDecoration: "none", marginBottom: 24 }}>
            ← Back to Projects
          </Link>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
            <div>
              {project.status && (
                <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: "rgba(255,255,255,0.2)", color: "white", marginBottom: 10 }}>
                  {project.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              )}
              <h1 style={{ fontSize: 36, fontWeight: 900, color: "white", margin: "0 0 8px" }}>{project.name}</h1>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", margin: "0 0 4px" }}>📍 {project.address || project.location}, {project.city}</p>
              {project.rera_number && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>RERA: {project.rera_number}</p>}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setEnquireOpen(true)} style={{ padding: "12px 24px", fontWeight: 700, fontSize: 13, borderRadius: 12, background: "white", color: "#262262", border: "none", cursor: "pointer" }}>
                📋 Enquire Now
              </button>
              <button onClick={() => setVisitOpen(true)} style={{ padding: "12px 24px", fontWeight: 700, fontSize: 13, borderRadius: 12, background: "rgba(255,255,255,0.15)", color: "white", border: "2px solid rgba(255,255,255,0.4)", cursor: "pointer" }}>
                🏡 Site Visit
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 40, marginTop: 32 }}>
            {[
              { label: "Total Units", value: units.length || "—" },
              { label: "Available", value: availableUnits.length },
              { label: "Price Range", value: minPrice > 0 ? `${fmtPrice(minPrice)} – ${fmtPrice(maxPrice)}` : "On Request" },
              { label: "Unit Types", value: unitTypes.length > 0 ? unitTypes.join(", ") : "Mixed" },
            ].map(s => (
              <div key={s.label} style={{ color: "white" }}>
                <p style={{ fontSize: 26, fontWeight: 900, margin: "0 0 2px" }}>{String(s.value)}</p>
                <p style={{ fontSize: 11, opacity: 0.7, margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex" }}>
          {(["overview", "units", "amenities"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "16px 24px", fontSize: 13, fontWeight: 700, background: "none", border: "none", borderBottom: activeTab === t ? "3px solid #29A9DF" : "3px solid transparent", color: activeTab === t ? "#2A3887" : "#999", cursor: "pointer", textTransform: "capitalize" }}>
              {t === "units" ? `Units (${units.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Overview */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "white", borderRadius: 16, padding: 24, border: "1px solid #E2F1FC" }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: "#262262", margin: "0 0 12px" }}>About the Project</h2>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "#555", margin: 0 }}>{project.description || "Premium residential project by Janapriya."}</p>
              </div>
              {unitTypes.length > 0 && (
                <div style={{ background: "white", borderRadius: 16, padding: 24, border: "1px solid #E2F1FC" }}>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: "#262262", margin: "0 0 16px" }}>Unit Configuration</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12 }}>
                    {unitTypes.map(type => {
                      const typeUnits = units.filter(u => u.unit_type === type);
                      const avail = typeUnits.filter(u => u.status === "available").length;
                      const tp = typeUnits.map(u => u.price).filter(Boolean);
                      return (
                        <div key={type} onClick={() => setActiveTab("units")} style={{ padding: 16, borderRadius: 12, background: "#F0F4FF", border: "2px solid #E2F1FC", textAlign: "center", cursor: "pointer" }}>
                          <p style={{ fontSize: 18, fontWeight: 900, color: "#2A3887", margin: "0 0 4px" }}>{type}</p>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", margin: "0 0 4px" }}>{avail} available</p>
                          {tp.length > 0 && <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{fmtPrice(Math.min(...tp))}+</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #E2F1FC" }}>
                <h3 style={{ fontSize: 13, fontWeight: 900, color: "#262262", margin: "0 0 16px" }}>Project Details</h3>
                {[
                  { label: "📍 Location", value: `${project.city}, ${project.state}` },
                  { label: "📌 Pincode", value: project.pincode },
                  { label: "🏛️ RERA No.", value: project.rera_number || "Applied" },
                  { label: "🏠 Total Units", value: units.length || "—" },
                  { label: "✅ Available", value: availableUnits.length },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F8F9FB" }}>
                    <span style={{ fontSize: 11, color: "#999" }}>{row.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#555" }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #E2F1FC" }}>
                <h3 style={{ fontSize: 13, fontWeight: 900, color: "#262262", margin: "0 0 16px" }}>Get in Touch</h3>
                <button onClick={() => setEnquireOpen(true)} style={{ width: "100%", padding: "12px", fontWeight: 700, fontSize: 13, color: "white", background: "linear-gradient(135deg,#262262,#29A9DF)", border: "none", borderRadius: 12, cursor: "pointer", marginBottom: 8 }}>
                  📋 Send Enquiry
                </button>
                <button onClick={() => setVisitOpen(true)} style={{ width: "100%", padding: "12px", fontWeight: 700, fontSize: 13, color: "#2A3887", background: "white", border: "2px solid #E2F1FC", borderRadius: 12, cursor: "pointer", marginBottom: project.brochure_url ? 8 : 0 }}>
                  🏡 Book Site Visit
                </button>
                {project.brochure_url && (
                  <a href={project.brochure_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", padding: "12px", fontWeight: 700, fontSize: 13, color: "#29A9DF", textAlign: "center", border: "2px solid #E2F1FC", borderRadius: 12, textDecoration: "none" }}>
                    📄 Download Brochure
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Units */}
        {activeTab === "units" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#262262", margin: "0 0 20px" }}>All Units ({units.length})</h2>
            {units.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 0", color: "#ccc" }}>
                <p style={{ fontSize: 48, margin: "0 0 12px" }}>🏠</p>
                <p style={{ fontWeight: 700 }}>No units found for this project</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
                {units.map(u => {
                  const sc = STATUS[u.status] || { bg: "#F0F4FF", color: "#555" };
                  return (
                    <div key={u.id} style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #E2F1FC", boxShadow: "0 2px 10px rgba(42,56,135,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <p style={{ fontSize: 18, fontWeight: 900, color: "#262262", margin: "0 0 2px" }}>{u.unit_type || "Unit"}</p>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#999", margin: 0 }}>Unit {u.unit_number || u.id.slice(0, 8)}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: sc.bg, color: sc.color, textTransform: "capitalize" }}>
                          {u.status || "available"}
                        </span>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        {u.floor != null && <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>🏢 Floor {u.floor}</p>}
                        {u.area_sqft && <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>📐 {u.area_sqft} sq.ft</p>}
                        {u.facing && <p style={{ fontSize: 12, color: "#888", margin: 0 }}>🧭 {u.facing} Facing</p>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid #F0F4FF" }}>
                        <p style={{ fontSize: 16, fontWeight: 900, color: "#262262", margin: 0 }}>{u.price ? fmtPrice(u.price) : "On Request"}</p>
                        <button onClick={() => setEnquireOpen(true)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "white", background: "linear-gradient(135deg,#2A3887,#29A9DF)", border: "none", borderRadius: 8, cursor: "pointer" }}>
                          Enquire
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Amenities */}
        {activeTab === "amenities" && (
          <div style={{ background: "white", borderRadius: 16, padding: 24, border: "1px solid #E2F1FC" }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#262262", margin: "0 0 24px" }}>Amenities</h2>
            {project.amenities?.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
                {project.amenities.map((a, i) => {
                  const iconMap: Record<string, string> = { "Pool": "🏊", "Gym": "💪", "Club": "🏛️", "Security": "🔐", "Power": "⚡", "Play": "🎠", "Garden": "🌳", "Park": "🅿️", "Lift": "🛗", "CCTV": "📷", "Water": "💧", "Wi-Fi": "📶" };
                  const icon = Object.entries(iconMap).find(([k]) => a.includes(k))?.[1] || "✅";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 12, background: "#F0F4FF", border: "1px solid #E2F1FC" }}>
                      <span style={{ fontSize: 24 }}>{icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#2A3887" }}>{a}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ textAlign: "center", padding: "32px 0", color: "#ccc" }}>No amenities listed</p>
            )}
          </div>
        )}
      </div>

      {enquireOpen && <EnquireModal project={project} onClose={() => setEnquireOpen(false)} />}
      {visitOpen && <SiteVisitModal project={project} onClose={() => setVisitOpen(false)} />}
    </div>
  );
}

function EnquireModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await fetch(`${API}/leads`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, project_id: project.id, source: "website", interest: project.name }),
      });
      setSent(true);
    } catch { /* ignore */ }
    setSending(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.55)" }}>
      <div style={{ background: "white", borderRadius: 24, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: "#262262", margin: "0 0 4px" }}>Enquire About</h3>
            <p style={{ fontSize: 13, color: "#29A9DF", margin: 0 }}>{project.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999" }}>✕</button>
        </div>
        {sent ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#16A34A", margin: "0 0 8px" }}>Enquiry Sent!</p>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>Our team will contact you shortly.</p>
            <button onClick={onClose} style={{ padding: "8px 24px", fontWeight: 700, color: "white", background: "#16A34A", border: "none", borderRadius: 12, cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {[
              { key: "name", label: "Full Name", type: "text", ph: "Your name", req: true },
              { key: "phone", label: "Phone", type: "tel", ph: "Mobile number", req: true },
              { key: "email", label: "Email", type: "email", ph: "your@email.com (optional)", req: false },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 900, color: "#2A3887", marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} placeholder={f.ph} required={f.req}
                  value={(form as Record<string,string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", fontSize: 13, borderRadius: 12, border: "1px solid #E2F1FC", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 900, color: "#2A3887", marginBottom: 4 }}>Message</label>
              <textarea rows={3} placeholder="Tell us what you are looking for..."
                value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", fontSize: 13, borderRadius: 12, border: "1px solid #E2F1FC", outline: "none", resize: "none", boxSizing: "border-box" }} />
            </div>
            <button type="submit" disabled={sending} style={{ width: "100%", padding: 12, fontWeight: 700, fontSize: 13, color: "white", background: "linear-gradient(135deg,#262262,#29A9DF)", border: "none", borderRadius: 12, cursor: "pointer", opacity: sending ? 0.6 : 1 }}>
              {sending ? "Sending..." : "Submit Enquiry"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SiteVisitModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", visit_date: "", visit_time: "9:00 AM" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await fetch(`${API}/site-visits`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, project_id: project.id, visit_date: form.visit_date ? new Date(form.visit_date).toISOString() : null }),
      });
      setSent(true);
    } catch { /* ignore */ }
    setSending(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.55)" }}>
      <div style={{ background: "white", borderRadius: 24, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: "#262262", margin: "0 0 4px" }}>Book Site Visit</h3>
            <p style={{ fontSize: 13, color: "#29A9DF", margin: 0 }}>{project.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999" }}>✕</button>
        </div>
        {sent ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏡</div>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#16A34A", margin: "0 0 8px" }}>Visit Booked!</p>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>We will confirm your slot shortly.</p>
            <button onClick={onClose} style={{ padding: "8px 24px", fontWeight: 700, color: "white", background: "#16A34A", border: "none", borderRadius: 12, cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {[
              { key: "name", label: "Full Name", type: "text", ph: "Your name" },
              { key: "phone", label: "Phone", type: "tel", ph: "Mobile number" },
              { key: "visit_date", label: "Preferred Date", type: "date", ph: "" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 900, color: "#2A3887", marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} placeholder={f.ph} required
                  value={(form as Record<string,string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", fontSize: 13, borderRadius: 12, border: "1px solid #E2F1FC", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 900, color: "#2A3887", marginBottom: 4 }}>Preferred Time</label>
              <select value={form.visit_time} onChange={e => setForm(p => ({ ...p, visit_time: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", fontSize: 13, borderRadius: 12, border: "1px solid #E2F1FC", outline: "none", boxSizing: "border-box" }}>
                {["9:00 AM","10:00 AM","11:00 AM","12:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={sending} style={{ width: "100%", padding: 12, fontWeight: 700, fontSize: 13, color: "white", background: "linear-gradient(135deg,#262262,#29A9DF)", border: "none", borderRadius: 12, cursor: "pointer", opacity: sending ? 0.6 : 1 }}>
              {sending ? "Booking..." : "Book Site Visit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
