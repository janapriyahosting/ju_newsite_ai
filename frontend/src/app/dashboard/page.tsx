"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCustomer, clearSession, isLoggedIn, customerApi } from "@/lib/customerAuth";
import { getSaved, toggleSaved as _toggleSaved } from "@/lib/savedProperties";

const TABS = [
  {id:"overview", label:"Overview", icon:"🏠"},
  {id:"bookings", label:"My Bookings", icon:"📋"},
  {id:"visits", label:"Site Visits", icon:"📅"},
  {id:"saved", label:"Saved Properties", icon:"❤️"},
  {id:"password", label:"Change Password", icon:"🔒"},
  {id:"profile", label:"Profile", icon:"👤"},
];

export default function DashboardPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [tab, setTab] = useState("overview");
  const [bookings, setBookings] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pwForm, setPwForm] = useState({ current: "", newpw: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState({ text: "", ok: false });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    setCustomer(getCustomer());
    setSavedIds(getSaved());
    loadData();
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [b, v] = await Promise.allSettled([
        customerApi("/bookings"),
        customerApi("/site-visits"),
      ]);
      if (b.status === "fulfilled") { const bv = b.value as any; setBookings(Array.isArray(bv) ? bv : (bv?.items || [])); }
      if (v.status === "fulfilled") { const vv = v.value as any; setVisits(Array.isArray(vv) ? vv : (vv?.items || [])); }
    } catch {}
    setLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg({ text: "", ok: false });
    if (pwForm.newpw !== pwForm.confirm) { setPwMsg({ text: "New passwords do not match", ok: false }); return; }
    if (pwForm.newpw.length < 8) { setPwMsg({ text: "Password must be at least 8 characters", ok: false }); return; }
    setPwLoading(true);
    try {
      const res = await customerApi("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.newpw }),
      });
      setPwMsg({ text: res.message || "Password updated successfully! ✅", ok: true });
      setPwForm({ current: "", newpw: "", confirm: "" });
    } catch (err: any) {
      setPwMsg({ text: err.message || "Failed to update password", ok: false });
    }
    setPwLoading(false);
  }

  if (!customer) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F9FB" }}>
      <div className="text-center"><div className="text-4xl animate-spin mb-4">⟳</div></div>
    </div>
  );

  return (
    <main style={{ fontFamily: "'Lato',sans-serif", background: "#F8F9FB" }} className="min-h-screen">
      <Navbar />

      {/* Top Banner */}
      <div className="pt-16" style={{ background: "linear-gradient(135deg,#262262,#2A3887)" }}>
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#29A9DF,#00C2FF)" }}>
              {customer.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ color: "#29A9DF" }} className="text-xs font-bold tracking-widest uppercase">My Account</p>
              <h1 className="text-xl font-black text-white">Welcome, {customer.name.split(" ")[0]}!</h1>
              <p style={{ color: "rgba(255,255,255,0.55)" }} className="text-xs">{customer.email}</p>
            </div>
          </div>
          <button onClick={() => { clearSession(); router.push("/login"); }}
            className="px-5 py-2 text-sm font-bold rounded-full"
            style={{ border: "1.5px solid rgba(255,255,255,0.3)", color: "white" }}>
            Sign Out
          </button>
        </div>

        {/* Stats */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Bookings", value: bookings.length, icon: "🏠" },
              { label: "Site Visits", value: visits.length, icon: "📅" },
              { label: "Saved Units", value: savedIds.length, icon: "❤️" },
              { label: "Status", value: customer.is_verified ? "Verified" : "Pending", icon: "✅" },
            ].map(s => (
              <div key={s.label} className="rounded-t-xl px-4 pt-4 pb-3 text-center"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-black text-white">{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.5)" }} className="text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-16 z-30 bg-white border-b shadow-sm overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6 flex gap-1 min-w-max">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5"
              style={tab === t.id ? { color: "#2A3887", borderColor: "#29A9DF" } : { color: "#666", borderColor: "transparent" }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-black mb-4" style={{ color: "#262262" }}>Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {icon:"🔍",label:"Browse Units",href:"/store"},
                  {icon:"📅",label:"Book Site Visit",href:"/contact"},
                  {icon:"🏘️",label:"Our Projects",href:"/projects"},
                  {icon:"⇄",label:"Compare",href:"/store"},
                ].map(a => (
                  <Link key={a.label} href={a.href}
                    className="flex flex-col items-center gap-2 p-5 rounded-2xl text-center transition-all hover:-translate-y-0.5 hover:shadow-md bg-white"
                    style={{ border: "1.5px solid #E2F1FC" }}>
                    <span className="text-3xl">{a.icon}</span>
                    <span className="text-sm font-bold" style={{ color: "#2A3887" }}>{a.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-lg font-black mb-4" style={{ color: "#262262" }}>Recent Activity</h2>
              {bookings.length === 0 && visits.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center" style={{ border: "1.5px dashed #E2F1FC" }}>
                  <div className="text-4xl mb-3">🏠</div>
                  <p style={{ color: "#555" }} className="font-semibold">No activity yet</p>
                  <p style={{ color: "#999" }} className="text-sm mt-1 mb-4">Start exploring our projects</p>
                  <Link href="/projects" className="inline-block px-6 py-2.5 text-white text-sm font-bold rounded-full"
                    style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>Explore Projects</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...bookings.slice(0,2).map(b => ({...b, _type:"booking"})),
                    ...visits.slice(0,2).map(v => ({...v, _type:"visit"}))
                  ].map((item, i) => (
                    <div key={i} className="bg-white flex items-center gap-4 p-4 rounded-xl"
                      style={{ border: "1px solid #E2F1FC" }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: "#E2F1FC" }}>
                        {item._type === "booking" ? "🏠" : "📅"}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: "#2A3887" }}>
                          {item._type === "booking" ? `Booking #${item.id?.slice(0,8)}` : `Site Visit - ${item.preferred_date || "Scheduled"}`}
                        </p>
                        <p style={{ color: "#999" }} className="text-xs">{new Date(item.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: "#E2F1FC", color: "#2A3887" }}>
                        {item.status || item.booking_status || "Active"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Bookings ── */}
        {tab === "bookings" && (
          <div>
            <h2 className="text-lg font-black mb-5" style={{ color: "#262262" }}>My Bookings</h2>
            {bookings.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1.5px dashed #E2F1FC" }}>
                <div className="text-5xl mb-4">🏠</div>
                <p className="font-bold text-lg mb-2" style={{ color: "#555" }}>No bookings yet</p>
                <Link href="/projects" className="inline-block px-8 py-3 text-white font-bold rounded-full"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>Browse Projects</Link>
              </div>
            ) : bookings.map((b: any, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl mb-3 flex justify-between items-center"
                style={{ border: "1px solid #E2F1FC" }}>
                <div>
                  <p className="font-black" style={{ color: "#2A3887" }}>Booking #{b.id?.slice(0,8)}</p>
                  <p style={{ color: "#555" }} className="text-sm mt-0.5">Unit: {b.unit_id?.slice(0,8)}</p>
                  <p style={{ color: "#999" }} className="text-xs mt-0.5">{new Date(b.created_at).toLocaleDateString()}</p>
                </div>
                <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "#E2F1FC", color: "#2A3887" }}>
                  {b.booking_status || b.status || "Confirmed"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Site Visits ── */}
        {tab === "visits" && (
          <SiteVisitsTab visits={visits} loading={loading} onRefresh={loadData} />
        )}

        {/* ── Saved Properties ── */}
        {tab === "saved" && (
          <div>
            <h2 className="text-lg font-black mb-5" style={{ color: "#262262" }}>Saved Properties</h2>
            {savedIds.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1.5px dashed #E2F1FC" }}>
                <div className="text-5xl mb-4">❤️</div>
                <p className="font-bold text-lg mb-2" style={{ color: "#555" }}>No saved properties</p>
                <p style={{ color: "#999" }} className="text-sm mb-6">Click the ♡ heart icon on any property to save it here</p>
                <Link href="/store" className="inline-block px-8 py-3 text-white font-bold rounded-full"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>Browse Units</Link>
              </div>
            ) : (
              <div>
                <p style={{ color: "#555" }} className="text-sm mb-4">{savedIds.length} saved unit{savedIds.length > 1 ? "s" : ""}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {savedIds.map(id => (
                    <SavedUnitCard key={id} unitId={id} onRemove={() => setSavedIds(getSaved())} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Change Password ── */}
        {tab === "password" && (
          <div className="max-w-md">
            <h2 className="text-lg font-black mb-2" style={{ color: "#262262" }}>Change Password</h2>
            <p style={{ color: "#555" }} className="text-sm mb-6">Choose a strong password with at least 8 characters</p>
            <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #E2F1FC" }}>
              {pwMsg.text && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ background: pwMsg.ok ? "#F0FDF4" : "#FEF2F2", color: pwMsg.ok ? "#16A34A" : "#DC2626", border: `1px solid ${pwMsg.ok ? "#86EFAC" : "#FCA5A5"}` }}>
                  {pwMsg.text}
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-4">
                {[
                  { key: "current", label: "Current Password", placeholder: "Enter current password" },
                  { key: "newpw", label: "New Password", placeholder: "Min. 8 characters" },
                  { key: "confirm", label: "Confirm New Password", placeholder: "Re-enter new password" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "#2A3887" }}>{f.label}</label>
                    <input type="password" required value={(pwForm as any)[f.key]}
                      onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                      style={{ background: "#F8F9FB", border: "1.5px solid #E2F1FC" }}
                      onFocus={e => e.target.style.borderColor = "#29A9DF"}
                      onBlur={e => e.target.style.borderColor = "#E2F1FC"} />
                  </div>
                ))}
                <button type="submit" disabled={pwLoading}
                  className="w-full py-3 text-white font-bold rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                  {pwLoading ? <><span className="animate-spin">⟳</span> Updating...</> : "Update Password"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Profile ── */}
        {tab === "profile" && (
          <div className="max-w-lg">
            <h2 className="text-lg font-black mb-5" style={{ color: "#262262" }}>My Profile</h2>
            <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #E2F1FC" }}>
              <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: "1px solid #E2F1FC" }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                  {customer.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-lg" style={{ color: "#2A3887" }}>{customer.name}</p>
                  <p style={{ color: "#555" }} className="text-sm">{customer.email}</p>
                </div>
              </div>
              {[
                { label: "Full Name", value: customer.name },
                { label: "Email", value: customer.email },
                { label: "Phone", value: customer.phone || "Not provided" },
                { label: "Account Status", value: customer.is_active ? "✅ Active" : "⚠ Inactive" },
                { label: "Email Verified", value: customer.is_verified ? "✅ Verified" : "⏳ Pending" },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-3"
                  style={{ borderBottom: "1px solid #F0F4FF" }}>
                  <span className="text-sm font-bold" style={{ color: "#555A5C" }}>{row.label}</span>
                  <span className="text-sm" style={{ color: "#333" }}>{row.value}</span>
                </div>
              ))}
              <div className="mt-5 flex gap-3">
                <button onClick={() => setTab("password")}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl"
                  style={{ border: "1.5px solid #2A3887", color: "#2A3887" }}>
                  🔒 Change Password
                </button>
                <button onClick={() => { clearSession(); router.push("/login"); }}
                  className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl"
                  style={{ background: "#DC2626" }}>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

// Helper component for saved unit cards
function SavedUnitCard({ unitId, onRemove }: { unitId: string; onRemove: () => void }) {
  const [unit, setUnit] = useState<any>(null);
  
  useEffect(() => {
    fetch(`http://173.168.0.81:8000/api/v1/units/${unitId}`).then(r => r.json() as Promise<any>).then(setUnit).catch(() => {});
  }, [unitId]);
  if (!unit) return <div className="bg-white rounded-xl p-4 animate-pulse h-32" style={{ border: "1px solid #E2F1FC" }} />;
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: "1px solid #E2F1FC" }}>
      <div className="h-24 flex items-end p-3" style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
        <p className="text-white font-black text-sm">{unit.unit_number}</p>
      </div>
      <div className="p-3">
        <p style={{ color: "#555" }} className="text-xs">{unit.unit_type} · {unit.bedrooms} BHK</p>
        <p className="font-black text-sm mt-1" style={{ color: "#2A3887" }}>
          {unit.base_price ? `₹${(parseFloat(unit.base_price)/100000).toFixed(0)}L` : "On Request"}
        </p>
        <div className="flex gap-2 mt-2">
          <Link href={`/units/${unit.id}`} className="flex-1 text-center py-1.5 text-xs font-bold text-white rounded-lg"
            style={{ background: "#2A3887" }}>View</Link>
          <button onClick={() => { _toggleSaved(unitId); onRemove(); }}
            className="px-3 py-1.5 text-xs font-bold rounded-lg"
            style={{ border: "1px solid #E2F1FC", color: "#DC2626" }}>✕</button>
        </div>
      </div>
    </div>
  );
}

// ── SiteVisitsTab with reschedule ──────────────────────────────────────────
function SiteVisitsTab({ visits, loading, onRefresh }: { visits: any[]; loading: boolean; onRefresh: () => void }) {
  const [rescheduleModal, setRescheduleModal] = useState<any>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      const res = await fetch(`http://173.168.0.81:8000/api/v1/site-visits/${rescheduleModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visit_date: newDate, visit_time: newTime }),
      });
      if (!res.ok) throw new Error("Failed");
      setMsg("✅ Rescheduled successfully!");
      setTimeout(() => { setRescheduleModal(null); setMsg(""); onRefresh(); }, 1500);
    } catch { setMsg("❌ Failed to reschedule. Please contact us."); }
    setSaving(false);
  }

  const statusStyle = (s: string) => ({
    confirmed: { bg: "#DCFCE7", color: "#16A34A" },
    completed: { bg: "#E2F1FC", color: "#2A3887" },
    cancelled: { bg: "#FEE2E2", color: "#DC2626" },
    pending:   { bg: "#FEF3C7", color: "#D97706" },
  }[s] || { bg: "#FEF3C7", color: "#D97706" });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-black" style={{ color: "#262262" }}>My Site Visits</h2>
        <Link href="/contact" className="px-4 py-2 text-sm font-bold text-white rounded-xl"
          style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
          + New Visit
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : visits.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1.5px dashed #E2F1FC" }}>
          <div className="text-5xl mb-4">📅</div>
          <p className="font-bold text-lg mb-2" style={{ color: "#555" }}>No site visits scheduled</p>
          <p style={{ color: "#999" }} className="text-sm mb-5">Come visit our projects in person — we'll guide you through</p>
          <Link href="/contact" className="inline-block px-8 py-3 text-white font-bold rounded-full"
            style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>Schedule a Visit</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {visits.map((v: any) => {
            const st = statusStyle(v.status || "pending");
            const visitDate = v.visit_date ? new Date(v.visit_date).toLocaleDateString("en-IN", {
              weekday: "short", day: "numeric", month: "short", year: "numeric"
            }) : null;
            const canReschedule = !["completed","cancelled"].includes(v.status);
            return (
              <div key={v.id} className="bg-white p-5 rounded-2xl" style={{ border: "1px solid #E2F1FC", boxShadow: "0 2px 10px rgba(42,56,135,0.06)" }}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: "#E2F1FC" }}>📅</div>
                      <div>
                        <p className="font-black text-sm" style={{ color: "#2A3887" }}>
                          {v.name || "Site Visit"} — #{v.id?.slice(0,8)}
                        </p>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-0.5"
                          style={{ background: st.bg, color: st.color }}>
                          {(v.status || "pending").charAt(0).toUpperCase() + (v.status||"pending").slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 text-sm" style={{ color: "#555" }}>
                      {visitDate && (
                        <p className="flex items-center gap-2">
                          <span style={{ color: "#29A9DF" }}>📆</span>
                          <span className="font-semibold">{visitDate}</span>
                        </p>
                      )}
                      {v.visit_time && (
                        <p className="flex items-center gap-2">
                          <span style={{ color: "#29A9DF" }}>🕐</span>
                          <span>{v.visit_time}</span>
                        </p>
                      )}
                      {v.phone && (
                        <p className="flex items-center gap-2">
                          <span style={{ color: "#29A9DF" }}>📞</span>
                          <span>{v.phone}</span>
                        </p>
                      )}
                      {v.notes && (
                        <p className="flex items-center gap-2 col-span-2">
                          <span style={{ color: "#29A9DF" }}>💬</span>
                          <span className="italic text-xs" style={{ color: "#999" }}>"{v.notes}"</span>
                        </p>
                      )}
                    </div>
                    <p style={{ color: "#bbb" }} className="text-xs mt-2">
                      Booked on {new Date(v.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {canReschedule && (
                    <button onClick={() => { setRescheduleModal(v); setNewDate(""); setNewTime(""); setMsg(""); }}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl flex-shrink-0 transition-all hover:scale-105"
                      style={{ background: "#E2F1FC", color: "#2A3887" }}>
                      🔄 Reschedule
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-black text-lg" style={{ color: "#2A3887" }}>Reschedule Visit</h3>
                <p style={{ color: "#555" }} className="text-xs">#{rescheduleModal.id?.slice(0,8)}</p>
              </div>
              <button onClick={() => setRescheduleModal(null)} style={{ color: "#999" }} className="text-xl leading-none">✕</button>
            </div>
            {msg && (
              <div className="mb-4 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: msg.includes("✅") ? "#F0FDF4" : "#FEF2F2",
                  color: msg.includes("✅") ? "#16A34A" : "#DC2626" }}>
                {msg}
              </div>
            )}
            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-black mb-1.5" style={{ color: "#2A3887" }}>New Date</label>
                <input type="date" required value={newDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ background: "#F8F9FB", border: "1.5px solid #E2F1FC" }}
                  onFocus={e => e.target.style.borderColor="#29A9DF"}
                  onBlur={e => e.target.style.borderColor="#E2F1FC"} />
              </div>
              <div>
                <label className="block text-xs font-black mb-1.5" style={{ color: "#2A3887" }}>Preferred Time</label>
                <select value={newTime} onChange={e => setNewTime(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ background: "#F8F9FB", border: "1.5px solid #E2F1FC" }}>
                  <option value="">Select time slot</option>
                  {["9:00 AM","10:00 AM","11:00 AM","12:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setRescheduleModal(null)}
                  className="flex-1 py-3 text-sm font-bold rounded-xl"
                  style={{ border: "1.5px solid #ddd", color: "#555" }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 text-sm font-bold text-white rounded-xl disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                  {saving ? "Saving..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
