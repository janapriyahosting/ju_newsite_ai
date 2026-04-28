"use client";
import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompareBar from "@/components/CompareBar";
import ProactiveAssistant from "@/components/ProactiveAssistant";
import UnitCard from "@/components/UnitCard";

const API = process.env.NEXT_PUBLIC_API_URL || "http://173.168.0.81/api/v1";

function formatPrice(p: any) {
  if (!p) return "Price on request";
  const n = parseFloat(p);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)} L`;
  return `₹${n.toLocaleString()}`;
}

function getPrice(unit: any) {
  const ta = unit.custom_fields?.total_amount;
  if (ta && parseFloat(ta) > 0) return parseFloat(ta);
  return unit.base_price ? parseFloat(unit.base_price) : null;
}

interface FilterConfig {
  id: string;
  filter_key: string;
  filter_label: string;
  filter_type: string;
  field_name: string | null;
  options: { value: string; label: string; min?: number; max?: number }[] | null;
  config: Record<string, any> | null;
  is_quick_filter: boolean;
  sort_order: number;
}

function getUnitFieldValue(unit: any, fieldName: string): any {
  if (unit[fieldName] !== undefined) return unit[fieldName];
  if (unit.custom_fields && unit.custom_fields[fieldName] !== undefined)
    return unit.custom_fields[fieldName];
  return undefined;
}

const FALLBACK_FILTERS: FilterConfig[] = [
  { id: "1", filter_key: "unit_type", filter_label: "Unit Type", filter_type: "pills", field_name: "unit_type", options: [{ value: "All", label: "All" }, { value: "2BHK", label: "2BHK" }, { value: "3BHK", label: "3BHK" }, { value: "4BHK", label: "4BHK" }, { value: "Villa", label: "Villa" }, { value: "Plot", label: "Plot" }, { value: "Studio", label: "Studio" }], config: { default_value: "All" }, is_quick_filter: true, sort_order: 1 },
  { id: "2", filter_key: "trending", filter_label: "Trending", filter_type: "checkbox", field_name: "is_trending", options: null, config: { label: "🔥 Trending" }, is_quick_filter: true, sort_order: 2 },
  { id: "3", filter_key: "status", filter_label: "Status", filter_type: "select", field_name: "status", options: [{ value: "All Status", label: "All Status" }, { value: "available", label: "Available" }, { value: "booked", label: "Booked" }, { value: "reserved", label: "Reserved" }], config: { default_value: "All Status" }, is_quick_filter: true, sort_order: 3 },
  { id: "4", filter_key: "sort", filter_label: "Sort By", filter_type: "select", field_name: null, options: [{ value: "newest", label: "Newest First" }, { value: "price_asc", label: "Price: Low → High" }, { value: "price_desc", label: "Price: High → Low" }, { value: "area_desc", label: "Area: Largest" }, { value: "floor_asc", label: "Floor: Lowest" }, { value: "floor_desc", label: "Floor: Highest" }], config: { default_value: "newest" }, is_quick_filter: true, sort_order: 4 },
  { id: "5", filter_key: "price_range", filter_label: "Price Range", filter_type: "range_slider", field_name: "base_price", options: null, config: { min: 0, max: 20000000, format: "price" }, is_quick_filter: false, sort_order: 5 },
  { id: "6", filter_key: "area_range", filter_label: "Area (sqft)", filter_type: "range_slider", field_name: "area_sqft", options: null, config: { min: 0, max: 5000, format: "area" }, is_quick_filter: false, sort_order: 6 },
  { id: "7", filter_key: "facing", filter_label: "Facing", filter_type: "pills", field_name: "facing", options: [{ value: "Any", label: "Any" }, { value: "East", label: "East" }, { value: "West", label: "West" }, { value: "North", label: "North" }, { value: "South", label: "South" }, { value: "North-East", label: "NE" }, { value: "North-West", label: "NW" }, { value: "South-East", label: "SE" }, { value: "South-West", label: "SW" }], config: { default_value: "Any" }, is_quick_filter: false, sort_order: 7 },
  { id: "8", filter_key: "floor_level", filter_label: "Floor Level", filter_type: "pills", field_name: "floor_number", options: [{ value: "any", label: "Any Floor", min: 0, max: 999 }, { value: "ground", label: "Ground (0-2)", min: 0, max: 2 }, { value: "low", label: "Low (3-7)", min: 3, max: 7 }, { value: "mid", label: "Mid (8-15)", min: 8, max: 15 }, { value: "high", label: "High (16+)", min: 16, max: 999 }], config: { default_value: "any" }, is_quick_filter: false, sort_order: 8 },
  { id: "9", filter_key: "bedrooms", filter_label: "Min Bedrooms", filter_type: "button_group", field_name: "bedrooms", options: [{ value: "0", label: "Any" }, { value: "1", label: "1+" }, { value: "2", label: "2+" }, { value: "3", label: "3+" }, { value: "4", label: "4+" }], config: { default_value: "0" }, is_quick_filter: false, sort_order: 9 },
];

// ── Range Slider ──────────────────────────────────────────────────────────────
function RangeSlider({ label, min, max, value, onChange, format }: {
  label: string; min: number; max: number; value: [number, number];
  onChange: (v: [number, number]) => void; format: (n: number) => string;
}) {
  if (max <= min) return (
    <div className="mb-5">
      <span className="text-xs font-black" style={{ color: "#2A3887" }}>{label}</span>
      <p className="text-xs mt-1" style={{ color: "#999" }}>—</p>
    </div>
  );
  const step = Math.max(1, Math.floor((max - min) / 200));
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-black" style={{ color: "#2A3887" }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: "#29A9DF" }}>{format(value[0])} – {format(value[1])}</span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute w-full h-1.5 rounded-full" style={{ background: "#E2F1FC" }} />
        <div className="absolute h-1.5 rounded-full pointer-events-none" style={{
          background: "linear-gradient(90deg,#2A3887,#29A9DF)",
          left: `${((value[0] - min) / (max - min)) * 100}%`,
          right: `${100 - ((value[1] - min) / (max - min)) * 100}%`,
        }} />
        {[0, 1].map(idx => (
          <input key={idx} type="range" min={min} max={max} step={step} value={value[idx]}
            onChange={e => {
              const v = parseInt(e.target.value);
              const next: [number, number] = [...value] as [number, number];
              if (idx === 0) next[0] = Math.min(v, value[1] - step);
              else next[1] = Math.max(v, value[0] + step);
              onChange(next);
            }}
            className="jp-range absolute w-full appearance-none bg-transparent"
            style={{ zIndex: 3, height: 20 }} />
        ))}
      </div>
      <style jsx>{`
        .jp-range { pointer-events: none; }
        .jp-range::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; height: 20px; width: 20px; border-radius: 50%; background: #2A3887; border: 2px solid white; box-shadow: 0 2px 6px rgba(42,56,135,0.35); pointer-events: auto; cursor: pointer; }
        .jp-range::-moz-range-thumb { height: 20px; width: 20px; border-radius: 50%; background: #2A3887; border: 2px solid white; box-shadow: 0 2px 6px rgba(42,56,135,0.35); pointer-events: auto; cursor: pointer; }
        .jp-range::-webkit-slider-runnable-track { background: transparent; }
        .jp-range::-moz-range-track { background: transparent; }
      `}</style>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onChange }: {
  currentPage: number; totalPages: number; onChange: (p: number) => void;
}) {
  function pageItems(): (number | "…")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const items: (number | "…")[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) items.push("…");
    for (let p = start; p <= end; p++) items.push(p);
    if (end < totalPages - 1) items.push("…");
    items.push(totalPages);
    return items;
  }
  const btnStyle = (active: boolean) => active
    ? { background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white", borderColor: "transparent" }
    : { background: "white", color: "#2A3887", borderColor: "#E2F1FC" };
  return (
    <div className="flex items-center justify-center gap-1.5 mt-10 flex-wrap">
      <button onClick={() => onChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
        className="px-3 py-2 rounded-lg text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={btnStyle(false)}>‹ Prev</button>
      {pageItems().map((p, i) =>
        p === "…"
          ? <span key={`e${i}`} className="px-1 text-sm" style={{ color: "#999" }}>…</span>
          : <button key={p} onClick={() => onChange(p as number)}
            className="w-8 h-8 rounded-lg text-xs font-bold border transition-all"
            style={btnStyle(p === currentPage)}>{p}</button>
      )}
      <button onClick={() => onChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-lg text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={btnStyle(false)}>Next ›</button>
    </div>
  );
}

// ── Accordion Panel Section ───────────────────────────────────────────────────
interface AccordionPanel {
  id: string;
  label: string;
  subtitle: string;
  image: string;
  buttons: { label: string; href: string; disabled?: boolean }[];
}

interface AccordionSectionProps {
  title: string;
  panels: AccordionPanel[];
  direction?: "left" | "right";
}

function AccordionSection({ title, panels, direction = "right" }: AccordionSectionProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const isLeft = direction === "left";

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Mobile: vertical accordion
  if (isMobile) {
    return (
      <section style={{ borderBottom: "1px solid #E2F1FC", background: "white" }}>
        <div style={{ textAlign: "center", padding: "24px 16px 16px" }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 500, textTransform: "uppercase", color: "#222", lineHeight: 1.2 }}>
            {title}
          </h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {panels.map((panel, idx) => {
            const isActive = activeIdx === idx;
            return (
              <div key={panel.id} style={{ borderTop: "1px solid #E2F1FC" }}>
                {/* Tab header */}
                <button
                  onClick={() => setActiveIdx(isActive ? -1 : idx)}
                  style={{
                    width: "100%",
                    background: isActive ? "#2A3887" : "#f5f8ff",
                    border: "none",
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: isActive ? "#fff" : "#2A3887",
                    fontFamily: "'Lato', sans-serif",
                  }}>
                    {panel.label}
                  </span>
                  <span style={{ color: isActive ? "#fff" : "#2A3887", fontSize: 16, transform: isActive ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}>▾</span>
                </button>
                {/* Expanded content */}
                {isActive && (
                  <div>
                    {/* Image */}
                    <div style={{
                      height: 220,
                      backgroundImage: `url(${panel.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }} />
                    {/* Info bar */}
                    <div style={{ padding: "16px 20px", background: "white" }}>
                      <p style={{
                        margin: "0 0 12px",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "#777",
                      }}>
                        {panel.subtitle}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {panel.buttons.map((btn, bi) =>
                          btn.disabled ? (
                            <span key={bi} style={{
                              display: "inline-flex", alignItems: "center",
                              padding: "8px 16px", fontSize: 11, fontWeight: 700,
                              background: "#2A3887", color: "#fff", opacity: 0.45,
                              cursor: "not-allowed",
                            }}>{btn.label}</span>
                          ) : (
                            <a key={bi} href={btn.href} style={{
                              display: "inline-flex", alignItems: "center",
                              padding: "8px 16px", fontSize: 11, fontWeight: 700,
                              textDecoration: "none",
                              background: "#2A3887", color: "#fff",
                            }}>
                              {btn.label}
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // Desktop: horizontal accordion
  return (
    <section style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #E2F1FC" }}>
      <div style={{ background: "white", textAlign: "center", padding: "28px 16px 0" }}>
        <h3 style={{ margin: 0, fontSize: 40, fontWeight: 500, textTransform: "uppercase", color: "#222" }}>
          {title}
        </h3>
      </div>
      <div style={{ display: "flex", flexDirection: isLeft ? "row-reverse" : "row", height: 620, overflow: "hidden", background: "#fff" }}>
        {panels.map((panel, idx) => {
          const isActive = activeIdx === idx;
          return (
            <div
              key={panel.id}
              style={{
                display: "flex",
                flexDirection: isLeft ? "row-reverse" : "row",
                flex: isActive ? "1 1 0%" : "0 0 78px",
                overflow: "hidden",
                position: "relative",
                transition: "flex 0.55s cubic-bezier(0.05, 0.61, 0.41, 0.95)",
              }}
            >
              <button
                onClick={() => setActiveIdx(idx)}
                aria-expanded={isActive}
                style={{
                  flexShrink: 0,
                  width: 78,
                  background: isActive ? "#a8c4f0" : "#000",
                  border: "3px solid #fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2,
                  padding: 0,
                  transition: "background 0.3s",
                }}
              >
                <span style={{
                  writingMode: "vertical-rl",
                  transform: isLeft ? "rotate(0deg)" : "rotate(180deg)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  fontFamily: "'Lato', sans-serif",
                  lineHeight: 1,
                }}>
                  {panel.label}
                </span>
              </button>
              <div style={{
                flex: 1,
                minWidth: 0,
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? "auto" : "none",
                transition: "opacity 0.35s ease 0.1s",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  background: "#fff",
                  padding: "16px 26px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  zIndex: 2,
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#555",
                  }}>
                    {panel.subtitle}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 6 }}>
                    {panel.buttons.map((btn, bi) =>
                      btn.disabled ? (
                        <span key={bi} style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "8px 22px", fontSize: 12, fontWeight: 700,
                          background: "#2A3887", color: "#fff", opacity: 0.45,
                          cursor: "not-allowed", whiteSpace: "nowrap",
                        }}>{btn.label}</span>
                      ) : (
                        <span key={bi} style={{ display: "inline-flex", alignItems: "center" }}>
                          {bi > 0 && (
                            <span style={{
                              display: "inline-block", width: 2, height: 30,
                              background: "#c0392b", margin: "0 10px", flexShrink: 0, alignSelf: "center",
                            }} />
                          )}
                          <a href={btn.href} style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "8px 22px", fontSize: 12, fontWeight: 700,
                            letterSpacing: "0.03em", textDecoration: "none",
                            background: "#2A3887", color: "#fff",
                            whiteSpace: "nowrap", transition: "background 0.2s",
                          }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#1e2d6e")}
                            onMouseLeave={e => (e.currentTarget.style.background = "#2A3887")}
                          >
                            {btn.label}
                          </a>
                        </span>
                      )
                    )}
                  </div>
                </div>
                <div style={{
                  position: "absolute",
                  top: 80,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `url(${panel.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Hero Banner ───────────────────────────────────────────────────────────────
const PROJECTS = [
  { id: "nile-valley", name: "Nile Valley", location: "Chanda Nagar", href: "/projects/nile-valley", image: "/store-nilevalley.jpg" },
  { id: "lakefront",   name: "Lakefront",   location: "Sainikpuri",   href: "/projects/lakefront",   image: "/store-lakefront.jpg" },
  { id: "bahiti",      name: "Bahiti",      location: "Chandanagar",  href: "/projects/bahiti",      image: "/store-bahiti.jpg" },
];

function HeroBanner() {
  const [active, setActive] = useState<string | null>(null);
  const [touched, setTouched] = useState<string | null>(null);

  const handleTap = (id: string, href: string) => {
    if (touched === id) {
      window.location.href = href;
    } else {
      setTouched(id);
      setTimeout(() => setTouched(null), 2000);
    }
  };

  return (
    <div className="hero-banner">
      {PROJECTS.map((p) => {
        const isActive = active === p.id || touched === p.id;
        return (
          <a key={p.id} href={p.href}
            className={`hero-panel${isActive ? " hero-panel--active" : ""}`}
            onMouseEnter={() => setActive(p.id)}
            onMouseLeave={() => setActive(null)}
            onTouchStart={() => setTouched(p.id)}
          >
            <div className="hero-panel-image" style={{ backgroundImage: `url(${p.image})` }} />
            <div className="hero-panel-overlay" />
            <div className="hero-panel-text">
              <span className="hero-panel-name">{p.name}</span>
              <span className="hero-panel-loc">{p.location}</span>
            </div>
          </a>
        );
      })}
      <style jsx>{`
        .hero-banner { display: flex; height: calc(100vh - 64px); min-height: 420px; overflow: hidden; }
        .hero-panel { position: relative; flex: 1; overflow: hidden; transition: flex 0.6s cubic-bezier(0.05,0.61,0.41,0.95); text-decoration: none; display: block; cursor: pointer; }
        .hero-panel--active { flex: 2.4; }
        .hero-panel-image { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform 0.6s ease; opacity: 0.82; }
        .hero-panel--active .hero-panel-image { transform: scale(1.04); opacity: 1; }
        .hero-panel-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(38,34,98,0.8) 0%, transparent 60%); }
        .hero-panel-text { position: absolute; bottom: 10%; left: 50%; transform: translateX(-50%); text-align: center; white-space: nowrap; }
        .hero-panel-name { display: block; font-size: clamp(14px, 2.5vw, 32px); font-weight: 300; color: white; letter-spacing: 0.04em; line-height: 1.2; }
        .hero-panel-loc { display: block; font-size: clamp(11px, 1.5vw, 18px); font-weight: 300; color: rgba(255,255,255,0.7); margin-top: 4px; }
        @media (max-width: 600px) {
          .hero-banner { flex-direction: column; height: 100svh; min-height: 480px; }
          .hero-panel--active { flex: 2.6; }
          .hero-panel-text { bottom: 12%; white-space: normal; width: 90%; text-align: center; }
          .hero-panel-name { font-size: 20px; }
          .hero-panel-loc { font-size: 13px; }
        }
      `}</style>
    </div>
  );
}

// ── Scroll Chevron ────────────────────────────────────────────────────────────
function ScrollChevron({ targetId }: { targetId: string }) {
  return (
    <div className="chevron-wrap" onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })}>
      {[0, 1, 2].map(i => <div key={i} className={`chev chev-${i}`} />)}
      <style jsx>{`
        .chevron-wrap { position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; z-index: 10; }
        .chev { width: 28px; height: 8px; position: relative; opacity: 0; animation: chev-move 2.4s ease-out infinite; }
        .chev-0 { animation-delay: 0s; } .chev-1 { animation-delay: 0.4s; } .chev-2 { animation-delay: 0.8s; }
        .chev::before, .chev::after { content: ''; position: absolute; top: 0; height: 100%; width: 51%; background: #29A9DF; }
        .chev::before { left: 0; transform: skew(0deg, 30deg); }
        .chev::after { right: 0; transform: skew(0deg, -30deg); }
        @keyframes chev-move { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 1; } 80% { opacity: 0.5; transform: translateY(14px); } 100% { opacity: 0; transform: translateY(20px); } }
      `}</style>
    </div>
  );
}

// ── AI Search Bar ─────────────────────────────────────────────────────────────
function AISearchBar({ value, onChange, onSubmit, onClear, searching, aiActive, filteredCount, query }: any) {
  return (
    <div className="ai-search-bar">
      <div className="ai-search-inner">
        <p className="ai-search-eyebrow">Find Your Home</p>
        <form onSubmit={onSubmit} className="ai-search-form">
          <div className="ai-input-wrap">
            <span className="ai-icon">✦</span>
            <input value={value} onChange={e => onChange(e.target.value)}
              placeholder="AI Search: 3BHK under ₹80L facing East..."
              className="ai-input" />
            {value && <button type="button" onClick={onClear} className="ai-clear">✕</button>}
          </div>
          <button type="submit" disabled={searching} className="ai-submit">
            {searching ? "⟳" : "✦ Search"}
          </button>
        </form>
        {aiActive && (
          <div className="ai-badge">
            <span>✦ AI results for "{query}" — {filteredCount} found</span>
            <button onClick={onClear}>Clear</button>
          </div>
        )}
      </div>
      <style jsx>{`
        .ai-search-bar { background: linear-gradient(135deg,#262262,#2A3887); padding: 32px 16px; }
        .ai-search-inner { max-width: 680px; margin: 0 auto; }
        .ai-search-eyebrow { margin: 0 0 16px; font-size: 24px; font-weight: 900; color: white; letter-spacing: -0.01em; }
        .ai-search-form { display: flex; gap: 10px; flex-wrap: wrap; }
        .ai-input-wrap { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); }
        .ai-icon { color: #29A9DF; font-size: 14px; flex-shrink: 0; }
        .ai-input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: white; font-size: 14px; }
        .ai-input::placeholder { color: rgba(255,255,255,0.35); }
        .ai-clear { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 14px; padding: 0; flex-shrink: 0; }
        .ai-clear:hover { color: white; }
        .ai-submit { padding: 12px 20px; border-radius: 12px; border: none; background: linear-gradient(135deg,#29A9DF,#00C2FF); color: white; font-size: 13px; font-weight: 800; cursor: pointer; white-space: nowrap; transition: opacity 0.2s; flex-shrink: 0; }
        .ai-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .ai-badge { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
        .ai-badge span { padding: 5px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; background: rgba(41,169,223,0.15); color: #29A9DF; border: 1px solid rgba(41,169,223,0.3); }
        .ai-badge button { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 12px; text-decoration: underline; cursor: pointer; }
        .ai-badge button:hover { color: white; }
        @media (max-width: 480px) {
          .ai-search-eyebrow { font-size: 20px; }
          .ai-search-form { flex-direction: column; }
          .ai-submit { width: 100%; text-align: center; }
          .ai-input-wrap { width: 100%; }
        }
      `}</style>
    </div>
  );
}

// ── Mobile Filter Drawer ──────────────────────────────────────────────────────
function MobileFilterDrawer({ open, onClose, children, activeCount, onReset }: {
  open: boolean; onClose: () => void; children: React.ReactNode; activeCount: number; onReset: () => void;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            zIndex: 50, backdropFilter: "blur(2px)",
          }}
        />
      )}
      {/* Drawer */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 51,
        background: "white",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.05, 0.61, 0.41, 0.95)",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Handle */}
        <div style={{ padding: "12px 20px 0", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#ddd" }} />
        </div>
        {/* Header */}
        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #E2F1FC" }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#2A3887" }}>
            Filters {activeCount > 0 && <span style={{ fontSize: 11, background: "#2A3887", color: "white", borderRadius: 999, padding: "2px 8px", marginLeft: 6 }}>{activeCount}</span>}
          </span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {activeCount > 0 && (
              <button onClick={onReset} style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Reset all</button>
            )}
            <button onClick={onClose} style={{ fontSize: 20, color: "#888", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
        </div>
        {/* Content */}
        <div style={{ overflowY: "auto", padding: "16px 20px 32px", flex: 1 }}>
          {children}
        </div>
        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #E2F1FC" }}>
          <button onClick={onClose} style={{
            width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white",
            fontSize: 14, fontWeight: 800, cursor: "pointer",
          }}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}

// ── Unit Grid Section ─────────────────────────────────────────────────────────
function UnitGridSection({ units, trendingIds, loading, filtered, currentPage, totalPages, pageStart, PAGE_SIZE, pagedUnits, setCurrentPage, filterConfigs, filterValues, getVal, setVal, getRangeMin, getRangeMax, filtersOpen, setFiltersOpen, activeCount, resetFilters, siteSettings }: any) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const formatPriceShort = (n: number) =>
    n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(0)}L` : `₹${n.toLocaleString()}`;

  const quickFilters = filterConfigs.filter((f: FilterConfig) => f.is_quick_filter);
  const advancedFilters = filterConfigs.filter((f: FilterConfig) => !f.is_quick_filter);

  function renderFilter(cfg: FilterConfig, isQuickBar: boolean) {
    const val = getVal(cfg.filter_key);
    switch (cfg.filter_type) {
      case "pills":
        if (isQuickBar) return (
          <div key={cfg.filter_key} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold shrink-0 hidden sm:inline" style={{ color: "#2A3887" }}>{cfg.filter_label}</span>
            <div className="flex gap-1.5 flex-nowrap overflow-x-auto">
              {(cfg.options || []).map(opt => (
                <button key={opt.value} onClick={() => setVal(cfg.filter_key, opt.value)}
                  className="px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap flex-shrink-0"
                  style={val === opt.value ? { background: "#2A3887", color: "white", borderColor: "#2A3887" } : { background: "white", color: "#666", borderColor: "#ddd" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
        return (
          <div key={cfg.filter_key} className="mb-5">
            <p className="text-xs font-black mb-2" style={{ color: "#2A3887" }}>{cfg.filter_label}</p>
            <div className="flex flex-wrap gap-1.5">
              {(cfg.options || []).map(opt => (
                <button key={opt.value} onClick={() => setVal(cfg.filter_key, opt.value)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                  style={val === opt.value ? { background: "#2A3887", color: "white", borderColor: "#2A3887" } : { background: "#F8F9FB", color: "#555", borderColor: "#E2F1FC" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      case "select": {
        const opts = cfg.options || [];
        const hasAll = opts.some((o: any) => o.value === "" || /^all\b/i.test(o.label) || /^all\b/i.test(o.value));
        const hasDefault = cfg.config?.default_value !== undefined && cfg.config.default_value !== "";
        const needsAll = !!cfg.field_name && !hasAll && !hasDefault;
        const renderedOpts = needsAll ? [{ value: "", label: `All ${cfg.filter_label}` }, ...opts] : opts;
        if (isQuickBar) return (
          <div key={cfg.filter_key} className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-bold shrink-0 hidden sm:inline" style={{ color: "#2A3887" }}>{cfg.filter_label}</span>
            <select value={val || ""} onChange={e => setVal(cfg.filter_key, e.target.value)}
              className="px-2 py-1.5 rounded-xl text-xs font-bold border focus:outline-none"
              style={{ borderColor: "#ddd", color: "#555", maxWidth: 120 }}>
              {renderedOpts.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        );
        return (
          <div key={cfg.filter_key} className="mb-5">
            <p className="text-xs font-black mb-2" style={{ color: "#2A3887" }}>{cfg.filter_label}</p>
            <select value={val || ""} onChange={e => setVal(cfg.filter_key, e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none"
              style={{ borderColor: "#E2F1FC", color: "#555", background: "#F8F9FB" }}>
              {renderedOpts.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        );
      }
      case "checkbox":
        return (
          <button key={cfg.filter_key} onClick={() => setVal(cfg.filter_key, !val)}
            className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 flex-shrink-0"
            style={val ? { background: "#f59e0b", color: "white", borderColor: "#f59e0b" } : { background: "white", color: "#666", borderColor: "#ddd" }}>
            {cfg.config?.label || cfg.filter_label}
          </button>
        );
      case "range_slider": {
        const rMin = getRangeMin(cfg.filter_key);
        const rMax = getRangeMax(cfg.filter_key);
        const rangeVal = Array.isArray(val) ? val as [number, number] : [rMin, rMax] as [number, number];
        const fmt = cfg.config?.format === "price"
          ? formatPriceShort
          : cfg.config?.format === "area"
            ? (n: number) => `${n.toLocaleString()} sqft`
            : (n: number) => n.toLocaleString();
        return <RangeSlider key={cfg.filter_key} label={cfg.filter_label} min={rMin} max={rMax} value={rangeVal} onChange={v => setVal(cfg.filter_key, v)} format={fmt} />;
      }
      case "button_group":
        if (isQuickBar) return (
          <div key={cfg.filter_key} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold shrink-0 hidden sm:inline" style={{ color: "#2A3887" }}>{cfg.filter_label}</span>
            <div className="flex gap-1.5">
              {(cfg.options || []).map((opt: any) => (
                <button key={opt.value} onClick={() => setVal(cfg.filter_key, opt.value)}
                  className="px-2.5 py-1 rounded-full text-xs font-bold border transition-all whitespace-nowrap flex-shrink-0"
                  style={val === opt.value ? { background: "#2A3887", color: "white", borderColor: "#2A3887" } : { background: "white", color: "#666", borderColor: "#ddd" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
        return (
          <div key={cfg.filter_key} className="mb-5">
            <p className="text-xs font-black mb-2" style={{ color: "#2A3887" }}>{cfg.filter_label}</p>
            <div className="flex flex-wrap gap-1.5">
              {(cfg.options || []).map((opt: any) => (
                <button key={opt.value} onClick={() => setVal(cfg.filter_key, opt.value)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                  style={val === opt.value ? { background: "#2A3887", color: "white", borderColor: "#2A3887" } : { background: "#F8F9FB", color: "#555", borderColor: "#E2F1FC" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div id="unit-grid-section">
      {/* Sticky filter bar */}
      <div className="sticky top-16 z-30 bg-white border-b shadow-sm">
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "10px 12px" }}>
          {isMobile ? (
            /* Mobile: horizontal scroll pills + filter button */
            <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
              {/* Unit type pills only on mobile quick bar */}
              {quickFilters
                .filter((f: FilterConfig) => f.filter_key === "unit_type" || f.filter_key === "trending")
                .map((cfg: FilterConfig) => renderFilter(cfg, true))}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                {/* Sort select */}
                {quickFilters.filter((f: FilterConfig) => f.filter_key === "sort").map((cfg: FilterConfig) => renderFilter(cfg, true))}
                {/* Filter button */}
                {advancedFilters.length > 0 && (
                  <button
                    onClick={() => setMobileDrawerOpen(true)}
                    style={{
                      padding: "7px 12px", borderRadius: 10, border: "1px solid",
                      borderColor: activeCount > 0 ? "#2A3887" : "#ddd",
                      background: activeCount > 0 ? "#2A3887" : "white",
                      color: activeCount > 0 ? "white" : "#555",
                      fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0,
                    }}>
                    ⚙ Filters
                    {activeCount > 0 && (
                      <span style={{ width: 16, height: 16, borderRadius: "50%", background: "white", color: "#2A3887", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>
                    )}
                  </button>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, color: "#29A9DF", flexShrink: 0 }}>{filtered.length} units</span>
              </div>
            </div>
          ) : (
            /* Desktop: full quick filter bar */
            <>
              <div className="flex flex-wrap gap-3 items-center">
                {quickFilters.map((cfg: FilterConfig) => renderFilter(cfg, true))}
                <div className="flex gap-2 ml-auto items-center shrink-0">
                  {advancedFilters.length > 0 && (
                    <button onClick={() => setFiltersOpen((o: boolean) => !o)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all"
                      style={filtersOpen || activeCount > 0 ? { background: "#2A3887", color: "white", borderColor: "#2A3887" } : { background: "white", color: "#555", borderColor: "#ddd" }}>
                      ⚙ Filters {activeCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-white text-xs font-black flex items-center justify-center" style={{ color: "#2A3887" }}>{activeCount}</span>
                      )}
                    </button>
                  )}
                  <span className="text-xs font-bold" style={{ color: "#29A9DF" }}>{filtered.length} units</span>
                </div>
              </div>
              {filtersOpen && advancedFilters.length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "#E2F1FC" }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2">
                    {advancedFilters.map((cfg: FilterConfig) => renderFilter(cfg, false))}
                  </div>
                  {activeCount > 0 && (
                    <div className="flex justify-end pb-2">
                      <button onClick={resetFilters}
                        className="px-4 py-1.5 text-xs font-bold rounded-full"
                        style={{ background: "#FEE2E2", color: "#DC2626" }}>
                        ✕ Reset all filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <MobileFilterDrawer open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} activeCount={activeCount} onReset={resetFilters}>
        {/* Status + sort in drawer on mobile */}
        {quickFilters
          .filter((f: FilterConfig) => f.filter_key === "status")
          .map((cfg: FilterConfig) => renderFilter(cfg, false))}
        {advancedFilters.map((cfg: FilterConfig) => renderFilter(cfg, false))}
      </MobileFilterDrawer>

      {/* Grid */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 12px 48px" }} data-store-grid-top>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: "#E2F1FC" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="font-bold text-lg mb-2" style={{ color: "#2A3887" }}>No units match your filters</p>
            <p style={{ color: "#555" }} className="text-sm mb-5">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-sm" style={{ color: "#666" }}>
                Showing <strong>{pageStart + 1}</strong>–<strong>{Math.min(pageStart + PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong>
              </p>
              {totalPages > 1 && (
                <p className="text-xs" style={{ color: "#999" }}>Page {currentPage} / {totalPages}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {pagedUnits.map((unit: any) => (
                <UnitCard key={unit.id} unit={unit} isTrending={trendingIds.has(unit.id)} onCompareChange={() => {}} />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onChange={(p) => {
                setCurrentPage(p);
                if (typeof window !== "undefined") {
                  window.scrollTo({
                    top: (document.querySelector("[data-store-grid-top]") as HTMLElement)?.offsetTop - 120 || 0,
                    behavior: "smooth",
                  });
                }
              }} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StorePage() {
  const [units, setUnits] = useState<any[]>([]);
  const [trendingIds, setTrendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [filterConfigs, setFilterConfigs] = useState<FilterConfig[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [aiQuery, setAiQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [lastResultsCount, setLastResultsCount] = useState(-1);
  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const [projectFilter, setProjectFilter] = useState<string>("");

  const getVal = useCallback((key: string) => {
    if (filterValues[key] !== undefined) return filterValues[key];
    const cfg = filterConfigs.find(f => f.filter_key === key);
    return cfg?.config?.default_value ?? "";
  }, [filterValues, filterConfigs]);

  const setVal = (key: string, val: any) => setFilterValues(prev => ({ ...prev, [key]: val }));

  const getRangeMax = useCallback((key: string) => {
    const cfg = filterConfigs.find(f => f.filter_key === key);
    if (!cfg?.config) return 0;
    const settingKey = cfg.config.setting_key;
    if (settingKey && siteSettings[settingKey]) return Number(siteSettings[settingKey]);
    return cfg.config.max ?? 0;
  }, [filterConfigs, siteSettings]);

  const getRangeMin = useCallback((key: string) => {
    const cfg = filterConfigs.find(f => f.filter_key === key);
    return cfg?.config?.min ?? 0;
  }, [filterConfigs]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/cms/public/store-filters`).then(r => r.json()).catch(() => null),
      fetch(`${API}/admin/cms/public/settings`).then(r => r.json()).catch(() => ({})),
    ]).then(([filtersData, settings]) => {
      const configs: FilterConfig[] = Array.isArray(filtersData) && filtersData.length > 0
        ? filtersData : FALLBACK_FILTERS;
      setFilterConfigs(configs);
      setSiteSettings(settings || {});
      const defaults: Record<string, any> = {};
      for (const cfg of configs) {
        if (cfg.config?.default_value !== undefined) defaults[cfg.filter_key] = cfg.config.default_value;
        if (cfg.filter_type === "range_slider") {
          const min = cfg.config?.min ?? 0;
          const settingKey = cfg.config?.setting_key;
          const max = (settingKey && settings?.[settingKey]) ? Number(settings[settingKey]) : (cfg.config?.max ?? 0);
          defaults[cfg.filter_key] = [min, max];
        }
      }
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        let hasAdvancedParam = false;
        for (const cfg of configs) {
          if (cfg.filter_type === "range_slider") {
            const paramBase = cfg.filter_key.replace(/_range$/, "");
            const minParam = sp.get(`min_${paramBase}`);
            const maxParam = sp.get(`max_${paramBase}`);
            if (minParam || maxParam) {
              const rMin = cfg.config?.min ?? 0;
              const settingKey = cfg.config?.setting_key;
              const rMax = (settingKey && settings?.[settingKey]) ? Number(settings[settingKey]) : (cfg.config?.max ?? 0);
              defaults[cfg.filter_key] = [Number(minParam) || rMin, Math.min(Number(maxParam) || rMax, rMax)];
              if (!cfg.is_quick_filter) hasAdvancedParam = true;
            }
          } else if (cfg.filter_type === "checkbox") {
            if (sp.get(cfg.filter_key) === "1") { defaults[cfg.filter_key] = true; if (!cfg.is_quick_filter) hasAdvancedParam = true; }
          } else if (cfg.filter_key !== "sort") {
            const paramVal = sp.get(cfg.filter_key);
            if (paramVal) { defaults[cfg.filter_key] = paramVal; if (!cfg.is_quick_filter) hasAdvancedParam = true; }
          }
          if (cfg.filter_key === "sort" && sp.get("sort")) defaults["sort"] = sp.get("sort")!;
        }
        if (hasAdvancedParam) setFiltersOpen(true);
      }
      setFilterValues(defaults);
      setFiltersLoaded(true);
    });

    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const qParam = sp.get("q");
      const projectParam = sp.get("project");
      if (projectParam) setProjectFilter(projectParam);
      if (qParam) { setAiQuery(qParam); setShowGrid(true); triggerAISearch(qParam); }
      else { loadAll(); }
    }
  }, []);

  async function triggerAISearch(q: string) {
    setSearching(true);
    try {
      const res = await fetch(`${API}/search/nlp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
      const d = await res.json() as any;
      const items = d.items || [];
      setUnits(items); setAiActive(true); setSearchCount(c => c + 1); setLastResultsCount(items.length);
    } catch {}
    setSearching(false); setLoading(false);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [allRes, trendRes] = await Promise.all([fetch(`${API}/units?page_size=200`), fetch(`${API}/units/trending?limit=50`)]);
      const allData = await allRes.json() as any;
      const trendData = await trendRes.json() as any;
      setUnits(Array.isArray(allData) ? allData : (allData.items || []));
      const tItems = Array.isArray(trendData) ? trendData : (trendData.items || []);
      setTrendingIds(new Set(tItems.map((u: any) => u.id)));
    } catch {}
    setLoading(false);
  }

  async function handleAISearch(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuery.trim()) { setAiActive(false); setShowGrid(true); loadAll(); return; }
    setShowGrid(true); setSearching(true);
    try {
      const res = await fetch(`${API}/search/nlp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: aiQuery }) });
      const d = await res.json() as any;
      const items = d.items || [];
      setUnits(items); setAiActive(true); setSearchCount(c => c + 1); setLastResultsCount(items.length);
    } catch {}
    setSearching(false);
    setTimeout(() => { document.getElementById("unit-grid-section")?.scrollIntoView({ behavior: "smooth" }); }, 100);
  }

  function clearAI() { setAiQuery(""); setAiActive(false); setShowGrid(false); loadAll(); }

  function resetFilters() {
    const defaults: Record<string, any> = {};
    for (const cfg of filterConfigs) {
      if (cfg.config?.default_value !== undefined) defaults[cfg.filter_key] = cfg.config.default_value;
      if (cfg.filter_type === "range_slider") defaults[cfg.filter_key] = [getRangeMin(cfg.filter_key), getRangeMax(cfg.filter_key)];
      if (cfg.filter_type === "checkbox") defaults[cfg.filter_key] = false;
    }
    setFilterValues(defaults);
  }

  const filtered = units.filter(u => {
    if (projectFilter) { const pn = String(u.project_name || "").toLowerCase(); if (pn !== projectFilter.toLowerCase()) return false; }
    for (const cfg of filterConfigs) {
      const val = getVal(cfg.filter_key);
      const defaultVal = cfg.config?.default_value;
      const fieldName = cfg.field_name;
      if (!fieldName) continue;
      if (cfg.filter_type === "checkbox") {
        if (val === true) { if (fieldName === "is_trending") { if (!trendingIds.has(u.id)) return false; } else { if (!getUnitFieldValue(u, fieldName)) return false; } }
        continue;
      }
      if (cfg.filter_type === "range_slider") {
        if (Array.isArray(val)) {
          let num: number;
          if (cfg.filter_key === "price_range" || fieldName === "base_price") num = getPrice(u) || 0;
          else num = parseFloat(getUnitFieldValue(u, fieldName) || 0);
          if (num > 0 && (num < val[0] || num > val[1])) return false;
        }
        continue;
      }
      if (!val || val === defaultVal) continue;
      if (cfg.filter_type === "button_group") {
        const minVal = parseInt(val) || 0;
        if (minVal > 0) { const unitNum = parseInt(getUnitFieldValue(u, fieldName)) || 0; if (unitNum < minVal) return false; }
        continue;
      }
      const selectedOpt = cfg.options?.find(o => o.value === val);
      if (selectedOpt && selectedOpt.min !== undefined && selectedOpt.max !== undefined) {
        const unitNum = parseFloat(getUnitFieldValue(u, fieldName) ?? 0);
        if (unitNum < selectedOpt.min || unitNum > selectedOpt.max) return false;
        continue;
      }
      const unitVal = getUnitFieldValue(u, fieldName);
      if (unitVal !== undefined && unitVal !== null) { if (String(unitVal).toLowerCase() !== String(val).toLowerCase()) return false; }
    }
    return true;
  }).sort((a, b) => {
    const sortVal = getVal("sort") || "newest";
    if (sortVal === "price_asc") return (getPrice(a) || 0) - (getPrice(b) || 0);
    if (sortVal === "price_desc") return (getPrice(b) || 0) - (getPrice(a) || 0);
    if (sortVal === "area_desc") return (parseFloat(b.area_sqft) || 0) - (parseFloat(a.area_sqft) || 0);
    if (sortVal === "floor_asc") return (a.floor_number ?? 0) - (b.floor_number ?? 0);
    if (sortVal === "floor_desc") return (b.floor_number ?? 0) - (a.floor_number ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedUnits = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(1); }, [filtered.length, totalPages, currentPage]);

  const activeCount = filterConfigs.filter(cfg => {
    if (cfg.is_quick_filter && cfg.filter_key !== "trending") return false;
    const val = getVal(cfg.filter_key);
    if (cfg.filter_type === "checkbox") return val === true;
    if (cfg.filter_type === "range_slider") { if (!Array.isArray(val)) return false; return val[0] > getRangeMin(cfg.filter_key) || val[1] < getRangeMax(cfg.filter_key); }
    return val && val !== cfg.config?.default_value;
  }).length;

  // ── Accordion data ─────────────────────────────────────────────────────────
  const paymentPanels: AccordionPanel[] = [
    { id: "budget", label: "An Easy Budget", subtitle: "Allows you to buy a home for the loved", image: "/easy-budget.jpg",
      buttons: [{ label: "₹1.3Cr+ Budget", href: "/store?min_price=13000000&max_price=50000000" }, { label: "₹90L+ Budget", href: "/store?min_price=9000000&max_price=12900000" }, { label: "₹70L+ Budget", href: "/store?min_price=7000000&max_price=8900000" }, { label: "₹50L+ Budget", href: "/store?min_price=5000000&max_price=6900000" }] },
    { id: "emi", label: "A Lighter EMI", subtitle: "Lets your family enjoy a good lifestyle", image: "/ALighterEMI.webp",
      buttons: [{ label: "₹85K+ EMI", href: "/property-listing/?sf_min_field_3077=85000" }, { label: "₹75K+ EMI", href: "/property-listing/?sf_min_field_3077=75000" }, { label: "₹55K+ EMI", href: "/property-listing/?sf_min_field_3077=55000" }, { label: "₹35K+ EMI", href: "/property-listing/?sf_min_field_3077=35000" }] },
    { id: "down", label: "A Suitable Downpayment", subtitle: "For your dreamhome to ease stress", image: "/ASuitableDownpayment1.webp",
      buttons: [{ label: "₹18L+ Down", href: "/property-listing/?sf_min_field_3078=1800000" }, { label: "₹16L+ Down", href: "/property-listing/?sf_min_field_3078=1600000" }, { label: "₹12L+ Down", href: "/property-listing/?sf_min_field_3078=1200000" }, { label: "₹8L+ Down", href: "/property-listing/?sf_min_field_3078=800000" }] },
  ];

  const sizePanels: AccordionPanel[] = [
    { id: "cozy", label: "Any Size of a Cozy Home", subtitle: "A treasure chest of love & happiness", image: "/any-size-of-a-cozy.webp",
      buttons: [{ label: "500+ sft", href: "/store?min_area=500&max_area=990" }] },
    { id: "bigger", label: "However Big the Home Is", subtitle: "There is no place like home", image: "/full-shot-woman-sitting-floor.webp",
      buttons: [{ label: "1000+ sft", href: "/store?min_area=1000&max_area=1500" }, { label: "1500+ sft", href: "/store?min_area=1500&max_area=2000" }] },
    { id: "lot", label: "Home Is Where a Lot Starts", subtitle: "Work, passion or just unwind", image: "/home-is-where-a-lot-starts.webp",
      buttons: [{ label: "2000+ sft", href: "/store?min_area=2000&max_area=2500" }, { label: "2500+ sft", href: "#", disabled: true }] },
  ];

  const bedroomPanels: AccordionPanel[] = [
    { id: "3bhk", label: "3 Bedrooms Are Such Bliss", subtitle: "The perfect family home", image: "/3bedroom.webp",
      buttons: [{ label: "Explore 3BHK Options", href: "/store?bedrooms=3" }] },
    { id: "2bhk", label: "2 Bedrooms Are Special", subtitle: "Cozy, comfortable, complete", image: "/2Bedroom.webp",
      buttons: [{ label: "Explore 2BHK Options", href: "/store?bedrooms=2" }] },
    { id: "1bhk", label: "Invest in a 1 Bedroom", subtitle: "Smart start, great investment", image: "/invest-in-a-1-Bedroom.webp",
      buttons: [{ label: "Explore 1BHK Options", href: "/store?bedrooms=1" }] },
  ];

  const locationPanels: AccordionPanel[] = [
    { id: "hyd", label: "Hyderabad", subtitle: "Properties across Hyderabad", image: "/hyderabad.webp",
      buttons: [{ label: "Know More", href: "/property-listing/?sf_multiple_field_3229=1%2C2%2C4" }] },
    { id: "blr", label: "Bengaluru", subtitle: "Expanding into Bengaluru", image: "/bengaluru.webp",
      buttons: [{ label: "Know More", href: "/property-listing/?sf_multiple_field_3229=4%2C5" }] },
    { id: "houston", label: "Take Me to Houston", subtitle: "International opportunities", image: "/take-me-to-houston.webp",
      buttons: [{ label: "Know More", href: "https://janapriya.us/#1" }] },
  ];

  return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <div className="pt-16 relative">
        <HeroBanner />
        <ScrollChevron targetId="ai-search-anchor" />
      </div>

      {/* AI Search */}
      <div id="ai-search-anchor">
        <AISearchBar
          value={aiQuery}
          onChange={setAiQuery}
          onSubmit={handleAISearch}
          onClear={clearAI}
          searching={searching}
          aiActive={aiActive}
          filteredCount={filtered.length}
          query={aiQuery}
        />
      </div>

      {/* Project filter notice */}
      {projectFilter && (
        <div style={{ background: "#EBF5FF", borderBottom: "1px solid #C7E2F9" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#2A3887" }}>🏢 Showing units in <strong>{projectFilter}</strong> only</span>
            <button onClick={() => setProjectFilter("")} style={{ fontSize: 12, color: "#888", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
          </div>
        </div>
      )}

      {/* Unit Grid */}
      {showGrid && (
        <UnitGridSection units={units} trendingIds={trendingIds} loading={loading} filtered={filtered}
          currentPage={currentPage} totalPages={totalPages} pageStart={pageStart} PAGE_SIZE={PAGE_SIZE}
          pagedUnits={pagedUnits} setCurrentPage={setCurrentPage} filterConfigs={filterConfigs}
          filterValues={filterValues} getVal={getVal} setVal={setVal} getRangeMin={getRangeMin}
          getRangeMax={getRangeMax} filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen}
          activeCount={activeCount} resetFilters={resetFilters} siteSettings={siteSettings} />
      )}

      {/* Accordion Sections */}
      {!showGrid && (
        <>
          <AccordionSection title="Search by Flexible Payments" panels={paymentPanels} direction="right" />
          <AccordionSection title="Search by Size"              panels={sizePanels}     direction="left"  />
          <AccordionSection title="Search by Bedroom"           panels={bedroomPanels}  direction="right" />
          <AccordionSection title="Search by Location"          panels={locationPanels} direction="left"  />
        </>
      )}

      <CompareBar />
      <Footer />
      <ProactiveAssistant searchCount={searchCount} lastResultsCount={lastResultsCount} lastQuery={aiQuery} budget={0} />
    </main>
  );
}