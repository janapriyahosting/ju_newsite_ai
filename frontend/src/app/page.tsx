"use client";
import AddToCartBtn from '@/components/AddToCartBtn';
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { isSaved, toggleSaved, isInCompare, toggleCompare } from "@/lib/savedProperties";

const PAYMENTS = [
  {
    id: "easy-budget",
    label: "AN EASY BUDGET",
    headline: "Allows you to buy a home for the loved",
    image: "/AnEasyBudget.webp",
    buttons: [
      { text: "₹ 1.3Cr+", sub: "is my budget", href: "/store?min_price=13000000" },
      { text: "₹ 90L+",   sub: "is my budget", href: "/store?min_price=9000000" },
      { text: "₹ 70L+",   sub: "is my budget", href: "/store?min_price=7000000" },
      { text: "₹ 50L+",   sub: "is my budget", href: "/store?min_price=5000000" },
    ],
  },
  {
    id: "lighter-emi",
    label: "A LIGHTER EMI",
    headline: "Lets your family enjoy a good lifestyle",
    image: "/ALighterEMI.webp",
    buttons: [
      { text: "₹ 85K+", sub: "EMI", href: "/store?max_emi=85000" },
      { text: "₹ 75K+", sub: "EMI", href: "/store?max_emi=75000" },
      { text: "₹ 55K+", sub: "EMI", href: "/store?max_emi=55000" },
      { text: "₹ 35K+", sub: "EMI", href: "/store?max_emi=35000" },
    ],
  },
  {
    id: "downpayment",
    label: "A SUITABLE DOWNPAYMENT",
    headline: "For your dreamhome to ease stress",
    image: "/ASuitableDownpayment1.webp",
    buttons: [
      { text: "₹ 18L+", sub: "Downpayment", href: "/store?max_down_payment=1800000" },
      { text: "₹ 16L+", sub: "Downpayment", href: "/store?max_down_payment=1600000" },
      { text: "₹ 12L+", sub: "Downpayment", href: "/store?max_down_payment=1200000" },
      { text: "₹ 8L+",  sub: "Downpayment", href: "/store?max_down_payment=800000" },
    ],
  },
];

const SIZES = [
  {
    id: "cozy",
    label: "ANY SIZE OF A COZY HOME",
    headline: "A Treasure Chest of love & happiness",
    image: "/any-size-of-a-cozy.webp",
    buttons: [
      { text: "500+", sub: "sft", href: "/store?min_area=500" },
    ],
  },
  {
    id: "however-big",
    label: "HOWEVER BIG THE HOME IS",
    headline: "There is no place like home",
    image: "/full-shot-woman-sitting-floor.webp",
    buttons: [
      { text: "1500+", sub: "sft", href: "/store?min_area=1500" },
      { text: "1000+", sub: "sft", href: "/store?min_area=1000" },
    ],
  },
  {
    id: "lot-starts",
    label: "HOME IS WHERE A LOT STARTS",
    headline: "Work, Passion or just unwind",
    image: "/home-is-where-a-lot-starts.webp",
    buttons: [
      { text: "1500+", sub: "sft", disabled: true, href: "/store?min_area=1500" },
      { text: "2000+", sub: "sft", href: "/store?min_area=2000" },
    ],
  },
];

const BEDROOMS = [
  {
    id: "3bhk",
    label: "3 BEDROOMS ARE SUCH BLISS",
    image: "/3bedroom.webp",
    cta: "Explore 3BHK Options",
    href: "/store?bedrooms=3&unit_type=3BHK",
  },
  {
    id: "2bhk",
    label: "2 BEDROOM ARE SPECIAL",
    image: "/2-bedroom-are-special.webp",
    cta: "Explore 2BHK Options",
    href: "/store?bedrooms=2&unit_type=2BHK",
  },
  {
    id: "1bhk",
    label: "INVEST IN A 1 BEDROOM",
    image: "/invest-in-a-1-Bedroom.webp",
    cta: "Explore 1BHK Options",
    href: "/store?bedrooms=1",
  },
];

const LOCATIONS = [
  {
    id: "houston",
    label: "TAKE ME TO HOUSTON",
    image: "/cash-in-hand.webp",
    cta: "Know More",
    href: "https://janapriya.us/#1",
  },
  {
    id: "bengaluru",
    label: "BENGALURU",
    image: "/bengaluru.webp",
    cta: "Know More",
    href: "/store",
  },
  {
    id: "hyderabad",
    label: "HYDERABAD",
    image: "/hyderabad.webp",
    cta: "Know More",
    href: "/store",
  },
];

function useInView(ref: React.RefObject<HTMLElement>, threshold = 0.2) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      background: "white",
      textAlign: "center",
      padding: "22px 24px",
      borderBottom: "1px solid #E5E7EB",
    }}>
      <h3 style={{
        margin: 0,
        fontSize: "clamp(15px, 2vw, 21px)",
        fontWeight: 900,
        color: "#0D1B2A",
        letterSpacing: 2.5,
        textTransform: "uppercase",
      }}>
        {title}
      </h3>
    </div>
  );
}

interface AccordionItem {
  id: string;
  label: string;
  headline?: string;
  image: string;
  buttons?: { text: string; sub?: string; href: string; disabled?: boolean }[];
  cta?: string;
  href?: string;
}

function AccordionPanel({
  items,
  defaultIndex = 0,
  dir = "right",
  noButtons = false,
}: {
  items: AccordionItem[];
  defaultIndex?: number;
  dir?: "right" | "left";
  noButtons?: boolean;
}) {
  const [active, setActive] = useState(defaultIndex);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>);

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: dir === "right" ? "row" : "row-reverse",
        width: "100%",
        height: "calc(100vh - 105px)",
        minHeight: 440,
        maxHeight: 700,
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {items.map((it, i) => (
          <div
            key={it.id}
            style={{
              position: "absolute",
              inset: 0,
              opacity: active === i ? 1 : 0,
              transition: "opacity 0.5s ease",
              pointerEvents: active === i ? "auto" : "none",
            }}
          >
            <img
              src={it.image}
              alt={it.label}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{
              position: "absolute",
              inset: 0,
              background: noButtons
                ? "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 100%)"
                : "linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.05) 100%)",
            }} />

            {!noButtons && it.buttons && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                padding: "32px 48px 0",
              }}>
                <p style={{
                  color: "white",
                  fontWeight: 900,
                  fontSize: "clamp(15px, 1.8vw, 22px)",
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  marginBottom: 22,
                  textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                }}>
                  {it.headline}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {it.buttons.map((btn) =>
                    btn.disabled ? (
                      <span key={btn.text} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        background: "#273b84",
                        color: "rgba(255,255,255,0.45)",
                        padding: "11px 22px",
                        borderRadius: 9,
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: "not-allowed",
                        whiteSpace: "nowrap",
                        fontFamily: "inherit",
                      }}>
                        {btn.text}
                        {btn.sub && <span style={{ fontWeight: 600, fontSize: 12 }}>{btn.sub}</span>}
                      </span>
                    ) : (
                      <Link key={btn.text} href={btn.href} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        background: "rgba(255,255,255,0.13)",
                        backdropFilter: "blur(10px)",
                        border: "1.5px solid rgba(255,255,255,0.38)",
                        color: "white",
                        padding: "11px 22px",
                        borderRadius: 9,
                        fontWeight: 800,
                        fontSize: 14,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        transition: "all 0.22s",
                        fontFamily: "inherit",
                      }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = "#273b84";
                          (e.currentTarget as HTMLElement).style.borderColor = "#273b84";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.13)";
                          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.38)";
                        }}
                      >
                        {btn.text}
                        {btn.sub && <span style={{ fontWeight: 600, fontSize: 12, opacity: 0.8 }}>{btn.sub}</span>}
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}

            {noButtons && it.cta && it.href && (
              <Link href={it.href} style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                background: "#273b84",
                color: "white",
                textAlign: "center",
                padding: "15px",
                fontWeight: 800,
                fontSize: 15,
                textDecoration: "none",
                letterSpacing: 0.5,
                transition: "background 0.2s",
                display: "block",
                fontFamily: "inherit",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "#1a2a6c")}
                onMouseLeave={e => (e.currentTarget.style.background = "#273b84")}
              >
                {it.cta}
              </Link>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "row" }}>
        {items.map((it, i) => {
          const isActive = active === i;
          return (
            <button
              key={it.id}
              onClick={() => setActive(i)}
              style={{
                width: isActive ? 68 : 58,
                background: isActive ? "#a9c6f8" : "#0D1B2A",
                border: "1px solid rgba(255,255,255,0.07)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.45s cubic-bezier(0.05,0.61,0.41,0.95)",
                outline: "none",
                animation: inView
                  ? `${dir === "right" ? "tabSlideRight" : "tabSlideLeft"} 0.55s cubic-bezier(0.05,0.61,0.41,0.95) ${i * 0.08}s both`
                  : "none",
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "#1a2a6c";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "#0D1B2A";
              }}
            >
              <span style={{
                writingMode: "vertical-rl",
                transform: "scale(-1,-1)",
                color: isActive ? "#0D1B2A" : "white",
                fontWeight: 800,
                fontSize: "clamp(8px, 0.9vw, 12px)",
                letterSpacing: 1.5,
                textTransform: "uppercase",
                lineHeight: 1.3,
                transition: "color 0.3s",
                padding: "14px 0",
                userSelect: "none",
                fontFamily: "inherit",
              }}>
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MobileCard({ item, noButtons = false }: { item: AccordionItem; noButtons?: boolean }) {
  return (
    <div style={{
      position: "relative",
      minHeight: 270,
      borderRadius: 18,
      overflow: "hidden",
      marginBottom: 16,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
    }}>
      <img src={item.image} alt={item.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.48)", zIndex: 1 }} />
      <div style={{ position: "relative", zIndex: 2, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)", padding: "22px 18px 18px" }}>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 6 }}>
          {item.label}
        </p>
        {item.headline && (
          <p style={{ color: "white", fontWeight: 900, fontSize: 15, marginBottom: 14, textTransform: "uppercase", lineHeight: 1.4 }}>
            {item.headline}
          </p>
        )}
        {!noButtons && item.buttons && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {item.buttons.map((btn) =>
              btn.disabled ? (
                <span key={btn.text} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "#273b84", color: "rgba(255,255,255,0.4)",
                  padding: "8px 14px", borderRadius: 7, fontWeight: 800, fontSize: 13,
                  cursor: "not-allowed", fontFamily: "inherit",
                }}>
                  {btn.text} {btn.sub && <span style={{ fontWeight: 600, fontSize: 11 }}>{btn.sub}</span>}
                </span>
              ) : (
                <Link key={btn.text} href={btn.href} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "rgba(255,255,255,0.14)",
                  border: "1.5px solid rgba(255,255,255,0.32)",
                  color: "white", padding: "8px 14px", borderRadius: 7,
                  fontWeight: 800, fontSize: 13, textDecoration: "none", fontFamily: "inherit",
                }}>
                  {btn.text} {btn.sub && <span style={{ fontWeight: 600, fontSize: 11, opacity: 0.75 }}>{btn.sub}</span>}
                </Link>
              )
            )}
          </div>
        )}
        {noButtons && item.cta && item.href && (
          <Link href={item.href} style={{
            display: "inline-block",
            background: "#273b84",
            color: "white",
            padding: "11px 24px",
            borderRadius: 9,
            fontWeight: 800,
            fontSize: 14,
            textDecoration: "none",
            fontFamily: "inherit",
          }}>
            {item.cta}
          </Link>
        )}
      </div>
    </div>
  );
}

function _getPrice(unit: any) {
  const ta = unit?.custom_fields?.total_amount;
  if (ta && parseFloat(ta) > 0) return parseFloat(ta);
  return unit?.base_price ? parseFloat(unit.base_price) : null;
}

// ── Trending Card (matches store UnitCard) ──────────────────────────────────
function TrendingCard({ unit: u, imgUrl, statusColor, formatPrice }: { unit: any; imgUrl: string; statusColor: string; formatPrice: (p: any) => string }) {
  const [saved, setSaved] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => { setSaved(isSaved(u.id)); setInCompare(isInCompare(u.id)); }, [u.id]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  function handleSave(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setSaved(toggleSaved(u.id));
    showToast(isSaved(u.id) ? "Saved ❤️" : "Removed");
    window.dispatchEvent(new Event("jp_saved_update"));
  }
  function handleCompare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const r = toggleCompare(u.id);
    if (r.error) { showToast(r.error); return; }
    setInCompare(r.added);
    showToast(r.added ? "Added to compare ⇄" : "Removed");
    window.dispatchEvent(new Event("jp_compare_update"));
  }
  function handleShare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}/units/${u.id}`;
    const text = `${u.unit_number} — ${u.unit_type}, ${formatPrice(_getPrice(u))} | Janapriya Upscale`;
    if (navigator.share) navigator.share({ title: "Janapriya Upscale", text, url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(`${text}\n${url}`).then(() => showToast("Link copied! 📋"));
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1"
      style={{ boxShadow: "0 4px 20px rgba(42,56,135,0.08)", border: "1.5px solid #E2F1FC" }}>
      <div className="h-44 relative flex flex-col justify-between p-4"
        style={{ background: imgUrl ? `url(${imgUrl}) center/cover no-repeat` : "linear-gradient(135deg,#2A3887 0%,#29A9DF 100%)" }}>
        {imgUrl && <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0.55) 100%)" }} />}
        <div className="relative z-10 flex justify-between items-center">
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white" style={{ color: statusColor }}>
            ● {(u.status||"available").charAt(0).toUpperCase()+(u.status||"available").slice(1)}
          </span>
          <div className="flex gap-1.5">
            {[
              { fn: handleSave, icon: saved?"♥":"♡", bg: saved?"rgba(239,68,68,0.9)":"rgba(255,255,255,0.2)" },
              { fn: handleCompare, icon: "⇄", bg: inCompare?"rgba(245,158,11,0.85)":"rgba(255,255,255,0.2)" },
              { fn: handleShare, icon: "↗", bg: "rgba(255,255,255,0.2)" },
            ].map((btn,i) => (
              <button key={i} onClick={btn.fn}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm transition-all hover:scale-110"
                style={{ background: btn.bg }}>{btn.icon}</button>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.65)" }}>
              {u.unit_type?.includes("BHK") ? u.unit_type : `${u.unit_type || ""}${u.bedrooms ? (u.unit_type ? " · " : "") + u.bedrooms + " BHK" : ""}`}
            </p>
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background:"rgba(245,158,11,0.9)",color:"white" }}>🔥</span>
          </div>
          <h3 className="text-white font-black text-lg leading-tight">{u.unit_number||"Unit"}</h3>
        </div>
        {toast && (
          <div className="absolute bottom-3 left-3 right-3 z-10 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-center"
            style={{ color: "#2A3887" }}>{toast}</div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { icon: "🛏", val: u.bedrooms||"—", label: "BHK" },
            { icon: "📐", val: u.area_sqft ? `${parseFloat(u.area_sqft).toFixed(0)}` : "—", label: "sqft" },
            { icon: "🏢", val: u.floor_number??  "—", label: "Floor" },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-2 text-center" style={{ background: "#F8F9FB" }}>
              <div className="text-base">{s.icon}</div>
              <div className="font-black text-sm" style={{ color: "#2A3887" }}>{s.val}</div>
              <div className="text-xs" style={{ color: "#999" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {u.bathrooms && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background:"#F0F4FF",color:"#2A3887" }}>🚿 {u.bathrooms} Bath</span>}
          {u.facing && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background:"#F0F4FF",color:"#2A3887" }}>🧭 {u.facing}</span>}
          {u.balconies > 0 && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background:"#F0F4FF",color:"#2A3887" }}>🏡 {u.balconies} Balc</span>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop:"1px solid #F0F4FF" }}>
          <div>
            <div className="font-black text-lg" style={{ color: "#2A3887" }}>{formatPrice(_getPrice(u))}</div>
            {u.area_sqft && _getPrice(u) && (
              <div className="text-xs" style={{ color: "#999" }}>
                ₹{Math.round(_getPrice(u)!/parseFloat(u.area_sqft)).toLocaleString()}/sqft
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <div onClick={e=>{e.preventDefault();e.stopPropagation();}}>
              <AddToCartBtn unitId={u.id} status={u.status} size="sm" />
            </div>
            <Link href={`/contact?unit=${u.id}`}
              className="px-3 py-1.5 text-xs font-bold rounded-xl"
              style={{ border:"1.5px solid #2A3887",color:"#2A3887" }}>Enquire</Link>
            <Link href={`/units/${u.id}`}
              className="px-3 py-1.5 text-xs font-bold text-white rounded-xl"
              style={{ background:"linear-gradient(135deg,#2A3887,#29A9DF)" }}>Details →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("Buy");
  const [activeSlide, setActiveSlide] = useState(0);

  const HERO_SLIDES = [
    { src: "/jp_final.mp4" },
    { src: "/RiseUpExplainer.mp4" },
  ];

  useEffect(() => {
    const timer = setInterval(() => setActiveSlide(s => (s + 1) % HERO_SLIDES.length), 7000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMounted(true);
    const API = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    fetch(`${API}/units/trending?limit=6`)
      .then(r => r.json() as Promise<any>)
      .then(d => setTrending(Array.isArray(d) ? d : (d.items || [])))
      .catch(() => {});
    fetch(`${API}/projects?is_featured=true`)
      .then(r => r.json())
      .then(d => setProjects(Array.isArray(d) ? d.slice(0, 4) : (d.items || []).slice(0, 4)))
      .catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    window.location.href = `/store?q=${encodeURIComponent(query.trim())}`;
  }

  function getPrice(unit: any) {
    const ta = unit.custom_fields?.total_amount;
    if (ta && parseFloat(ta) > 0) return parseFloat(ta);
    return unit.base_price ? parseFloat(unit.base_price) : null;
  }

  function formatPrice(p: any) {
    if (!p) return "Price on request";
    const n = parseFloat(p);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(0)} L`;
    return `₹${n.toLocaleString()}`;
  }

  const APARTMENT_TYPES = [
    { icon: "🏠", label: "Villa" },
    { icon: "🏢", label: "Apartment" },
    { icon: "🏡", label: "Duplex" },
    { icon: "🏗️", label: "Plot" },
    { icon: "🌆", label: "Penthouse" },
    { icon: "🏰", label: "Bungalow" },
  ];

  const SERVICES = [
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      ),
      title: "Buy A Property",
      desc: "Find your dream home from our curated listings across prime locations in Hyderabad.",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M7 8h10M7 12h6"/>
        </svg>
      ),
      title: "Sell A Property",
      desc: "List your property with us and reach thousands of verified buyers instantly.",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      ),
      title: "Rent A Property",
      desc: "Explore flexible rental options tailored to your lifestyle and budget needs.",
    },
  ];

  const TESTIMONIALS = [
    { name: "Rajesh Kumar", role: "Software Engineer", city: "Hyderabad", text: "Excellent construction quality and transparent process. Janapriya delivered exactly what they promised. Highly recommended!", rating: 5, initial: "R" },
    { name: "Priya Sharma", role: "Doctor", city: "Secunderabad", text: "Bought a 3BHK in Janapriya Heights. The team was professional at every step. Best decision of my life!", rating: 5, initial: "P" },
    { name: "Venkat Reddy", role: "Business Owner", city: "Hyderabad", text: "Invested in Janapriya Meadows villa. Superb quality, premium location. Great ROI and an even better living experience.", rating: 5, initial: "V" },
  ];

  const AGENTS = [
    { name: "Arjun Rao", role: "Senior Advisor", exp: "12 yrs", deals: "340+" },
    { name: "Meena Pillai", role: "Property Consultant", exp: "8 yrs", deals: "210+" },
    { name: "Karthik Boya", role: "Investment Expert", exp: "10 yrs", deals: "280+" },
    { name: "Neha Gupta", role: "Sales Manager", exp: "6 yrs", deals: "160+" },
  ];

  const NEWS = [
    { tag: "Market", title: "Podcast With 𝐉𝐀𝐍𝐀𝐏𝐑𝐈𝐘𝐀 𝐔𝐏𝐒𝐂𝐀𝐋𝐄 Managing Director 𝐊𝐫𝐚𝐧𝐭𝐢 𝐊𝐢𝐫𝐚𝐧 𝐑𝐞𝐝𝐝𝐲", date: "Dec 12, 2024" },
    { tag: "Tips", title: "Sakshi Property Plus: Janapriya Upscale MD – Mr. Kranti Kiran Reddy Exclusive Interview | Real Estate |", date: "Nov 28, 2024" },
    { tag: "Legal", title: "Janapriya Upscale to invest Rs 1,250 cr in 4 projects", date: "Nov 15, 2024" },
  ];

  const STATS = [
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
          <path d="M12 12l1.5 5-1.5 1-1.5-1z"/>
        </svg>
      ),
      iconBg: "#EBF4FF",
      value: "40",
      label: "Years of Experience",
      valueColor: "#185FA5",
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          <line x1="12" y1="12" x2="12" y2="16"/>
          <line x1="10" y1="14" x2="14" y2="14"/>
        </svg>
      ),
      iconBg: "#E1F5EE",
      value: "40K+",
      label: "Dream Homes",
      valueColor: "#0F6E56",
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      iconBg: "#FEF3C7",
      value: "70K+",
      label: "Happy Families",
      valueColor: "#854F0B",
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#993556" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="18" rx="2"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
          <line x1="2" y1="9" x2="22" y2="9"/>
          <line x1="2" y1="15" x2="22" y2="15"/>
        </svg>
      ),
      iconBg: "#FBEAF0",
      value: "20+",
      label: "Million Square Feet",
      valueColor: "#993556",
    },
  ];

  return (
    <main style={{ fontFamily: "'Nunito', 'Segoe UI', sans-serif" }} className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        .jp-brand { color: #273b84; }
        .jp-brand-bg { background: #273b84; }
        .jp-dark { color: #0D1B2A; }
        .jp-gray { color: #6B7280; }
        .card-hover { transition: all 0.28s cubic-bezier(.4,0,.2,1); }
        .card-hover:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(39,59,132,0.13); }
        .fade-in { animation: fadeUp 0.6s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .ticker { display: flex; gap: 40px; animation: tick 18s linear infinite; white-space: nowrap; }
        @keyframes tick { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .pill-tab { border-radius: 8px; padding: 10px 28px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; }
        .pill-tab.active { background: #273b84; color: white; }
        .pill-tab:not(.active) { background: white; color: #374151; }
        .input-search { border: none; outline: none; background: transparent; flex: 1; font-size: 14px; color: #374151; font-family: inherit; min-width: 0; }
        .input-search::placeholder { color: #9CA3AF; }
        .section-label { font-size: 12px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: #273b84; margin-bottom: 8px; }
        .section-title { font-size: clamp(28px, 4vw, 42px); font-weight: 900; color: #0D1B2A; line-height: 1.2; }
        .divider-brand { width: 48px; height: 3px; background: #273b84; border-radius: 2px; margin: 16px 0; }
        .star { color: #F59E0B; font-size: 14px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; }
        .badge-brand { background: #e8ebf8; color: #273b84; }
        .badge-amber { background: #FEF3C7; color: #92400E; }
        .badge-blue { background: #DBEAFE; color: #1E40AF; }
        .news-img { width: 100%; height: 170px; object-fit: cover; border-radius: 12px 12px 0 0; background: linear-gradient(135deg, #0D1B2A, #273b84); }
        .agent-avatar { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; color: white; background: linear-gradient(135deg, #0D1B2A, #273b84); margin: 0 auto 12px; }
        .scroll-indicator { width: 22px; height: 36px; border: 2px solid rgba(255,255,255,0.4); border-radius: 20px; display: flex; align-items: flex-start; justify-content: center; padding-top: 5px; }
        .scroll-dot { width: 4px; height: 8px; background: white; border-radius: 2px; animation: scrollDown 1.5s ease-in-out infinite; }
        @keyframes scrollDown { 0%,100% { transform: translateY(0); opacity:1; } 50% { transform: translateY(8px); opacity:0.3; } }
        @keyframes heroProgress { from { width: 0%; } to { width: 100%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes tabSlideRight { 0% { transform: translateX(40px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes tabSlideLeft  { 0% { transform: translateX(-40px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        .hero-arrow:hover { background: rgba(39,59,132,0.25) !important; border-color: #273b84 !important; }
        .search-card { transition: all 0.25s cubic-bezier(.4,0,.2,1); }
        .search-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(39,59,132,0.12); }

        /* ── Stats Box hover ── */
        .stat-box { transition: all 0.28s cubic-bezier(.4,0,.2,1); cursor: default; }
        .stat-box:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(39,59,132,0.12); }

        /* ── Services Card hover ── */
        .service-card-filled { transition: all 0.25s ease; }
        .service-card-filled:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(0,0,0,0.18); }
        .service-card-outline { transition: all 0.25s ease; }
        .service-card-outline:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(39,59,132,0.12); border-color: #273b84 !important; }

        /* ── Search Filter responsive ── */
        .sf-desktop { display: flex !important; width: 100%; }
        .sf-mobile  { display: none !important; }

        /* ── Hero headline ── */
        .hero-headline {
          text-align: center;
          margin-bottom: 28px;
        }
        .hero-headline-eyebrow {
          color: rgba(255,255,255,0.7);
          font-size: clamp(10px, 2.5vw, 13px);
          font-weight: 800;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 12px;
          display: block;
        }
        .hero-headline-h1 {
          color: white;
          font-weight: 900;
          font-size: clamp(32px, 7vw, 60px);
          line-height: 1.12;
          margin: 0 0 14px;
          text-shadow: 0 4px 24px rgba(0,0,0,0.45);
        }
        .hero-headline-sub {
          color: rgba(255,255,255,0.62);
          font-size: clamp(13px, 2vw, 16px);
          font-weight: 500;
          max-width: 460px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* ── Search bar ── */
        .hero-search-bar {
          border-radius: 24px;
          padding: 6px 6px 6px 22px;
          display: flex;
          align-items: center;
          gap: 0;
          box-shadow: 0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.8);
          
          width: 100%;
          box-sizing: border-box;
        }

        /* ── MOBILE FIXES ── */
        @media (max-width: 767px) {
          .sf-desktop { display: none !important; }
          .sf-mobile  { display: block !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .services-grid { grid-template-columns: 1fr !important; }

          /* Hero nav arrows — hide on mobile */
          .hero-arrow { display: none !important; }

          /* Hero search bar — stack vertically on mobile */
          .hero-search-bar {
            flex-wrap: wrap !important;
            padding: 12px 14px !important;
            border-radius: 20px !important;
            gap: 10px !important;
            align-items: stretch !important;
          }

          /* Hide non-essential elements inside the search bar on mobile */
          .hero-location { display: none !important; }
          .hero-divider  { display: none !important; }
          .hero-icon-box { display: none !important; }

          /* Input: full width row */
          .input-search.hero-search-input {
            font-size: 15px !important;
            padding: 6px 0 !important;
            width: 100% !important;
            flex: 1 1 100% !important;
            min-width: 0 !important;
          }

          /* Button: full width row below input */
          .hero-search-btn {
            width: 100% !important;
            flex: 1 1 100% !important;
            justify-content: center !important;
            border-radius: 14px !important;
            padding: 14px 16px !important;
            box-sizing: border-box !important;
            font-size: 15px !important;
          }

          /* Hero headline sizes on mobile */
          .hero-headline {
            margin-bottom: 20px;
          }
          .hero-headline-h1 {
            font-size: clamp(30px, 9vw, 44px) !important;
          }
        }
      `}</style>

      <Navbar />

      {/* ── HERO VIDEO SLIDER ──────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        {HERO_SLIDES.map((slide, i) => (
          <div key={i} className="absolute inset-0" style={{ zIndex: 1, opacity: activeSlide === i ? 1 : 0, transition: "opacity 1.2s ease-in-out" }}>
            <div className="absolute inset-0" />
            {mounted && (
              <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.55, zIndex: 1 }}>
                <source src={slide.src} type="video/mp4" />
              </video>
            )}
          </div>
        ))}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(13,27,42,0.35) 0%, rgba(13,27,42,0.1) 50%, rgba(13,27,42,0.55) 100%)", zIndex: 0 }} />
        <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(39,59,132,0.18), transparent 70%)", zIndex: 2 }} />
        <div className="absolute bottom-1/3 left-0 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(39,59,132,0.12), transparent 70%)", zIndex: 2 }} />

        {/* ── Hero content ── */}
        <div
          className="relative mx-auto"
          style={{
            zIndex: 1,
            paddingTop: "clamp(100px, 20vw, 150px)",
            paddingBottom: "clamp(90px, 16vw, 130px)",
            paddingLeft: "clamp(16px, 5vw, 32px)",
            paddingRight: "clamp(16px, 5vw, 32px)",
            width: "100%",
            maxWidth: 800,
            boxSizing: "border-box",
          }}
        >
         

          {/* ── Search Bar ── */}
          <div
            className="fade-in"
            style={{ width: "100%", boxSizing: "border-box", animationDelay: "0.18s" }}
          >
            <form onSubmit={handleSearch}>
              <div className="hero-search-bar">
                {/* Icon */}
                <div
                  className="hero-icon-box"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #e8ebf8, #b8c0e8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                    marginRight: 10,
                  }}
                >
                  ✦
                </div>

                {/* Input */}
                <input
                  className="input-search hero-search-input"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  style={{ flex: 1, fontSize: 15, color: "#fff", padding: "12px 0", fontWeight: 600 }}
                  placeholder={`Search ${activeTab === "Buy" ? "properties to buy" : activeTab === "Rent" ? "rental properties" : "investment opportunities"}…`}
                />

                {/* Divider */}
                <div
                  className="hero-divider"
                  style={{ width: 1, height: 28, background: "#E5E7EB", flexShrink: 0, margin: "0 14px" }}
                />

                {/* Location */}
                <div
                  className="hero-location"
                  style={{ display: "flex", alignItems: "center", gap: 5, color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0, marginRight: 10, whiteSpace: "nowrap" }}
                >
                  <span style={{ fontSize: 15 }}>📍</span> Hyderabad
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={searching}
                  className="hero-search-btn"
                  style={{
                    background: searching ? "#9CA3AF" : "linear-gradient(135deg, #273b84 0%, #1a2a6c 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 18,
                    padding: "13px 28px",
                    fontWeight: 900,
                    fontSize: 14,
                    cursor: searching ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "inherit",
                    transition: "all 0.22s",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: searching ? "none" : "0 4px 20px rgba(39,59,132,0.5)",
                    flexShrink: 0,
                  }}
                >
                  {searching ? (
                    <><span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Searching…</>
                  ) : (
                    <><span>🔍</span> AI Search</>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Search redirects to /store?q=... */}
        </div>

        {/* ── Slide Dots + Scroll indicator ── */}
        <div className="absolute" style={{ bottom: 36, left: "50%", transform: "translateX(-50%)", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {HERO_SLIDES.map((_, i) => (
              <button key={i} onClick={() => setActiveSlide(i)} style={{ width: activeSlide === i ? 28 : 8, height: 8, borderRadius: 4, background: activeSlide === i ? "#273b84" : "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", transition: "all 0.4s ease", padding: 0 }} />
            ))}
          </div>
          <div className="scroll-indicator"><div className="scroll-dot" /></div>
          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 9, letterSpacing: 2.5 }}>SCROLL</span>
        </div>

        {/* ── Prev / Next arrows (hidden on mobile via CSS) ── */}
        <button onClick={() => setActiveSlide(s => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className="absolute hero-arrow" style={{ left: 24, top: "50%", transform: "translateY(-50%)", zIndex: 5, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", color: "white", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>‹</button>
        <button onClick={() => setActiveSlide(s => (s + 1) % HERO_SLIDES.length)} className="absolute hero-arrow" style={{ right: 24, top: "50%", transform: "translateY(-50%)", zIndex: 5, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", color: "white", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>›</button>

        {/* ── Progress bar ── */}
        <div className="absolute" style={{ bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.1)", zIndex: 5 }}>
          <div key={activeSlide} style={{ height: "100%", background: "#273b84", animation: "heroProgress 7s linear forwards", transformOrigin: "left" }} />
        </div>
      </section>

      {/* ── STATS ROW — BOX DESIGN ─────────────────────────────────────── */}
      <section style={{ background: "#F8FAFB", padding: "48px 0" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div
            className="stats-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}
          >
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="stat-box"
                style={{
                  background: "white",
                  border: "1.5px solid #E5E7EB",
                  borderRadius: 16,
                  padding: "28px 20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  textAlign: "center",
                }}
              >
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  background: stat.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {stat.icon}
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, color: stat.valueColor, lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600, lineHeight: 1.4 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHERE A HOUSE FEELS LIKE HOME ─────────────────────────────── */}
      <section style={{ padding: "60px 0", background: "#F8FAFB" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-label">About Janapriya</p>
              <h2 className="section-title">Where Find A House<br />Feels Like Home</h2>
              <div className="divider-brand" />
              <p style={{ color: "#6B7280", fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>
                For over four decades, Janapriya Engineers Syndicate has been crafting premium homes across Hyderabad. We combine quality construction, transparent pricing, and timely delivery — making your dream home a reality.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { icon: "✅", text: "RERA Registered" },
                  { icon: "🌿", text: "IGBC Green Certified" },
                  { icon: "📱", text: "Smart Home Ready" },
                  { icon: "💎", text: "Premium Finishes" },
                ].map(f => (
                  <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#374151" }}>
                    <span>{f.icon}</span> {f.text}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ background: "#273b84", borderRadius: 12, padding: "14px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "white" }}>560+</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>CURRENT UNITS</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>Handpicked properties in the best<br />localities across Hyderabad.</div>
                </div>
              </div>
              <Link href="/projects" style={{ display: "inline-block", background: "#273b84", color: "white", borderRadius: 10, padding: "12px 28px", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
                Explore Projects →
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ background: "linear-gradient(135deg, #0D1B2A, #273b84)", borderRadius: 20, height: 360, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                {mounted && (
                  <video autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}>
                    <source src="/jp_final.mp4" type="video/mp4" />
                  </video>
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,27,42,0.6) 0%, transparent 60%)" }} />
                <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
                  <p style={{ color: "white", fontWeight: 900, fontSize: 18 }}>40 Years of Trust</p>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Building premium homes since 1984</p>
                </div>
              </div>
              <div style={{ position: "absolute", top: -16, right: -16, background: "#273b84", borderRadius: 14, padding: "14px 18px", boxShadow: "0 8px 24px rgba(39,59,132,0.35)" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>4.9★</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>RATING</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRENDING PROPERTIES ────────────────────────────────────────── */}
      {trending.length > 0 && (
        <section style={{ padding: "80px 0", background: "#F8FAFB" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
              <div>
                <p className="section-label">Trending Properties</p>
                <h2 className="section-title">Property For Sale</h2>
              </div>
              <Link href="/store" style={{ color: "#273b84", fontWeight: 800, fontSize: 13, textDecoration: "none", border: "2px solid #273b84", borderRadius: 10, padding: "10px 20px" }}>
                View All Units →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trending.map((u: any) => {
                const img3d = u.custom_fields?.series_floor_plan_3d;
                const imgUrl = img3d || "";
                const statusColor = u.status === "available" ? "#22c55e" : u.status === "booked" ? "#ef4444" : "#f59e0b";
                return (
                  <TrendingCard key={u.id} unit={u} imgUrl={imgUrl} statusColor={statusColor} formatPrice={formatPrice} />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── JOIN JANAPRIYA STATS ───────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(135deg, #0D1B2A, #1a2a6c)", padding: "72px 24px" }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="section-label" style={{ color: "#7b8fd4" }}>Why Join Us</p>
            <h2 style={{ color: "white", fontWeight: 900, fontSize: 36, lineHeight: 1.2, marginBottom: 16 }}>Join Janapriya And Experience Today</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 28 }}>Four decades of excellence, thousands of satisfied families, and a legacy built on trust.</p>
            <Link href="/contact" style={{ display: "inline-block", background: "#273b84", color: "white", borderRadius: 12, padding: "14px 32px", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
              Get in Touch →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {[
              { v: "560+",  l: "Current Listings" },
              { v: "196K+", l: "Total Apartments" },
              { v: "₹16M+", l: "Total Land Value" },
              { v: "40+",   l: "Years of Trust" },
            ].map(s => (
              <div key={s.l} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 20px" }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: "#7b8fd4", marginBottom: 4 }}>{s.v}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED PROJECTS ──────────────────────────────────────────── */}
      <section style={{ padding: "80px 0", background: "white", position: "relative", overflow: "hidden" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(39,59,132,0.05), transparent)", transform: "translate(30%,-30%)" }} />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 32, height: 2, background: "#273b84", borderRadius: 2 }} />
              <p className="section-label" style={{ marginBottom: 0 }}>Our Projects</p>
              <div style={{ width: 32, height: 2, background: "#273b84", borderRadius: 2 }} />
            </div>
            <h2 className="section-title">Featured Projects</h2>
            <p style={{ color: "#6B7280", fontSize: 14, marginTop: 8, maxWidth: 500, margin: "8px auto 0" }}>
              Premium residential communities across Hyderabad — crafted to the highest standards.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {projects.length > 0 ? projects.slice(0, 3).map((p: any) => (
              <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                <div className="card-hover" style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1.5px solid #e8ebf8", boxShadow: "0 4px 20px rgba(39,59,132,0.08)" }}>
                  <div style={{ height: 224, background: "linear-gradient(135deg, #273b84 0%, #1a2a6c 100%)", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20, overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)" }} />
                    <span style={{
                      alignSelf: "flex-start", display: "inline-block", padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800, zIndex: 1,
                      background: p.status === "ready" ? "#e8ebf8" : p.status === "upcoming" ? "#FEF3C7" : "#DBEAFE",
                      color: p.status === "ready" ? "#273b84" : p.status === "upcoming" ? "#92400E" : "#1E40AF",
                    }}>
                      {p.status === "ready" ? "✓ Ready to Move" : p.status === "upcoming" ? "⏳ Upcoming" : "🏗 Under Construction"}
                    </span>
                    <div style={{ zIndex: 1 }}>
                      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 4 }}>{p.project_type || "Residential"}</p>
                      <h3 style={{ color: "white", fontWeight: 900, fontSize: 20, marginBottom: 4 }}>{p.name}</h3>
                      {p.address && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>📍 {p.address}</p>}
                    </div>
                  </div>
                  <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Starting from</p>
                      <span style={{ fontWeight: 900, fontSize: 18, color: "#0D1B2A" }}>{p.min_price ? formatPrice(p.min_price) : "Price on request"}</span>
                    </div>
                    <span style={{ background: "linear-gradient(135deg,#0D1B2A,#273b84)", color: "white", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 800 }}>View →</span>
                  </div>
                </div>
              </Link>
            )) : [1, 2, 3].map(i => (
              <div key={i} style={{ height: 290, borderRadius: 20, background: "#F3F4F6", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Link href="/projects" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 36px", fontWeight: 800, fontSize: 14, borderRadius: 50, border: "2px solid #273b84", color: "#273b84", textDecoration: "none", transition: "all 0.2s" }}>
              View All Projects →
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────── */}
      <section style={{ background: "#F8FAFB", padding: "80px 0" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p className="section-label">Happy Families</p>
            <h2 className="section-title">What People Saying About<br />Our Real Estate</h2>
            <p style={{ color: "#6B7280", fontSize: 14, marginTop: 8 }}>70,000+ customers trust us</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="card-hover" style={{ background: "white", borderRadius: 18, padding: 28, border: "1px solid #F0F0F0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", position: "relative" }}>
                <div style={{ position: "absolute", top: 20, right: 24, fontSize: 40, color: "#e8ebf8", fontWeight: 900, lineHeight: 1 }}>"</div>
                <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
                  {Array(t.rating).fill(0).map((_, i) => <span key={i} className="star">★</span>)}
                </div>
                <p style={{ color: "#374151", fontSize: 13, lineHeight: 1.75, marginBottom: 20 }}>{t.text}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #0D1B2A, #273b84)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>{t.initial}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#0D1B2A" }}>{t.name}</div>
                    <div style={{ color: "#9CA3AF", fontSize: 11 }}>{t.role}, {t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 48, flexWrap: "wrap" }}>
            {["RERA", "IGBC", "ISO 9001", "CRISIL AA", "CREDAI"].map(logo => (
              <div key={logo} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 20px", fontWeight: 800, fontSize: 12, color: "#6B7280", letterSpacing: 1 }}>{logo}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEET AGENTS ────────────────────────────────────────────────── */}
      <section style={{ background: "white", padding: "80px 0" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p className="section-label">Our Team</p>
            <h2 className="section-title">Meet With Agents</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {AGENTS.map(a => (
              <div key={a.name} className="card-hover" style={{ background: "#F8FAFB", borderRadius: 18, padding: "24px 16px", textAlign: "center", border: "1px solid #F0F0F0" }}>
                <div className="agent-avatar">{a.name[0]}</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0D1B2A" }}>{a.name}</div>
                <div style={{ color: "#273b84", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{a.role}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <span style={{ background: "#e8ebf8", color: "#273b84", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>{a.exp}</span>
                  <span style={{ background: "#DBEAFE", color: "#1E40AF", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>{a.deals} deals</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MILESTONES VIDEO ───────────────────────────────────────────── */}
      {mounted && (
        <section style={{ background: "#0D1B2A", overflow: "hidden", position: "relative" }}>
          <video autoPlay muted loop playsInline className="hidden md:block" style={{ width: "100%", maxHeight: 620, objectFit: "cover", opacity: 0.55 }}>
            <source src="/jp_milestones.mp4" type="video/mp4" />
          </video>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: 24 }}>
            <p className="section-label" style={{ color: "#7b8fd4" }}>Our Journey</p>
            <h2 style={{ color: "white", fontWeight: 900, fontSize: 36, marginBottom: 12 }}>40 Years of Milestones</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, maxWidth: 400 }}>From our first project in 1984 to 40,000+ homes delivered — a legacy of excellence.</p>
          </div>
        </section>
      )}

      {/* ── NEWS & ARTICLES ────────────────────────────────────────────── */}
      <section style={{ background: "#F8FAFB", padding: "80px 0" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
            <div>
              <p className="section-label">Insights</p>
              <h2 className="section-title">Our Latest Article And<br />News For You</h2>
            </div>
            <Link href="/blog" style={{ color: "#273b84", fontWeight: 800, fontSize: 13, textDecoration: "none", border: "2px solid #273b84", borderRadius: 10, padding: "10px 20px" }}>
              All Articles →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {NEWS.map(n => (
              <div key={n.title} className="card-hover" style={{ background: "white", borderRadius: 18, overflow: "hidden", border: "1px solid #F0F0F0", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
                <div className="news-img" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 40 }}>🏙️</span>
                </div>
                <div style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span className="badge badge-brand">{n.tag}</span>
                    <span style={{ color: "#9CA3AF", fontSize: 11 }}>{n.date}</span>
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: 14, color: "#0D1B2A", lineHeight: 1.5, marginBottom: 12 }}>{n.title}</h3>
                  <span style={{ color: "#273b84", fontSize: 12, fontWeight: 800 }}>Read more →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER BANNER ──────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(135deg, #273b84, #1a2a6c)", padding: "72px 24px", textAlign: "center" }}>
        <div className="max-w-2xl mx-auto">
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>Take The Next Step</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: 36, marginBottom: 12, lineHeight: 1.2 }}>Ready to Find Your<br />Dream Home?</h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, marginBottom: 32 }}>Talk to our experts today. Site visits available 7 days a week. No spam — ever.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/contact" style={{ background: "white", color: "#273b84", borderRadius: 12, padding: "14px 32px", fontWeight: 900, fontSize: 14, textDecoration: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
              🗓 Schedule a Visit
            </Link>
            <Link href="/projects" style={{ background: "rgba(255,255,255,0.12)", color: "white", borderRadius: 12, padding: "14px 32px", fontWeight: 800, fontSize: 14, textDecoration: "none", border: "2px solid rgba(255,255,255,0.3)" }}>
              Browse Projects →
            </Link>
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 20 }}>📞 Our team will reach out within 24 hours.</p>
        </div>
      </section>

      <Footer />
    </main>
  );
}