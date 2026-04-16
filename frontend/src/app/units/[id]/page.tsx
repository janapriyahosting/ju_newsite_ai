"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { isSaved, toggleSaved, toggleCompare, isInCompare } from "@/lib/savedProperties";
import { UnitMediaProvider, UnitMediaThumbs, UnitMediaMain } from "@/components/UnitMediaSlider";
import RiseUpCalculator from "@/components/RiseUpCalculator";
import HomeLoanEMICalculator from "@/components/HomeLoanEMICalculator";
import DynamicFields from "@/components/DynamicFields";
import { customerApi } from "@/lib/customerAuth";

const API = process.env.NEXT_PUBLIC_API_URL || "";

function formatPrice(p: any) {
  if (!p) return "Price on request";
  const n = parseFloat(p);
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(0)} L`;
  return `₹${n.toLocaleString()}`;
}

function getPrice(unit: any) {
  const ta = unit.custom_fields?.total_amount;
  if (ta && parseFloat(ta) > 0) return parseFloat(ta);
  return unit.base_price ? parseFloat(unit.base_price) : null;
}


const MEDIA_BASE = "";
function mUrl(u: string) {
  if (!u?.startsWith('/media')) return u;
  return MEDIA_BASE + u.split('/').map(s => encodeURIComponent(s)).join('/');
}
function toEmbed(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

function toFtIn(val: any, unit: string): string {
  const str = String(val ?? '0');
  if (unit === 'ft') {
    const [feet, inches = '0'] = str.split('.');
    return `${feet}'${inches}"`;
  }
  if (unit === 'm') return `${parseFloat(str).toFixed(2)}m`;
  return `${str}"`;
}

export default function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [tower, setTower] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [towerAmenities, setTowerAmenities] = useState<string[]>([]);
  const [towerData, setTowerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [toast, setToast] = useState("");
  const [enquireOpen, setEnquireOpen] = useState(false);

  // Auto-open enquiry modal if ?enquire=true in URL
  useEffect(() => {
    if (!loading && unit && typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("enquire") === "true") setEnquireOpen(true);
    }
  }, [loading, unit]);

  const [cartAdded, setCartAdded] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [unitSections, setUnitSections] = useState<any[]>([]);
  const [customFieldMap, setCustomFieldMap] = useState<Record<string, { value: any; field_type: string; label: string }>>({});
  const [blocked, setBlocked] = useState(false);

  // Auto-download brochure after login redirect (?download=brochure)
  useEffect(() => {
    if (!loading && unit && typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("download") === "brochure" && localStorage.getItem("jp_token")) {
        const brochureUrl = unit.brochure_url || towerData?.brochure_url || customFieldMap['series_brochure']?.value;
        if (brochureUrl) window.open(MEDIA_BASE + brochureUrl, '_blank');
        const url = new URL(window.location.href);
        url.searchParams.delete("download");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [loading, unit, towerData, customFieldMap]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API}/admin/sections/public/unit`)
      .then(r => r.ok ? r.json() : Promise.reject(`sections fetch failed: ${r.status}`))
      .then(s => setUnitSections(Array.isArray(s) ? s : []))
      .catch(e => console.error('[UnitDetail] sections load error:', e));
    fetch(`${API}/admin/fields/public-values/unit/${id}`)
      .then(r => r.ok ? r.json() : [])
      .then((vals: any[]) => {
        if (!Array.isArray(vals)) return;
        const map: Record<string, { value: any; field_type: string; label: string }> = {};
        vals.forEach(v => { map[v.field_key] = { value: v.value, field_type: v.field_type || 'text', label: v.label }; });
        setCustomFieldMap(map);
      })
      .catch(() => {});
    const token = typeof window !== 'undefined' ? localStorage.getItem('jp_token') || '' : '';
    fetch(`${API}/units/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async r => {
        if (r.status === 403) { setBlocked(true); setLoading(false); return; }
        if (!r.ok) { setLoading(false); return; } // 404 → unit stays null → shows 404 page
        const u = await r.json() as any;
        setUnit(u);
        setSaved(isSaved(u.id));
        setInCompare(isInCompare(u.id));
        // Load tower amenities
        if (u.tower_id) {
          try {
            const tRes = await fetch(API + '/admin/towers/' + u.tower_id, {
              headers: { Authorization: 'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '') }
            }).then(r => r.json());
            if (Array.isArray(tRes.amenities)) setTowerAmenities(tRes.amenities);
            setTowerData(tRes);
          } catch {}
        }
        // Load correct project via tower's project_id
        if (u.tower_id) {
          try {
            const projects = await fetch(`${API}/projects`).then(r=>r.json() as Promise<any>);
            const projectList = Array.isArray(projects) ? projects : (projects as any).items || [];
            // tRes already fetched above — use its project_id to match
            const tRes = await fetch(API + '/admin/towers/' + u.tower_id, {
              headers: { Authorization: 'Bearer ' + (typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '') }
            }).then(r => r.json()).catch(() => null);
            const pid = tRes?.project_id;
            const matched = pid ? projectList.find((p: any) => p.id === pid) : null;
            setProject(matched || projectList[0] || null);
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [id]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  function copyToClipboard(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast("Link copied! 📋")).catch(() => showToast("Could not copy link"));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast("Link copied! 📋");
    }
  }

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
    const text = unit ? `Check out: ${unit.unit_number} — ${unit.unit_type}, ${formatPrice(getPrice(unit))} | Janapriya Upscale` : "Janapriya Upscale Property";
    if (navigator.share) { navigator.share({ title: "Janapriya Upscale", text, url }).catch(() => {}); }
    else { copyToClipboard(`${text}\n${url}`); }
  }

  // handleEnquire is now inside UnitEnquiryModal

  async function addToCart() {
    const token = localStorage.getItem('jp_token');
    if (!token) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname) + '&reason=cart';
      return;
    }
    setCartLoading(true);
    try {
      const r = await fetch(API + '/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ unit_id: id })
      });
      if (r.ok) {
        setCartAdded(true);
        showToast('✅ Added to cart! View in 🛒 Cart');
      } else if (r.status === 400) {
        setCartAdded(true);
        showToast('Already in cart 🛒');
      }
    } catch {}
    setCartLoading(false);
  }

  if (loading) return (
    <main className="min-h-screen">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F9FB" }}>
        <div className="text-center">
          <div className="text-4xl animate-spin mb-3">⟳</div>
          <p style={{ color: "#555" }}>Loading unit details...</p>
        </div>
      </div>
    </main>
  );

  if (blocked) return (
    <>
    <meta name="robots" content="noindex, nofollow" />
    <main className="min-h-screen">

      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-16"
        style={{ background: "linear-gradient(135deg,#F8F9FB 0%,#E2F1FC 100%)" }}>
        <div className="text-center px-6 max-w-lg">
          <div className="text-8xl mb-6">🔒</div>
          <h1 className="text-4xl font-black mb-3" style={{ color: "#2A3887" }}>Unit Booked</h1>
          <h2 className="text-xl font-bold mb-4" style={{ color: "#262262" }}>
            This unit has been booked and is no longer available for viewing.
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Explore our other available units or contact us for similar options.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/store"
              className="px-8 py-3.5 rounded-full font-black text-white text-sm"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
              Browse Available Units
            </Link>
            <Link href="/contact"
              className="px-8 py-3.5 rounded-full font-black text-sm border-2"
              style={{ borderColor: "#2A3887", color: "#2A3887" }}>
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </main>
    </>
  );

  if (!unit) return (
    <main className="min-h-screen">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-16"
        style={{ background: "linear-gradient(135deg,#F8F9FB 0%,#E2F1FC 100%)" }}>
        <div className="text-center px-6 max-w-lg">
          <div className="text-8xl mb-6">🏚️</div>
          <h1 className="text-5xl font-black mb-3" style={{ color: "#2A3887" }}>404</h1>
          <h2 className="text-2xl font-black mb-4" style={{ color: "#262262" }}>
            This property is no longer available
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            The unit you&apos;re looking for may have been sold, removed, or the link may be outdated.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/store"
              className="px-8 py-3.5 rounded-full font-black text-white text-sm"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
              Browse Available Units
            </Link>
            <Link href="/projects"
              className="px-8 py-3.5 rounded-full font-black text-sm border-2"
              style={{ borderColor: "#2A3887", color: "#2A3887" }}>
              View Projects
            </Link>
          </div>
        </div>
      </div>
    </main>
  );

  const statusColor = unit.status === "available" ? "#22c55e" : unit.status === "booked" ? "#ef4444" : "#f59e0b";

  // Build spec lookup once — outside the section render loop
  const SPEC_MAP: Record<string, { icon: string; label: string; val: string | null }> = {
    unit_type:      { icon: '🏘', label: 'Type',          val: unit.unit_type || null },
    bedrooms:       { icon: '🛏', label: 'Bedrooms',      val: unit.bedrooms != null ? String(unit.bedrooms) : null },
    bathrooms:      { icon: '🚿', label: 'Bathrooms',     val: unit.bathrooms != null ? String(unit.bathrooms) : null },
    area_sqft:      { icon: '📐', label: 'Super Area',    val: unit.area_sqft ? `${parseFloat(unit.area_sqft).toFixed(0)} sqft` : null },
    carpet_area:    { icon: '🏠', label: 'Carpet Area',   val: unit.carpet_area ? `${parseFloat(unit.carpet_area).toFixed(0)} sqft` : null },
    plot_area:      { icon: '🌱', label: 'Plot Area',     val: unit.plot_area ? `${parseFloat(unit.plot_area).toFixed(0)} sqft` : null },
    floor_number:   { icon: '🏢', label: 'Floor',         val: unit.floor_number != null ? String(unit.floor_number) : null },
    facing:         { icon: '🧭', label: 'Facing',        val: unit.facing || null },
    balconies:      { icon: '🏡', label: 'Balconies',     val: unit.balconies != null ? String(unit.balconies) : null },
    status:         { icon: '●',  label: 'Status',        val: unit.status ? unit.status.charAt(0).toUpperCase() + unit.status.slice(1) : null },
    base_price:     { icon: '💰', label: 'Total Price',   val: getPrice(unit) ? formatPrice(getPrice(unit)) : null },
    price_per_sqft: { icon: '📊', label: 'Price / sqft', val: unit.price_per_sqft
      ? `₹${parseFloat(unit.price_per_sqft).toLocaleString()}`
      : (unit.area_sqft && getPrice(unit) ? `₹${Math.round(getPrice(unit)! / parseFloat(unit.area_sqft)).toLocaleString()}` : null) },
    down_payment:   { icon: '💳', label: 'Down Payment',  val: unit.down_payment ? formatPrice(unit.down_payment) : null },
    emi_estimate:   { icon: '📅', label: 'EMI / mo',      val: unit.emi_estimate ? `₹${parseFloat(unit.emi_estimate).toLocaleString()}` : null },
  };

  // Fields that have dedicated renderers — don't treat as generic custom fields
  const SPECIAL_FIELDS = new Set([
    'images', 'floor_plan_img', 'floor_plans', 'video_url', 'walkthrough_url', 'amenities', 'description',
    'series_floor_plan', 'series_floor_plan_2d', 'series_floor_plan_3d', 'series_model_flat_video', 'series_tower_elevation',
    'series_project_video', 'series_project_image', 'series_walkthrough_video', 'series_brochure', 'series_unit_image',
    'floor_plan_url', 'add_on_video', 'gallery', 'attachments', 'rooms_and_sizes',
  ]);

  // All field keys assigned to any section — used to hide them from "Additional Details"
  const fieldsInSections = new Set(unitSections.flatMap((s: any) => s.fields || []));

  function renderCustomVal(item: { value: any; field_type: string; label: string }) {
    const { value, field_type } = item;
    if (value === null || value === undefined || value === '') return null;
    if (field_type === 'boolean' || typeof value === 'boolean') {
      const yes = value === true || value === 'true' || value === 'Yes';
      return <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: yes ? '#dcfce7' : '#fee2e2', color: yes ? '#16a34a' : '#dc2626' }}>{yes ? 'Yes' : 'No'}</span>;
    }
    if (field_type === 'currency') {
      const n = parseFloat(String(value).replace(/,/g, ''));
      if (isNaN(n)) return <span>{String(value)}</span>;
      const fmt = n >= 10000000 ? `₹${(n/10000000).toFixed(2)} Cr` : n >= 100000 ? `₹${(n/100000).toFixed(2)} L` : `₹${n.toLocaleString('en-IN')}`;
      return <span className="font-black" style={{ color: '#2A3887' }}>{fmt}</span>;
    }
    // Skip image/media rendering inline — they belong in the slider only
    if (typeof value === 'string' && (/\.(png|jpg|jpeg|webp|gif|svg|mp4|webm|pdf)(\?.*)?$/i.test(value) || value.startsWith('/media/'))) {
      return null;
    }
    if ((field_type === 'url' || (typeof value === 'string' && value.startsWith('http'))) && /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(String(value))) {
      return null;
    }
    if (field_type === 'url' || (typeof value === 'string' && value.startsWith('http'))) {
      return <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline break-all" style={{ color: '#29A9DF' }}>{String(value)}</a>;
    }
    if (field_type === 'number' || field_type === 'decimal') { const n = Number(String(value).replace(/,/g, '')); return <span className="font-bold">{isNaN(n) ? String(value) : n.toLocaleString('en-IN')}</span>; }
    if (Array.isArray(value)) return <div className="flex flex-wrap gap-1 justify-end">{value.map((v: string, i: number) => <span key={i} className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#E2F1FC', color: '#2A3887' }}>{v}</span>)}</div>;
    return <span className="font-semibold text-right" style={{ color: '#333' }}>{String(value)}</span>;
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Breadcrumb */}
      <div className="pt-16 bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-xs" style={{ color: "#999" }}>
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-[#2A3887]">Home</Link>
            <span>›</span>
            <Link href="/store" className="hover:text-[#2A3887]">Store</Link>
            <span>›</span>
            <span style={{ color: "#2A3887" }} className="font-bold">{unit.unit_number}</span>
          </div>
          <button onClick={() => router.back()}
            className="font-semibold flex items-center gap-1 transition-colors hover:text-[#2A3887]"
            style={{ color: '#94a3b8' }}>
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero: Media Slider + Unit Info */}
            <UnitMediaProvider unit={unit} seriesFields={customFieldMap}>
              <div className="flex items-start" style={{ marginLeft: '-90px' }}>
                {/* Vertical thumbnails — pulled left outside the box */}
                <div className="flex-shrink-0 self-start" style={{ width: '80px', marginRight: '10px' }}>
                  <UnitMediaThumbs />
                </div>

                {/* The box: main viewer + unit info */}
                <div className="flex-1 min-w-0 rounded-3xl overflow-hidden" style={{ boxShadow: "0 8px 40px rgba(42,56,135,0.15)" }}>
                  {/* Media Main Viewer */}
                  <UnitMediaMain />

                  {/* Unit Title Bar */}
                  <div className="px-5 py-4 flex items-center justify-between"
                    style={{ background: "linear-gradient(135deg,#262262,#2A3887)" }}>
                    <div>
                      <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-xs uppercase tracking-wider mb-0.5">
                        {unit.unit_type && unit.unit_type.includes("BHK") ? unit.unit_type : `${unit.unit_type}${unit.bedrooms ? " · " + unit.bedrooms + " BHK" : ""}`}
                      </p>
                      <h1 className="text-2xl font-black text-white">{unit.unit_number}</h1>
                      {(project?.location || project?.name) && <p style={{ color: "rgba(255,255,255,0.65)" }} className="text-xs mt-0.5">📍 {project?.location || project?.name}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 rounded-full text-xs font-black bg-white" style={{ color: statusColor }}>
                        ● {(unit.status || "available").charAt(0).toUpperCase() + (unit.status||"").slice(1)}
                      </span>
                      <div className="flex gap-1.5">
                        {[
                          { fn: handleSave, icon: saved ? "♥" : "♡", bg: saved ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.2)", title: "Save" },
                          { fn: handleCompare, icon: "⇄", bg: inCompare ? "rgba(245,158,11,0.9)" : "rgba(255,255,255,0.2)", title: "Compare" },
                          { fn: handleShare, icon: "↗", bg: "rgba(255,255,255,0.2)", title: "Share" },
                        ].map((btn, i) => (
                          <button key={i} onClick={btn.fn} title={btn.title}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm transition-all hover:scale-110"
                            style={{ background: btn.bg }}>
                            {btn.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {toast && (
                    <div className="fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl flex items-center gap-2 animate-bounce"
                      style={{ background: toast.includes('✅') ? '#16A34A' : '#2A3887', color: 'white', maxWidth: '280px' }}>
                      {toast}
                    </div>
                  )}
                </div>
              </div>
            </UnitMediaProvider>

            {/* Section-driven content — ordered and visibility controlled by admin Sections */}
            {unitSections.filter((s: any) => s.visible).map((s: any) => {
              const fields: string[] = s.fields || [];

              // gallery — images already shown in the media slider above
              if (fields.length > 0 && fields.every((f: string) => f === 'images')) return null;

              // Built-in spec cards (bedrooms, price, etc.)
              const specItems = fields
                .filter((f: string) => SPEC_MAP[f] && SPEC_MAP[f].val !== null)
                .map((f: string) => ({ key: f, ...SPEC_MAP[f] }));

              // Custom field rows for anything not in SPEC_MAP and not a special renderer
              const customItems = fields
                .filter((f: string) => !SPEC_MAP[f] && !SPECIAL_FIELDS.has(f) && customFieldMap[f] !== undefined
                  && customFieldMap[f].value !== null && customFieldMap[f].value !== undefined && customFieldMap[f].value !== ''
                  && !(typeof customFieldMap[f].value === 'string' && (customFieldMap[f].value.startsWith('/media/') || /\.(png|jpg|jpeg|webp|gif|svg|mp4|webm|pdf)$/i.test(customFieldMap[f].value))))
                .map((f: string) => ({ key: f, ...customFieldMap[f] }));

              // Series media — only shown in the main media slider, not here
              if (s.key === 'series_media') return null;

              // Media (floor plans, video, walkthrough) only shown in slider, not in sections
              const hasAmenities   = fields.includes('amenities') && (towerAmenities.length > 0 || unit.amenities?.length > 0);
              const hasDescription = fields.includes('description') && unit.description;

              // Skip section if nothing to show
              if (!specItems.length && !customItems.length && !hasAmenities && !hasDescription) return null;

              return (
                <div key={s.key} className="rounded-2xl p-6" style={{ background: "#F8F9FB", border: "1px solid #E2F1FC" }}>
                  <h2 className="font-black text-lg mb-4" style={{ color: "#262262" }}>{s.label}</h2>

                  {/* Built-in spec cards */}
                  {specItems.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {specItems.map((item: any) => (
                        <div key={item.key} className="rounded-xl p-4 text-center bg-white" style={{ border: "1px solid #E2F1FC" }}>
                          <div className="text-2xl mb-1">{item.icon}</div>
                          <div className="font-black text-sm" style={{ color: "#2A3887" }}>{item.val}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#999" }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Custom field key-value rows */}
                  {customItems.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 mb-4">
                      {customItems.map((item: any) => (
                        <div key={item.key} className="flex justify-between items-center py-2.5 gap-4" style={{ borderBottom: "1px solid #E2F1FC" }}>
                          <span className="text-sm flex-shrink-0" style={{ color: "#888" }}>{item.label}</span>
                          {renderCustomVal(item)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {hasDescription && (
                    <p style={{ color: "#555" }} className="text-sm leading-relaxed mb-4">{unit.description}</p>
                  )}

                  {/* Amenities tags */}
                  {hasAmenities && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(towerAmenities.length > 0 ? towerAmenities : (unit.amenities || [])).map((a: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ background: "#E2F1FC", color: "#2A3887" }}>✓ {a}</span>
                      ))}
                    </div>
                  )}

                  {/* Media (floor plans, video, walkthrough) displayed in slider only */}
                </div>
              );
            })}

          </div>
          {/* Right: Sticky CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Price Card */}
              <div className="rounded-2xl p-6" style={{ boxShadow: "0 8px 30px rgba(42,56,135,0.15)", border: "1px solid #E2F1FC" }}>
                <p style={{ color: "#999" }} className="text-xs uppercase tracking-wide mb-1">Total Price</p>
                <p className="text-3xl font-black mb-1" style={{ color: "#2A3887" }}>{formatPrice(getPrice(unit))}</p>
                {unit.area_sqft && getPrice(unit) && (
                  <p style={{ color: "#29A9DF" }} className="text-sm font-semibold mb-5">
                    ₹{Math.round(getPrice(unit)!/parseFloat(unit.area_sqft)).toLocaleString()}/sqft
                  </p>
                )}
                <button data-enquire-trigger onClick={() => setEnquireOpen(true)}
                  className="w-full py-3.5 text-white font-black rounded-xl text-sm mb-3 transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                  Enquire Now
                </button>
                <Link href="/site-visit"
                  className="block w-full py-3.5 text-center font-black rounded-xl text-sm transition-all"
                  style={{ border: "2px solid #2A3887", color: "#2A3887" }}>
                  📅 Book Site Visit
                </Link>

                {/* Add to Cart + Book Now */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button onClick={addToCart} disabled={cartLoading || cartAdded}
                    className="py-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 border-2 transition-all"
                    style={{ borderColor: cartAdded ? '#16A34A' : '#2A3887',
                             color: cartAdded ? '#16A34A' : '#2A3887',
                             background: cartAdded ? 'rgba(22,163,74,0.06)' : 'white' }}>
                    {cartLoading ? '⏳' : cartAdded ? '✓ In Cart' : '🛒 Add to Cart'}
                  </button>
                  <Link href={`/booking/${unit.id}`}
                    className="py-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg,#16A34A,#22c55e)', color: 'white' }}>
                    🏷️ Book Now
                  </Link>
                </div>
              </div>

              {/* Brochure Download */}
              {(unit.brochure_url || towerData?.brochure_url || customFieldMap['series_brochure']?.value) && (
                <BrochureDownload url={unit.brochure_url || towerData?.brochure_url || String(customFieldMap['series_brochure'].value)} unitId={id as string} />
              )}

              {/* Home Loan + Get Quote */}
              <div className="grid grid-cols-2 gap-3">
                <Link href={`/home-loan/${id}`}
                  className="py-3.5 text-center text-white font-black rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #16A34A, #22c55e)' }}>
                  🏦 Home Loan
                </Link>
                <button
                  className="py-3.5 font-black rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #EAB308)', color: '#fff' }}>
                  📋 Get Quote
                </button>
              </div>

              {/* Share Card */}
              <div className="rounded-2xl p-5" style={{ background: "#F8F9FB", border: "1px solid #E2F1FC" }}>
                <p className="text-xs font-black mb-3" style={{ color: "#2A3887" }}>Share this property</p>
                <div className="flex gap-2">
                  {[
                    { label: "WhatsApp", icon: "📱", color: "#25D366",
                      fn: () => window.open(`https://wa.me/?text=${encodeURIComponent(`${unit.unit_number} — ${formatPrice(getPrice(unit))}\n${window.location.href}`)}`) },
                    { label: "Copy Link", icon: "🔗", color: "#2A3887",
                      fn: () => { copyToClipboard(window.location.href); } },
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

              {/* Room Dimensions */}
              {unit.dimensions && unit.dimensions.length > 0 && (
                <div className="rounded-2xl p-5" style={{background:"#F8F9FB", border:"1px solid #E2F1FC"}}>
                  <h3 className="text-sm font-black mb-3 flex items-center gap-2" style={{color:"#262262"}}>
                    📐 Room Dimensions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {unit.dimensions.map((d: any, idx: number) => (
                      <div key={idx} className="rounded-xl px-3 py-2.5" style={{background:"white", border:"1px solid #E2F1FC"}}>
                        <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{color:"#94a3b8"}}>{d.room}</p>
                        <p className="text-sm font-black" style={{color:"#2A3887", whiteSpace:"nowrap"}}>{toFtIn(d.width, d.unit)} <span style={{color:"#94a3b8", fontWeight:400}}>×</span> {toFtIn(d.length, d.unit)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RiseUp Calculator */}
              {getPrice(unit) && getPrice(unit)! > 100_000 && (
                <RiseUpCalculator unitPrice={getPrice(unit)!} unitName={unit.unit_number} />
              )}

              {/* Home Loan EMI Calculator */}
              {getPrice(unit) && getPrice(unit)! > 100_000 && (
                <HomeLoanEMICalculator unitPrice={getPrice(unit)!} unitName={unit.unit_number} />
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Enquire Modal */}
      {enquireOpen && unit && (
        <UnitEnquiryModal
          unitId={id as string}
          unitNumber={unit.unit_number}
          unitType={unit.unit_type}
          unitPrice={getPrice(unit)}
          projectName={towerData?.project_name || ""}
          onClose={() => setEnquireOpen(false)}
        />
      )}

      <Footer />
    </main>
  );
}

function BrochureDownload({ url, unitId }: { url: string; unitId: string }) {
  const loggedIn = typeof window !== 'undefined' && !!localStorage.getItem('jp_token');

  function handleClick() {
    if (loggedIn) {
      window.open(MEDIA_BASE + url, '_blank');
    } else {
      window.location.href = '/login?redirect=' + encodeURIComponent('/units/' + unitId + '?download=brochure') + '&reason=brochure';
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full py-3 text-white font-black rounded-xl text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
        ⬇️ Download Brochure
      </button>
      {!loggedIn && <p className="text-xs text-center mt-2" style={{ color: "#94a3b8" }}>Login required to download</p>}
    </div>
  );
}

function UnitEnquiryModal({ unitId, unitNumber, unitType, unitPrice, projectName, onClose }: {
  unitId: string; unitNumber: string; unitType: string; unitPrice: any; projectName: string; onClose: () => void;
}) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); } }, [countdown]);
  useEffect(() => { if (otpStep) otpRefs.current[0]?.focus(); }, [otpStep]);

  const cleanPhone = (p: string) => p.replace(/\D/g, "").replace(/^91/, "");
  const up = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Name required (min 2 chars)";
    const ph = cleanPhone(form.phone);
    if (!ph || !/^[6-9]\d{9}$/.test(ph)) e.phone = "Valid 10-digit Indian mobile required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.consent) e.consent = "Consent required";
    setErrors(e); return Object.keys(e).length === 0;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setOtpLoading(true); setOtpError("");
    try {
      const r = await customerApi("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone: cleanPhone(form.phone), purpose: "lead" }) });
      if (r.dev_otp) setDevOtp(r.dev_otp);
      setOtpStep(true); setCountdown(30);
    } catch (err: any) { setOtpError(err.message || "Failed"); }
    finally { setOtpLoading(false); }
  }

  async function resendOtp() {
    setOtpLoading(true); setOtpError(""); setDevOtp(null);
    try {
      const r = await customerApi("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone: cleanPhone(form.phone), purpose: "lead" }) });
      if (r.dev_otp) setDevOtp(r.dev_otp);
      setOtp(["", "", "", "", "", ""]); setCountdown(30);
    } catch (err: any) { setOtpError(err.message || "Failed"); }
    finally { setOtpLoading(false); }
  }

  async function doSubmit(code: string) {
    setOtpLoading(true); setOtpError("");
    try {
      await customerApi("/auth/verify-phone", { method: "POST", body: JSON.stringify({ phone: cleanPhone(form.phone), otp: code }) });
      // Get UTM from URL
      const sp = new URLSearchParams(window.location.search);
      const utm: any = {};
      if (sp.get("utm_source")) utm.utm_source = sp.get("utm_source");
      if (sp.get("utm_medium")) utm.utm_medium = sp.get("utm_medium");
      if (sp.get("utm_campaign")) utm.utm_campaign = sp.get("utm_campaign");

      await fetch(`${API}/leads`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), phone: cleanPhone(form.phone),
          email: form.email.trim() || undefined, message: form.message.trim(),
          source: utm.utm_source ? "campaign" : "unit_detail",
          project_interest: projectName || undefined,
          interest: unitType || undefined,
          extra_data: { unit_id: unitId, unit_number: unitNumber, unit_type: unitType, unit_price: unitPrice },
          ...utm,
        }),
      });
      setDone(true);
    } catch (err: any) { setOtpError(err.message || "Failed"); }
    finally { setOtpLoading(false); }
  }

  function handleOtpChange(i: number, v: string) {
    if (v && !/^\d$/.test(v)) return;
    const n = [...otp]; n[i] = v; setOtp(n);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
    if (v && i === 5 && n.join("").length === 6) setTimeout(() => doSubmit(n.join("")), 100);
  }
  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) { if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); }
  function handleOtpPaste(ev: React.ClipboardEvent) { ev.preventDefault(); const p = ev.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6); if (p.length === 6) { const d = p.split(""); setOtp(d); otpRefs.current[5]?.focus(); setTimeout(() => doSubmit(d.join("")), 100); } }

  const ic = "w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none";
  const is = { background: "#F8F9FB", border: "1.5px solid #E2F1FC" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
        {done ? (
          <div className="text-center py-4">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="font-black text-xl mb-2" style={{ color: "#2A3887" }}>Enquiry Submitted!</h3>
            <p style={{ color: "#555" }} className="text-sm mb-1">We received your enquiry about <strong>{unitNumber}</strong>.</p>
            <p style={{ color: "#888" }} className="text-xs mb-4">Our team will contact you shortly.</p>
            <button onClick={onClose} className="px-6 py-2.5 text-white font-bold rounded-full"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>Close</button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="font-black text-lg" style={{ color: "#2A3887" }}>Enquire About This Unit</h3>
                <p style={{ color: "#555" }} className="text-sm">{unitNumber} · {unitType} · {formatPrice(unitPrice)}</p>
                {projectName && <p style={{ color: "#888" }} className="text-xs">{projectName}</p>}
              </div>
              <button onClick={onClose} style={{ color: "#999" }} className="hover:text-gray-600 text-xl">✕</button>
            </div>
            {otpError && <div className="mb-3 px-3 py-2 rounded-xl text-sm" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>{otpError}</div>}
            {devOtp && <div className="mb-3 px-3 py-1.5 rounded-lg text-xs" style={{ background: "#FEF9C3", color: "#92400E", border: "1px solid #FDE68A" }}>Dev OTP: <strong>{devOtp}</strong></div>}
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#2A3887" }}>Your Name *</label>
                <input value={form.name} onChange={e => up("name", e.target.value)} disabled={otpStep}
                  className={`${ic} disabled:opacity-60 disabled:bg-gray-100`} style={{ ...is, borderColor: errors.name ? "#f87171" : "#E2F1FC" }}
                  onFocus={e => e.target.style.borderColor = "#29A9DF"} onBlur={e => e.target.style.borderColor = errors.name ? "#f87171" : "#E2F1FC"} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#2A3887" }}>Phone Number *</label>
                <input value={form.phone} onChange={e => up("phone", e.target.value)} disabled={otpStep} maxLength={13}
                  className={`${ic} disabled:opacity-60 disabled:bg-gray-100`} style={{ ...is, borderColor: errors.phone ? "#f87171" : "#E2F1FC" }} placeholder="98765 43210"
                  onFocus={e => e.target.style.borderColor = "#29A9DF"} onBlur={e => e.target.style.borderColor = errors.phone ? "#f87171" : "#E2F1FC"} />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#2A3887" }}>Email</label>
                <input type="email" value={form.email} onChange={e => up("email", e.target.value)} disabled={otpStep}
                  className={`${ic} disabled:opacity-60 disabled:bg-gray-100`} style={{ ...is, borderColor: errors.email ? "#f87171" : "#E2F1FC" }}
                  onFocus={e => e.target.style.borderColor = "#29A9DF"} onBlur={e => e.target.style.borderColor = "#E2F1FC"} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <textarea value={form.message} onChange={e => up("message", e.target.value)} disabled={otpStep}
                placeholder="Any specific questions? (optional)" rows={2}
                className={`${ic} resize-none disabled:opacity-60 disabled:bg-gray-100`} style={is} />
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={form.consent} onChange={e => up("consent", e.target.checked)} disabled={otpStep}
                  className="mt-0.5 w-4 h-4 accent-amber-500" />
                <span className={`text-xs leading-relaxed ${errors.consent ? "text-red-500" : "text-gray-500"}`}>
                  I consent to Janapriya contacting me via calls, SMS, WhatsApp, and email.
                </span>
              </label>
              {errors.consent && <p className="text-red-500 text-xs ml-6">{errors.consent}</p>}

              {otpStep ? (
                <div className="border-t pt-4 space-y-3" style={{ borderColor: "#E2F1FC" }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">OTP sent to <strong>+91 {cleanPhone(form.phone)}</strong></p>
                    <button type="button" onClick={() => { setOtpStep(false); setOtp(["","","","","",""]); setOtpError(""); setDevOtp(null); }}
                      className="text-xs hover:underline" style={{ color: "#29A9DF" }}>Change</button>
                  </div>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((d, i) => (
                      <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={d}
                        onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="w-11 h-13 text-center text-lg font-bold rounded-xl focus:outline-none"
                        style={{ background: "#fff", border: `1.5px solid ${d ? "#F59E0B" : "#E2F1FC"}`, color: "#333" }} />
                    ))}
                  </div>
                  {otpLoading && <p className="text-center text-sm text-gray-400 animate-pulse">Verifying...</p>}
                  <div className="text-center">
                    {countdown > 0
                      ? <p className="text-xs text-gray-400">Resend in {countdown}s</p>
                      : <button type="button" onClick={resendOtp} disabled={otpLoading} className="text-xs font-bold hover:underline" style={{ color: "#29A9DF" }}>Resend OTP</button>}
                  </div>
                </div>
              ) : (
                <button type="submit" disabled={otpLoading}
                  className="w-full py-3 text-white font-black rounded-xl transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                  {otpLoading ? "Sending OTP..." : "Submit Enquiry"}
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
