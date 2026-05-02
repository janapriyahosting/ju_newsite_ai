"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DynamicFields from "@/components/DynamicFields";
import ProactiveAssistant from "@/components/ProactiveAssistant";
import { customerApi } from "@/lib/customerAuth";

/* ═══════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════ */
const API   = process.env.NEXT_PUBLIC_API_URL || "";
const MEDIA = "";

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */
type UnitStatus = "available" | "reserved" | "booked" | "sold";
type FormKey    = "none" | "enquire" | "visit";

interface ApiUnit {
  id: string;
  unit_number?: string;
  name?: string;
  unit_type?: string;
  bhk_type?: string;
  floor_number?: number;
  area_sqft?: string;
  base_price?: string;
  custom_fields?: {
    total_amount?: string;
    floor_rise?: string;
    car_park?: string;
    club_membership?: string;
  };
  facing?: string;
  view?: string;
  status?: string;
  project_name?: string;
  location?: string;
  city?: string;
  updated_at?: string;
  tower_id?: string;        // ← used to look up tower image
  images?: string[];        // ← unit-level images (if API returns them)
  floor_plan?: string;      // ← unit-level floor plan (if any)
}

interface Tower {
  id: string;
  name: string;
  description?: string;
  total_floors?: number;
  total_units?: number;
  thumbnail?: string;
  images?: string[];
  video_url?: string;
  walkthrough_url?: string;
  floor_plans?: string[];
}

interface Section {
  key: string;
  label: string;
  visible: boolean;
  fields: string[];
}

interface Project {
  id: string;
  name: string;
  slug?: string;
  city?: string;
  state?: string;
  address?: string;
  pincode?: string;
  description?: string;
  location?: string;
  rera_number?: string;
  images?: string[];
  floor_plans?: string[];
  video_url?: string;
  walkthrough_url?: string;
  brochure_url?: string;
  amenities?: string[];
  lat?: number;
  lng?: number;
  total_floors?: number;
  configuration?: string;
  possession_date?: string;
  launch_date?: string;
  total_units?: number;
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const fmtCr = (p: any) =>
  p && +p > 0 ? `₹${(+p / 10000000).toFixed(2)} Cr` : "—";

const mUrl = (u: string) =>
  u?.startsWith("/media") ? `${MEDIA}${u}` : u;

function toEmbed(url: string): string {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

function getUnitPrice(u: ApiUnit): number {
  const ta = u.custom_fields?.total_amount;
  if (ta && parseFloat(ta) > 0) return parseFloat(ta);
  const base = u.base_price ? parseFloat(u.base_price) : 0;
  const carPark = parseFloat(u.custom_fields?.car_park || "0");
  const clubMembership = parseFloat(u.custom_fields?.club_membership || "0");
  return base + carPark + clubMembership;
}

function mapStatus(s?: string): UnitStatus {
  const l = (s || "").toLowerCase();
  if (l === "available") return "available";
  if (l === "reserved")  return "reserved";
  if (l === "booked")    return "booked";
  return "sold";
}

function useUtmParams() {
  const sp = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  return {
    utm_source:   sp.get("utm_source")   || undefined,
    utm_medium:   sp.get("utm_medium")   || undefined,
    utm_campaign: sp.get("utm_campaign") || undefined,
  };
}

function cleanPhone(p: string)    { return p.replace(/\D/g, "").replace(/^91/, ""); }
function validatePhone(p: string) { return /^[6-9]\d{9}$/.test(cleanPhone(p)); }
function validateEmail(e: string) { return !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function buildupArea(area?: string) {
  if (!area) return "—";
  const n = parseFloat(area.replace(/,/g, ""));
  return isNaN(n) ? area : `${Math.round(n * 1.12).toLocaleString()} sq ft (approx)`;
}

/**
 * Resolve the 3D render image for a unit from the local media folder.
 * Filename pattern: {floor_2digit}-{Facing}-{area_integer}-SFT.png
 * e.g. floor=27, facing="East", area=1635  →  "27-East-1635-SFT.png"
 * Full URL:  /media/series/Nilevalley/Block-6/3D/27-East-1635-SFT.png
 */
function get3DImage(u: ApiUnit): string | null {
  const floor  = u.floor_number;
  const facing = u.facing || u.view;    // API may use either field
  const area   = u.area_sqft;

  if (!floor || !facing || !area) return null;

  // Normalise facing → Title-case: "east" → "East", "WEST" → "West"
  const facingNorm =
    facing.trim().charAt(0).toUpperCase() + facing.trim().slice(1).toLowerCase();

  // Area → integer (strip commas + decimals)
  const areaInt = Math.round(parseFloat(area.replace(/,/g, "")));
  if (isNaN(areaInt)) return null;

  // Floor → zero-padded 2 digits: 1→"01", 10→"10", 30→"30"
  const floorPad = String(floor).padStart(2, "0");

  return `/media/series/Nilevalley/Block-6/3D/${floorPad}-${facingNorm}-${areaInt}-SFT.png`;
}

/* ═══════════════════════════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════════════════════════ */
const PAYMENT_STEPS = [
  { num: "10%", label: "On booking",         milestone: "Token amount",      when: "At agreement", active: true },
  { num: "20%", label: "Within 30 days",     milestone: "Agreement to sale", when: "+ 10% booking"              },
  { num: "30%", label: "On slab completion", milestone: "Floors 1–9",        when: "Est. Q3 2026"               },
  { num: "30%", label: "On super structure", milestone: "Floors 10–18",      when: "Est. Q2 2027"               },
  { num: "10%", label: "On possession",      milestone: "Final handover",    when: "Dec 2028"                   },
];

const CONSTRUCTION_ITEMS = [
  { label: "Foundation & basement",     pct: 100, color: "gold"     },
  { label: "Podium level (G–3F)",        pct: 100, color: "gold"     },
  { label: "Tower A structure (4–10F)", pct: 78,  color: "sapphire" },
  { label: "Tower B structure (4–10F)", pct: 62,  color: "sapphire" },
  { label: "MEP rough-in works",         pct: 45,  color: "gold"     },
  { label: "External facade & glazing",  pct: 20,  color: "gold"     },
  { label: "Club & amenities fit-out",   pct: 10,  color: "gold"     },
];

const TIME_SLOTS = ["10:00 AM","11:00 AM","12:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM"];
const tomorrow   = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const MIN_DATE   = tomorrow.toISOString().split("T")[0];

const SECTION_LABELS: Record<string, string> = {
  description: "About the Project", location: "Location", address: "Address",
  city: "City", state: "State", pincode: "Pincode", rera_number: "RERA Number",
};

/* ═══════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Jost:wght@300;400;500&display=swap');
.pd *{box-sizing:border-box;margin:0;padding:0}
.pd{font-family:'Jost',sans-serif;background:#f0e8d4;color:#F0E8D4;line-height:1.5;min-height:100vh;
  --ink:#0E0C08;--deep:#13100A;--surface:#1C1710;--card:#221D13;
  --gold:#C49A3C;--gold-lt:#E2C47A;--gold-dk:#8A6820;--gold-dim:rgba(196,154,60,0.16);
  --sapphire:#2A5FA5;--sapphire-lt:#4A84D4;--sapphire-dim:rgba(42,95,165,0.16);
  --cream:#F0E8D4;--cream-2:#D4C8A8;--muted:#8A7D60;
  --border-gold:rgba(196,154,60,0.2);}

/* ── SPINNER ── */
.pd-spin{width:40px;height:40px;border:3px solid rgba(196,154,60,0.15);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── NAV ── */
.pd-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2.5rem;
  height: 62px;
  background: linear-gradient(
    105deg,
    #a67c00  0%,
    #c9960c 15%,
    #e8c84a 30%,
    #fdf0a0 42%,
    #ffe066 50%,
    #fdf0a0 58%,
    #e8c84a 70%,
    #c9960c 85%,
    #a67c00 100%
  );
  border-bottom: 1px solid var(--border-gold);
  position: sticky;
  top: 0;
  z-index: 100;
}
.pd-nav-logo{font-family:'Playfair Display',serif;font-size:18px;font-weight:400;color:var(--gold);text-decoration:none}
.pd-nav-logo em{font-style:italic;color:var(--gold)}
.pd-bc{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted);letter-spacing:0.06em}
.pd-bc a{color:#fff; font-size:16px;text-decoration:none;transition:color 0.2s}
.pd-bc a:hover{color:var(--gold-lt)}
.pd-bc-cur{color:#000;font-size:14px;}
.pd-bc-sep{color:#fff}
.pd-nav-cta{background:var(--gold);color:var(--ink);font-family:'Jost',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;padding:9px 22px;border:none;cursor:pointer;border-radius:2px;transition:background 0.2s}
.pd-nav-cta:hover{background:var(--gold-lt)}

/* ── HERO ── */
.pd-hero{display:grid;grid-template-columns:1fr 380px;background:#f0e8d4;border-bottom:1px solid var(--border-gold)}
.pd-hero-left{padding:3rem 2.5rem;border-right:1px solid var(--border-gold)}
.pd-eyebrow{font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--gold);margin-bottom:1rem;display:flex;align-items:center;gap:8px}
.pd-ey-line{width:24px;height:1px;background:var(--sapphire-lt);flex-shrink:0}
.pd-eyebrow span{color:var(--sapphire-lt)}
.pd-title{font-family:'Playfair Display',serif;font-size:52px;font-weight:400;color:var(--cream);line-height:1.0;margin-bottom:6px}
.pd-title em{font-style:italic;color:var(--gold)}
.pd-sub{font-size:13px;color:var(--muted);letter-spacing:0.06em;margin-bottom:2rem}
.pd-img-wrap{background:var(--card);border:1px solid var(--border-gold);border-radius:2px;height:220px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;margin-bottom:2rem}
.pd-img-wrap img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.pd-fp-grid{position:absolute;inset:0;opacity:0.06;background-image:repeating-linear-gradient(0deg,var(--gold) 0,var(--gold) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,var(--gold) 0,var(--gold) 1px,transparent 1px,transparent 40px)}
.pd-fp-tag{position:absolute;top:14px;left:14px;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;background:var(--gold-dim);color:var(--gold-lt);border:1px solid var(--border-gold);padding:4px 10px;border-radius:2px;z-index:2}
.pd-specs{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--border-gold);padding-top:1.8rem}
.pd-spec{padding-right:1.5rem;border-right:1px solid var(--border-gold)}
.pd-spec:last-child{border-right:none}
.pd-spec-val{font-family:'Playfair Display',serif;font-size:22px;font-weight:400;color:var(--gold);line-height:1}
.pd-spec-val span{font-size:14px;color:var(--muted)}
.pd-spec-label{font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-top:4px}

/* ── HERO RIGHT ── */
.pd-hr{padding:2rem;display:flex;flex-direction:column;background:#f0e8d4}
.pd-hr-sec{padding-bottom:1.4rem;margin-bottom:1.4rem;border-bottom:1px solid var(--border-gold)}
.pd-hr-sec:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
.pd-hr-label{font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.pd-price-big{font-family:'Playfair Display',serif;font-size:30px;font-weight:400;color:var(--gold);line-height:1.1}
.pd-price-big em{font-style:italic}
.pd-price-note{font-size:11px;color:var(--muted);margin-top:3px}
.pd-avail-num{font-family:'Playfair Display',serif;font-size:40px;font-weight:400;color:var(--gold);line-height:1}
.pd-avail-sub{font-size:11px;color:var(--muted);margin-top:2px}
.pd-live{display:flex;align-items:center;gap:6px;font-size:10px;color:#8a7d60;letter-spacing:0.06em;margin-top:6px}
.pd-ldot{width:6px;height:6px;border-radius:50%;background:var(--sapphire-lt);animation:pdPulse 2s infinite;flex-shrink:0}
@keyframes pdPulse{0%,100%{opacity:1}50%{opacity:0.3}}
.pd-proj-box{border:1px solid var(--border-gold);border-radius:2px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.pd-proj-row{display:flex;justify-content:space-between;font-size:11px}
.pd-proj-key{color:var(--gold)}
.pd-proj-val{color:var(--gold);text-align:right}
.pd-hero-btns{display:flex;flex-direction:column;gap:10px;margin-top:auto;padding-top:1.2rem}
.pd-btn-gold{background:var(--gold);color:var(--ink);font-family:'Jost',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;padding:13px;border:none;cursor:pointer;border-radius:2px;width:100%;transition:background 0.2s;text-align:center;text-decoration:none;display:block}
.pd-btn-gold:hover{background:var(--gold-lt)}
.pd-btn-sap{background:#000;color:#fff;font-family:'Jost',sans-serif;font-size:11px;font-weight:400;letter-spacing:0.12em;text-transform:uppercase;padding:12px;border:1px solid rgba(74,132,212,0.3);cursor:pointer;border-radius:2px;width:100%;transition:background 0.2s;text-align:center;text-decoration:none;display:block}
.pd-btn-sap:hover{background:#111}

/* ── UNIT SECTION ── */
.pd-us{padding:2.5rem;border-bottom:1px solid var(--border-gold)}
.pd-us-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.6rem}
.pd-us-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--gold)}
.pd-us-title em{font-style:italic;color:var(--gold)}
.pd-legend{display:flex;align-items:center;gap:16px;font-size:10px;letter-spacing:0.08em;color:var(--muted)}
.pd-leg-item{display:flex;align-items:center;gap:5px}
.pd-leg-dot{width:8px;height:8px;border-radius:50%}
.pd-leg-avail{background:var(--gold)}
.pd-leg-hold{background:var(--sapphire-lt)}
.pd-leg-sold{background:rgba(138,125,96,0.5)}
.pd-type-tabs{display:flex;border:1px solid var(--border-gold);border-radius:2px;margin-bottom:1.2rem;overflow:hidden;width:fit-content}
.pd-type-tab{font-size:11px;font-weight:400;letter-spacing:0.1em;text-transform:uppercase;padding:9px 20px;cursor:pointer;color:var(--muted);background:transparent;border:none;border-right:1px solid var(--border-gold);font-family:'Jost',sans-serif;transition:all 0.2s}
.pd-type-tab:last-child{border-right:none}
.pd-type-tab.on{background:var(--gold-dim);color:var(--gold-lt)}
.pd-unit-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;}

/* ── UNIT CARD — with image support ── */
.pd-uc{
  background:#f3e6c696;padding:12px;cursor:pointer;transition:background 0.15s;
  border:1px solid #ffd700;text-align:left;width:100%;
  display:flex;flex-direction:column;
}
.pd-uc:hover{background:#fff}
.pd-uc.sel{background:#fff;outline:1px solid var(--gold)}
.pd-uc.unavail{opacity:0.38;cursor:not-allowed}
.pd-uc.hold{background:rgba(42,95,165,0.07)}

/* unit card image wrapper */
.pd-uc-img{
  width:100%;height:76px;margin-bottom:8px;border-radius:2px;
  overflow:hidden;background:var(--gold-dim);flex-shrink:0;
  position:relative;
}
.pd-uc-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.3s ease}
.pd-uc:hover .pd-uc-img img{transform:scale(1.06)}
.pd-uc-img-overlay{
  position:absolute;inset:0;
  background:linear-gradient(to bottom,transparent 40%,rgba(14,12,8,0.50) 100%);
  pointer-events:none;
}
/* fallback SVG placeholder — dark bg so it's always visible */
.pd-uc-img-placeholder{
  width:100%;height:100%;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,rgba(14,12,8,0.82) 0%,rgba(34,29,19,0.90) 100%);
  border-bottom:1px solid var(--border-gold);
}

.pd-uc-id{font-family:'Playfair Display',serif;font-size:13px;color:#000;margin-bottom:2px}
.pd-uc-type{font-size:12px;color:#18437e;margin-bottom:5px;font-weight:500;letter-spacing:0.04em}
.pd-uc-price{font-size:11px;color:#000}
.pd-uc-badge{font-size:8px;letter-spacing:0.1em;text-transform:uppercase;padding:2px 6px;border-radius:2px;display:inline-block;margin-top:4px}
.b-avail{background:#fff;color:#000}
.b-hold{background:var(--sapphire-dim);color:var(--sapphire-lt)}
.b-sold{background:rgba(138,125,96,0.12);color:var(--muted)}

/* ── UNIT DETAIL PANEL (3 col) ── */
.pd-dp{margin-top:1.4rem;border:1px solid #c49a3c;border-radius:2px;display:grid;grid-template-columns:1fr 1fr 1fr}
.pd-dp-col{padding:1.2rem;border-right:1px solid var(--border-gold)}
.pd-dp-col:last-child{border-right:none}
.pd-dp-hd{font-size:8px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--gold);padding-bottom:8px;border-bottom:1px solid var(--border-gold);margin-bottom:10px}
.pd-dp-hd span{color:var(--gold)}
.pd-dp-row{display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px}
.pd-dp-k{color:var(--muted)}
.pd-dp-v{color:var(--gold)}
.pd-dp-price{font-family:'Playfair Display',serif;font-size:26px;color:var(--gold);margin-top:8px;line-height:1}
.pd-dp-note{font-size:10px;color:var(--muted);margin-top:2px}
.pd-dp-action-txt{font-size:11px;color:var(--muted);line-height:1.6;margin-bottom:12px}
.pd-expr-btn{width:100%;background:var(--gold);color:var(--ink);font-family:'Jost',sans-serif;font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;padding:11px;border:none;cursor:pointer;border-radius:2px;transition:background 0.2s;margin-bottom:8px}
.pd-expr-btn:hover{background:var(--gold-lt)}
.pd-expr-btn:disabled{opacity:0.4;cursor:not-allowed}
.pd-fp-share-row{display:flex;gap:1px;background:var(--border-gold);border-radius:2px;overflow:hidden}
.pd-fp-share-btn{flex:1;background:var(--surface);color:var(--muted);font-family:'Jost',sans-serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;padding:9px 4px;border:none;cursor:pointer;text-align:center;transition:background 0.15s}
.pd-fp-share-btn:hover{background:var(--card);color:var(--cream)}

/* ── FLOOR PLAN SECTION ── */
.pd-fps{display:grid;grid-template-columns:1fr 300px;border-bottom:1px solid var(--border-gold)}
.pd-fps-left{padding:2.5rem;border-right:1px solid var(--border-gold)}
.pd-fps-tabs{display:flex;border-bottom:1px solid var(--border-gold);margin-bottom:1.4rem}
.pd-fps-tab{font-size:11px;letter-spacing:0.08em;text-transform:uppercase;padding:9px 16px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px;background:none;border-top:none;border-left:none;border-right:none;font-family:'Jost',sans-serif;transition:all 0.2s}
.pd-fps-tab.on{color:var(--gold);border-bottom-color:var(--gold)}
.pd-fps-viewer{background:var(--card);border:1px solid var(--border-gold);border-radius:2px;min-height:300px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;margin-bottom:1rem}
.pd-fps-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.6rem}
.pd-sec-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--gold)}
.pd-sec-title em{font-style:italic;color:var(--gold)}
.pd-dl-link{font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--sapphire-lt);text-decoration:none;border-bottom:1px solid rgba(74,132,212,0.3)}
.pd-fps-right{padding:2rem;background:var(--surface)}
.pd-am-group{margin-bottom:1.4rem}
.pd-am-title{font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--gold);padding-bottom:6px;border-bottom:1px solid var(--border-gold);margin-bottom:8px}
.pd-am-list{display:flex;flex-direction:column;gap:6px}
.pd-am-item{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--cream-2)}
.pd-am-dot{width:4px;height:4px;border-radius:50%;background:var(--gold);flex-shrink:0}
.pd-am-dot-b{background:var(--sapphire-lt)}

/* ── PAYMENT ── */
.pd-pay{padding:2.5rem;border-bottom:1px solid var(--border-gold)}
.pd-sec-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.6rem}
.pd-sec-note{font-size:10px;color:var(--muted);letter-spacing:0.06em}
.pd-pay-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:var(--border-gold)}
.pd-pay-step{background:var(--surface);padding:1.2rem;text-align:center}
.pd-pay-step.hi{background:var(--gold-dim)}
.pd-pay-num{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--gold);line-height:1}
.pd-pay-lbl{font-size:10px;color:var(--gold-lt);margin-bottom:4px}
.pd-pay-ms{font-size:11px;color:var(--cream-2);line-height:1.4;margin-bottom:3px}
.pd-pay-wh{font-size:10px;color:var(--muted)}

/* ── CONSTRUCTION ── */
.pd-con{padding:2.5rem;border-bottom:1px solid var(--border-gold)}
.pd-prog-rows{display:flex;flex-direction:column;gap:14px;margin-top:1.4rem}
.pd-prog-row{display:flex;align-items:center;gap:1rem}
.pd-prog-lbl{font-size:12px;color:var(--cream-2);width:220px;flex-shrink:0}
.pd-prog-track{flex:1;height:4px;background:rgba(196,154,60,0.12);border-radius:2px}
.pd-prog-fill{height:100%;border-radius:2px;background:var(--gold)}
.pd-prog-fill-b{background:var(--sapphire-lt)}
.pd-prog-pct{font-size:11px;color:var(--gold-lt);width:38px;text-align:right;flex-shrink:0}
.pd-prog-pct-b{color:var(--sapphire-lt)}

/* ── CONTACT STRIP ── */
.pd-cs{background:var(--surface);border-bottom:1px solid var(--border-gold);padding:2rem 2.5rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:2rem;align-items:center}
.pd-cs-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:400;color:var(--cream)}
.pd-cs-title em{font-style:italic;color:var(--gold)}
.pd-cs-sub{font-size:12px;color:var(--muted);margin-top:4px;line-height:1.6}
.pd-cs-form{display:flex;flex-direction:column;gap:10px}
.pd-cs-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pd-flabel{font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.pd-inp{font-family:'Jost',sans-serif;font-size:12px;font-weight:300;color:var(--cream);background:rgba(240,232,212,0.05);border:1px solid var(--border-gold);padding:9px 12px;border-radius:2px;outline:none;width:100%;transition:border-color 0.2s}
.pd-inp::placeholder{color:rgba(138,125,96,0.5)}
.pd-inp:focus{border-color:rgba(196,154,60,0.45)}
.pd-inp.err{border-color:rgba(155,35,53,0.7)}
.pd-inp:disabled{opacity:0.5}
.pd-sel{font-family:'Jost',sans-serif;font-size:12px;color:var(--cream);background:rgba(240,232,212,0.05);border:1px solid var(--border-gold);padding:9px 28px 9px 12px;border-radius:2px;width:100%;appearance:none;outline:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238A7D60'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
.pd-sel option{background:#221D13}
.pd-cs-submit{background:var(--gold);color:var(--ink);font-family:'Jost',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;padding:12px;border:none;cursor:pointer;border-radius:2px;width:100%;transition:background 0.2s}
.pd-cs-submit:hover{background:var(--gold-lt)}
.pd-cs-submit:disabled{opacity:0.5;cursor:not-allowed}
.pd-ci-list{display:flex;flex-direction:column;gap:12px}
.pd-ci{padding:12px 14px;background:var(--card);border:1px solid var(--border-gold);border-radius:2px}
.pd-ci-lbl{font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.pd-ci-val{font-size:13px;color:var(--cream-2)}
.pd-ci-val a{color:var(--sapphire-lt);text-decoration:none}

/* ── FORM WRAP ── */
.pd-form-wrap{background:var(--card);border:1px solid var(--border-gold);border-radius:2px;padding:2rem}
.pd-form-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.4rem}
.pd-form-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:400;color:var(--cream)}
.pd-form-title em{font-style:italic;color:var(--gold)}
.pd-form-close{background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer}
.pd-form-close:hover{color:var(--cream)}
.pd-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.pd-textarea{font-family:'Jost',sans-serif;font-size:12px;font-weight:300;color:var(--cream);background:rgba(240,232,212,0.05);border:1px solid var(--border-gold);padding:9px 12px;border-radius:2px;outline:none;width:100%;resize:none}
.pd-textarea:focus{border-color:rgba(196,154,60,0.45)}
.pd-form-err{font-size:10px;color:rgba(155,35,53,0.9);margin-top:3px}
.pd-consent-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
.pd-consent-txt{font-size:11px;color:var(--muted);line-height:1.5}
.pd-consent-txt.err{color:rgba(155,35,53,0.9)}
.pd-time-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:2px}
.pd-time-btn{font-size:10px;padding:7px 4px;border-radius:2px;border:1px solid var(--border-gold);background:transparent;color:var(--muted);cursor:pointer;font-family:'Jost',sans-serif;transition:all 0.15s;text-align:center}
.pd-time-btn.on{background:var(--gold-dim);color:var(--gold-lt);border-color:var(--gold)}
.pd-time-btn:disabled{opacity:0.4;cursor:not-allowed}
.pd-form-cta{background:var(--gold);color:var(--ink);font-family:'Jost',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;padding:13px;border:none;cursor:pointer;border-radius:2px;width:100%;transition:background 0.2s;margin-top:4px}
.pd-form-cta:hover{background:var(--gold-lt)}
.pd-form-cta:disabled{opacity:0.5;cursor:not-allowed}
.pd-otp-row{display:flex;gap:8px;justify-content:center}
.pd-otp-cell{width:44px;height:52px;text-align:center;font-size:18px;border-radius:2px;outline:none;font-family:'Playfair Display',serif;color:var(--cream);background:rgba(240,232,212,0.05);border:1.5px solid var(--border-gold);transition:border-color 0.2s}
.pd-otp-cell:focus,.pd-otp-cell.filled{border-color:rgba(196,154,60,0.5)}
.pd-dev-otp{font-size:11px;padding:6px 10px;border-radius:2px;background:rgba(254,249,195,0.08);color:var(--gold-lt);border:1px solid rgba(253,230,138,0.2)}
.pd-resend-btn{font-size:11px;color:var(--sapphire-lt);background:none;border:none;cursor:pointer;font-family:'Jost',sans-serif}
.pd-success-box{background:var(--card);border:1px solid rgba(74,132,212,0.3);border-radius:2px;padding:2rem;text-align:center}
.pd-success-title{font-family:'Playfair Display',serif;font-size:22px;color:var(--cream);margin:1rem 0 6px}
.pd-success-sub{font-size:13px;color:var(--muted);line-height:1.6}
.pd-success-actions{display:flex;gap:10px;justify-content:center;margin-top:1.4rem;flex-wrap:wrap}
.pd-forms-sec{padding:2.5rem;border-bottom:1px solid var(--border-gold);display:flex;flex-direction:column;gap:16px}

/* ── FOOTER ── */
.pd-footer{background:var(--deep);border-top:1px solid var(--border-gold);padding:1.4rem 2.5rem;display:flex;justify-content:space-between;align-items:center}
.pd-footer-logo{font-family:'Playfair Display',serif;font-size:15px;color:var(--gold-lt);text-decoration:none}
.pd-footer-logo em{font-style:italic;color:var(--gold)}
.pd-footer-copy{font-size:10px;color:rgba(138,125,96,0.45);letter-spacing:0.04em}

/* ── TOAST ── */
.pd-toast{position:fixed;bottom:2rem;right:2rem;z-index:999;background:var(--card);border:1px solid var(--border-gold);border-radius:2px;padding:14px 20px;font-size:13px;color:var(--cream);box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:pdSI 0.3s ease}
@keyframes pdSI{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}

/* ── RESPONSIVE ── */
@media(max-width:960px){
  .pd-hero{grid-template-columns:1fr}
  .pd-hr{border-top:1px solid var(--border-gold)}
  .pd-fps{grid-template-columns:1fr}
  .pd-fps-right{border-top:1px solid var(--border-gold)}
  .pd-cs{grid-template-columns:1fr}
  .pd-dp{grid-template-columns:1fr}
  .pd-dp-col{border-right:none;border-bottom:1px solid var(--border-gold)}
  .pd-dp-col:last-child{border-bottom:none}
}
@media(max-width:640px){
  .pd-nav{padding:0 1.2rem}
  .pd-hero-left{padding:2rem 1.2rem}
  .pd-title{font-size:36px}
  .pd-unit-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
  .pd-specs{grid-template-columns:repeat(2,1fr)}
  .pd-pay-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
  .pd-us,.pd-fps-left,.pd-pay,.pd-con,.pd-cs,.pd-forms-sec{padding:1.8rem 1.2rem}
  .pd-cs-row{grid-template-columns:1fr}
  .pd-form-grid{grid-template-columns:1fr}
}
`;

/* ═══════════════════════════════════════════════════════════
   GALLERY
═══════════════════════════════════════════════════════════ */
function Gallery({ images }: { images: string[] }) {
  const [a, setA] = useState(0);
  if (!images?.length) return null;
  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ borderRadius: 2, overflow: "hidden", aspectRatio: "16/9", background: "var(--card)", marginBottom: 10 }}>
        <img src={mUrl(images[a])} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {images.map((img, i) => (
            <button key={i} onClick={() => setA(i)}
              style={{ width: 80, height: 54, borderRadius: 2, overflow: "hidden", padding: 0, cursor: "pointer", border: `2px solid ${a === i ? "var(--gold)" : "transparent"}` }}>
              <img src={mUrl(img)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OTP WIDGET
═══════════════════════════════════════════════════════════ */
function InlineOtp({ phone, onVerified, loading: pL, setLoading: sL }: {
  phone: string; onVerified: () => void; loading: boolean; setLoading: (v: boolean) => void;
}) {
  const [otp, setOtp] = useState(["","","","","",""]);
  const [err, setErr] = useState("");
  const [cd, setCd]   = useState(0);
  const [dev, setDev] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (cd > 0) { const t = setTimeout(() => setCd(c => c - 1), 1000); return () => clearTimeout(t); } }, [cd]);
  useEffect(() => { if (sent) refs.current[0]?.focus(); }, [sent]);

  async function send() {
    sL(true); setErr("");
    try {
      const r = await customerApi("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone: cleanPhone(phone), purpose: "lead" }) });
      if (r.dev_otp) setDev(r.dev_otp);
      setSent(true); setCd(30);
    } catch (e: any) { setErr(e.message || "Failed to send OTP"); }
    finally { sL(false); }
  }

  async function doVerify(code: string) {
    sL(true); setErr("");
    try {
      await customerApi("/auth/verify-phone", { method: "POST", body: JSON.stringify({ phone: cleanPhone(phone), otp: code }) });
      onVerified();
    } catch (e: any) { setErr(e.message || "Invalid OTP"); }
    finally { sL(false); }
  }

  async function auto(d: string[]) { const c = d.join(""); if (c.length === 6 && !pL) await doVerify(c); }
  function onChange(i: number, v: string) {
    if (v && !/^\d$/.test(v)) return;
    const n = [...otp]; n[i] = v; setOtp(n);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (v && i === 5 && n.join("").length === 6) setTimeout(() => auto(n), 100);
  }
  function onKey(i: number, e: React.KeyboardEvent) { if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus(); }
  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p.length === 6) { const d = p.split(""); setOtp(d); refs.current[5]?.focus(); setTimeout(() => auto(d), 100); }
  }

  if (!sent) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {err && <p style={{ color: "rgba(155,35,53,0.9)", fontSize: 12 }}>{err}</p>}
      <button type="button" onClick={send} disabled={pL} className="pd-form-cta">{pL ? "Sending OTP…" : "Send OTP to verify"}</button>
    </div>
  );
  return (
    <div style={{ borderTop: "1px solid var(--border-gold)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      {err && <p style={{ color: "rgba(155,35,53,0.9)", fontSize: 12 }}>{err}</p>}
      {dev && <div className="pd-dev-otp">Dev OTP: <strong>{dev}</strong></div>}
      <p style={{ fontSize: 12, color: "var(--muted)" }}>OTP sent to <strong style={{ color: "var(--cream-2)" }}>+91 {cleanPhone(phone)}</strong></p>
      <div className="pd-otp-row" onPaste={onPaste}>
        {otp.map((d, i) => (
          <input key={i} ref={el => { refs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={d}
            onChange={e => onChange(i, e.target.value)} onKeyDown={e => onKey(i, e)}
            className={`pd-otp-cell${d ? " filled" : ""}`} />
        ))}
      </div>
      <button type="button" onClick={() => doVerify(otp.join(""))} disabled={pL || otp.join("").length !== 6} className="pd-form-cta">
        {pL ? "Verifying…" : "Verify & Submit"}
      </button>
      <div style={{ textAlign: "center" }}>
        {cd > 0
          ? <p style={{ fontSize: 11, color: "var(--muted)" }}>Resend in {cd}s</p>
          : <button type="button" onClick={() => { setOtp(["","","","","",""]); setDev(null); send(); }} disabled={pL} className="pd-resend-btn">Resend OTP</button>
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ENQUIRY FORM
═══════════════════════════════════════════════════════════ */
function EnquiryForm({ projectName, onDone, onCancel }: { projectName: string; onDone: () => void; onCancel: () => void }) {
  const utm = useUtmParams();
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpPhase, setOtpPhase] = useState(false);
  const [loading, setLoading] = useState(false);
  const up = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Name is required (min 2 chars)";
    if (!validatePhone(form.phone)) e.phone = "Valid 10-digit Indian mobile required";
    if (!validateEmail(form.email)) e.email = "Invalid email format";
    if (!form.consent) e.consent = "Consent is required";
    setErrors(e); return Object.keys(e).length === 0;
  }

  async function handleVerified() {
    setLoading(true);
    try {
      await fetch(`${API}/leads`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), phone: cleanPhone(form.phone),
          email: form.email.trim() || undefined, message: form.message.trim(),
          source: utm.utm_source ? "campaign" : "project_page",
          project_interest: projectName, ...utm,
        }),
      });
      onDone();
    } catch { setLoading(false); }
  }

  return (
    <div className="pd-form-wrap">
      <div className="pd-form-hd">
        <div>
          <div className="pd-form-title">Enquire — <em>{projectName}</em></div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>We'll get back to you within 24 hours</p>
        </div>
        <button className="pd-form-close" onClick={onCancel}>✕</button>
      </div>
      <form onSubmit={e => { e.preventDefault(); if (!validate()) return; setOtpPhase(true); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="pd-form-grid">
          <div>
            <div className="pd-flabel">Name *</div>
            <input className={`pd-inp${errors.name ? " err" : ""}`} value={form.name} onChange={e => up("name", e.target.value)} disabled={otpPhase} placeholder="Your full name" />
            {errors.name && <p className="pd-form-err">{errors.name}</p>}
          </div>
          <div>
            <div className="pd-flabel">Phone *</div>
            <input className={`pd-inp${errors.phone ? " err" : ""}`} value={form.phone} onChange={e => up("phone", e.target.value)} disabled={otpPhase} placeholder="98765 43210" maxLength={13} />
            {errors.phone && <p className="pd-form-err">{errors.phone}</p>}
          </div>
        </div>
        <div>
          <div className="pd-flabel">Email</div>
          <input type="email" className={`pd-inp${errors.email ? " err" : ""}`} value={form.email} onChange={e => up("email", e.target.value)} disabled={otpPhase} placeholder="you@email.com" />
          {errors.email && <p className="pd-form-err">{errors.email}</p>}
        </div>
        <div>
          <div className="pd-flabel">Message</div>
          <textarea rows={3} className="pd-textarea" value={form.message} onChange={e => up("message", e.target.value)} disabled={otpPhase} placeholder="I'm interested in…" />
        </div>
        <div className="pd-consent-row">
          <input type="checkbox" checked={form.consent} onChange={e => up("consent", e.target.checked)} disabled={otpPhase} style={{ marginTop: 2, accentColor: "var(--gold)" }} />
          <span className={`pd-consent-txt${errors.consent ? " err" : ""}`}>I consent to Janapriya contacting me via phone calls, SMS, WhatsApp, and email regarding property updates.</span>
        </div>
        {errors.consent && <p className="pd-form-err">{errors.consent}</p>}
        {otpPhase
          ? <InlineOtp phone={form.phone} onVerified={handleVerified} loading={loading} setLoading={setLoading} />
          : <button type="submit" className="pd-form-cta">Submit Enquiry</button>}
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SITE VISIT FORM
═══════════════════════════════════════════════════════════ */
function SiteVisitForm({ projectName, onDone, onCancel }: { projectName: string; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", visit_date: "", visit_time: "", notes: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpPhase, setOtpPhase] = useState(false);
  const [loading, setLoading] = useState(false);
  const up = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Name is required (min 2 chars)";
    if (!validatePhone(form.phone)) e.phone = "Valid 10-digit Indian mobile required";
    if (!validateEmail(form.email)) e.email = "Invalid email format";
    if (!form.visit_date) e.visit_date = "Select a date";
    if (!form.visit_time) e.visit_time = "Select a time slot";
    if (!form.consent) e.consent = "Consent is required";
    setErrors(e); return Object.keys(e).length === 0;
  }

  async function handleVerified() {
    setLoading(true);
    try {
      const api = (await import("@/lib/api")).default;
      await api.post("/site-visits", {
        name: form.name.trim(), phone: cleanPhone(form.phone),
        email: form.email.trim() || undefined,
        visit_date: new Date(form.visit_date).toISOString(),
        visit_time: form.visit_time, notes: form.notes.trim(),
      });
      onDone();
    } catch { setLoading(false); }
  }

  return (
    <div className="pd-form-wrap">
      <div className="pd-form-hd">
        <div>
          <div className="pd-form-title">📅 Book a Site Visit — <em>{projectName}</em></div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Pick a date and time that works for you</p>
        </div>
        <button className="pd-form-close" onClick={onCancel}>✕</button>
      </div>
      <form onSubmit={e => { e.preventDefault(); if (!validate()) return; setOtpPhase(true); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="pd-form-grid">
          <div>
            <div className="pd-flabel">Name *</div>
            <input className={`pd-inp${errors.name ? " err" : ""}`} value={form.name} onChange={e => up("name", e.target.value)} disabled={otpPhase} placeholder="Your full name" />
            {errors.name && <p className="pd-form-err">{errors.name}</p>}
          </div>
          <div>
            <div className="pd-flabel">Phone *</div>
            <input className={`pd-inp${errors.phone ? " err" : ""}`} value={form.phone} onChange={e => up("phone", e.target.value)} disabled={otpPhase} placeholder="98765 43210" maxLength={13} />
            {errors.phone && <p className="pd-form-err">{errors.phone}</p>}
          </div>
        </div>
        <div>
          <div className="pd-flabel">Email</div>
          <input type="email" className={`pd-inp${errors.email ? " err" : ""}`} value={form.email} onChange={e => up("email", e.target.value)} disabled={otpPhase} placeholder="you@email.com" />
          {errors.email && <p className="pd-form-err">{errors.email}</p>}
        </div>
        <div className="pd-form-grid">
          <div>
            <div className="pd-flabel">Preferred Date *</div>
            <input type="date" min={MIN_DATE} className={`pd-inp${errors.visit_date ? " err" : ""}`} value={form.visit_date} onChange={e => up("visit_date", e.target.value)} disabled={otpPhase} />
            {errors.visit_date && <p className="pd-form-err">{errors.visit_date}</p>}
          </div>
          <div>
            <div className="pd-flabel">Preferred Time *</div>
            <div className="pd-time-grid">
              {TIME_SLOTS.map(s => (
                <button key={s} type="button" disabled={otpPhase} onClick={() => up("visit_time", s)}
                  className={`pd-time-btn${form.visit_time === s ? " on" : ""}`}>{s}</button>
              ))}
            </div>
            {errors.visit_time && <p className="pd-form-err">{errors.visit_time}</p>}
          </div>
        </div>
        <div>
          <div className="pd-flabel">What are you looking for?</div>
          <textarea rows={2} className="pd-textarea" value={form.notes} onChange={e => up("notes", e.target.value)} disabled={otpPhase} placeholder="e.g. 3BHK, pool view, budget ₹1.5 Cr…" />
        </div>
        <div className="pd-consent-row">
          <input type="checkbox" checked={form.consent} onChange={e => up("consent", e.target.checked)} disabled={otpPhase} style={{ marginTop: 2, accentColor: "var(--gold)" }} />
          <span className={`pd-consent-txt${errors.consent ? " err" : ""}`}>I consent to Janapriya contacting me via phone calls, SMS, WhatsApp, and email regarding my site visit and property updates.</span>
        </div>
        {errors.consent && <p className="pd-form-err">{errors.consent}</p>}
        {otpPhase
          ? <InlineOtp phone={form.phone} onVerified={handleVerified} loading={loading} setLoading={setLoading} />
          : <button type="submit" className="pd-form-cta">📅 Confirm Site Visit</button>}
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROJECT FORMS SECTION
═══════════════════════════════════════════════════════════ */
function ProjectFormsSection({ projectName }: { projectName: string }) {
  const [activeForm, setActiveForm]   = useState<FormKey>("none");
  const [enquiryDone, setEnquiryDone] = useState(false);
  const [visitDone, setVisitDone]     = useState(false);

  return (
    <div className="pd-forms-sec" id="enquire">
      {activeForm === "none" && !enquiryDone && !visitDone && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => setActiveForm("enquire")} className="pd-btn-gold" style={{ flex: 1 }}>Enquire Now</button>
          <button onClick={() => setActiveForm("visit")} className="pd-btn-sap" style={{ flex: 1 }}>📅 Book Site Visit</button>
        </div>
      )}
      {enquiryDone && (
        <div className="pd-success-box">
          <div style={{ fontSize: 48 }}>✅</div>
          <div className="pd-success-title">Thank You for Your Interest!</div>
          <p className="pd-success-sub">We've received your enquiry about <strong>{projectName}</strong>. Our sales team will get back to you within 24 hours.</p>
          <div className="pd-success-actions">
            <button className="pd-btn-sap" style={{ width: "auto", padding: "10px 20px" }} onClick={() => { setEnquiryDone(false); setActiveForm("visit"); }}>📅 Book a Site Visit</button>
            <Link href="/units" className="pd-btn-gold" style={{ width: "auto", padding: "10px 20px", textDecoration: "none" }}>Browse Units →</Link>
          </div>
        </div>
      )}
      {visitDone && (
        <div className="pd-success-box">
          <div style={{ fontSize: 48 }}>🏠</div>
          <div className="pd-success-title">Site Visit Confirmed!</div>
          <p className="pd-success-sub">Your visit to <strong>{projectName}</strong> has been scheduled. Our team will call you to confirm.</p>
          <div className="pd-success-actions">
            <Link href="/" className="pd-btn-sap" style={{ width: "auto", padding: "10px 20px", textDecoration: "none" }}>Back to Home</Link>
            <Link href="/units" className="pd-btn-gold" style={{ width: "auto", padding: "10px 20px", textDecoration: "none" }}>Browse Units →</Link>
          </div>
        </div>
      )}
      {activeForm === "enquire" && !enquiryDone && (
        <EnquiryForm projectName={projectName} onDone={() => { setActiveForm("none"); setEnquiryDone(true); }} onCancel={() => setActiveForm("none")} />
      )}
      {activeForm === "visit" && !visitDone && (
        <SiteVisitForm projectName={projectName} onDone={() => { setActiveForm("none"); setVisitDone(true); }} onCancel={() => setActiveForm("none")} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   INLINE CONTACT FORM
═══════════════════════════════════════════════════════════ */
function InlineContactForm({ projectName }: { projectName: string }) {
  const utm = useUtmParams();
  const [form, setForm] = useState({ name: "", mobile: "", email: "", unitType: "3 BHK — from ₹1.4 Cr" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.name.trim() || !form.mobile.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API}/leads`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), phone: cleanPhone(form.mobile),
          email: form.email.trim() || undefined, unit_type: form.unitType,
          project_interest: projectName, source: utm.utm_source ? "campaign" : "project_page", ...utm,
        }),
      });
      setDone(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  if (done) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 14, color: "var(--gold-lt)", fontFamily: "'Playfair Display',serif" }}>✓ Request received!</div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>Our advisor will call you within 2 hours.</div>
    </div>
  );

  return (
    <div className="pd-cs-form">
      <div className="pd-cs-row">
        <div>
          <div className="pd-flabel">Name</div>
          <input className="pd-inp" type="text" placeholder="Ravi Sharma" value={form.name} onChange={e => up("name", e.target.value)} />
        </div>
        <div>
          <div className="pd-flabel">Mobile</div>
          <input className="pd-inp" type="tel" placeholder="+91 98490 00000" value={form.mobile} onChange={e => up("mobile", e.target.value)} maxLength={13} />
        </div>
      </div>
      <div>
        <div className="pd-flabel">Email</div>
        <input className="pd-inp" type="email" placeholder="ravi@example.com" value={form.email} onChange={e => up("email", e.target.value)} />
      </div>
      <div>
        <div className="pd-flabel">Preferred unit type</div>
        <select className="pd-sel" value={form.unitType} onChange={e => up("unitType", e.target.value)}>
          <option>3 BHK — from ₹1.4 Cr</option>
          <option>3 BHK+ — from ₹1.9 Cr</option>
          <option>4 BHK — from ₹2.4 Cr</option>
        </select>
      </div>
      <button className="pd-cs-submit" onClick={submit} disabled={loading}>
        {loading ? "Submitting…" : "Request Callback →"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   UNIT CARD IMAGE — SVG architectural fallback
═══════════════════════════════════════════════════════════ */
function UnitCardImageFallback({ label }: { label?: string }) {
  return (
    <div className="pd-uc-img-placeholder">
      <svg width="88" height="56" viewBox="0 0 88 56" style={{ opacity: 0.8 }}>
        {/* Left unit block */}
        <rect x="4"  y="4"  width="36" height="48" fill="rgba(196,154,60,0.08)" stroke="#C49A3C" strokeWidth="0.9"/>
        <rect x="8"  y="8"  width="12" height="16" fill="rgba(196,154,60,0.05)" stroke="#C49A3C" strokeWidth="0.5"/>
        <rect x="24" y="8"  width="12" height="16" fill="rgba(196,154,60,0.05)" stroke="#C49A3C" strokeWidth="0.5"/>
        <rect x="8"  y="30" width="28" height="18" fill="rgba(196,154,60,0.05)" stroke="#C49A3C" strokeWidth="0.5"/>
        {/* Right unit block */}
        <rect x="48" y="4"  width="36" height="48" fill="rgba(74,132,212,0.08)" stroke="#4A84D4" strokeWidth="0.9"/>
        <rect x="52" y="8"  width="12" height="16" fill="rgba(74,132,212,0.05)" stroke="#4A84D4" strokeWidth="0.5"/>
        <rect x="68" y="8"  width="12" height="16" fill="rgba(74,132,212,0.05)" stroke="#4A84D4" strokeWidth="0.5"/>
        <rect x="52" y="30" width="28" height="18" fill="rgba(74,132,212,0.05)" stroke="#4A84D4" strokeWidth="0.5"/>
        {/* Divider */}
        <line x1="44" y1="4" x2="44" y2="52" stroke="#C49A3C" strokeWidth="0.4" strokeDasharray="3,2"/>
        {/* Labels */}
        <text x="22" y="24" textAnchor="middle" fontSize="5" fill="#E2C47A" fontFamily="Jost,sans-serif" letterSpacing="0.5">BED</text>
        <text x="66" y="24" textAnchor="middle" fontSize="5" fill="#4A84D4" fontFamily="Jost,sans-serif" letterSpacing="0.5">BED</text>
        <text x="22" y="42" textAnchor="middle" fontSize="5" fill="#E2C47A" fontFamily="Jost,sans-serif" letterSpacing="0.5">LIVING</text>
        <text x="66" y="42" textAnchor="middle" fontSize="5" fill="#4A84D4" fontFamily="Jost,sans-serif" letterSpacing="0.5">LIVING</text>
      </svg>
      {label && (
        <span style={{
          position:"absolute",bottom:4,left:0,right:0,textAlign:"center",
          fontSize:8,letterSpacing:"0.12em",textTransform:"uppercase",
          color:"rgba(196,154,60,0.7)",fontFamily:"Jost,sans-serif",
        }}>{label}</span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DETAIL PANEL 3D IMAGE — safe hook usage in own component
═══════════════════════════════════════════════════════════ */
function DetailPanel3DImage({
  unit,
  getUnitImg,
}: {
  unit: ApiUnit;
  getUnitImg: (u: ApiUnit) => string | null;
}) {
  const [err, setErr] = useState(false);
  // Priority: dedicated 3D file first, then any resolved image
  const img = get3DImage(unit) || getUnitImg(unit);

  if (!img || err) return null;

  return (
    <div style={{
      width: "100%", height: 150, borderRadius: 2, overflow: "hidden",
      marginBottom: 10, position: "relative",
      background: "linear-gradient(135deg,rgba(14,12,8,0.85),rgba(34,29,19,0.92))",
      border: "1px solid var(--border-gold)",
    }}>
      <img
        src={mUrl(img)}
        alt="3D render"
        onError={() => setErr(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {/* Label strip */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, rgba(14,12,8,0.75) 0%, transparent 100%)",
        padding: "8px 10px",
        fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--gold-lt)", fontFamily: "Jost,sans-serif",
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      }}>
        <span>3D Render</span>
        <span>Fl.{unit.floor_number} · {unit.facing || unit.view}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   UNIT SELECTOR — with dynamic 3D / floor-plan image per card
═══════════════════════════════════════════════════════════ */
function UnitSelector({ units, towers, slug, projectName, onExpressInterest, projectImages }: {
  units: ApiUnit[];
  towers: Tower[];
  slug: string;
  projectName: string;
  onExpressInterest: () => void;
  projectImages?: string[];   // ← project-level images as final image fallback
}) {
  const types = ["All Types", ...Array.from(new Set(units.map(u => u.unit_type || u.bhk_type).filter(Boolean) as string[]))];
  const [activeType, setActiveType] = useState("All Types");
  const [selIdx, setSelIdx]         = useState(0);
  // Track per-unit whether their real image failed to load
  const [imgErrors, setImgErrors]   = useState<Record<string, boolean>>({});

  /* ── Image resolution map: tower_id → best available image ── */
  const towerImageMap = Object.fromEntries(
    towers.map(t => [
      t.id,
      t.floor_plans?.[0] || t.thumbnail || t.images?.[0] || null,
    ])
  );

  /**
   * Resolve the best image for a unit card in priority order:
   *  1. get3DImage(u)         — /media/series/Nilevalley/Block-6/3D/{floor}-{facing}-{area}-SFT.png
   *  2. unit.images[0]        — unit-level photo/render from API
   *  3. unit.floor_plan       — unit-level floor plan from API
   *  4. tower.floor_plans[0]  — tower's first floor plan
   *  5. tower.thumbnail       — tower hero image
   *  6. tower.images[0]       — any tower gallery image
   *  7. projectImages[0]      — project-level hero image
   *  8. null                  — render SVG blueprint placeholder
   */
  const getUnitImg = (u: ApiUnit): string | null =>
    get3DImage(u)      ||
    u.images?.[0]      ||
    u.floor_plan       ||
    (() => {
      if (u.tower_id) {
        const t = towers.find(t => t.id === u.tower_id);
        if (t?.floor_plans?.[0]) return t.floor_plans[0];
        if (t?.thumbnail)        return t.thumbnail;
        if (t?.images?.[0])      return t.images[0];
      }
      return null;
    })()               ||
    projectImages?.[0] ||
    null;

  const filtered = activeType === "All Types" ? units : units.filter(u => (u.unit_type || u.bhk_type) === activeType);
  const sel = filtered[selIdx] ?? filtered[0];
  const status = sel ? mapStatus(sel.status) : "available";

  const stLabel = (u: ApiUnit) => ({ available: "Available", reserved: "On Hold", booked: "Booked", sold: "Sold" }[mapStatus(u.status)]);
  const stCls   = (u: ApiUnit) => ({ available: "b-avail", reserved: "b-hold", booked: "b-sold", sold: "b-sold" }[mapStatus(u.status)]);
  const ucCls   = (u: ApiUnit, i: number) => {
    const s = mapStatus(u.status);
    return ["pd-uc", s === "reserved" ? "hold" : "", (s === "booked" || s === "sold") ? "unavail" : "", i === selIdx ? "sel" : ""].filter(Boolean).join(" ");
  };
  const canClick = (u: ApiUnit) => { const s = mapStatus(u.status); return s === "available" || s === "reserved"; };

  return (
    <div className="pd-us">
      {/* Header + legend */}
      <div className="pd-us-head">
        <div className="pd-us-title">Select a <em>Unit</em></div>
        <div className="pd-legend">
          <div className="pd-leg-item"><div className="pd-leg-dot pd-leg-avail" />Available</div>
          <div className="pd-leg-item"><div className="pd-leg-dot pd-leg-hold" />On Hold</div>
          <div className="pd-leg-item"><div className="pd-leg-dot pd-leg-sold" />Sold</div>
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="pd-type-tabs">
        {types.map(t => (
          <button key={t} className={`pd-type-tab${activeType === t ? " on" : ""}`}
            onClick={() => { setActiveType(t); setSelIdx(0); }}>
            {t}
          </button>
        ))}
      </div>

      {/* Unit grid */}
      {filtered.length > 0 ? (
        <div className="pd-unit-grid">
          {filtered.map((u, i) => {
            const img = getUnitImg(u);
            return (
              <button key={u.id} className={ucCls(u, i)} onClick={() => { if (canClick(u)) setSelIdx(i); }}>

                {/* ── Dynamic 3D / floor-plan image ── */}
                <div className="pd-uc-img" style={{ position: "relative" }}>
                  {img && !imgErrors[u.id] ? (
                    <>
                      <img
                        src={mUrl(img)}
                        alt={`${u.unit_number || u.id} floor plan`}
                        onError={() =>
                          // Flip to SVG fallback WITHOUT hiding the whole div
                          setImgErrors(prev => ({ ...prev, [u.id]: true }))
                        }
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      <div className="pd-uc-img-overlay" />
                    </>
                  ) : (
                    <UnitCardImageFallback label={u.unit_type || u.bhk_type || undefined} />
                  )}
                </div>

                {/* ── Unit info ── */}
                <div className="pd-uc-id">{u.unit_number || u.name || u.id}</div>
                <div className="pd-uc-type">{u.unit_type || u.bhk_type} · Fl.{u.floor_number ?? "—"}</div>
                <div className="pd-uc-price">{fmtCr(getUnitPrice(u))}</div>
                <span className={`pd-uc-badge ${stCls(u)}`}>{stLabel(u)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: 13, padding: "1.5rem 0" }}>No units match this filter.</p>
      )}

      {/* 3-column detail panel */}
      {sel && (
        <div className="pd-dp">
          {/* Col 1 — Unit Details + 3D preview */}
          <div className="pd-dp-col">
            <div className="pd-dp-hd">Unit Details</div>

            {/* Large 3D render for selected unit */}
            <DetailPanel3DImage unit={sel} getUnitImg={getUnitImg} />

            <div className="pd-dp-row"><span className="pd-dp-k">Unit No.</span>     <span className="pd-dp-v">{sel.unit_number || sel.name || sel.id}</span></div>
            <div className="pd-dp-row"><span className="pd-dp-k">Type</span>         <span className="pd-dp-v">{sel.unit_type || sel.bhk_type || "—"}</span></div>
            <div className="pd-dp-row"><span className="pd-dp-k">Floor</span>        <span className="pd-dp-v">{sel.floor_number != null ? `${sel.floor_number}th Floor` : "—"}</span></div>
            <div className="pd-dp-row"><span className="pd-dp-k">Carpet area</span>  <span className="pd-dp-v">{sel.area_sqft ? `${parseFloat(sel.area_sqft).toLocaleString()} sq ft` : "—"}</span></div>
            <div className="pd-dp-row"><span className="pd-dp-k">Buildup</span>      <span className="pd-dp-v">{buildupArea(sel.area_sqft)}</span></div>
            <div className="pd-dp-row"><span className="pd-dp-k">Facing</span>       <span className="pd-dp-v">{sel.facing || sel.view || "—"}</span></div>
          </div>

          {/* Col 2 — Pricing */}
          <div className="pd-dp-col">
            <div className="pd-dp-hd">Pricing — <span>Salesforce Live</span></div>
            <div className="pd-dp-row"><span className="pd-dp-k">Base price</span>      <span className="pd-dp-v">{fmtCr(sel.base_price)}</span></div>
            <div className="pd-dp-row"><span className="pd-dp-k">Floor rise</span>      <span className="pd-dp-v">{sel.custom_fields?.floor_rise ? fmtCr(sel.custom_fields.floor_rise) : "—"}</span></div>
            <div className="pd-dp-row"><span className="pd-dp-k">Car park</span>        <span className="pd-dp-v">{sel.custom_fields?.car_park ? fmtCr(sel.custom_fields.car_park) : "—"}</span></div>
            <div className="pd-dp-row"><span className="pd-dp-k">Club membership</span> <span className="pd-dp-v">{sel.custom_fields?.club_membership ? fmtCr(sel.custom_fields.club_membership) : "—"}</span></div>
            <div className="pd-dp-row"><span className="pd-dp-k">Total (ex-GST)</span>  <span className="pd-dp-v">{fmtCr(getUnitPrice(sel))}</span></div>
            <div className="pd-dp-price">{fmtCr(getUnitPrice(sel))}</div>
            <div className="pd-dp-note">GST additional as applicable</div>
          </div>

          {/* Col 3 — Actions */}
          <div className="pd-dp-col">
            <div className="pd-dp-hd">Actions</div>
            <p className="pd-dp-action-txt">
              {status === "available"
                ? "This unit is available. Click below to express interest — your details will sync to Salesforce instantly."
                : status === "reserved"
                ? "This unit is currently on hold. You may still register your interest."
                : "This unit has been sold. Browse other available units above."}
            </p>
            <button className="pd-expr-btn" disabled={status !== "available" && status !== "reserved"} onClick={onExpressInterest}>
              Express Interest →
            </button>
            <div className="pd-fp-share-row">
              <Link href={`/projects/${slug}/units/${sel.id}`} className="pd-fp-share-btn" style={{ textDecoration: "none" }}>Floor Plan</Link>
              <button className="pd-fp-share-btn" onClick={() => { navigator.share?.({ title: `${sel.unit_number || sel.id} — ${projectName}`, url: window.location.href }); }}>Share</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLOOR PLAN SECTION
═══════════════════════════════════════════════════════════ */
function FloorPlanSection({ plans, brochureUrl, amenities }: {
  plans: string[]; brochureUrl?: string; amenities?: string[];
}) {
  const FP_TABS = [
    { label: "2 BHK — 990 sqft",  tag: "2 BHK — Type A · 990 sq ft"  },
    { label: "3 BHK — 1450 sqft", tag: "3 BHK — Type B · 1450 sq ft" },
    { label: "3+ BHK — 1635 sqft",  tag: "3+ BHK — Type C · 1635 sq ft"  },
  ];
  const [activeTab, setActiveTab] = useState(0);

  const clubLeisure  = amenities?.filter((_, i) => i < 5)  || ["25m temperature-controlled pool","Fully equipped gymnasium","Indoor squash court","Multipurpose banquet hall","Rooftop sky lounge — 18F"];
  const wellness     = amenities?.filter((_, i) => i >= 5 && i < 9) || ["Yoga & meditation pavilion","Steam & sauna suite","Children's play zone","Senior citizen garden"];
  const smart        = amenities?.filter((_, i) => i >= 9) || ["3-tier security · CCTV · Intercom","100% DG power backup","EV charging bays (B1 & B2)","STP · Rainwater harvesting"];

  return (
    <div className="pd-fps">
      <div className="pd-fps-left">
        <div className="pd-fps-head">
          <div className="pd-sec-title">Floor <em>Plans</em></div>
          {brochureUrl && <a href={mUrl(brochureUrl)} target="_blank" rel="noopener noreferrer" className="pd-dl-link">Download PDF →</a>}
        </div>

        {plans.length > 0 ? (
          <>
            <div className="pd-fps-tabs">
              {plans.map((_, i) => (
                <button key={i} className={`pd-fps-tab${activeTab === i ? " on" : ""}`} onClick={() => setActiveTab(i)}>Plan {i + 1}</button>
              ))}
            </div>
            <div className="pd-fps-viewer">
              <div className="pd-fp-grid" />
              <div className="pd-fp-tag">Floor Plan {activeTab + 1}</div>
              {plans[activeTab]?.endsWith(".pdf")
                ? <iframe src={mUrl(plans[activeTab])} style={{ width: "100%", height: 400, position: "relative", zIndex: 1 }} />
                : <img src={mUrl(plans[activeTab])} alt="" style={{ maxWidth: "100%", maxHeight: "90%", objectFit: "contain", position: "relative", background: "#f0e8d4", zIndex: 1 }} />
              }
            </div>
          </>
        ) : (
          <>
            <div className="pd-fps-tabs">
              {FP_TABS.map((t, i) => (
                <button key={t.label} className={`pd-fps-tab${activeTab === i ? " on" : ""}`} onClick={() => setActiveTab(i)}>{t.label}</button>
              ))}
            </div>
            <div className="pd-fps-viewer">
              <div className="pd-fp-grid" />
              <div className="pd-fp-tag">{FP_TABS[activeTab].tag}</div>
              <svg width="380" height="260" viewBox="0 0 380 260" style={{ position: "relative", zIndex: 1 }}>
                <rect x="30" y="20" width="320" height="220" fill="none" stroke="#C49A3C" strokeWidth="1.5"/>
                <rect x="30" y="20" width="110" height="90" fill="rgba(196,154,60,0.05)" stroke="#C49A3C" strokeWidth="0.8"/>
                <rect x="140" y="20" width="100" height="90" fill="rgba(74,132,212,0.05)" stroke="#4A84D4" strokeWidth="0.8"/>
                <rect x="240" y="20" width="110" height="90" fill="rgba(196,154,60,0.05)" stroke="#C49A3C" strokeWidth="0.8"/>
                <rect x="30" y="110" width="150" height="130" fill="rgba(196,154,60,0.07)" stroke="#C49A3C" strokeWidth="0.8"/>
                <rect x="180" y="110" width="90" height="60" fill="rgba(74,132,212,0.05)" stroke="#4A84D4" strokeWidth="0.8"/>
                <rect x="270" y="110" width="80" height="60" fill="rgba(196,154,60,0.04)" stroke="#C49A3C" strokeWidth="0.5" strokeDasharray="3,2"/>
                <rect x="180" y="170" width="170" height="70" fill="rgba(196,154,60,0.05)" stroke="#C49A3C" strokeWidth="0.8"/>
                <line x1="30" y1="110" x2="350" y2="110" stroke="#C49A3C" strokeWidth="0.5" strokeDasharray="4,3"/>
                <text x="85" y="62" textAnchor="middle" fontSize="9" fill="#E2C47A" fontFamily="Jost,sans-serif" letterSpacing="1">Master BR</text>
                <text x="85" y="74" textAnchor="middle" fontSize="8" fill="#8A7D60" fontFamily="Jost,sans-serif">14 × 13 ft</text>
                <text x="190" y="62" textAnchor="middle" fontSize="9" fill="#4A84D4" fontFamily="Jost,sans-serif" letterSpacing="1">Kitchen</text>
                <text x="295" y="62" textAnchor="middle" fontSize="9" fill="#E2C47A" fontFamily="Jost,sans-serif" letterSpacing="1">Bedroom 2</text>
                <text x="295" y="74" textAnchor="middle" fontSize="8" fill="#8A7D60" fontFamily="Jost,sans-serif">12 × 11 ft</text>
                <text x="105" y="178" textAnchor="middle" fontSize="9" fill="#E2C47A" fontFamily="Jost,sans-serif" letterSpacing="1">Living & Dining</text>
                <text x="105" y="190" textAnchor="middle" fontSize="8" fill="#8A7D60" fontFamily="Jost,sans-serif">22 × 18 ft</text>
                <text x="225" y="143" textAnchor="middle" fontSize="9" fill="#4A84D4" fontFamily="Jost,sans-serif" letterSpacing="1">Bedroom 3</text>
                <text x="225" y="155" textAnchor="middle" fontSize="8" fill="#8A7D60" fontFamily="Jost,sans-serif">11 × 10 ft</text>
                <text x="310" y="138" textAnchor="middle" fontSize="8" fill="#8A7D60" fontFamily="Jost,sans-serif">Study</text>
                <text x="265" y="208" textAnchor="middle" fontSize="9" fill="#E2C47A" fontFamily="Jost,sans-serif" letterSpacing="1">Balcony</text>
                <path d="M30 200 L20 200 L20 240 L30 240" fill="none" stroke="#C49A3C" strokeWidth="0.8"/>
                <text x="8" y="222" fontSize="7" fill="#8A7D60" fontFamily="Jost,sans-serif" transform="rotate(-90,8,222)">Entry</text>
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Amenities sidebar */}
      <div className="pd-fps-right">
        <div className="pd-am-group">
          <div className="pd-am-title">Club &amp; Leisure</div>
          <div className="pd-am-list">{clubLeisure.map((a, i) => <div key={i} className="pd-am-item"><span className="pd-am-dot"/>{a}</div>)}</div>
        </div>
        <div className="pd-am-group">
          <div className="pd-am-title">Wellness &amp; Lifestyle</div>
          <div className="pd-am-list">{wellness.map((a, i) => <div key={i} className="pd-am-item"><span className="pd-am-dot pd-am-dot-b"/>{a}</div>)}</div>
        </div>
        <div className="pd-am-group">
          <div className="pd-am-title">Smart &amp; Secure</div>
          <div className="pd-am-list">{smart.map((a, i) => <div key={i} className="pd-am-item"><span className="pd-am-dot"/>{a}</div>)}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CMS SECTION RENDERER
═══════════════════════════════════════════════════════════ */
function CmsSection({ s, project }: { s: Section; project: Project }) {
  const f = s.fields;
  const parts: React.ReactNode[] = [];
  const textFields = f.filter(k => SECTION_LABELS[k] && (project as any)[k]);
  if (textFields.length)
    parts.push(
      <div key="text" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {textFields.map(k => (
          <div key={k} style={{ gridColumn: k === "description" ? "1/-1" : undefined }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>{SECTION_LABELS[k]}</div>
            <div style={{ fontSize: 14, color: "var(--cream-2)", lineHeight: 1.7 }}>{(project as any)[k]}</div>
          </div>
        ))}
      </div>
    );
  if (f.includes("images") && project.images?.length) parts.push(<Gallery key="gal" images={project.images} />);
  if (f.includes("video_url") && project.video_url)
    parts.push(<div key="vid" style={{ borderRadius: 2, overflow: "hidden", aspectRatio: "16/9", background: "#111" }}>
      <iframe src={toEmbed(project.video_url)} style={{ width: "100%", height: "100%" }} allowFullScreen title="Video" />
    </div>);
  if (f.includes("walkthrough_url") && project.walkthrough_url)
    parts.push(<div key="wt" style={{ borderRadius: 2, overflow: "hidden", height: 450, background: "#111" }}>
      <iframe src={project.walkthrough_url} style={{ width: "100%", height: "100%" }} allowFullScreen title="Tour" />
    </div>);
  if (f.includes("amenities") && project.amenities?.length)
    parts.push(<div key="am" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {project.amenities.map((a, i) => <span key={i} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 2, background: "var(--gold-dim)", color: "var(--gold-lt)", border: "1px solid var(--border-gold)" }}>✓ {a}</span>)}
    </div>);
  if (f.includes("lat") && project.lat && project.lng)
    parts.push(<div key="map" style={{ borderRadius: 2, overflow: "hidden", height: 350 }}>
      <iframe src={`https://maps.google.com/maps?q=${project.lat},${project.lng}&z=15&output=embed`} style={{ width: "100%", height: "100%", border: 0 }} loading="lazy" title="Map" />
    </div>);
  if (!parts.length) return null;
  return (
    <section style={{ padding: "2.5rem", borderBottom: "1px solid var(--border-gold)" }}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 400, color: "var(--cream)", marginBottom: "1.6rem" }}>{s.label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>{parts}</div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function NileValleyDetailPage() {
  const params = useParams();
  const slug   = (params?.id as string) || "nile-valley";

  const [project,    setProject]    = useState<Project | null>(null);
  const [towers,     setTowers]     = useState<Tower[]>([]);
  const [units,      setUnits]      = useState<ApiUnit[]>([]);
  const [sections,   setSections]   = useState<Section[]>([]);
  const [floorPlans, setFloorPlans] = useState<string[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState<string | null>(null);
  const [showForms,  setShowForms]  = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const list = await fetch(`${API}/projects?limit=50`).then(r => r.json()).catch(() => ({ items: [] }));
      const proj = (list.items || []).find((p: any) => p.slug === slug || p.id === slug);
      if (!proj) { setLoading(false); return; }

      const [fp, tr, sr] = await Promise.all([
        fetch(`${API}/projects/${proj.id}`).then(r => r.json()),
        fetch(`${API}/projects/${proj.id}/towers`).then(r => r.json()).catch(() => ({ items: [] })),
        fetch(`${API}/admin/sections/public/project`).then(r => r.json()).catch(() => []),
      ]);

      setProject(fp);
      const tList: Tower[] = tr.items || [];
      setTowers(tList);
      setSections(Array.isArray(sr) ? sr : (sr?.sections || []));

      const merged = [
        ...(fp.floor_plans || []),
        ...tList.flatMap((t: Tower) => t.floor_plans || []),
      ];
      setFloorPlans([...new Set(merged)]);

      const ur = await Promise.all(
        tList.map((t: Tower) => fetch(`${API}/units?tower_id=${t.id}&limit=200`).then(r => r.json()).catch(() => ({ items: [] })))
      );

      // Attach tower_id to each unit so UnitSelector can resolve images
      const allUnits: ApiUnit[] = ur.flatMap((r: any, idx: number) =>
        (r.items || []).map((u: ApiUnit) => ({
          ...u,
          tower_id: u.tower_id || tList[idx]?.id,
        }))
      );
      setUnits(allUnits);
      setLoading(false);
    })();
  }, [slug]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 4000); }
  function scrollToEnquire() { setShowForms(true); setTimeout(() => document.getElementById("enquire")?.scrollIntoView({ behavior: "smooth" }), 100); }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E0C08" }}>
      <div className="pd-spin" />
    </div>
  );

  if (!project) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E0C08" }}>
      <p style={{ color: "#8A7D60", fontFamily: "Jost,sans-serif" }}>Project not found.</p>
    </div>
  );

  const availUnits = units.filter(u => mapStatus(u.status) === "available");
  const soldUnits  = units.filter(u => mapStatus(u.status) === "booked" || mapStatus(u.status) === "sold");
  const prices     = units.map(getUnitPrice).filter(p => p > 0);
  const minP       = prices.length ? Math.min(...prices) : 0;
  const maxP       = prices.length ? Math.max(...prices) : 0;
  const syncTime   = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const totalUnits = project.total_units || units.length;
  const soldPct    = totalUnits > 0 ? Math.round((soldUnits.length / totalUnits) * 100) : 0;

  const launchStr = project.launch_date
    ? new Date(project.launch_date).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "—";
  const possStr   = project.possession_date
    ? new Date(project.possession_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : "Dec 2028";

  return (
    <div className="pd">
      <style>{STYLES}</style>

      {/* ══ NAVBAR ══ */}
      <nav className="pd-nav">
        <Link href="/" className="pd-nav-logo">
          <img src="/logo-dark.png" alt="Janapriya Upscale" className="h-10 w-auto transition-all duration-300"/>
        </Link>
        <div className="pd-bc">
          <Link href="/">Home</Link>
          <span className="pd-bc-sep">›</span>
          <Link href="/projects">Projects</Link>
          <span className="pd-bc-sep">›</span>
          <span className="pd-bc-cur">{project.name}</span>
        </div>
        <button className="pd-nav-cta" onClick={scrollToEnquire}>Enquire Now</button>
      </nav>

      {/* ══ HERO ══ */}
      <div className="pd-hero">
        <div className="pd-hero-left">
          <div className="pd-eyebrow">
            {[project.city?.toUpperCase(), project.location?.toUpperCase()].filter(Boolean).join(" · ")}
          </div>
          <div className="pd-title"><em>{project.name}</em></div>
          <div className="pd-sub">
            {project.configuration || "Luxury 2 & 3 BHK Residences"}
            {project.total_floors ? ` · G+${project.total_floors} Towers` : " · G+9 Towers"}
            {project.rera_number ? " · RERA Registered" : ""}
          </div>

          {project.images?.length ? (
            <Gallery images={project.images} />
          ) : (
            <div className="pd-img-wrap">
              <div className="pd-fp-grid" />
              <div className="pd-fp-tag">Tower A — Floor Plan View</div>
              <svg width="320" height="160" viewBox="0 0 320 160" style={{ position: "relative", zIndex: 1, opacity: 0.5 }}>
                <rect x="20" y="20" width="80" height="120" fill="none" stroke="#C49A3C" strokeWidth="1"/>
                <rect x="30" y="30" width="25" height="35" fill="none" stroke="#C49A3C" strokeWidth="0.5"/>
                <rect x="60" y="30" width="30" height="35" fill="none" stroke="#C49A3C" strokeWidth="0.5"/>
                <rect x="30" y="75" width="60" height="20" fill="none" stroke="#C49A3C" strokeWidth="0.5"/>
                <rect x="115" y="20" width="90" height="120" fill="none" stroke="#4A84D4" strokeWidth="1"/>
                <rect x="125" y="30" width="30" height="40" fill="none" stroke="#4A84D4" strokeWidth="0.5"/>
                <rect x="162" y="30" width="33" height="40" fill="none" stroke="#4A84D4" strokeWidth="0.5"/>
                <rect x="125" y="78" width="70" height="22" fill="none" stroke="#4A84D4" strokeWidth="0.5"/>
                <rect x="220" y="20" width="80" height="120" fill="none" stroke="#C49A3C" strokeWidth="1" strokeDasharray="4,2"/>
                <text x="60"  y="86" textAnchor="middle" fontSize="9" fill="#C49A3C" fontFamily="Jost,sans-serif" letterSpacing="1">3 BHK</text>
                <text x="160" y="90" textAnchor="middle" fontSize="9" fill="#4A84D4" fontFamily="Jost,sans-serif" letterSpacing="1">3 BHK+</text>
                <text x="260" y="86" textAnchor="middle" fontSize="9" fill="#8A7D60" fontFamily="Jost,sans-serif" letterSpacing="1">4 BHK</text>
              </svg>
            </div>
          )}

          <div className="pd-specs">
            <div className="pd-spec">
              <div className="pd-spec-val">{project.total_floors ? `G+${project.total_floors}` : "G+9"}</div>
              <div className="pd-spec-label">Floors</div>
            </div>
            <div className="pd-spec">
              <div className="pd-spec-val">2, 3</div>
              <div className="pd-spec-label">BHK Types</div>
            </div>
            <div className="pd-spec">
              <div className="pd-spec-val">980<span>–</span>1635</div>
              <div className="pd-spec-label">Sq ft range</div>
            </div>
            <div className="pd-spec">
              <div className="pd-spec-val">{project.possession_date ? new Date(project.possession_date).getFullYear() : "Ready To Move"}</div>
              <div className="pd-spec-label">Possession</div>
            </div>
          </div>
        </div>

        <div className="pd-hr">
          {minP > 0 && (
            <div className="pd-hr-sec">
              <div className="pd-hr-label">Starting Price</div>
              <div className="pd-price-big">{fmtCr(minP)}<em> – {fmtCr(maxP)}</em></div>
              <div className="pd-price-note">Allotment · GST extra as applicable</div>
            </div>
          )}

          <div className="pd-hr-sec">
            <div className="pd-hr-label">Live Availability</div>
            <div className="pd-avail-num">{availUnits.length}</div>
            <div className="pd-avail-sub">units available across all floors</div>
            <div className="pd-live"><span className="pd-ldot" />Live from Salesforce · {syncTime} today</div>
          </div>

          <div className="pd-hr-sec">
            <div className="pd-hr-label">Project Details</div>
            <div className="pd-proj-box">
              {project.rera_number && (
                <div className="pd-proj-row"><span className="pd-proj-key">RERA No.</span><span className="pd-proj-val">{project.rera_number}</span></div>
              )}
              <div className="pd-proj-row"><span className="pd-proj-key">Launch</span>    <span className="pd-proj-val">{launchStr}</span></div>
              <div className="pd-proj-row"><span className="pd-proj-key">Possession</span><span className="pd-proj-val">{possStr}</span></div>
              <div className="pd-proj-row"><span className="pd-proj-key">Total units</span><span className="pd-proj-val">{totalUnits || "—"}</span></div>
              {soldUnits.length > 0 && (
                <div className="pd-proj-row">
                  <span className="pd-proj-key">Sold</span>
                  <span className="pd-proj-val">{soldUnits.length}{soldPct > 0 ? ` (${soldPct}%)` : ""}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pd-hero-btns">
            <button className="pd-btn-gold" onClick={scrollToEnquire}>Book a Site Visit</button>
            {project.brochure_url
              ? <a href={mUrl(project.brochure_url)} target="_blank" rel="noopener noreferrer" className="pd-btn-sap">Download Brochure</a>
              : <button className="pd-btn-sap" onClick={() => showToast("Brochure available on request.")}>Download Brochure</button>
            }
          </div>
        </div>
      </div>

      {/* Dynamic fields */}
      {project.id && (
        <div style={{ display: "none" }}>
          <DynamicFields entity="project" entityId={project.id} entityData={project} />
        </div>
      )}

      {/* ══ UNIT SELECTOR — now receives towers for image resolution ══ */}
      <UnitSelector
        units={units}
        towers={towers}
        slug={slug}
        projectName={project.name}
        onExpressInterest={scrollToEnquire}
        projectImages={project.images}
      />

      {/* ══ FLOOR PLANS + AMENITIES ══ */}
      <FloorPlanSection
        plans={floorPlans}
        brochureUrl={project.brochure_url}
        amenities={project.amenities}
      />

      {/* ══ PAYMENT PLAN ══ */}
      <div className="pd-pay">
        <div className="pd-sec-head">
          <div className="pd-sec-title">Payment <em>Plan</em></div>
          <span className="pd-sec-note">Construction-linked plan · Total 100%</span>
        </div>
        <div className="pd-pay-grid">
          {PAYMENT_STEPS.map(s => (
            <div key={s.num + s.label} className={`pd-pay-step${s.active ? " hi" : ""}`}>
              <div className="pd-pay-num">{s.num}</div>
              <div className="pd-pay-lbl">{s.label}</div>
              <div className="pd-pay-ms">{s.milestone}</div>
              <div className="pd-pay-wh">{s.when}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ CONSTRUCTION PROGRESS ══ */}
      <div className="pd-con">
        <div className="pd-sec-head">
          <div className="pd-sec-title">Construction <em>Progress</em></div>
          <div className="pd-live" style={{ fontSize: 10 }}><span className="pd-ldot" />Updated from Salesforce</div>
        </div>
        <div className="pd-prog-rows">
          {CONSTRUCTION_ITEMS.map(item => (
            <div key={item.label} className="pd-prog-row">
              <span className="pd-prog-lbl">{item.label}</span>
              <div className="pd-prog-track">
                <div className={`pd-prog-fill${item.color === "sapphire" ? " pd-prog-fill-b" : ""}`} style={{ width: `${item.pct}%` }} />
              </div>
              <span className={`pd-prog-pct${item.color === "sapphire" ? " pd-prog-pct-b" : ""}`}>{item.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ CONTACT STRIP ══ */}
      <div className="pd-cs">
        <div>
          <div className="pd-cs-title">Reserve Your <em>Unit</em></div>
          <div className="pd-cs-sub">Fill in your details and our advisor will call you within 2 hours. Your enquiry syncs directly to Salesforce.</div>
          <div className="pd-live" style={{ marginTop: 12 }}><span className="pd-ldot" />CRM sync on submit</div>
        </div>
        <InlineContactForm projectName={project.name} />
        <div className="pd-ci-list">
          <div className="pd-ci">
            <div className="pd-ci-lbl">Sales office</div>
            <div className="pd-ci-val">{project.address || "Kokapet Site Office, Financial District, Hyd"}</div>
          </div>
          <div className="pd-ci">
            <div className="pd-ci-lbl">Sales hotline</div>
            <div className="pd-ci-val"><a href="tel:+914045678900">+91 40 4567 8900</a></div>
          </div>
          <div className="pd-ci">
            <div className="pd-ci-lbl">Office hours</div>
            <div className="pd-ci-val">Mon – Sun · 9:00 AM – 7:00 PM</div>
          </div>
        </div>
      </div>

      {/* ══ OTP-VERIFIED FORMS ══ */}
      {showForms && <ProjectFormsSection projectName={project.name} />}

      {/* ══ FOOTER ══ */}
      <footer className="pd-footer">
        <Link href="/" className="pd-footer-logo">
          <img src="/logo-dark.png" alt="Janapriya Upscale" className="h-10 w-auto transition-all duration-300"/>
        </Link>
        <div className="pd-footer-copy">
          © 2026 Janapriya Engineers Syndicate Pvt. Ltd.{project.rera_number ? ` · RERA ${project.rera_number}` : ""} · Hyderabad
        </div>
      </footer>

      {/* ══ AI ASSISTANT ══ */}
      <ProactiveAssistant
        pageContext={{ page: "project", project_id: project.id, project_slug: project.slug, project_name: project.name }}
      />

      {toast && <div className="pd-toast">{toast}</div>}
    </div>
  );
}