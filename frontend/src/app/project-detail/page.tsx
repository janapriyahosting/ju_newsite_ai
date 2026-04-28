"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/* ─────────────────────────────────────────
   Page-level styles
───────────────────────────────────────── */
const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .el-page { font-family: 'DM Sans', sans-serif; color: #1a1a1a; background: #fff; }

  /* ── Hero ── */
  .el-hero {
    position: relative; width: 100%; height: 100vh; overflow: hidden;
  }
  .el-hero-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.6) 100%);
  }
  .el-hero-content {
    position: absolute; bottom: 100px; left: 60px; color: #fff;
  }
  .el-hero-eyebrow {
    font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase;
    color: #f0c84a; font-weight: 500; margin-bottom: 10px;
  }
  .el-hero-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(3rem, 7vw, 5.5rem); font-weight: 400;
    line-height: 1.05; margin: 0 0 6px 0;
  }
  .el-hero-title span { color: #f0c84a; font-style: italic; }
  .el-hero-sub {
    font-size: clamp(0.9rem, 1.5vw, 1.1rem); font-weight: 300;
    opacity: 0.9; margin: 0 0 28px 0;
  }
  .el-hero-btns { display: flex; gap: 14px; flex-wrap: wrap; }
  .el-btn-primary {
    padding: 0.65rem 1.8rem; background: #f0c84a; color: #1a1a1a;
    border: none; border-radius: 3px; font-weight: 600; font-size: 0.92rem;
    cursor: pointer; text-decoration: none; display: inline-block;
  }
  .el-btn-outline {
    padding: 0.65rem 1.8rem; background: transparent; color: #fff;
    border: 1.5px solid rgba(255,255,255,0.7); border-radius: 3px;
    font-weight: 500; font-size: 0.92rem; cursor: pointer;
    text-decoration: none; display: inline-block;
  }
  .el-hero-stats {
    position: absolute; bottom: 0; left: 0; right: 0;
    display: flex; justify-content: center; gap: 0;
    background: rgba(20,40,20,0.92); backdrop-filter: blur(8px);
  }
  .el-stat-item {
    flex: 1; max-width: 200px; padding: 20px 10px; text-align: center;
    border-right: 1px solid rgba(255,255,255,0.12); color: #fff;
  }
  .el-stat-item:last-child { border-right: none; }
  .el-stat-num {
    font-family: 'Playfair Display', serif;
    font-size: 1.7rem; font-weight: 600; color: #f0c84a; line-height: 1;
  }
  .el-stat-label { font-size: 0.7rem; font-weight: 300; opacity: 0.75; margin-top: 4px; letter-spacing: 0.05em; }

  /* ── Section common ── */
  .el-section { padding: 5rem 0; }
  .el-container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
  .el-section-tag {
    font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase;
    color: #4a7c59; font-weight: 600; margin-bottom: 8px;
  }
  .el-section-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.8rem, 3vw, 2.6rem); font-weight: 400; color: #1a1a1a;
    margin: 0 0 1.5rem 0; line-height: 1.2;
  }

  /* ── Overview ── */
  .el-overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
  .el-overview-img { border-radius: 8px; overflow: hidden; aspect-ratio: 4/3; }
  .el-overview-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .el-overview-body p {
    font-size: 1rem; font-weight: 300; color: #555; line-height: 1.8;
    margin: 0 0 1rem 0;
  }
  .el-overview-list { list-style: none; padding: 0; margin: 1.5rem 0 2rem; }
  .el-overview-list li {
    font-size: 0.92rem; font-weight: 400; color: #444; padding: 5px 0 5px 22px;
    position: relative; border-bottom: 1px solid #f0f0f0;
  }
  .el-overview-list li::before {
    content: '✓'; position: absolute; left: 0; color: #4a7c59; font-weight: 700;
  }
  .el-dl-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 0.65rem 1.6rem; background: #2d5a3d; color: #fff;
    border-radius: 3px; font-weight: 500; font-size: 0.92rem;
    text-decoration: none; cursor: pointer; border: none;
  }

  /* ── Typology ── */
  .el-typology-section { background: #f8f8f6; }
  .el-typology-tag-row { display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
  .el-typology-badge {
    font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase;
    background: #2d5a3d; color: #fff; padding: 3px 12px; border-radius: 2px;
    font-weight: 600;
  }
  .el-typology-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 3rem; align-items: start; }
  .el-typology-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .el-spec-box {
    background: #fff; border: 1px solid #e8e8e8; border-radius: 6px;
    padding: 1.2rem; text-align: center;
  }
  .el-spec-box .label { font-size: 0.72rem; color: #999; letter-spacing: 0.08em; text-transform: uppercase; }
  .el-spec-box .value { font-size: 1.15rem; font-weight: 600; color: #1a1a1a; margin-top: 4px; }
  .el-typology-img { border-radius: 8px; overflow: hidden; }
  .el-typology-img img { width: 100%; display: block; object-fit: cover; border-radius: 8px; }

  /* ── Features ── */
  .el-features-section { background: #fff; }
  .el-features-title { text-align: center; margin-bottom: 3rem; }
  .el-features-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
  .el-feature-card {
    background: #f8f8f6; border-radius: 8px; padding: 2rem 1.5rem;
    text-align: center; transition: transform 0.2s, box-shadow 0.2s;
  }
  .el-feature-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.09); }
  .el-feature-icon { font-size: 2.2rem; margin-bottom: 1rem; }
  .el-feature-name { font-size: 0.92rem; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
  .el-feature-desc { font-size: 0.8rem; color: #888; font-weight: 300; line-height: 1.5; }
  .el-feature-num { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: #4a7c59; font-weight: 600; }

  /* ── Amenities ── */
  .el-amenities-section { background: #1e3a2a; color: #fff; }
  .el-amenities-section .el-section-tag { color: #f0c84a; }
  .el-amenities-section .el-section-title { color: #fff; }
  .el-amenities-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); }
  .el-amenity-item {
    padding: 1.8rem 1.5rem; text-align: center; background: #1e3a2a;
    transition: background 0.2s;
  }
  .el-amenity-item:hover { background: #2d5a3d; }
  .el-amenity-icon { font-size: 1.8rem; margin-bottom: 0.8rem; }
  .el-amenity-name { font-size: 0.82rem; font-weight: 400; color: rgba(255,255,255,0.85); line-height: 1.4; }

  /* ── Gallery ── */
  .el-gallery-section { background: #fff; padding: 4rem 0 0; }
  .el-gallery-header { padding: 0 2rem 2rem; }
  .el-gallery-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: auto auto;
    gap: 4px;
  }
  .el-gallery-item { overflow: hidden; aspect-ratio: 4/3; cursor: pointer; }
  .el-gallery-item.tall { grid-row: span 2; aspect-ratio: unset; }
  .el-gallery-item img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform 0.4s ease;
  }
  .el-gallery-item:hover img { transform: scale(1.04); }

  /* ── Floorplans ── */
  .el-floor-section { background: #f8f8f6; }
  .el-floor-layout { display: grid; grid-template-columns: 280px 1fr; gap: 3rem; }
  .el-floor-tabs { display: flex; flex-direction: column; gap: 6px; }
  .el-floor-tab {
    padding: 0.9rem 1.2rem; border-radius: 4px; cursor: pointer;
    font-size: 0.88rem; font-weight: 500; color: #555;
    background: #fff; border: 1px solid #e8e8e8;
    text-align: left; transition: all 0.15s;
  }
  .el-floor-tab.active {
    background: #2d5a3d; color: #fff; border-color: #2d5a3d;
  }
  .el-floor-tab .el-tab-size {
    font-size: 0.78rem; font-weight: 300; opacity: 0.7; display: block; margin-top: 2px;
  }
  .el-floor-panel { background: #fff; border-radius: 8px; padding: 2rem; border: 1px solid #e8e8e8; }
  .el-floor-sizes {
    display: flex; gap: 2rem; margin-bottom: 1.5rem;
    border-bottom: 1px solid #f0f0f0; padding-bottom: 1rem;
  }
  .el-floor-size-item { text-align: center; }
  .el-floor-size-label { font-size: 0.72rem; color: #999; letter-spacing: 0.06em; text-transform: uppercase; }
  .el-floor-size-val { font-size: 1.1rem; font-weight: 600; color: #1a1a1a; }
  .el-floor-img { width: 100%; border-radius: 4px; border: 1px solid #eee; }

  /* ── Location ── */
  .el-location-section { background: #fff; }
  .el-location-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; }
  .el-location-details { display: flex; flex-direction: column; gap: 1.5rem; }
  .el-location-cat h4 {
    font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase;
    color: #4a7c59; font-weight: 600; margin: 0 0 8px 0;
  }
  .el-location-items { display: flex; flex-direction: column; gap: 4px; }
  .el-location-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 0; border-bottom: 1px solid #f5f5f5;
    font-size: 0.88rem;
  }
  .el-location-row .name { color: #444; font-weight: 400; }
  .el-location-row .dist {
    color: #2d5a3d; font-weight: 600; font-size: 0.82rem;
    background: #edf5f0; padding: 2px 10px; border-radius: 20px;
  }
  .el-map-placeholder {
    background: #e8ede9; border-radius: 8px; overflow: hidden;
    min-height: 380px; display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .el-map-placeholder iframe { width: 100%; height: 100%; min-height: 380px; border: none; }

  /* ── Contact CTA ── */
  .el-cta-section {
    background: linear-gradient(135deg, #1e3a2a 0%, #2d5a3d 100%);
    padding: 5rem 2rem; text-align: center; color: #fff;
  }
  .el-cta-section h2 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(2rem, 4vw, 3rem); font-weight: 400;
    margin: 0 0 0.5rem 0; color: #fff;
  }
  .el-cta-section p { font-size: 1rem; font-weight: 300; opacity: 0.8; margin: 0 0 2rem 0; }
  .el-cta-btn {
    display: inline-block; padding: 0.8rem 2.5rem;
    background: #f0c84a; color: #1a1a1a;
    border-radius: 3px; font-weight: 700; font-size: 1rem;
    text-decoration: none; letter-spacing: 0.02em;
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .el-overview-grid, .el-typology-grid, .el-location-grid, .el-floor-layout {
      grid-template-columns: 1fr;
    }
    .el-features-grid { grid-template-columns: repeat(2, 1fr); }
    .el-amenities-grid { grid-template-columns: repeat(2, 1fr); }
    .el-gallery-grid { grid-template-columns: repeat(2, 1fr); }
    .el-gallery-item.tall { grid-row: unset; aspect-ratio: 4/3; }
    .el-hero-content { left: 20px; bottom: 120px; }
    .el-hero-stats { flex-wrap: wrap; }
    .el-stat-item { flex: 0 0 50%; }
    .el-floor-tabs { flex-direction: row; flex-wrap: wrap; }
  }
  @media (max-width: 560px) {
    .el-features-grid, .el-amenities-grid { grid-template-columns: repeat(2, 1fr); }
    .el-gallery-grid { grid-template-columns: repeat(2, 1fr); }
    .el-typology-specs { grid-template-columns: 1fr 1fr; }
  }
`;

/* ─────────────────────────────────────────
   Data
───────────────────────────────────────── */
const FLOOR_PLANS = [
  { id: "236n", label: "236 - North", sizes: [{ l: "Super Builtup", v: "3332.69 sqft" }, { l: "Builtup", v: "3125.61 sqft" }, { l: "Carpet", v: "2285.64 sqft" }], img: "/elysium-fp-236n.jpg" },
  { id: "236s", label: "236 - South", sizes: [{ l: "Super Builtup", v: "3332.69 sqft" }, { l: "Builtup", v: "3125.61 sqft" }, { l: "Carpet", v: "2285.64 sqft" }], img: "/elysium-fp-236s.jpg" },
  { id: "309n", label: "309 - North", sizes: [{ l: "Super Builtup", v: "3544.20 sqft" }, { l: "Builtup", v: "3220.00 sqft" }, { l: "Carpet", v: "2380.00 sqft" }], img: "/elysium-fp-309n.jpg" },
  { id: "corner", label: "Corner Villa", sizes: [{ l: "Super Builtup", v: "3700.00 sqft" }, { l: "Builtup", v: "3380.00 sqft" }, { l: "Carpet", v: "2500.00 sqft" }], img: "/elysium-fp-corner.jpg" },
];

const AMENITIES = [
  { icon: "🏊", name: "Swimming Pool" },
  { icon: "🏋️", name: "Fitness Center" },
  { icon: "🧘", name: "Yoga Deck" },
  { icon: "🎮", name: "Clubhouse" },
  { icon: "🌳", name: "Landscaped Gardens" },
  { icon: "🏃", name: "Jogging Track" },
  { icon: "🎭", name: "Amphitheatre" },
  { icon: "🏸", name: "Badminton Court" },
  { icon: "🧒", name: "Children's Play Area" },
  { icon: "🚗", name: "Covered Parking" },
  { icon: "🔒", name: "24/7 Security" },
  { icon: "⚡", name: "Power Backup" },
  { icon: "🌿", name: "Organic Garden" },
  { icon: "📚", name: "Library" },
  { icon: "🌅", name: "Sky Lounge" },
  { icon: "🚿", name: "Spa & Sauna" },
];

const GALLERY_IMAGES = [
  "/elysium-g1.jpg", "/elysium-g2.jpg", "/elysium-g3.jpg", "/elysium-g4.jpg",
  "/elysium-g5.jpg", "/elysium-g6.jpg", "/elysium-g7.jpg", "/elysium-g8.jpg",
  "/elysium-g9.jpg", "/elysium-g10.jpg", "/elysium-g11.jpg",
];

const LOCATION_DATA = [
  {
    cat: "IT Business Hubs",
    items: [
      { name: "ITIR – Phase I", dist: "15 min" },
      { name: "TCS Deccan Park", dist: "12 min" },
      { name: "Infosys Pocharam", dist: "18 min" },
      { name: "Cognizant Campus", dist: "20 min" },
    ],
  },
  {
    cat: "Highway & ORR Access",
    items: [
      { name: "ORR Exit 14", dist: "6 min" },
      { name: "NH 65 Junction", dist: "10 min" },
    ],
  },
  {
    cat: "Intercity Connectivity",
    items: [
      { name: "Ramoji Film City", dist: "5 min" },
      { name: "Uppal Metro", dist: "25 min" },
      { name: "Secunderabad Stn", dist: "30 min" },
      { name: "RGIA Airport", dist: "45 min" },
    ],
  },
];

/* ─────────────────────────────────────────
   Chevron
───────────────────────────────────────── */
function Chevron() {
  return (
    <div style={{ position:"absolute", bottom:76, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:4, zIndex:10 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:24, height:7, opacity:0,
          animation:`chevAnim 3s ease-out ${i}s infinite`,
          position:"relative",
        }}>
          <style>{`
            @keyframes chevAnim {
              25%{opacity:1} 33%{opacity:1;transform:translateY(8px)} 67%{opacity:1;transform:translateY(14px)}
              100%{opacity:0;transform:translateY(22px) scale(0.5)}
            }
          `}</style>
          <div style={{ position:"absolute", left:0, top:0, width:"51%", height:"100%", background:"#f0c84a", transform:"skew(0,30deg)" }} />
          <div style={{ position:"absolute", right:0, top:0, width:"50%", height:"100%", background:"#f0c84a", transform:"skew(0,-30deg)" }} />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   Hero
───────────────────────────────────────── */
const HERO_SLIDES = [
  { src: "/elysium.png",          alt: "Elysium — Hill View" },
  { src: "/elysium-banner2.png",  alt: "Elysium — Villa Exterior" },
  { src: "/elysium-banner3.png",  alt: "Elysium — Amenities" },
];

function Hero() {
  const [idx, setIdx] = useState(0);
  const total = HERO_SLIDES.length;

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % total), 3500);
    return () => clearInterval(t);
  }, []);

  const prev = () => setIdx(i => (i - 1 + total) % total);
  const next = () => setIdx(i => (i + 1) % total);

  return (
    <div className="el-hero">
      {/* Slides — cross-fade */}
      {HERO_SLIDES.map((slide, i) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            opacity: i === idx ? 1 : 0,
            transition: "opacity 0.9s ease-in-out",
            zIndex: 0,
          }}
        />
      ))}

      <div className="el-hero-overlay" />

      {/* Prev arrow */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        style={{
          position: "absolute", left: 20, top: "50%",
          transform: "translateY(-50%)", zIndex: 20,
          background: "rgba(255,255,255,0.18)",
          border: "1.5px solid rgba(255,255,255,0.4)",
          color: "#fff", width: 44, height: 44, borderRadius: "50%",
          fontSize: 22, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
      >‹</button>

      {/* Next arrow */}
      <button
        onClick={next}
        aria-label="Next slide"
        style={{
          position: "absolute", right: 20, top: "50%",
          transform: "translateY(-50%)", zIndex: 20,
          background: "rgba(255,255,255,0.18)",
          border: "1.5px solid rgba(255,255,255,0.4)",
          color: "#fff", width: 44, height: 44, borderRadius: "50%",
          fontSize: 22, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
      >›</button>

      {/* Content */}
      <div className="el-hero-content">
        <div className="el-hero-eyebrow">Janapriya Projects · Batasingaram, Hyderabad</div>
        <h1 className="el-hero-title">
          Live on <span>Hills</span>
        </h1>
        <p className="el-hero-sub">Grand Triplex Villas · Starting ₹1 Cr Onwards</p>
        <div className="el-hero-btns">
          <Link href="/contact" className="el-btn-primary">Book a Visit</Link>
          <a href="#overview" className="el-btn-outline">Explore Project</a>
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{
        position: "absolute", bottom: 84, left: "50%",
        transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 20,
      }}>
        {HERO_SLIDES.map((_, i) => (
          <div
            key={i}
            onClick={() => setIdx(i)}
            style={{
              width: i === idx ? 22 : 8, height: 8, borderRadius: 4,
              background: i === idx ? "#f0c84a" : "rgba(255,255,255,0.5)",
              cursor: "pointer", transition: "width 0.3s",
            }}
          />
        ))}
      </div>

      {/* Stats bar */}
      <div className="el-hero-stats">
        {[
          { num: "25",    label: "Acres of Green" },
          { num: "189",   label: "Premium Villas" },
          { num: "4,622", label: "Sq Ft Max Area" },
          { num: "30%+",  label: "Open Space" },
          { num: "30+",   label: "Amenities" },
        ].map(s => (
          <div key={s.label} className="el-stat-item">
            <div className="el-stat-num">{s.num}</div>
            <div className="el-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Overview
───────────────────────────────────────── */
function Overview() {
  return (
    <section id="overview" className="el-section" style={{ background:"#fff" }}>
      <div className="el-container">
        <div className="el-overview-grid">
          <div className="el-overview-img">
            <img src="/elysium.png" alt="Elysium Overview" />
          </div>
          <div className="el-overview-body">
            <div className="el-section-tag">Project Overview</div>
            <h2 className="el-section-title">Comfort Meet Elegance<br />on the Hills</h2>
            <p>
              Elysium is Janapriya's crown jewel — a meticulously planned hilltop villa community set across 25 verdant acres in Batasingaram, Hyderabad's rising eastern corridor.
            </p>
            <p>
              Each Grand Triplex Villa is designed to maximise natural light, cross ventilation and panoramic views, with thoughtfully crafted interiors that balance luxury with liveability.
            </p>
            <ul className="el-overview-list">
              <li>G+2 Triplex Villas | Plans: 3+1, 4+1 BHK</li>
              <li>Individual compound walls &amp; private gardens</li>
              <li>Large terrace with valley/lake-view options</li>
              <li>Vaastu-compliant east and north-facing units</li>
              <li>Premium finishes — Italian marble, VRF AC</li>
              <li>Home Theatre provisions in all villas</li>
            </ul>
            <a href="#" className="el-dl-btn">
              <span>↓</span> Download Brochure
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   Typology
───────────────────────────────────────── */
function Typology() {
  return (
    <section className="el-section el-typology-section">
      <div className="el-container">
        <div className="el-typology-tag-row">
          <div className="el-section-tag" style={{ margin:0 }}>Villa Typology</div>
          <span className="el-typology-badge">Grand Triplex Villa</span>
        </div>
        <h2 className="el-section-title">Triplex Stepped Villa</h2>
        <div className="el-typology-grid">
          <div>
            <p style={{ fontSize:"0.95rem", color:"#666", fontWeight:300, lineHeight:1.8, marginBottom:"1.5rem" }}>
              Three thoughtfully stacked floors — each with its own identity. Ground for living, first for bedrooms, top for sky-view terraces and leisure.
            </p>
            <div className="el-typology-specs">
              {[
                { label:"Floors", value:"G+2" },
                { label:"Bedrooms", value:"4+1" },
                { label:"Area From", value:"3332 sqft" },
                { label:"Facing", value:"Home Theatre" },
              ].map(s => (
                <div key={s.label} className="el-spec-box">
                  <div className="label">{s.label}</div>
                  <div className="value">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="el-typology-img">
            <img src="/elysium.png" alt="Villa Typology" style={{ height:340 }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   Features
───────────────────────────────────────── */
function Features() {
  const features = [
    { icon:"🏊", name:"Exclusive Pool", desc:"Temperature-controlled infinity pool with deck", num:null },
    { icon:"🌳", name:"Open Green Space", desc:"", num:"500+" },
    { icon:"🌲", name:"Infinite Lap Pool", desc:"Olympic-length lap pool for residents", num:null },
    { icon:"🏡", name:"Sq Ft. Grand Clubhouse", desc:"", num:"21,000" },
  ];

  return (
    <section className="el-section el-features-section">
      <div className="el-container">
        <div className="el-features-title">
          <div className="el-section-tag" style={{ textAlign:"center" }}>Highlights</div>
          <h2 className="el-section-title" style={{ textAlign:"center", margin:"0 auto" }}>What Makes Elysium Exceptional</h2>
          <p style={{ fontSize:"0.95rem", color:"#888", fontWeight:300, maxWidth:560, margin:"0.5rem auto 0", textAlign:"center" }}>
            A confluence of thoughtful design, world-class amenities, and nature-forward living.
          </p>
        </div>
        <div className="el-features-grid">
          {features.map(f => (
            <div key={f.name} className="el-feature-card">
              <div className="el-feature-icon">{f.icon}</div>
              {f.num && <div className="el-feature-num">{f.num}</div>}
              <div className="el-feature-name">{f.name}</div>
              {f.desc && <div className="el-feature-desc">{f.desc}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   Amenities
───────────────────────────────────────── */
function Amenities() {
  return (
    <section className="el-section el-amenities-section">
      <div className="el-container">
        <div className="el-section-tag">Lifestyle</div>
        <h2 className="el-section-title">Modern Facilities at Elysium</h2>
        <p style={{ fontSize:"0.95rem", color:"rgba(255,255,255,0.65)", fontWeight:300, marginBottom:"2.5rem", maxWidth:520 }}>
          Every amenity has been curated to elevate everyday living into an extraordinary experience.
        </p>
        <div className="el-amenities-grid">
          {AMENITIES.map(a => (
            <div key={a.name} className="el-amenity-item">
              <div className="el-amenity-icon">{a.icon}</div>
              <div className="el-amenity-name">{a.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   Gallery
───────────────────────────────────────── */
function Gallery() {
  const items = [
    { src:"/elysium.png", tall:true },
    { src:"/elysium.png" },
    { src:"/elysium.png" },
    { src:"/elysium.png" },
    { src:"/elysium.png" },
    { src:"/elysium.png" },
    { src:"/elysium.png" },
    { src:"/elysium.png" },
    { src:"/elysium.png" },
  ];

  return (
    <section className="el-gallery-section">
      <div className="el-gallery-header el-container">
        <div className="el-section-tag">Visual Tour</div>
        <h2 className="el-section-title">Gallery</h2>
      </div>
      <div className="el-gallery-grid">
        {items.map((item, i) => (
          <div key={i} className={`el-gallery-item${item.tall ? " tall" : ""}`}>
            <img src={item.src} alt={`Elysium ${i + 1}`} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   Floor Plans
───────────────────────────────────────── */
function FloorPlans() {
  const [active, setActive] = useState(FLOOR_PLANS[0].id);
  const plan = FLOOR_PLANS.find(p => p.id === active)!;

  return (
    <section className="el-section el-floor-section">
      <div className="el-container">
        <div className="el-section-tag">Layouts</div>
        <h2 className="el-section-title">Home Floorplans</h2>
        <p style={{ fontSize:"0.95rem", color:"#888", fontWeight:300, marginBottom:"2.5rem", maxWidth:520 }}>
          Explore a range of meticulously planned layouts optimised for space, light, and family living.
        </p>
        <div className="el-floor-layout">
          <div className="el-floor-tabs">
            {FLOOR_PLANS.map(fp => (
              <button
                key={fp.id}
                className={`el-floor-tab${active === fp.id ? " active" : ""}`}
                onClick={() => setActive(fp.id)}
              >
                {fp.label}
                <span className="el-tab-size">{fp.sizes[0].v}</span>
              </button>
            ))}
          </div>
          <div className="el-floor-panel">
            <div className="el-floor-sizes">
              {plan.sizes.map(s => (
                <div key={s.l} className="el-floor-size-item">
                  <div className="el-floor-size-label">{s.l}</div>
                  <div className="el-floor-size-val">{s.v}</div>
                </div>
              ))}
            </div>
            <img src="/elysium.png" alt={plan.label} className="el-floor-img" style={{ maxHeight:380, objectFit:"contain" }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   Location
───────────────────────────────────────── */
function Location() {
  return (
    <section className="el-section el-location-section">
      <div className="el-container">
        <div className="el-section-tag">Connectivity</div>
        <h2 className="el-section-title">Batasingaram — Hyderabad's<br />Rising Eastern Corridor</h2>
        <div className="el-location-grid">
          <div className="el-location-details">
            {LOCATION_DATA.map(cat => (
              <div key={cat.cat} className="el-location-cat">
                <h4>{cat.cat}</h4>
                <div className="el-location-items">
                  {cat.items.map(item => (
                    <div key={item.name} className="el-location-row">
                      <span className="name">{item.name}</span>
                      <span className="dist">{item.dist}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="el-map-placeholder">
            <iframe
              title="Elysium Location Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d30445.6!2d78.6!3d17.35!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDIxJzAwLjAiTiA3OMKwMzYnMDAuMCJF!5e0!3m2!1sen!2sin!4v1!5m2!1sen!2sin"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   Contact CTA
───────────────────────────────────────── */
function ContactCTA() {
  return (
    <div className="el-cta-section">
      <h2>Interested in Elysium?</h2>
      <p>We'd love to show you around. Schedule a site visit today.</p>
      <Link href="/contact" className="el-cta-btn">Get in Touch</Link>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Page
═══════════════════════════════════════════ */
export default function ElysiumPage() {
  return (
    <main className="el-page" style={{ minHeight:"100vh", overflowX:"hidden" }}>
      <style>{PAGE_STYLES}</style>
      <Navbar />
      <Hero />
      <Overview />
      <Typology />
      <Features />
      <Amenities />
      <Gallery />
      <FloorPlans />
      <Location />
      <ContactCTA />
      <Footer />
    </main>
  );
}