"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";
import CompareBar from "@/components/CompareBar";
import ProactiveAssistant from "@/components/ProactiveAssistant";
import UnitCard from "@/components/UnitCard";
import Link from "next/link";

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

// ── Types ────────────────────────────────────────────────────────────────────
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
  { id: "7", filter_key: "facing", filter_label: "Facing", filter_type: "pills", field_name: "facing", options: [{ value: "Any", label: "Any" }, { value: "East", label: "East" }, { value: "West", label: "West" }, { value: "North", label: "North" }, { value: "South", label: "South" }, { value: "North-East", label: "North-East" }, { value: "North-West", label: "North-West" }, { value: "South-East", label: "South-East" }, { value: "South-West", label: "South-West" }], config: { default_value: "Any" }, is_quick_filter: false, sort_order: 7 },
  { id: "8", filter_key: "floor_level", filter_label: "Floor Level", filter_type: "pills", field_name: "floor_number", options: [{ value: "any", label: "Any Floor", min: 0, max: 999 }, { value: "ground", label: "Ground (0-2)", min: 0, max: 2 }, { value: "low", label: "Low (3-7)", min: 3, max: 7 }, { value: "mid", label: "Mid (8-15)", min: 8, max: 15 }, { value: "high", label: "High (16+)", min: 16, max: 999 }], config: { default_value: "any" }, is_quick_filter: false, sort_order: 8 },
  { id: "9", filter_key: "bedrooms", filter_label: "Min Bedrooms", filter_type: "button_group", field_name: "bedrooms", options: [{ value: "0", label: "Any" }, { value: "1", label: "1+" }, { value: "2", label: "2+" }, { value: "3", label: "3+" }, { value: "4", label: "4+" }], config: { default_value: "0" }, is_quick_filter: false, sort_order: 9 },
];

// ── Range Slider ─────────────────────────────────────────────────────────────
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
        .jp-range::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; height: 18px; width: 18px; border-radius: 50%; background: #2A3887; border: 2px solid white; box-shadow: 0 2px 6px rgba(42,56,135,0.35); pointer-events: auto; cursor: pointer; }
        .jp-range::-moz-range-thumb { height: 18px; width: 18px; border-radius: 50%; background: #2A3887; border: 2px solid white; box-shadow: 0 2px 6px rgba(42,56,135,0.35); pointer-events: auto; cursor: pointer; }
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
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
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
    <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
      <button onClick={() => onChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
        className="px-3 py-1.5 rounded-lg text-sm font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={btnStyle(false)}>‹ Prev</button>
      {pageItems().map((p, i) =>
        p === "…"
          ? <span key={`e${i}`} className="px-2 text-sm" style={{ color: "#999" }}>…</span>
          : <button key={p} onClick={() => onChange(p)}
            className="w-9 h-9 rounded-lg text-sm font-bold border transition-all"
            style={btnStyle(p === currentPage)}>{p}</button>
      )}
      <button onClick={() => onChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
        className="px-3 py-1.5 rounded-lg text-sm font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={btnStyle(false)}>Next ›</button>
    </div>
  );
}

// ── Accordion Panel Section (mimics the WP store expand panels) ───────────────
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

  return (
    <section className="accordion-section">
      <div className="accordion-section-title">
        <h3>{title}</h3>
      </div>

      <div className={`accordion-options accordion-${direction}`}>
        {panels.map((panel, idx) => {
          const isActive = activeIdx === idx;
          return (
            <div key={panel.id} className={`accordion-box${isActive ? " accordion-box--active" : ""}`}>
              {/* Collapsed tab */}
              <button
                className={`accordion-tab${isActive ? " accordion-tab--active" : ""}`}
                onClick={() => setActiveIdx(idx)}
                aria-expanded={isActive}
              >
                <span className="accordion-tab-label">{panel.label}</span>
              </button>

              {/* Expanded content */}
              <div className={`accordion-content${isActive ? " accordion-content--active" : ""}`}>
                <div className="accordion-inner">
                  {/* Image */}
                  <div className="accordion-image" style={{ backgroundImage: `url(${panel.image})` }} />

                  {/* Text + buttons overlay */}
                  <div className="accordion-overlay">
                    <p className="accordion-subtitle">{panel.subtitle}</p>
                    <div className="accordion-buttons">
                      {panel.buttons.map((btn, bi) => (
                        btn.disabled
                          ? <span key={bi} className="acc-btn acc-btn--disabled">{btn.label}</span>
                          : <a key={bi} href={btn.href} className="acc-btn acc-btn--active">{btn.label}</a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .accordion-section {
          display: flex;
          flex-direction: column;
          border-bottom: 1px solid #E2F1FC;
        }
        .accordion-section-title {
          background: white;
          text-align: center;
          padding: 24px 16px;
          border-bottom: 1px solid #E2F1FC;
        }
        .accordion-section-title h3 {
          margin: 0;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #2A3887;
        }

        /* The row of panels */
        .accordion-options {
          display: flex;
          flex-direction: row;
          height: 520px;
          overflow: hidden;
        }

        /* Individual panel box */
        .accordion-box {
          display: flex;
          flex-direction: row;
          transition: flex 0.55s cubic-bezier(0.05, 0.61, 0.41, 0.95);
          flex: 0 0 64px;    /* collapsed width = tab width */
          overflow: hidden;
          position: relative;
        }
        .accordion-box--active {
          flex: 1 1 0%;        /* active takes remaining space */
        }

        /* Collapsed vertical tab */
        .accordion-tab {
          flex-shrink: 0;
          width: 64px;
          background: linear-gradient(180deg, #262262, #2A3887);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
          transition: background 0.3s;
        }
        .accordion-tab--active {
          background: linear-gradient(180deg, #2A3887, #29A9DF);
        }
        .accordion-tab:hover:not(.accordion-tab--active) {
          background: linear-gradient(180deg, #1e2a6b, #2A3887);
        }
        .accordion-tab-label {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          color: white;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
          opacity: 0.9;
          padding: 12px 0;
        }

        /* Expanded content area */
        .accordion-content {
          flex: 1;
          min-width: 0;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease 0.15s;
        }
        .accordion-content--active {
          opacity: 1;
          pointer-events: auto;
        }

        .accordion-inner {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .accordion-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        .accordion-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, rgba(38,34,98,0.82) 0%, rgba(38,34,98,0.5) 55%, transparent 100%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 36px 40px;
          gap: 20px;
        }

        .accordion-subtitle {
          margin: 0;
          color: rgba(255,255,255,0.9);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .accordion-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .acc-btn {
          display: inline-flex;
          align-items: center;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-decoration: none;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .acc-btn--active {
          background: rgba(41,169,223,0.15);
          color: white;
          border: 1.5px solid rgba(41,169,223,0.5);
          backdrop-filter: blur(4px);
        }
        .acc-btn--active:hover {
          background: #29A9DF;
          border-color: #29A9DF;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(41,169,223,0.4);
        }
        .acc-btn--disabled {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.35);
          border: 1.5px solid rgba(255,255,255,0.12);
          cursor: not-allowed;
        }

        /* Mobile: stack vertically */
        @media (max-width: 767px) {
          .accordion-options {
            flex-direction: column;
            height: auto;
          }
          .accordion-box {
            flex-direction: column;
            flex: none !important;
          }
          .accordion-tab {
            width: 100%;
            height: 52px;
            writing-mode: initial;
          }
          .accordion-tab-label {
            writing-mode: initial;
            transform: none;
            font-size: 12px;
          }
          .accordion-content {
            height: 0;
            overflow: hidden;
            transition: height 0.45s cubic-bezier(0.05, 0.61, 0.41, 0.95), opacity 0.3s;
          }
          .accordion-content--active {
            height: 340px;
          }
          .accordion-inner {
            height: 340px;
          }
          .accordion-overlay {
            padding: 20px 20px;
          }
          .accordion-subtitle {
            font-size: 11px;
          }
          .acc-btn {
            font-size: 11px;
            padding: 8px 14px;
          }
        }
      `}</style>
    </section>
  );
}

// ── Hero Banner with project panels ──────────────────────────────────────────
const PROJECTS = [
  {
    id: "nile-valley",
    name: "Nile Valley",
    location: "Chanda Nagar",
    href: "/project-nile-valley-chandanagar/",
    image: "/cn/images/store/store-banner-01.webp",
  },
  {
    id: "lakefront",
    name: "Lakefront",
    location: "Sainikpuri",
    href: "/project-lake-front-sainikpuri/",
    image: "/cn/images/store/lakefront-scaled-image.webp",
  },
  {
    id: "bahiti",
    name: "Bahiti",
    location: "Chandanagar",
    href: "/project-bahiti-chandanagar/",
    image: "/cn/images/projects-images/bahiti-banner-right.webp",
  },
];

function HeroBanner() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="hero-banner">
      {PROJECTS.map((p) => {
        const isActive = active === p.id;
        return (
          <a
            key={p.id}
            href={p.href}
            className={`hero-panel${isActive ? " hero-panel--active" : ""}`}
            onMouseEnter={() => setActive(p.id)}
            onMouseLeave={() => setActive(null)}
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
        .hero-banner {
          display: flex;
          height: calc(100vh - 64px);
          min-height: 480px;
          overflow: hidden;
        }
        .hero-panel {
          position: relative;
          flex: 1;
          overflow: hidden;
          transition: flex 0.6s cubic-bezier(0.05, 0.61, 0.41, 0.95);
          text-decoration: none;
          display: block;
        }
        .hero-panel--active {
          flex: 2.4;
        }
        .hero-panel-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          transition: transform 0.6s ease;
          opacity: 0.82;
        }
        .hero-panel--active .hero-panel-image {
          transform: scale(1.04);
          opacity: 1;
        }
        .hero-panel-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(38,34,98,0.8) 0%, transparent 60%);
        }
        .hero-panel-text {
          position: absolute;
          bottom: 10%;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          white-space: nowrap;
        }
        .hero-panel-name {
          display: block;
          font-size: clamp(18px, 2.5vw, 32px);
          font-weight: 300;
          color: white;
          letter-spacing: 0.04em;
          line-height: 1.2;
        }
        .hero-panel-loc {
          display: block;
          font-size: clamp(13px, 1.5vw, 18px);
          font-weight: 300;
          color: rgba(255,255,255,0.7);
          margin-top: 4px;
        }
        @media (max-width: 600px) {
          .hero-banner {
            flex-direction: column;
            height: 100vh;
          }
          .hero-panel--active {
            flex: 2.2;
          }
          .hero-panel-text {
            bottom: 8%;
          }
        }
      `}</style>
    </div>
  );
}

// ── Scroll-down chevron ───────────────────────────────────────────────────────
function ScrollChevron({ targetId }: { targetId: string }) {
  return (
    <div className="chevron-wrap" onClick={() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
    }}>
      {[0, 1, 2].map(i => <div key={i} className={`chev chev-${i}`} />)}
      <style jsx>{`
        .chevron-wrap {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          z-index: 10;
        }
        .chev {
          width: 28px;
          height: 8px;
          position: relative;
          opacity: 0;
          animation: chev-move 2.4s ease-out infinite;
        }
        .chev-0 { animation-delay: 0s; }
        .chev-1 { animation-delay: 0.4s; }
        .chev-2 { animation-delay: 0.8s; }
        .chev::before, .chev::after {
          content: '';
          position: absolute;
          top: 0;
          height: 100%;
          width: 51%;
          background: #29A9DF;
        }
        .chev::before { left: 0; transform: skew(0deg, 30deg); }
        .chev::after { right: 0; transform: skew(0deg, -30deg); }
        @keyframes chev-move {
          0% { opacity: 0; transform: translateY(0); }
          30% { opacity: 1; }
          80% { opacity: 0.5; transform: translateY(14px); }
          100% { opacity: 0; transform: translateY(20px); }
        }
      `}</style>
    </div>
  );
}

// ── AI Search bar (shared) ───────────────────────────────────────────────────
function AISearchBar({ value, onChange, onSubmit, onClear, searching, aiActive, filteredCount, query }: any) {
  return (
    <div className="ai-search-bar">
      <div className="ai-search-inner">
        <p className="ai-search-eyebrow">Find Your Home</p>
        <p className="ai-search-sub">{/* populated from parent */}</p>
        <form onSubmit={onSubmit} className="ai-search-form">
          <div className="ai-input-wrap">
            <span className="ai-icon">✦</span>
            <input
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="AI Search: 3BHK under ₹80L facing East..."
              className="ai-input"
            />
            {value && (
              <button type="button" onClick={onClear} className="ai-clear">✕</button>
            )}
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
        .ai-search-bar {
          background: linear-gradient(135deg,#262262,#2A3887);
          padding: 40px 24px;
        }
        .ai-search-inner {
          max-width: 680px;
          margin: 0 auto;
        }
        .ai-search-eyebrow {
          margin: 0 0 4px;
          font-size: 28px;
          font-weight: 900;
          color: white;
          letter-spacing: -0.01em;
        }
        .ai-search-sub {
          margin: 0 0 20px;
          font-size: 13px;
          color: rgba(255,255,255,0.5);
        }
        .ai-search-form {
          display: flex;
          gap: 10px;
        }
        .ai-input-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .ai-icon { color: #29A9DF; font-size: 14px; }
        .ai-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 14px;
        }
        .ai-input::placeholder { color: rgba(255,255,255,0.35); }
        .ai-clear {
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          font-size: 14px;
          padding: 0;
        }
        .ai-clear:hover { color: white; }
        .ai-submit {
          padding: 12px 20px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg,#29A9DF,#00C2FF);
          color: white;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.2s;
        }
        .ai-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .ai-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
        }
        .ai-badge span {
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          background: rgba(41,169,223,0.15);
          color: #29A9DF;
          border: 1px solid rgba(41,169,223,0.3);
        }
        .ai-badge button {
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 12px;
          text-decoration: underline;
          cursor: pointer;
        }
        .ai-badge button:hover { color: white; }
        @media (max-width: 600px) {
          .ai-search-form { flex-direction: column; }
          .ai-submit { text-align: center; }
        }
      `}</style>
    </div>
  );
}

// ── Unit Grid Section (shown after AI search or "Browse All") ─────────────────
function UnitGridSection({ units, trendingIds, loading, filtered, currentPage, totalPages, pageStart, PAGE_SIZE, pagedUnits, setCurrentPage, filterConfigs, filterValues, getVal, setVal, getRangeMin, getRangeMax, filtersOpen, setFiltersOpen, activeCount, resetFilters, siteSettings }: any) {
  const formatPriceShort = (n: number) =>
    n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(0)}L` : `₹${n.toLocaleString()}`;

  const quickFilters = filterConfigs.filter((f: FilterConfig) => f.is_quick_filter);
  const advancedFilters = filterConfigs.filter((f: FilterConfig) => !f.is_quick_filter);

  function renderFilter(cfg: FilterConfig, isQuickBar: boolean) {
    const val = getVal(cfg.filter_key);
    switch (cfg.filter_type) {
      case "pills":
        if (isQuickBar) return (
          <div key={cfg.filter_key} className="flex items-center gap-2">
            <span className="text-xs font-bold shrink-0" style={{ color: "#2A3887" }}>{cfg.filter_label}</span>
            <div className="flex gap-1.5 flex-wrap">
              {(cfg.options || []).map(opt => (
                <button key={opt.value} onClick={() => setVal(cfg.filter_key, opt.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
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
          <div key={cfg.filter_key} className="flex items-center gap-1.5">
            <span className="text-xs font-bold shrink-0" style={{ color: "#2A3887" }}>{cfg.filter_label}</span>
            <select value={val || ""} onChange={e => setVal(cfg.filter_key, e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none"
              style={{ borderColor: "#ddd", color: "#555" }}>
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
            className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1"
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
          <div key={cfg.filter_key} className="flex items-center gap-2">
            <span className="text-xs font-bold shrink-0" style={{ color: "#2A3887" }}>{cfg.filter_label}</span>
            <div className="flex gap-1.5">
              {(cfg.options || []).map((opt: any) => (
                <button key={opt.value} onClick={() => setVal(cfg.filter_key, opt.value)}
                  className="px-2.5 py-1 rounded-full text-xs font-bold border transition-all"
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
      {/* Filter bar */}
      <div className="sticky top-16 z-30 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
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
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-10" data-store-grid-top>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-72 rounded-2xl animate-pulse" style={{ background: "#E2F1FC" }} />
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
                Showing <strong>{pageStart + 1}</strong>–<strong>{Math.min(pageStart + PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong> units
              </p>
              {totalPages > 1 && (
                <p className="text-xs" style={{ color: "#999" }}>Page {currentPage} / {totalPages}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedUnits.map((unit: any) => (
                <UnitCard key={unit.id} unit={unit} isTrending={trendingIds.has(unit.id)} onCompareChange={() => { }} />
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

  const setVal = (key: string, val: any) => {
    setFilterValues(prev => ({ ...prev, [key]: val }));
  };

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
      if (qParam) {
        setAiQuery(qParam);
        setShowGrid(true);
        triggerAISearch(qParam);
      } else {
        loadAll();
      }
    }
  }, []);

  async function triggerAISearch(q: string) {
    setSearching(true);
    try {
      const res = await fetch(`${API}/search/nlp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const d = await res.json() as any;
      const items = d.items || [];
      setUnits(items);
      setAiActive(true);
      setSearchCount(c => c + 1);
      setLastResultsCount(items.length);
    } catch { }
    setSearching(false);
    setLoading(false);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [allRes, trendRes] = await Promise.all([
        fetch(`${API}/units?page_size=200`),
        fetch(`${API}/units/trending?limit=50`),
      ]);
      const allData = await allRes.json() as any;
      const trendData = await trendRes.json() as any;
      setUnits(Array.isArray(allData) ? allData : (allData.items || []));
      const tItems = Array.isArray(trendData) ? trendData : (trendData.items || []);
      setTrendingIds(new Set(tItems.map((u: any) => u.id)));
    } catch { }
    setLoading(false);
  }

  async function handleAISearch(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuery.trim()) { setAiActive(false); setShowGrid(true); loadAll(); return; }
    setShowGrid(true);
    setSearching(true);
    try {
      const res = await fetch(`${API}/search/nlp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery }),
      });
      const d = await res.json() as any;
      const items = d.items || [];
      setUnits(items);
      setAiActive(true);
      setSearchCount(c => c + 1);
      setLastResultsCount(items.length);
    } catch { }
    setSearching(false);
    // Scroll to grid
    setTimeout(() => {
      document.getElementById("unit-grid-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function clearAI() {
    setAiQuery("");
    setAiActive(false);
    setShowGrid(false);
    loadAll();
  }

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
    if (projectFilter) {
      const pn = String(u.project_name || "").toLowerCase();
      if (pn !== projectFilter.toLowerCase()) return false;
    }
    for (const cfg of filterConfigs) {
      const val = getVal(cfg.filter_key);
      const defaultVal = cfg.config?.default_value;
      const fieldName = cfg.field_name;
      if (!fieldName) continue;

      if (cfg.filter_type === "checkbox") {
        if (val === true) {
          if (fieldName === "is_trending") { if (!trendingIds.has(u.id)) return false; }
          else { if (!getUnitFieldValue(u, fieldName)) return false; }
        }
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
      if (unitVal !== undefined && unitVal !== null) {
        if (String(unitVal).toLowerCase() !== String(val).toLowerCase()) return false;
      }
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

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filtered.length, totalPages, currentPage]);

  const activeCount = filterConfigs.filter(cfg => {
    if (cfg.is_quick_filter && cfg.filter_key !== "trending") return false;
    const val = getVal(cfg.filter_key);
    if (cfg.filter_type === "checkbox") return val === true;
    if (cfg.filter_type === "range_slider") {
      if (!Array.isArray(val)) return false;
      return val[0] > getRangeMin(cfg.filter_key) || val[1] < getRangeMax(cfg.filter_key);
    }
    return val && val !== cfg.config?.default_value;
  }).length;

  // ── Accordion data ────────────────────────────────────────────────────────
  const paymentPanels: AccordionPanel[] = [
    {
      id: "budget", label: "An Easy Budget", subtitle: "Allows you to buy a home for the loved",
      image: "/cn/images/store/AnEasyBudget.webp",
      buttons: [
        { label: "₹1.3Cr+ Budget", href: "/property-listing/?sf_min_field_3076=13000000" },
        { label: "₹90L+ Budget", href: "/property-listing/?sf_min_field_3076=9000000" },
        { label: "₹70L+ Budget", href: "/property-listing/?sf_min_field_3076=7000000" },
        { label: "₹50L+ Budget", href: "/property-listing/?sf_min_field_3076=5000000" },
      ],
    },
    {
      id: "emi", label: "A Lighter EMI", subtitle: "Lets your family enjoy a good lifestyle",
      image: "/cn/images/store/ALighterEMI.webp",
      buttons: [
        { label: "₹85K+ EMI", href: "/property-listing/?sf_min_field_3077=85000" },
        { label: "₹75K+ EMI", href: "/property-listing/?sf_min_field_3077=75000" },
        { label: "₹55K+ EMI", href: "/property-listing/?sf_min_field_3077=55000" },
        { label: "₹35K+ EMI", href: "/property-listing/?sf_min_field_3077=35000" },
      ],
    },
    {
      id: "down", label: "A Suitable Downpayment", subtitle: "For your dreamhome to ease stress",
      image: "/cn/images/store/ASuitableDownpayment1.webp",
      buttons: [
        { label: "₹18L+ Down", href: "/property-listing/?sf_min_field_3078=1800000" },
        { label: "₹16L+ Down", href: "/property-listing/?sf_min_field_3078=1600000" },
        { label: "₹12L+ Down", href: "/property-listing/?sf_min_field_3078=1200000" },
        { label: "₹8L+ Down", href: "/property-listing/?sf_min_field_3078=800000" },
      ],
    },
  ];

  const sizePanels: AccordionPanel[] = [
    {
      id: "cozy", label: "Any Size of a Cozy Home", subtitle: "A treasure chest of love & happiness",
      image: "/cn/images/store/any-size-of-a-cozy.webp",
      buttons: [{ label: "500+ sft", href: "/property-listing/?sf_min_living_area=500" }],
    },
    {
      id: "bigger", label: "However Big the Home Is", subtitle: "There is no place like home",
      image: "/cn/images/store/full-shot-woman-sitting-floor.webp",
      buttons: [
        { label: "1000+ sft", href: "/property-listing/?sf_min_living_area=1000" },
        { label: "1500+ sft", href: "/property-listing/?sf_min_living_area=1500" },
      ],
    },
    {
      id: "lot", label: "Home Is Where a Lot Starts", subtitle: "Work, passion or just unwind",
      image: "/cn/images/store/home-is-where-a-lot-starts.webp",
      buttons: [
        { label: "2000+ sft", href: "/property-listing/?sf_min_living_area=2000" },
        { label: "2500+ sft", href: "#", disabled: true },
      ],
    },
  ];

  const bedroomPanels: AccordionPanel[] = [
    {
      id: "3bhk", label: "3 Bedrooms Are Such Bliss", subtitle: "The perfect family home",
      image: "/cn/images/store/3bedroom.webp",
      buttons: [{ label: "Explore 3BHK Options", href: "/property-listing/?sf_tmin_bedrooms=3" }],
    },
    {
      id: "2bhk", label: "2 Bedrooms Are Special", subtitle: "Cozy, comfortable, complete",
      image: "/cn/images/store/2Bedroom.webp",
      buttons: [{ label: "Explore 2BHK Options", href: "/property-listing/?sf_tmin_bedrooms=2" }],
    },
    {
      id: "1bhk", label: "Invest in a 1 Bedroom", subtitle: "Smart start, great investment",
      image: "/cn/images/store/invest-in-a-1-Bedroom.webp",
      buttons: [{ label: "Explore 1BHK Options", href: "/property-listing/?sf_tmin_bedrooms=1" }],
    },
  ];

  const locationPanels: AccordionPanel[] = [
    {
      id: "hyd", label: "Hyderabad", subtitle: "Properties across Hyderabad",
      image: "/cn/images/store/hyderabad.webp",
      buttons: [{ label: "Know More", href: "/property-listing/?sf_multiple_field_3229=1%2C2%2C4" }],
    },
    {
      id: "blr", label: "Bengaluru", subtitle: "Expanding into Bengaluru",
      image: "/cn/images/store/bengaluru.webp",
      buttons: [{ label: "Know More", href: "/property-listing/?sf_multiple_field_3229=4%2C5" }],
    },
    {
      id: "houston", label: "Take Me to Houston", subtitle: "International opportunities",
      image: "/cn/images/store/take-me-to-houston.webp",
      buttons: [{ label: "Know More", href: "https://janapriya.us/#1" }],
    },
  ];

  return (
    <main style={{ fontFamily: "'Lato',sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero Banner ── */}
      <div className="pt-16 relative">
        <HeroBanner />
        <ScrollChevron targetId="ai-search-anchor" />
      </div>

      {/* ── AI Search ── */}
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

      {/* ── Browse All Units CTA ── */}
      {!showGrid && (
        <div style={{ background: "#F0F6FF", borderBottom: "1px solid #E2F1FC" }}>
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-bold" style={{ color: "#2A3887", margin: 0 }}>
                {units.length} properties available · RERA registered · Hyderabad
              </p>
              <p className="text-xs" style={{ color: "#888", margin: "2px 0 0" }}>Browse and filter all available units</p>
            </div>
            <button
              onClick={() => {
                setShowGrid(true);
                setTimeout(() => document.getElementById("unit-grid-section")?.scrollIntoView({ behavior: "smooth" }), 50);
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
              Browse All Units →
            </button>
          </div>
        </div>
      )}

      {/* ── Project filter notice ── */}
      {projectFilter && (
        <div style={{ background: "#EBF5FF", borderBottom: "1px solid #C7E2F9" }}>
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
            <span className="text-sm font-bold" style={{ color: "#2A3887" }}>
              🏢 Showing units in <strong>{projectFilter}</strong> only
            </span>
            <button onClick={() => setProjectFilter("")}
              className="text-xs underline" style={{ color: "#888" }}>Clear</button>
          </div>
        </div>
      )}

      {/* ── Unit Grid (shown when AI search fires or Browse All clicked) ── */}
      {showGrid && (
        <UnitGridSection
          units={units}
          trendingIds={trendingIds}
          loading={loading}
          filtered={filtered}
          currentPage={currentPage}
          totalPages={totalPages}
          pageStart={pageStart}
          PAGE_SIZE={PAGE_SIZE}
          pagedUnits={pagedUnits}
          setCurrentPage={setCurrentPage}
          filterConfigs={filterConfigs}
          filterValues={filterValues}
          getVal={getVal}
          setVal={setVal}
          getRangeMin={getRangeMin}
          getRangeMax={getRangeMax}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
          activeCount={activeCount}
          resetFilters={resetFilters}
          siteSettings={siteSettings}
        />
      )}

      {/* ── Accordion Sections (always visible unless grid takes over) ── */}
      {!showGrid && (
        <>
          <AccordionSection title="Search by Flexible Payments" panels={paymentPanels} direction="right" />
          <AccordionSection title="Search by Size" panels={sizePanels} direction="left" />
          <AccordionSection title="Search by Bedroom" panels={bedroomPanels} direction="right" />
          <AccordionSection title="Search by Location" panels={locationPanels} direction="left" />
        </>
      )}

      <CompareBar />
      <Footer />
      <ProactiveAssistant
        searchCount={searchCount}
        lastResultsCount={lastResultsCount}
        lastQuery={aiQuery}
        budget={0}
      />
    </main>
  );
}