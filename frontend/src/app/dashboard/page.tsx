"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCustomer, clearSession, isLoggedIn, customerApi } from "@/lib/customerAuth";
import { getSaved, toggleSaved as _toggleSaved } from "@/lib/savedProperties";
import { validateKycStep1, validateKycStep2, validateKycStep3, validateKycStep4 } from "@/lib/validators";

const TABS = [
  {id:"overview", label:"Overview", icon:"🏠"},
  {id:"bookings", label:"My Bookings", icon:"📋"},
  {id:"kyc", label:"KYC Documents", icon:"📄"},
  {id:"visits", label:"Site Visits", icon:"📅"},
  {id:"saved", label:"Saved Properties", icon:"❤️"},
  {id:"password", label:"Change Password", icon:"🔒"},
  {id:"profile", label:"Profile", icon:"👤"},
];

const API = process.env.NEXT_PUBLIC_API_URL || 'http://173.168.0.81:8000/api/v1';
const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
const RELATIONS = ['Father','Spouse','Mother','Guardian','Brother','Sister','Other'];
const EMP_TYPES = ['Salaried','Self-Employed','Business Owner','Professional','Retired','Homemaker','Other'];

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
      else { console.error("[Dashboard] bookings fetch failed:", b.reason); }
      if (v.status === "fulfilled") { const vv = v.value as any; setVisits(Array.isArray(vv) ? vv : (vv?.items || [])); }
      else { console.error("[Dashboard] visits fetch failed:", v.reason); }
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
                  {icon:"📅",label:"Book Site Visit",href:"/site-visit"},
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
            ) : bookings.map((b: any, i) => {
              const u = b.unit || {};
              const fmtP = (p: any) => { if (!p) return '—'; const n = parseFloat(p); if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`; if (n >= 100000) return `₹${(n/100000).toFixed(1)} L`; return `₹${n.toLocaleString('en-IN')}`; };
              const statusColors: Record<string,{bg:string,color:string}> = {
                confirmed: {bg:'#DCFCE7',color:'#16A34A'}, pending: {bg:'#FEF3C7',color:'#D97706'},
                cancelled: {bg:'#FEE2E2',color:'#DC2626'},
              };
              const sc = statusColors[b.status] || statusColors.pending;
              return (
              <div key={i} className="bg-white rounded-2xl mb-4 overflow-hidden"
                style={{ border: "1px solid #E2F1FC", boxShadow: "0 2px 12px rgba(42,56,135,0.06)" }}>
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg,#262262,#2A3887)" }}>
                  <div>
                    <p className="text-white font-black">{u.unit_number || `Unit ${b.unit_id?.slice(0,8)}`}</p>
                    <p className="text-blue-200 text-xs mt-0.5">
                      {b.project?.name}{b.tower?.name ? ` · ${b.tower.name}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-black" style={{ background: sc.bg, color: sc.color }}>
                      {(b.status || 'pending').toUpperCase()}
                    </span>
                    <p className="text-xs mt-1" style={{ color: b.payment_status === 'paid' ? '#86EFAC' : '#FBBF24' }}>
                      {b.payment_status === 'paid' ? '✓ Paid' : '⏳ ' + (b.payment_status || 'unpaid').toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Unit Details */}
                <div className="px-5 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {u.unit_type && <div className="rounded-lg p-2.5 text-center" style={{ background: "#F8F9FB" }}><p className="text-xs text-gray-400">Type</p><p className="font-black text-sm" style={{ color: "#2A3887" }}>{u.unit_type}</p></div>}
                    {u.bedrooms && <div className="rounded-lg p-2.5 text-center" style={{ background: "#F8F9FB" }}><p className="text-xs text-gray-400">Bedrooms</p><p className="font-black text-sm" style={{ color: "#2A3887" }}>{u.bedrooms} BHK</p></div>}
                    {u.area_sqft && <div className="rounded-lg p-2.5 text-center" style={{ background: "#F8F9FB" }}><p className="text-xs text-gray-400">Area</p><p className="font-black text-sm" style={{ color: "#2A3887" }}>{u.area_sqft} sqft</p></div>}
                    {u.floor_number && <div className="rounded-lg p-2.5 text-center" style={{ background: "#F8F9FB" }}><p className="text-xs text-gray-400">Floor</p><p className="font-black text-sm" style={{ color: "#2A3887" }}>{u.floor_number}</p></div>}
                    {u.facing && <div className="rounded-lg p-2.5 text-center" style={{ background: "#F8F9FB" }}><p className="text-xs text-gray-400">Facing</p><p className="font-black text-sm" style={{ color: "#2A3887" }}>{u.facing}</p></div>}
                    {u.carpet_area && <div className="rounded-lg p-2.5 text-center" style={{ background: "#F8F9FB" }}><p className="text-xs text-gray-400">Carpet</p><p className="font-black text-sm" style={{ color: "#2A3887" }}>{u.carpet_area} sqft</p></div>}
                  </div>

                  {/* Pricing */}
                  <div className="rounded-xl p-4 mb-4" style={{ background: "#F0F4FF", border: "1px solid #E2F1FC" }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><p className="text-xs text-gray-400">Total Price</p><p className="font-black" style={{ color: "#2A3887" }}>{fmtP(b.total_amount)}</p></div>
                      <div><p className="text-xs text-gray-400">Booking (10%)</p><p className="font-black" style={{ color: "#16A34A" }}>{fmtP(b.booking_amount)}</p></div>
                      {parseFloat(b.discount_amount) > 0 && <div><p className="text-xs text-gray-400">Discount</p><p className="font-black text-green-600">- {fmtP(b.discount_amount)}</p></div>}
                      {u.price_per_sqft && <div><p className="text-xs text-gray-400">Rate/sqft</p><p className="font-black" style={{ color: "#2A3887" }}>{fmtP(u.price_per_sqft)}</p></div>}
                    </div>
                  </div>

                  {/* Additional unit fields (admin-controlled via show_on_customer) */}
                  {(() => {
                    const skipKeys = new Set(['id','tower_id','unit_number','unit_type','bedrooms','bathrooms','area_sqft','carpet_area','base_price','floor_number','facing','status','images','is_trending','is_featured','view_count','created_at','updated_at','embedding','floor_plan_img','floor_plans','video_url','walkthrough_url','brochure_url','amenities','dimensions','plot_area','description','price_per_sqft','down_payment','emi_estimate','balconies']);
                    const extras = Object.entries(u).filter(([k, v]) => !skipKeys.has(k) && v !== null && v !== '' && v !== undefined);
                    if (!extras.length) return null;
                    return (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Additional Details</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {extras.map(([k, v]) => (
                            <div key={k} className="text-xs"><span className="text-gray-400">{k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}:</span> <span className="text-gray-700 font-medium">{String(v)}</span></div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Booking Meta */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t" style={{ borderColor: "#E2F1FC", color: "#999" }}>
                    <div>Booking ID: <span className="font-mono font-bold" style={{ color: "#555" }}>{b.id?.slice(0,8).toUpperCase()}</span></div>
                    {b.razorpay_payment_id && <div>Payment ID: <span className="font-mono">{b.razorpay_payment_id}</span></div>}
                    <div>Booked: {b.booked_at ? new Date(b.booked_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                    {b.confirmed_at && <div>Confirmed: {new Date(b.confirmed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
                    {b.project?.rera_number && <div>RERA: {b.project.rera_number}</div>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setTab("kyc")}
                      className="flex-1 text-center py-2.5 text-xs font-bold rounded-xl"
                      style={{ background: b.kyc_submitted ? "#DCFCE7" : "#FEF3C7", color: b.kyc_submitted ? "#16A34A" : "#92400E" }}>
                      {b.kyc_submitted ? '✓ KYC Submitted — Edit' : '📄 Upload KYC Documents'}
                    </button>
                    <Link href={`/units/${b.unit_id}`}
                      className="px-4 py-2.5 text-xs font-bold rounded-xl text-center"
                      style={{ border: "1px solid #2A3887", color: "#2A3887" }}>
                      View Unit
                    </Link>
                  </div>
                </div>
              </div>);
            })}
          </div>
        )}

        {/* ── KYC Documents ── */}
        {tab === "kyc" && (
          <KYCTab bookings={bookings} token={localStorage.getItem("jp_token") || ""} />
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
        <Link href="/site-visit" className="px-4 py-2 text-sm font-bold text-white rounded-xl"
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
          <Link href="/site-visit" className="inline-block px-8 py-3 text-white font-bold rounded-full"
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

/* ── KYC Tab ──────────────────────────────────────────────────────────────── */
function KYCTab({ bookings, token }: { bookings: any[]; token: string }) {
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [kycData, setKycData] = useState<any>(null);
  const [loadingKyc, setLoadingKyc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [kyc, setKyc] = useState({
    corr_address: '', corr_city: '', corr_state: 'Telangana', corr_pincode: '',
    perm_same_as_corr: true, perm_address: '', perm_city: '', perm_state: 'Telangana', perm_pincode: '',
    co_applicant_name: '', co_applicant_phone: '', co_applicant_email: '',
    co_applicant_relation: '', co_applicant_aadhar: '', co_applicant_pan: '',
    employer_name: '', designation: '', employment_type: 'Salaried',
    monthly_salary: '', work_experience: '',
    has_existing_loans: false, existing_loan_amount: '', existing_loan_emi: '', loan_details: '',
    aadhar_number: '', aadhar_name: '', pan_number: '', pan_name: '', date_of_birth: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const up = (k: string, v: any) => { setKyc(f => ({ ...f, [k]: v })); setFieldErrors(e => ({ ...e, [k]: '' })); };
  const ic = 'w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-400';
  const lc = 'block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide';
  const stl = { border: '1px solid #E2F1FC' };
  const fe = (k: string) => fieldErrors[k] ? <p className="text-red-500 text-xs mt-1">{fieldErrors[k]}</p> : null;
  const fi = (k: string) => ({ ...stl, borderColor: fieldErrors[k] ? '#f87171' : '#E2F1FC' });

  function validateCurrentStep(): boolean {
    const validators: Record<number, (k: any) => Record<string, string>> = {
      1: validateKycStep1, 2: validateKycStep2, 3: validateKycStep3, 4: validateKycStep4,
    };
    const errs = validators[step](kyc);
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }
  function goNext() { if (validateCurrentStep()) setStep(s => s + 1); }

  async function loadKyc(bookingId: string) {
    setSelectedBooking(bookingId); setLoadingKyc(true); setSaved(false); setError(''); setStep(1);
    try {
      const r = await fetch(`${API}/bookings/kyc/${bookingId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const data = await r.json(); setKycData(data);
        const filled: any = {};
        Object.keys(kyc).forEach(k => { if (data[k] !== undefined && data[k] !== null) filled[k] = data[k]; });
        setKyc(prev => ({ ...prev, ...filled }));
      } else { setKycData(null); }
    } catch { setKycData(null); }
    finally { setLoadingKyc(false); }
  }

  async function handleSave() {
    if (!validateCurrentStep()) return;
    setSaving(true); setError('');
    try {
      const body: any = { booking_id: selectedBooking, ...kyc };
      ['monthly_salary','existing_loan_amount','existing_loan_emi'].forEach(k => {
        body[k] = body[k] && String(body[k]).trim() ? parseFloat(body[k]) : null;
      });
      Object.keys(body).forEach(k => { if (body[k] === '') body[k] = null; });
      const r = await fetch(`${API}/bookings/kyc`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json();
        if (Array.isArray(d.detail)) {
          const msgs = d.detail.map((e: any) => {
            const field = e.loc?.slice(-1)[0] || '';
            const msg = (e.msg || '').replace('Value error, ', '');
            return `${field}: ${msg}`;
          });
          throw new Error(msgs.join('\n'));
        }
        throw new Error(d.detail || 'Save failed');
      }
      setSaved(true);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  if (bookings.length === 0) return (
    <div><h2 className="text-lg font-black mb-5" style={{ color: "#262262" }}>KYC Documents</h2>
      <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1.5px dashed #E2F1FC" }}>
        <div className="text-5xl mb-4">📄</div><p className="font-bold text-lg mb-2" style={{ color: "#555" }}>No bookings found</p>
        <p style={{ color: "#999" }} className="text-sm">Book a unit first, then upload your KYC documents here.</p></div></div>
  );

  const stepTitles = ['Addresses', 'Father / Spouse / Guardian', 'Employment & Loans', 'KYC Documents'];

  return (
    <div>
      <h2 className="text-lg font-black mb-5" style={{ color: "#262262" }}>KYC Documents</h2>
      {!selectedBooking ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-3">Select a booking to upload/update KYC:</p>
          {bookings.map((b: any) => (
            <button key={b.id} onClick={() => loadKyc(b.id)} className="w-full bg-white p-5 rounded-2xl text-left flex justify-between items-center hover:shadow-md transition-all" style={{ border: "1px solid #E2F1FC" }}>
              <div><p className="font-black" style={{ color: "#2A3887" }}>Booking #{b.id?.slice(0, 8)}</p><p className="text-xs text-gray-500 mt-0.5">{new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
              <span className="text-sm font-bold" style={{ color: "#29A9DF" }}>Upload KYC →</span>
            </button>
          ))}
        </div>
      ) : loadingKyc ? (
        <div className="text-center py-10 text-gray-400 animate-pulse">Loading...</div>
      ) : saved ? (
        <div className="bg-white rounded-2xl p-8 text-center" style={{ border: "1px solid #BBF7D0" }}>
          <div className="text-4xl mb-3">✅</div><h3 className="font-black text-lg mb-1" style={{ color: "#16A34A" }}>KYC Details Saved!</h3>
          <p className="text-sm text-gray-500 mb-4">Our team will verify your documents and contact you.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setSaved(false); setStep(1); }} className="px-5 py-2 text-sm font-bold rounded-xl" style={{ border: "1px solid #2A3887", color: "#2A3887" }}>Edit KYC</button>
            <button onClick={() => { setSelectedBooking(null); setSaved(false); }} className="px-5 py-2 text-sm font-bold text-white rounded-xl" style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>Back to Bookings</button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E2F1FC" }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg,#262262,#2A3887)" }}>
            <div><h3 className="text-white font-black">KYC — Booking #{selectedBooking?.slice(0, 8)}</h3><p className="text-blue-200 text-xs mt-0.5">Step {step}/4 — {stepTitles[step - 1]}</p></div>
            <button onClick={() => setSelectedBooking(null)} className="text-white text-xs hover:underline">← Back</button>
          </div>
          <div className="flex gap-1 px-6 pt-3">{[1,2,3,4].map(s => <div key={s} className="flex-1 h-1.5 rounded-full" style={{ background: s <= step ? '#29A9DF' : '#E2F1FC' }} />)}</div>
          {kycData && <div className="mx-6 mt-3 px-3 py-2 rounded-lg text-xs" style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}>KYC previously submitted — you can update below.</div>}
          <div className="px-6 py-5 space-y-4">
            {error && <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}>{error}</div>}
            {step === 1 && (<>
              <h3 className="font-black text-sm" style={{ color: '#2A3887' }}>Correspondence Address</h3>
              <div><label className={lc}>Address *</label><textarea value={kyc.corr_address} onChange={e => up('corr_address', e.target.value)} rows={2} className={`${ic} resize-none`} style={fi('corr_address')} placeholder="Flat/House No, Street, Area" />{fe('corr_address')}</div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lc}>City *</label><input value={kyc.corr_city} onChange={e => up('corr_city', e.target.value)} className={ic} style={stl} placeholder="Hyderabad" /></div>
                <div><label className={lc}>State *</label><select value={kyc.corr_state} onChange={e => up('corr_state', e.target.value)} className={ic} style={stl}>{STATES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className={lc}>Pincode *</label><input value={kyc.corr_pincode} onChange={e => up('corr_pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className={ic} style={fi('corr_pincode')} maxLength={6} />{fe('corr_pincode')}</div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-3"><input type="checkbox" checked={kyc.perm_same_as_corr} onChange={e => up('perm_same_as_corr', e.target.checked)} className="w-4 h-4 accent-amber-500" /><span className="text-sm text-gray-600">Permanent address same as correspondence</span></label>
              {!kyc.perm_same_as_corr && (<>
                <h3 className="font-black text-sm mt-3" style={{ color: '#2A3887' }}>Permanent Address</h3>
                <div><label className={lc}>Address</label><textarea value={kyc.perm_address} onChange={e => up('perm_address', e.target.value)} rows={2} className={`${ic} resize-none`} style={stl} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={lc}>City</label><input value={kyc.perm_city} onChange={e => up('perm_city', e.target.value)} className={ic} style={stl} /></div>
                  <div><label className={lc}>State</label><select value={kyc.perm_state} onChange={e => up('perm_state', e.target.value)} className={ic} style={stl}>{STATES.map(s => <option key={s}>{s}</option>)}</select></div>
                  <div><label className={lc}>Pincode</label><input value={kyc.perm_pincode} onChange={e => up('perm_pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className={ic} style={fi('corr_pincode')} maxLength={6} />{fe('corr_pincode')}</div>
                </div>
              </>)}
            </>)}
            {step === 2 && (<>
              <h3 className="font-black text-sm" style={{ color: '#2A3887' }}>Father / Spouse / Guardian Details</h3>
              <p className="text-xs text-gray-400">Provide details of your father, spouse, or guardian</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>Full Name</label><input value={kyc.co_applicant_name} onChange={e => up('co_applicant_name', e.target.value)} className={ic} style={stl} /></div>
                <div><label className={lc}>Relationship</label><select value={kyc.co_applicant_relation} onChange={e => up('co_applicant_relation', e.target.value)} className={ic} style={stl}><option value="">Select...</option>{RELATIONS.map(r => <option key={r}>{r}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>Phone</label><input value={kyc.co_applicant_phone} onChange={e => up('co_applicant_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={ic} style={fi('pan_number')} maxLength={10} />{fe('pan_number')}</div>
                <div><label className={lc}>Email</label><input type="email" value={kyc.co_applicant_email} onChange={e => up('co_applicant_email', e.target.value)} className={ic} style={stl} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>Aadhar</label><input value={kyc.co_applicant_aadhar} onChange={e => up('co_applicant_aadhar', e.target.value.replace(/\D/g, '').slice(0, 12))} className={ic} style={fi('aadhar_number')} maxLength={12} />{fe('aadhar_number')}</div>
                <div><label className={lc}>PAN</label><input value={kyc.co_applicant_pan} onChange={e => up('co_applicant_pan', e.target.value.toUpperCase().slice(0, 10))} className={ic} style={fi('pan_number')} maxLength={10} />{fe('pan_number')}</div>
              </div>
            </>)}
            {step === 3 && (<>
              <h3 className="font-black text-sm" style={{ color: '#2A3887' }}>Employment Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>Employer *</label><input value={kyc.employer_name} onChange={e => up('employer_name', e.target.value)} className={ic} style={stl} /></div>
                <div><label className={lc}>Designation</label><input value={kyc.designation} onChange={e => up('designation', e.target.value)} className={ic} style={stl} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lc}>Type</label><select value={kyc.employment_type} onChange={e => up('employment_type', e.target.value)} className={ic} style={stl}>{EMP_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className={lc}>Monthly Salary</label><input type="number" value={kyc.monthly_salary} onChange={e => up('monthly_salary', e.target.value)} className={ic} style={stl} /></div>
                <div><label className={lc}>Experience</label><input value={kyc.work_experience} onChange={e => up('work_experience', e.target.value)} className={ic} style={stl} placeholder="e.g. 5 years" /></div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-3"><input type="checkbox" checked={kyc.has_existing_loans} onChange={e => up('has_existing_loans', e.target.checked)} className="w-4 h-4 accent-amber-500" /><span className="text-sm text-gray-600">I have existing loans</span></label>
              {kyc.has_existing_loans && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lc}>Loan Amount</label><input type="number" value={kyc.existing_loan_amount} onChange={e => up('existing_loan_amount', e.target.value)} className={ic} style={stl} /></div>
                  <div><label className={lc}>Monthly EMI</label><input type="number" value={kyc.existing_loan_emi} onChange={e => up('existing_loan_emi', e.target.value)} className={ic} style={stl} /></div>
                  <div className="col-span-2"><label className={lc}>Details</label><input value={kyc.loan_details} onChange={e => up('loan_details', e.target.value)} className={ic} style={stl} placeholder="e.g. Home loan SBI" /></div>
                </div>
              )}
            </>)}
            {step === 4 && (<>
              <h3 className="font-black text-sm" style={{ color: '#2A3887' }}>Aadhar Card</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>Aadhar Number *</label><input value={kyc.aadhar_number} onChange={e => up('aadhar_number', e.target.value.replace(/\D/g, '').slice(0, 12))} className={ic} style={fi('aadhar_number')} maxLength={12} />{fe('aadhar_number')}</div>
                <div><label className={lc}>Name as per Aadhar *</label><input value={kyc.aadhar_name} onChange={e => up('aadhar_name', e.target.value)} className={ic} style={stl} /></div>
              </div>
              <h3 className="font-black text-sm mt-3" style={{ color: '#2A3887' }}>PAN Card</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>PAN Number *</label><input value={kyc.pan_number} onChange={e => up('pan_number', e.target.value.toUpperCase().slice(0, 10))} className={ic} style={fi('pan_number')} maxLength={10} />{fe('pan_number')}</div>
                <div><label className={lc}>Name as per PAN *</label><input value={kyc.pan_name} onChange={e => up('pan_name', e.target.value)} className={ic} style={stl} /></div>
              </div>
              <div className="max-w-xs mt-3"><label className={lc}>Date of Birth *</label><input type="date" value={kyc.date_of_birth} onChange={e => up('date_of_birth', e.target.value)} className={ic} style={stl} /></div>
            </>)}
            <div className="flex justify-between pt-4 border-t" style={{ borderColor: '#E2F1FC' }}>
              {step > 1 ? <button onClick={() => setStep(s => s - 1)} className="px-5 py-2.5 rounded-xl text-sm font-bold" style={{ border: '1px solid #2A3887', color: '#2A3887' }}>← Back</button> : <div />}
              {step < 4 ? <button onClick={goNext} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>Next →</button>
              : <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#16A34A,#22c55e)' }}>{saving ? 'Saving...' : 'Submit KYC Details'}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
