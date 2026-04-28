"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://173.168.0.81/api/v1";
const SF_BASE = process.env.NEXT_PUBLIC_SF_BASE_URL || "https://your-instance.lightning.force.com";
const SF_OBJECT = process.env.NEXT_PUBLIC_SF_OBJECT || "Project__c";

/* ═══════════════════════════════════════════════════════════
   STYLES — zero changes from original
═══════════════════════════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Jost:wght@300;400;500&display=swap');

.jl-root *{box-sizing:border-box;margin:0;padding:0}
.jl-root{
  font-family:'Jost',sans-serif;
  margin-left:22rem;
  margin-right:22rem;
  background:#0E0C08;
  color:#F0E8D4;
  line-height:1.5;
  min-height:100vh;
  --ink:#0E0C08;
  --deep:#13100A;
  --surface:#1C1710;
  --card:#221D13;
  --gold:#C49A3C;
  --gold-lt:#E2C47A;
  --gold-dk:#8A6820;
  --gold-dim:rgba(196,154,60,0.18);
  --sapphire-lt:#4A84D4;
  --sapphire-dim:rgba(42,95,165,0.18);
  --crimson:#9B2335;
  --crimson-dim:rgba(155,35,53,0.15);
  --cream:#F0E8D4;
  --cream-2:#D4C8A8;
  --muted:#8A7D60;
  --border-gold:rgba(196,154,60,0.22);
}

/* ══════════════════════════
   NAVBAR
══════════════════════════ */
.jl-nav{
  margin-left:22rem;
  margin-right:22rem;
  position:fixed;top:0;left:0;right:0;z-index:200;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 2.5rem;height:56px;
  background:var(--deep);
  border-bottom:1px solid var(--border-gold);
}
.jl-nav-logo{
  font-family:'Playfair Display',serif;
  font-size:18px;font-weight:400;
  color:var(--gold-lt);letter-spacing:0.04em;
  text-decoration:none;display:flex;flex-direction:column;line-height:1.15;
}
.jl-nav-logo span:first-child{font-weight:500;font-size:15px;letter-spacing:0.06em}
.jl-nav-logo span:last-child{font-style:italic;color:var(--gold);font-size:14px}
.jl-nav-links{display:flex;gap:2.2rem;align-items:center}
.jl-nav-links a{
  font-size:11px;font-weight:400;letter-spacing:0.14em;text-transform:uppercase;
  color:var(--muted);text-decoration:none;transition:color 0.2s;
}
.jl-nav-links a:hover{color:var(--gold-lt)}
.jl-nav-cta{
  background:var(--gold);color:var(--ink);
  font-family:'Jost',sans-serif;font-size:11px;font-weight:500;
  letter-spacing:0.12em;text-transform:uppercase;
  padding:8px 20px;border:none;cursor:pointer;border-radius:2px;
  transition:background 0.2s;text-decoration:none;display:inline-block;
}
.jl-nav-cta:hover{background:var(--gold-lt)}

/* ══════════════════════════
   HERO
══════════════════════════ */
.jl-hero{
  display:grid;grid-template-columns:1fr 280px;
  min-height:auto;padding-top:56px;
  border-bottom:1px solid var(--border-gold);
}
.jl-hero-left{
  padding:4rem 3rem;
  display:flex;flex-direction:column;justify-content:space-between;
  border-right:1px solid var(--border-gold);
}
.jl-eyebrow{
  display:inline-flex;align-items:center;gap:10px;
  font-size:10px;font-weight:400;letter-spacing:0.22em;text-transform:uppercase;
  color:var(--sapphire-lt);margin-bottom:2rem;
}
.jl-eyebrow-line{width:28px;height:1px;background:var(--sapphire-lt);display:block;flex-shrink:0}
.jl-hero-left h1{
  font-family:'Playfair Display',serif;
  font-size:clamp(42px,5.5vw,64px);font-weight:400;line-height:1.08;
  color:var(--cream);margin-bottom:1.8rem;
}
.jl-hero-left h1 em{font-style:italic;color:var(--gold)}
.jl-hero-body{
  font-size:14px;font-weight:300;color:var(--muted);
  max-width:420px;line-height:1.85;margin-bottom:2.5rem;
}
.jl-hero-btns{
  display:grid;grid-template-columns:1fr 1fr;
  border-top:1px solid var(--border-gold);
  border-bottom:1px solid var(--border-gold);
}
.jl-btn-left{
  background:transparent;color:rgba(196,154,60,0.5);
  font-family:'Jost',sans-serif;font-size:10px;font-weight:500;
  letter-spacing:0.2em;text-transform:uppercase;
  padding:18px 20px;border:none;border-right:1px solid var(--border-gold);
  cursor:pointer;text-align:center;transition:color 0.2s;
}
.jl-btn-right{
  background:transparent;color:rgba(196,154,60,0.5);
  font-family:'Jost',sans-serif;font-size:10px;font-weight:500;
  letter-spacing:0.2em;text-transform:uppercase;
  padding:18px 20px;border:none;cursor:pointer;text-align:center;transition:color 0.2s;
}
.jl-btn-left:hover,.jl-btn-right:hover{color:var(--gold)}

.jl-hero-counters{
  display:grid;grid-template-columns:repeat(4,1fr);
  border-top:1px solid var(--border-gold);padding-top:2rem;
}
.jl-counter{padding-right:1.5rem}
.jl-counter:not(:last-child){border-right:1px solid var(--border-gold)}
.jl-counter+.jl-counter{padding-left:1.5rem;padding-right:0}
.jl-counter-num{
  font-family:'Playfair Display',serif;
  font-size:32px;font-weight:400;color:var(--gold);line-height:1;
}
.jl-counter-num.sap{color:var(--sapphire-lt)}
.jl-counter-label{
  font-size:9px;font-weight:400;letter-spacing:0.12em;text-transform:uppercase;
  color:var(--muted);margin-top:6px;
}

/* Hero right panel */
.jl-hero-right{display:flex;flex-direction:column;background:var(--surface)}
.jl-sf-header{
  padding:1rem 1.4rem;border-bottom:1px solid var(--border-gold);
  font-size:9px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);
}
.jl-inv-rows{display:flex;flex-direction:column;flex:1}
.jl-inv-row{
  padding:1.3rem 1.4rem;border-bottom:1px solid var(--border-gold);
  cursor:pointer;transition:background 0.15s;
  display:block;text-decoration:none;color:inherit;
}
.jl-inv-row:hover{background:rgba(196,154,60,0.06)}
.jl-inv-name{
  font-family:'Playfair Display',serif;font-size:15px;font-weight:400;
  color:var(--cream);margin-bottom:4px;
}
.jl-inv-loc{font-size:10px;color:var(--muted);letter-spacing:0.04em}
.jl-sf-footer{padding:10px 1.4rem;border-top:1px solid var(--border-gold);margin-top:auto}
.jl-sf-time{font-size:10px;color:var(--muted)}

/* ══════════════════════════
   TICKER
══════════════════════════ */
.jl-ticker{
  background:var(--gold);padding:9px 2.5rem;
  display:flex;gap:2.5rem;overflow:hidden;align-items:center;
}
.jl-ticker-tag{font-size:9px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink);opacity:0.6;white-space:nowrap}
.jl-ticker-div{color:rgba(14,12,8,0.3);font-size:11px}
.jl-ticker-item{font-size:11px;font-weight:400;color:var(--ink);white-space:nowrap}
.jl-ticker-badge{
  font-size:9px;font-weight:500;background:rgba(14,12,8,0.15);color:var(--ink);
  padding:2px 7px;border-radius:2px;letter-spacing:0.08em;margin-left:6px;
}

/* ══════════════════════════
   METRICS
══════════════════════════ */
.jl-metrics{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--border-gold)}
.jl-metric{padding:2rem 2.5rem;border-right:1px solid var(--border-gold)}
.jl-metric:last-child{border-right:none}
.jl-metric-val{
  font-family:'Playfair Display',serif;font-size:38px;font-weight:400;
  color:var(--cream);line-height:1;margin-bottom:5px;
}
.jl-metric-val .sm{font-size:20px;color:var(--muted)}
.jl-metric-label{font-size:11px;font-weight:300;color:var(--muted);letter-spacing:0.06em;margin-bottom:6px}
.jl-delta{
  display:inline-flex;align-items:center;gap:4px;
  font-size:10px;font-weight:400;padding:3px 8px;border-radius:2px;letter-spacing:0.04em;
}
.jl-delta-gold{background:var(--gold-dim);color:var(--gold-lt)}
.jl-delta-sap{background:var(--sapphire-dim);color:var(--sapphire-lt)}

/* ══════════════════════════
   PROJECTS
══════════════════════════ */
.jl-projects{padding:3rem 2.5rem;border-bottom:1px solid var(--border-gold)}
.jl-sec-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem}
.jl-sec-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;color:var(--cream)}
.jl-sec-title em{font-style:italic;color:var(--gold)}
.jl-sec-link{
  font-size:10px;letter-spacing:0.14em;text-transform:uppercase;
  color:var(--sapphire-lt);cursor:pointer;border-bottom:1px solid rgba(74,132,212,0.3);
  text-decoration:none;
}
.jl-proj-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--border-gold)}
.jl-proj-card{
  background:var(--surface);padding:1.6rem;
  cursor:pointer;transition:background 0.2s;
  display:block;text-decoration:none;color:inherit;
}
.jl-proj-card:hover{background:var(--card)}
.jl-proj-bar{height:2px;margin-bottom:1.4rem}
.jl-bar-g{background:var(--gold)}
.jl-bar-s{background:var(--sapphire-lt)}
.jl-bar-r{background:var(--crimson)}
.jl-bar-m{background:var(--gold-dk)}
.jl-proj-name{font-family:'Playfair Display',serif;font-size:17px;font-weight:400;color:var(--cream);margin-bottom:3px}
.jl-proj-loc{font-size:10px;color:var(--muted);letter-spacing:0.06em;margin-bottom:1.2rem}
.jl-proj-detail{font-size:11px;color:var(--muted);margin-bottom:3px}
.jl-proj-detail strong{color:var(--cream-2);font-weight:400}
.jl-proj-big{font-family:'Playfair Display',serif;font-size:32px;font-weight:400;margin-top:1.2rem;margin-bottom:2px}
.jl-proj-big-label{font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted)}
.jl-proj-pill{
  display:inline-block;font-size:9px;font-weight:400;letter-spacing:0.1em;
  text-transform:uppercase;padding:3px 9px;border-radius:2px;margin-top:10px;
}
.jl-pill-gold{background:var(--gold-dim);color:var(--gold-lt)}
.jl-pill-sap{background:var(--sapphire-dim);color:var(--sapphire-lt)}
.jl-pill-crimson{background:var(--crimson-dim);color:#D4607A}
.jl-pill-muted{background:rgba(138,125,96,0.15);color:var(--muted)}

/* ══════════════════════════
   AVAILABILITY
══════════════════════════ */
.jl-avail{padding:2.5rem;border-bottom:1px solid var(--border-gold)}
.jl-avail-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.8rem}
.jl-avail-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:400;color:var(--cream)}
.jl-avail-title em{font-style:italic;color:var(--gold)}
.jl-live-dot{
  width:6px;height:6px;border-radius:50%;background:var(--sapphire-lt);
  animation:jlPulse 2s infinite;display:inline-block;flex-shrink:0;
}
@keyframes jlPulse{0%,100%{opacity:1}50%{opacity:0.3}}
.jl-sf-sync{display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--sapphire-lt)}

/* Stacked filters */
.jl-filters{display:flex;flex-direction:column;gap:10px;margin-bottom:2rem}
.jl-filters select{
  font-family:'Jost',sans-serif;font-size:15px;font-weight:300;
  color:var(--cream);background:transparent;
  border:1px solid rgba(196,154,60,0.35);border-radius:6px;
  padding:14px 20px;width:100%;cursor:pointer;appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7'%3E%3Cpath d='M0 0l6 7 6-7z' fill='%238A7D60'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 18px center;
  outline:none;transition:border-color 0.2s;
}
.jl-filters select:focus{border-color:rgba(196,154,60,0.7)}
.jl-filters select option{background:#221D13;font-size:13px}

/* Table */
.jl-table{width:100%;border-collapse:collapse;table-layout:fixed}
.jl-table th{
  font-size:10px;font-weight:400;letter-spacing:0.14em;text-transform:uppercase;
  color:var(--muted);padding:10px 12px;text-align:left;
  border-bottom:1px solid var(--border-gold);
}
.jl-table td{
  font-size:13px;color:var(--cream);
  padding:14px 12px;
  border-bottom:1px solid rgba(196,154,60,0.08);
}
.jl-table tr:hover td{background:rgba(196,154,60,0.03)}
.jl-unit-id{font-family:'Playfair Display',serif;font-size:14px;font-weight:400;color:var(--gold)}
.jl-spill{display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:4px 12px;border-radius:4px;font-weight:400}
.jl-spill-avail{background:rgba(196,154,60,0.2);color:var(--gold-lt);border:1px solid rgba(196,154,60,0.3)}
.jl-spill-hold{background:rgba(42,95,165,0.25);color:var(--sapphire-lt);border:1px solid rgba(42,95,165,0.35)}
.jl-spill-sold{background:rgba(155,35,53,0.25);color:#D4607A;border:1px solid rgba(155,35,53,0.35)}
.jl-spill-reserved{background:rgba(138,104,32,0.25);color:var(--gold-lt);border:1px solid rgba(138,104,32,0.35)}
.jl-sdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;display:inline-block}
.jl-sd-g{background:var(--gold)}
.jl-sd-s{background:var(--sapphire-lt)}
.jl-sd-r{background:var(--crimson)}
.jl-sd-y{background:var(--gold-dk)}

/* Skeleton shimmer */
.jl-skel{background:var(--surface);border-radius:2px;animation:jlSkel 1.4s ease infinite alternate}
@keyframes jlSkel{from{opacity:0.4}to{opacity:0.8}}

/* ══════════════════════════
   FOOTER
══════════════════════════ */
.jl-footer{
  background:var(--deep);border-top:1px solid var(--border-gold);
  padding:1.8rem 2.5rem;
  display:flex;justify-content:space-between;align-items:center;
}
.jl-footer-logo{
  font-family:'Playfair Display',serif;font-size:16px;font-weight:400;
  color:var(--gold-lt);text-decoration:none;display:flex;flex-direction:column;line-height:1.2;
}
.jl-footer-logo span:first-child{font-size:14px;letter-spacing:0.04em}
.jl-footer-logo span:last-child{font-style:italic;color:var(--gold);font-size:13px}
.jl-footer-mid{display:flex;gap:2rem;flex-wrap:wrap}
.jl-footer-mid a{
  font-size:10px;letter-spacing:0.12em;text-transform:uppercase;
  color:var(--muted);text-decoration:none;cursor:pointer;transition:color 0.2s;
}
.jl-footer-mid a:hover{color:var(--gold-lt)}
.jl-footer-right{font-size:10px;color:rgba(138,125,96,0.45);letter-spacing:0.04em;text-align:right;line-height:1.6}

/* ══════════════════════════
   RESPONSIVE
══════════════════════════ */
@media(max-width:960px){
  .jl-hero{grid-template-columns:1fr}
  .jl-hero-right{display:none}
  .jl-proj-grid{grid-template-columns:repeat(2,1fr)}
  .jl-metrics{grid-template-columns:repeat(2,1fr)}
  .jl-footer{flex-direction:column;gap:1.5rem;text-align:center}
  .jl-footer-right{text-align:center}
}
@media(max-width:560px){
  .jl-proj-grid{grid-template-columns:1fr}
  .jl-hero-counters{grid-template-columns:repeat(2,1fr)}
  .jl-hero-left{padding:2.5rem 1.5rem}
  .jl-hero-left h1{font-size:36px}
  .jl-nav{padding:0 1.2rem}
  .jl-nav-links{gap:1rem}
}
`;

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function formatPrice(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(0)} L`;
  return `₹${n.toLocaleString()}`;
}

function getPrice(unit: any): number {
  const ta = unit.custom_fields?.total_amount;
  if (ta && parseFloat(ta) > 0) return parseFloat(ta);
  return unit.base_price ? parseFloat(unit.base_price) : 0;
}

function statusSpill(status: string): { cls: string; dot: string } {
  const s = (status || "").toLowerCase();
  if (s === "available") return { cls: "jl-spill-avail", dot: "jl-sd-g" };
  if (s === "booked" || s === "sold") return { cls: "jl-spill-sold", dot: "jl-sd-r" };
  if (s === "reserved") return { cls: "jl-spill-reserved", dot: "jl-sd-y" };
  return { cls: "jl-spill-hold", dot: "jl-sd-s" };
}

/**
 * Slug map — add an entry whenever a project gets its own internal page.
 * Key: project name (case-insensitive, trimmed). Value: Next.js route.
 */
const PROJECT_SLUG_MAP: Record<string, string> = {
  "first light": "/projects/first-light",
  // "peninsula heights": "/projects/peninsula-heights",  ← add more here
};

/** Resolve a project's URL: internal page > API slug > Salesforce record. */
function resolveProjectUrl(p: any): { href: string; internal: boolean } {
  // 1. Name-based slug map (takes priority)
  const nameKey = (p.name || "").toLowerCase().trim();
  if (PROJECT_SLUG_MAP[nameKey]) {
    return { href: PROJECT_SLUG_MAP[nameKey], internal: true };
  }
  // 2. API-provided slug field
  if (p.slug) {
    return { href: `/projects/${p.slug}`, internal: true };
  }
  // 3. API-provided explicit URLs
  if (p.internal_url) return { href: p.internal_url, internal: true };
  if (p.sf_url)        return { href: p.sf_url,       internal: false };
  if (p.salesforce_url) return { href: p.salesforce_url, internal: false };
  // 4. Construct Salesforce URL from ID
  return {
    href: `${SF_BASE}/lightning/r/${SF_OBJECT}/${p.id}/view`,
    internal: false,
  };
}

/** Renders an internal <Link> or an external <a> depending on the project URL. */
function ProjectLink({
  project,
  className,
  children,
}: {
  project: any;
  className?: string;
  children: React.ReactNode;
}) {
  const { href, internal } = resolveProjectUrl(project);
  if (internal) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

// Per-project accent colours (cycles if >4 projects)
const BAR_CLASSES  = ["jl-bar-g", "jl-bar-s", "jl-bar-r", "jl-bar-m"];
const BIG_COLORS   = ["var(--gold)", "var(--sapphire-lt)", "#D4607A", "var(--gold-dk)"];
const PILL_CLASSES = ["jl-pill-gold", "jl-pill-sap", "jl-pill-crimson", "jl-pill-muted"];

function pillText(avail: number, total: number): string {
  const pct = total > 0 ? (avail / total) * 100 : 0;
  if (avail === 0) return "Up Coming Projects";
  if (pct <= 20)   return "Very limited";
  if (pct <= 50)   return "Selling fast";
  return "Available now";
}

/* ══════════════════════════
   NAVBAR
══════════════════════════ */
function JlNavbar() {
  return (
    <nav className="jl-nav">
      <Link href="/" className="jl-nav-logo">
        {/* FIX: className instead of class */}
        <img src="/logo-dark.png" alt="Janapriya Upscale" className="h-10 w-auto transition-all duration-300" />
      </Link>
      <div className="jl-nav-links">
        <Link href="#">Projects</Link>
        <Link href="#">Availability</Link>
        <Link href="#">Gallery</Link>
        <Link href="#">About</Link>
      </div>
    </nav>
  );
}

/* ══════════════════════════
   HERO — counters + inventory panel from API
══════════════════════════ */
function Hero({ stats, projects }: {
  stats: { yearsLegacy: number; liveProjects: number; unitsDelivered: string; availableNow: number };
  projects: any[];
}) {
  const now = new Date();
  const syncDate = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const syncTime = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="jl-hero">
      <div className="jl-hero-left">
        <div>
          <div className="jl-eyebrow">
            <span className="jl-eyebrow-line" />
            Hyderabad · Premium Residences
          </div>
          <h1>
            Where Every<br />
            Detail Is <em>Crafted</em><br />
            for You
          </h1>
          <p className="jl-hero-body">
            Four landmark projects across Hyderabad — designed for the discerning few.
            Live availability and pricing drawn in real time from Salesforce.
          </p>
        </div>

        {/* Counters — dynamic */}
        <div className="jl-hero-counters">
          <div className="jl-counter">
            <div className="jl-counter-num">{stats.yearsLegacy}</div>
            <div className="jl-counter-label">Years<br />Legacy</div>
          </div>
          <div className="jl-counter">
            <div className="jl-counter-num">{stats.liveProjects}</div>
            <div className="jl-counter-label">Live<br />Projects</div>
          </div>
          <div className="jl-counter">
            <div className="jl-counter-num">{stats.unitsDelivered}</div>
            <div className="jl-counter-label">Units<br />Delivered</div>
          </div>
          <div className="jl-counter">
            <div className="jl-counter-num sap">{stats.availableNow}</div>
            <div className="jl-counter-label">Available<br />Now</div>
          </div>
        </div>
      </div>

      {/* Right panel — dynamic project list with SF deep links */}
      <div className="jl-hero-right">
        <div className="jl-sf-header">Salesforce Live Inventory</div>
        <div className="jl-inv-rows">
          {projects.length === 0
            ? [1, 2, 3, 4].map(i => (
                <div key={i} className="jl-inv-row">
                  <div className="jl-skel" style={{ height: 16, width: "60%", marginBottom: 6 }} />
                  <div className="jl-skel" style={{ height: 11, width: "80%" }} />
                </div>
              ))
            : projects.map(p => (
                <ProjectLink key={p.id} project={p} className="jl-inv-row">
                  <div className="jl-inv-name">{p.name}</div>
                  <div className="jl-inv-loc">{p.location || p.address || "Hyderabad"}</div>
                </ProjectLink>
              ))
          }
        </div>
        <div className="jl-sf-footer">
          <span className="jl-sf-time">Last synced: {syncDate}, {syncTime}</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════
   TICKER — dynamic recent units
══════════════════════════ */
function Ticker({ units }: { units: any[] }) {
  const items = units.slice(0, 4);
  if (items.length === 0) return (
    <div className="jl-ticker">
      <span className="jl-ticker-tag">Live —</span>
      <span className="jl-ticker-div">|</span>
      <span className="jl-ticker-item">Loading live listings…</span>
    </div>
  );
  return (
    <div className="jl-ticker">
      <span className="jl-ticker-tag">Live —</span>
      {items.map((u, i) => (
        <span key={u.id} style={{ display: "contents" }}>
          {i > 0 && <span className="jl-ticker-div">|</span>}
          <span className="jl-ticker-item">
            {u.unit_number || u.name} · {u.unit_type || u.bhk_type || "Unit"} · {formatPrice(getPrice(u))}
            <span className="jl-ticker-badge">
              {(u.status || "").toLowerCase() === "available" ? "Available" : u.status || "Listed"}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}

/* ══════════════════════════
   METRICS — dynamic from API
══════════════════════════ */
function Metrics({ data }: {
  data: {
    bookingsAmount: string; bookingsDelta: string;
    availableUnits: number; projectCount: number;
    bookingsToday: number; reraCompliant: string;
  };
}) {
  return (
    <div className="jl-metrics">
      <div className="jl-metric">
        <div className="jl-metric-val">{data.bookingsAmount}<span className="sm"> Cr</span></div>
        <div className="jl-metric-label">Bookings this fiscal year</div>
        <div className="jl-delta jl-delta-gold">{data.bookingsDelta}</div>
      </div>
      <div className="jl-metric">
        <div className="jl-metric-val">{data.availableUnits}<span className="sm"> units</span></div>
        <div className="jl-metric-label">Available right now</div>
        <div className="jl-delta jl-delta-sap">Across {data.projectCount} projects</div>
      </div>
      <div className="jl-metric">
        <div className="jl-metric-val">{data.bookingsToday}<span className="sm"> today</span></div>
        <div className="jl-metric-label">Bookings received</div>
        <div className="jl-delta jl-delta-sap">Live from Salesforce</div>
      </div>
      <div className="jl-metric">
        <div className="jl-metric-val">{data.reraCompliant}<span className="sm">%</span></div>
        <div className="jl-metric-label">RERA compliant</div>
        <div className="jl-delta jl-delta-gold">All active projects</div>
      </div>
    </div>
  );
}

/* ══════════════════════════
   PROJECTS — dynamic from API, each card links to SF record
══════════════════════════ */
function Projects({ projects }: { projects: any[] }) {
  if (projects.length === 0) {
    return (
      <div className="jl-projects">
        <div className="jl-sec-head">
          <div className="jl-sec-title">Our <em>Projects</em></div>
          <Link href="#" className="jl-sec-link">View All →</Link>
        </div>
        <div className="jl-proj-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="jl-proj-card">
              <div className="jl-skel" style={{ height: 2, marginBottom: "1.4rem" }} />
              <div className="jl-skel" style={{ height: 18, width: "70%", marginBottom: 6 }} />
              <div className="jl-skel" style={{ height: 11, width: "90%", marginBottom: "1.2rem" }} />
              <div className="jl-skel" style={{ height: 11, width: "80%", marginBottom: 4 }} />
              <div className="jl-skel" style={{ height: 11, width: "75%", marginBottom: 4 }} />
              <div className="jl-skel" style={{ height: 11, width: "65%" }} />
              <div className="jl-skel" style={{ height: 36, width: 60, marginTop: "1.2rem", marginBottom: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="jl-projects">
      <div className="jl-sec-head">
        <div className="jl-sec-title">Our <em>Projects</em></div>
        <Link href="#" className="jl-sec-link">View All →</Link>
      </div>
      <div className="jl-proj-grid">
        {projects.map((p, idx) => {
          const avail   = p.available_units ?? p.available_count ?? 0;
          const total   = p.total_units ?? p.unit_count ?? 0;
          const barCls  = BAR_CLASSES[idx % BAR_CLASSES.length];
          const bigClr  = BIG_COLORS[idx % BIG_COLORS.length];
          const pillCls = PILL_CLASSES[idx % PILL_CLASSES.length];
          const pt      = pillText(avail, total);
          const bhk     = p.bhk_types || p.unit_types || p.configuration || "—";
          const area    = p.area_range || (p.min_area && p.max_area ? `${p.min_area} – ${p.max_area}` : p.area || "—");
          const price   = p.price_range || (p.min_price && p.max_price
            ? `${formatPrice(p.min_price)} – ${formatPrice(p.max_price)}`
            : p.base_price ? formatPrice(p.base_price) : "Price on request");
          const floors  = p.floors || p.total_floors || "";
          const areaStr = floors ? `sq ft · ${floors}` : "sq ft";

          return (
            /* Each project card links internally if a page exists, else opens SF record */
            <ProjectLink key={p.id} project={p} className="jl-proj-card">
              <div className={`jl-proj-bar ${barCls}`} />
              <div className="jl-proj-name">{p.name}</div>
              <div className="jl-proj-loc">{p.location || p.address || "Hyderabad"}</div>
              <div className="jl-proj-detail"><strong>{bhk}</strong> Apartments</div>
              <div className="jl-proj-detail"><strong>{area}</strong> {areaStr}</div>
              <div className="jl-proj-detail"><strong>{price}</strong> starting</div>
              <div className="jl-proj-big" style={{ color: bigClr }}>{avail}</div>
              <div className="jl-proj-big-label">{total > 0 ? `Units available of ${total}` : "Units available"}</div>
              <div className={`jl-proj-pill ${pillCls}`}>{pt}</div>
            </ProjectLink>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════
   AVAILABILITY — dynamic units table
══════════════════════════ */
function AvailSection({ units, projects }: { units: any[]; projects: any[] }) {
  const [filterProj,   setFilterProj]   = useState("All Projects");
  const [filterType,   setFilterType]   = useState("All Types");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [filterBudget, setFilterBudget] = useState("Any Budget");

  const unitTypes    = ["All Types", ...Array.from(new Set(units.map(u => u.unit_type || u.bhk_type).filter(Boolean)))];
  const projectNames = ["All Projects", ...projects.map(p => p.name)];

  const filtered = units.filter(u => {
    if (filterProj   !== "All Projects" && (u.project_name || "") !== filterProj) return false;
    if (filterType   !== "All Types"    && (u.unit_type || u.bhk_type || "") !== filterType) return false;
    if (filterStatus !== "All Status"   && (u.status || "").toLowerCase() !== filterStatus.toLowerCase()) return false;
    if (filterBudget !== "Any Budget") {
      const price = getPrice(u);
      if (filterBudget === "Under ₹1 Cr" && price >= 10000000) return false;
      if (filterBudget === "₹1–2 Cr"     && (price < 10000000 || price > 20000000)) return false;
      if (filterBudget === "Above ₹2 Cr" && price <= 20000000) return false;
    }
    return true;
  }).slice(0, 20);

  return (
    <div className="jl-avail">
      <div className="jl-avail-head">
        <div className="jl-avail-title">Live <em>Availability</em></div>
        <div className="jl-sf-sync">
          <span className="jl-live-dot" />
          Salesforce Sync
        </div>
      </div>

      <div className="jl-filters">
        <select value={filterProj}   onChange={e => setFilterProj(e.target.value)}>
          {projectNames.map(o => <option key={o}>{o}</option>)}
        </select>
        <select value={filterType}   onChange={e => setFilterType(e.target.value)}>
          {unitTypes.map(o => <option key={o}>{o}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          {["All Status", "available", "booked", "reserved"].map(o => <option key={o}>{o}</option>)}
        </select>
        <select value={filterBudget} onChange={e => setFilterBudget(e.target.value)}>
          {["Any Budget", "Under ₹1 Cr", "₹1–2 Cr", "Above ₹2 Cr"].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      <table className="jl-table">
        <thead>
          <tr>
            <th style={{ width: 90  }}>Unit</th>
            <th style={{ width: 110 }}>Project</th>
            <th style={{ width: 75  }}>Type</th>
            <th style={{ width: 55  }}>Floor</th>
            <th style={{ width: 100 }}>Area</th>
            <th style={{ width: 90  }}>Price</th>
            <th style={{ width: 120 }}>Status</th>
            <th style={{ width: 90  }}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0
            ? units.length === 0
              ? [1, 2, 3, 4, 5, 6].map(i => (
                  <tr key={i}>
                    {[90, 110, 75, 55, 100, 90, 120, 90].map((_, j) => (
                      <td key={j}><div className="jl-skel" style={{ height: 13, width: "80%" }} /></td>
                    ))}
                  </tr>
                ))
              : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>
                    No units match the selected filters
                  </td>
                </tr>
              )
            : filtered.map(u => {
                const { cls, dot } = statusSpill(u.status || "");
                const price     = getPrice(u);
                const updatedAt = u.updated_at
                  ? new Date(u.updated_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                  : "—";
                return (
                  <tr key={u.id}>
                    <td><span className="jl-unit-id">{u.unit_number || u.name || u.id}</span></td>
                    <td>{u.project_name || "—"}</td>
                    <td>{u.unit_type || u.bhk_type || "—"}</td>
                    <td>{u.floor_number ?? "G"}</td>
                    <td>{u.area_sqft ? `${parseFloat(u.area_sqft).toLocaleString()} sqft` : "—"}</td>
                    <td>{price > 0 ? formatPrice(price) : "—"}</td>
                    <td>
                      <span className={`jl-spill ${cls}`}>
                        <span className={`jl-sdot ${dot}`} />
                        {u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : "—"}
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{updatedAt}</td>
                  </tr>
                );
              })
          }
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════
   FOOTER
══════════════════════════ */
function JlFooter() {
  return (
    <footer className="jl-footer">
      <Link href="/" className="jl-footer-logo">
        {/* FIX: className instead of class */}
        <img src="/logo-dark.png" alt="Janapriya Upscale" className="h-10 w-auto transition-all duration-300" />
      </Link>
      <div className="jl-footer-mid">
        <Link href="#">Privacy Policy</Link>
        <Link href="#">RERA Details</Link>
        <Link href="#">Sitemap</Link>
        <Link href="#">Contact</Link>
      </div>
      <div className="jl-footer-right">
        <div>© 2026 Janapriya Engineers Syndicate Pvt. Ltd.</div>
        <div>RERA Reg. No. P02400003579 · Hyderabad, Telangana</div>
      </div>
    </footer>
  );
}

/* ══════════════════════════
   PAGE — data fetching
══════════════════════════ */
export default function JanapriyaHomePage() {
  const [projects,     setProjects]     = useState<any[]>([]);
  const [units,        setUnits]        = useState<any[]>([]);
  const [metrics,      setMetrics]      = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/projects`).then(r => r.json()).catch(() => []),
      fetch(`${API}/units?page_size=200`).then(r => r.json()).catch(() => []),
      fetch(`${API}/admin/cms/public/settings`).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/analytics/summary`).then(r => r.json()).catch(() => null),
    ]).then(([proj, unitsData, settings, analytics]) => {
      const projArr  = Array.isArray(proj)      ? proj      : (proj?.items      || proj?.results || []);
      const unitsArr = Array.isArray(unitsData) ? unitsData : (unitsData?.items || []);
      setProjects(projArr);
      setUnits(unitsArr);

      const available     = unitsArr.filter((u: any) => (u.status || "").toLowerCase() === "available").length;
      const today         = new Date();
      const todayBookings = unitsArr.filter((u: any) => {
        if ((u.status || "").toLowerCase() !== "booked") return false;
        const upd = u.updated_at ? new Date(u.updated_at) : null;
        return upd && upd.toDateString() === today.toDateString();
      }).length;

      const fiscalAmount   = analytics?.fiscal_bookings_amount
        ? (analytics.fiscal_bookings_amount / 10000000).toFixed(0)
        : settings?.fiscal_bookings_cr  || "52";
      const fiscalDelta    = analytics?.fiscal_delta || settings?.fiscal_delta       || "+18% vs last FY";
      const reraCompliant  = settings?.rera_compliant_pct || "98";
      const yearsLegacy    = parseInt(settings?.years_legacy   || "39");
      const unitsDelivered = settings?.units_delivered          || "847+";

      setMetrics({
        bookingsAmount: fiscalAmount,
        bookingsDelta:  fiscalDelta,
        availableUnits: available,
        projectCount:   projArr.length || 4,
        bookingsToday:  todayBookings,
        reraCompliant,
        yearsLegacy,
        unitsDelivered,
      });
    });
  }, []);

  const stats = {
    yearsLegacy:    metrics?.yearsLegacy    ?? 39,
    liveProjects:   projects.length         || 4,
    unitsDelivered: metrics?.unitsDelivered ?? "847+",
    availableNow:   metrics?.availableUnits ?? units.filter(u => (u.status || "").toLowerCase() === "available").length,
  };

  const metricsData = metrics ?? {
    bookingsAmount: "52",
    bookingsDelta:  "+18% vs last FY",
    availableUnits: stats.availableNow,
    projectCount:   stats.liveProjects,
    bookingsToday:  3,
    reraCompliant:  "98",
  };

  return (
    <div className="jl-root">
      <style>{STYLES}</style>
      <JlNavbar />
      <Hero     stats={stats}    projects={projects} />
      <Ticker   units={units} />
      <Metrics  data={metricsData} />
      <Projects projects={projects} />
      <AvailSection units={units} projects={projects} />
      <JlFooter />
    </div>
  );
}