"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/* ═══════════════════════════════════════════════════════════
   PAGE STYLES
═══════════════════════════════════════════════════════════ */
const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .nv-page { font-family: 'DM Sans', sans-serif; color: #1a1a1a; background: #fff; }

  /* ── Hero ── */
  .nv-hero { position: relative; width: 100%; height: 100vh; overflow: hidden; }
  /* Layered overlay: vertical darken + LEFT-side gradient where the text sits */
  .nv-hero-overlay {
    position: absolute; inset: 0;
    background:
      linear-gradient(to right,
        rgba(10,8,4,0.78) 0%,
        rgba(10,8,4,0.55) 35%,
        rgba(10,8,4,0.15) 65%,
        rgba(10,8,4,0.0) 100%),
      linear-gradient(to bottom,
        rgba(0,0,0,0.55) 0%,
        rgba(0,0,0,0.25) 45%,
        rgba(0,0,0,0.75) 100%);
  }
  .nv-hero-content {
    position: absolute; bottom: 110px; left: 60px; color: #fff; max-width: 720px;
    z-index: 5;
  }
  .nv-hero-eyebrow {
    font-size: 0.78rem; letter-spacing: 0.2em; text-transform: uppercase;
    color: #F5D77E; font-weight: 600; margin-bottom: 14px;
    display: flex; align-items: center; gap: 10px;
    text-shadow: 0 1px 6px rgba(0,0,0,0.6);
  }
  .nv-hero-eyebrow::before {
    content: ''; width: 30px; height: 1px; background: #F5D77E;
  }
  .nv-hero-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(3rem, 7vw, 5.5rem); font-weight: 500;
    line-height: 1.05; margin: 0 0 12px 0; letter-spacing: -0.01em;
    color: #fff;
    text-shadow: 0 2px 24px rgba(0,0,0,0.65), 0 1px 4px rgba(0,0,0,0.5);
  }
  .nv-hero-title em {
    color: #F5D77E; font-style: italic;
    text-shadow: 0 2px 18px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4);
  }
  .nv-hero-sub {
    font-size: clamp(0.95rem, 1.5vw, 1.15rem); font-weight: 400;
    color: rgba(255,255,255,0.96);
    opacity: 1; margin: 0 0 32px 0; line-height: 1.6;
    text-shadow: 0 1px 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.5);
  }
  .nv-hero-btns { display: flex; gap: 14px; flex-wrap: wrap; }
  .nv-btn-primary {
    padding: 0.85rem 2.2rem; background: #C49A3C; color: #1a1208;
    border: none; border-radius: 3px; font-weight: 700; font-size: 0.92rem;
    cursor: pointer; text-decoration: none; display: inline-block;
    letter-spacing: 0.1em; text-transform: uppercase;
    transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
  }
  .nv-btn-primary:hover {
    background: #E2C47A; transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(196,154,60,0.35);
  }
  .nv-btn-outline {
    padding: 0.85rem 2.2rem; background: rgba(0,0,0,0.25);
    color: #fff;
    border: 1.5px solid rgba(255,255,255,0.85);
    border-radius: 3px;
    font-weight: 600; font-size: 0.92rem; cursor: pointer;
    text-decoration: none; display: inline-block;
    letter-spacing: 0.1em; text-transform: uppercase;
    transition: background 0.2s, border-color 0.2s;
    backdrop-filter: blur(4px);
  }
  .nv-btn-outline:hover {
    background: rgba(255,255,255,0.15);
    border-color: #fff;
  }
  .nv-hero-stats {
    position: absolute; bottom: 0; left: 0; right: 0;
    display: flex; justify-content: center; gap: 0;
    background: rgba(20,20,30,0.88); backdrop-filter: blur(10px);
  }
  .nv-stat-item {
    flex: 1; padding: 22px 12px; text-align: center;
    border-right: 1px solid rgba(255,255,255,0.12); color: #fff;
  }
  .nv-stat-item:last-child { border-right: none; }
  .nv-stat-num {
    font-family: 'Playfair Display', serif;
    font-size: 1.8rem; font-weight: 600; color: #C49A3C; line-height: 1;
  }
  .nv-stat-label { font-size: 0.7rem; font-weight: 300; opacity: 0.78; margin-top: 5px; letter-spacing: 0.06em; }

  /* ── Section common ── */
  .nv-section { padding: 5rem 0; }
  .nv-container { max-width: 1240px; margin: 0 auto; padding: 0 2rem; }
  .nv-section-tag {
    font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase;
    color: #C49A3C; font-weight: 600; margin-bottom: 10px;
  }
  .nv-section-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.9rem, 3vw, 2.6rem); font-weight: 400; color: #1a1208;
    margin: 0 0 1.5rem 0; line-height: 1.2;
  }
  .nv-section-title em { color: #C49A3C; font-style: italic; }

  /* ── Overview ── */
  .nv-overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
  .nv-overview-img { border-radius: 8px; overflow: hidden; aspect-ratio: 4/3; }
  .nv-overview-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .nv-overview-body p {
    font-size: 1rem; font-weight: 300; color: #555; line-height: 1.8; margin: 0 0 1rem 0;
  }
  .nv-overview-list { list-style: none; padding: 0; margin: 1.5rem 0 2rem; }
  .nv-overview-list li {
    font-size: 0.92rem; font-weight: 400; color: #444; padding: 6px 0 6px 24px;
    position: relative; border-bottom: 1px solid #f0f0f0;
  }
  .nv-overview-list li::before {
    content: '✓'; position: absolute; left: 0; color: #C49A3C; font-weight: 700;
  }
  .nv-dl-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 0.75rem 1.8rem; background: #1a1208; color: #C49A3C;
    border-radius: 3px; font-weight: 500; font-size: 0.9rem;
    text-decoration: none; cursor: pointer; border: 1px solid #C49A3C;
    letter-spacing: 0.06em; text-transform: uppercase;
    transition: all 0.2s;
  }
  .nv-dl-btn:hover { background: #C49A3C; color: #1a1208; }

  /* ── Typology ── */
  .nv-typology-section { background: #f8f6f0; }
  .nv-typology-tag-row { display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; flex-wrap: wrap; }
  .nv-typology-badge {
    font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
    background: #1a1208; color: #C49A3C; padding: 4px 14px; border-radius: 2px;
    font-weight: 600;
  }
  .nv-typology-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 3rem; align-items: start; }
  .nv-typology-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .nv-spec-box {
    background: #fff; border: 1px solid #e8e3d3; border-radius: 6px;
    padding: 1.3rem; text-align: center;
  }
  .nv-spec-box .label { font-size: 0.72rem; color: #999; letter-spacing: 0.1em; text-transform: uppercase; }
  .nv-spec-box .value {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem; font-weight: 500; color: #C49A3C; margin-top: 6px;
  }
  .nv-typology-img { border-radius: 8px; overflow: hidden; }
  .nv-typology-img img { width: 100%; display: block; object-fit: cover; border-radius: 8px; }

  /* ── Features ── */
  .nv-features-section { background: #fff; }
  .nv-features-title { text-align: center; margin-bottom: 3rem; }
  .nv-features-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
  .nv-feature-card {
    background: #f8f6f0; border-radius: 8px; padding: 2rem 1.5rem;
    text-align: center; transition: transform 0.2s, box-shadow 0.2s;
    border: 1px solid transparent;
  }
  .nv-feature-card:hover {
    transform: translateY(-4px); box-shadow: 0 8px 24px rgba(196,154,60,0.15);
    border-color: rgba(196,154,60,0.2);
  }
  .nv-feature-icon { font-size: 2.2rem; margin-bottom: 1rem; }
  .nv-feature-name { font-size: 0.95rem; font-weight: 600; color: #1a1208; margin-bottom: 6px; }
  .nv-feature-desc { font-size: 0.82rem; color: #888; font-weight: 300; line-height: 1.5; }
  .nv-feature-num { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #C49A3C; font-weight: 600; }

  /* ── Amenities ── */
  .nv-amenities-section { background: #1a1208; color: #fff; }
  .nv-amenities-section .nv-section-tag { color: #C49A3C; }
  .nv-amenities-section .nv-section-title { color: #fff; }
  .nv-amenities-section .nv-section-title em { color: #C49A3C; }
  .nv-amenities-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px;
    background: rgba(196,154,60,0.15); border: 1px solid rgba(196,154,60,0.15);
  }
  .nv-amenity-item {
    padding: 1.8rem 1.5rem; text-align: center; background: #1a1208;
    transition: background 0.2s;
  }
  .nv-amenity-item:hover { background: #261a0e; }
  .nv-amenity-icon { font-size: 1.8rem; margin-bottom: 0.8rem; }
  .nv-amenity-name { font-size: 0.82rem; font-weight: 400; color: rgba(255,255,255,0.85); line-height: 1.4; }

  /* ── Gallery ── */
  .nv-gallery-section { background: #fff; padding: 4rem 0 0; }
  .nv-gallery-header { padding: 0 2rem 2rem; max-width: 1240px; margin: 0 auto; }
  .nv-gallery-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    grid-template-rows: auto auto; gap: 4px;
  }
  .nv-gallery-item { overflow: hidden; aspect-ratio: 4/3; cursor: pointer; }
  .nv-gallery-item.tall { grid-row: span 2; aspect-ratio: unset; }
  .nv-gallery-item img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform 0.4s ease;
  }
  .nv-gallery-item:hover img { transform: scale(1.04); }

  /* ── Floor Plans ── */
  .nv-floor-section { background: #f8f6f0; }
  .nv-floor-layout { display: grid; grid-template-columns: 280px 1fr; gap: 3rem; }
  .nv-floor-tabs { display: flex; flex-direction: column; gap: 8px; }
  .nv-floor-tab {
    padding: 1rem 1.2rem; border-radius: 4px; cursor: pointer;
    font-size: 0.9rem; font-weight: 500; color: #555;
    background: #fff; border: 1px solid #e8e3d3;
    text-align: left; transition: all 0.15s;
  }
  .nv-floor-tab.active {
    background: #1a1208; color: #C49A3C; border-color: #1a1208;
  }
  .nv-floor-tab .nv-tab-size {
    font-size: 0.78rem; font-weight: 300; opacity: 0.75;
    display: block; margin-top: 3px;
  }
  .nv-floor-panel { background: #fff; border-radius: 8px; padding: 2rem; border: 1px solid #e8e3d3; }
  .nv-floor-sizes {
    display: flex; gap: 2rem; margin-bottom: 1.5rem;
    border-bottom: 1px solid #f0e8d4; padding-bottom: 1rem; flex-wrap: wrap;
  }
  .nv-floor-size-item { text-align: center; }
  .nv-floor-size-label { font-size: 0.72rem; color: #999; letter-spacing: 0.08em; text-transform: uppercase; }
  .nv-floor-size-val {
    font-family: 'Playfair Display', serif;
    font-size: 1.15rem; font-weight: 600; color: #C49A3C;
  }
  .nv-floor-img { width: 100%; border-radius: 4px; border: 1px solid #f0e8d4; }

  /* ── Location ── */
  .nv-location-section { background: #fff; }
  .nv-location-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; }
  .nv-location-details { display: flex; flex-direction: column; gap: 1.5rem; }
  .nv-location-cat h4 {
    font-size: 0.78rem; letter-spacing: 0.12em; text-transform: uppercase;
    color: #C49A3C; font-weight: 600; margin: 0 0 8px 0;
  }
  .nv-location-items { display: flex; flex-direction: column; gap: 4px; }
  .nv-location-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 0; border-bottom: 1px solid #f5f1e8; font-size: 0.9rem;
  }
  .nv-location-row .name { color: #444; font-weight: 400; }
  .nv-location-row .dist {
    color: #8A6820; font-weight: 600; font-size: 0.82rem;
    background: #f5edd4; padding: 3px 12px; border-radius: 20px;
  }
  .nv-map-placeholder {
    background: #f5f1e8; border-radius: 8px; overflow: hidden;
    min-height: 380px;
  }
  .nv-map-placeholder iframe { width: 100%; height: 100%; min-height: 380px; border: none; }

  /* ── Payment Plan ── */
  .nv-payment-section { background: #1a1208; color: #fff; padding: 5rem 0; }
  .nv-payment-section .nv-section-tag { color: #C49A3C; }
  .nv-payment-section .nv-section-title { color: #fff; }
  .nv-payment-section .nv-section-title em { color: #C49A3C; }
  .nv-payment-grid {
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px;
    background: rgba(196,154,60,0.2);
    border: 1px solid rgba(196,154,60,0.2);
    border-radius: 4px; overflow: hidden;
  }
  .nv-payment-step {
    background: #1a1208; padding: 1.5rem 1.2rem; text-align: center;
  }
  .nv-payment-step.hi { background: #261a0e; }
  .nv-payment-num {
    font-family: 'Playfair Display', serif;
    font-size: 2rem; font-weight: 500; color: #C49A3C; line-height: 1;
  }
  .nv-payment-lbl { font-size: 0.72rem; color: #E2C47A; margin-top: 8px; letter-spacing: 0.06em; }
  .nv-payment-ms { font-size: 0.85rem; color: #D4C8A8; line-height: 1.4; margin-top: 6px; }
  .nv-payment-wh { font-size: 0.72rem; color: rgba(212,200,168,0.55); margin-top: 4px; }

  /* ── Contact CTA ── */
  .nv-cta-section {
    background: linear-gradient(135deg, #1a1208 0%, #2d2110 100%);
    padding: 5rem 2rem; text-align: center; color: #fff;
  }
  .nv-cta-section h2 {
    font-family: 'Playfair Display', serif;
    font-size: clamp(2rem, 4vw, 3rem); font-weight: 400;
    margin: 0 0 0.5rem 0; color: #fff;
  }
  .nv-cta-section h2 em { color: #C49A3C; font-style: italic; }
  .nv-cta-section p { font-size: 1rem; font-weight: 300; opacity: 0.85; margin: 0 0 2rem 0; }
  .nv-cta-btn {
    display: inline-block; padding: 0.85rem 2.5rem;
    background: #C49A3C; color: #1a1208;
    border-radius: 3px; font-weight: 600; font-size: 0.95rem;
    text-decoration: none; letter-spacing: 0.08em; text-transform: uppercase;
    transition: background 0.2s;
  }
  .nv-cta-btn:hover { background: #E2C47A; }

  /* ═════════════════════════════════════════════
     ── SELECT A UNIT SECTION ──
  ═════════════════════════════════════════════ */
  .nv-units-section {
    background: #f0e8d4;
    padding: 4rem 0;
    border-top: 1px solid rgba(196,154,60,0.2);
    border-bottom: 1px solid rgba(196,154,60,0.2);
  }
  .nv-units-head {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 1.6rem; flex-wrap: wrap; gap: 12px;
  }
  .nv-units-title {
    font-family: 'Playfair Display', serif;
    font-size: 32px; font-weight: 400; color: #8A6820; margin: 0;
  }
  .nv-units-title em { font-style: italic; color: #C49A3C; }
  .nv-units-legend {
    display: flex; align-items: center; gap: 16px;
    font-size: 11px; letter-spacing: 0.08em; color: #8A7D60;
  }
  .nv-units-leg-item { display: flex; align-items: center; gap: 6px; }
  .nv-units-leg-dot { width: 9px; height: 9px; border-radius: 50%; }
  .nv-units-leg-avail { background: #C49A3C; }
  .nv-units-leg-hold  { background: #2A5FA5; }
  .nv-units-leg-sold  { background: rgba(138,125,96,0.5); }

  .nv-units-tabs {
    display: flex; border: 1px solid rgba(196,154,60,0.3);
    border-radius: 2px; margin-bottom: 1.4rem; overflow: hidden;
    width: fit-content; background: rgba(255,255,255,0.3);
  }
  .nv-units-tab {
    font-size: 11px; font-weight: 500; letter-spacing: 0.1em;
    text-transform: uppercase; padding: 10px 22px; cursor: pointer;
    color: #8A7D60; background: transparent; border: none;
    border-right: 1px solid rgba(196,154,60,0.25);
    font-family: 'DM Sans', sans-serif; transition: all 0.2s;
  }
  .nv-units-tab:last-child { border-right: none; }
  .nv-units-tab.on { background: rgba(196,154,60,0.18); color: #8A6820; }
  .nv-units-tab:hover:not(.on) { background: rgba(196,154,60,0.08); }

  .nv-units-grid {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;
  }

  .nv-uc {
    background: #f5ead8; border: 1.5px solid #d4a843; border-radius: 6px;
    padding: 10px 8px 10px 12px; cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s;
    text-align: left; width: 100%;
    display: flex; flex-direction: row; align-items: center;
    gap: 0; min-height: 90px; position: relative; overflow: hidden;
  }
  .nv-uc:hover { background: #fff; box-shadow: 0 4px 18px rgba(196,154,60,0.18); }
  .nv-uc.sel { background: #fff; box-shadow: 0 0 0 2px #C49A3C; }
  .nv-uc.unavail { opacity: 0.38; cursor: not-allowed; }
  .nv-uc.hold { background: rgba(42,95,165,0.06); }

  .nv-uc-text {
    display: flex; flex-direction: column; justify-content: center;
    flex: 1; min-width: 0; padding-right: 6px; z-index: 1;
  }
  .nv-uc-img {
    flex: 0 0 200px; width: 200px; height: 150px;
    background: transparent;
    display: flex; align-items: center; justify-content: center;
  }
  .nv-uc-img img {
    width: 200px; height: 150px; object-fit: contain; display: block;
    transition: transform 0.35s ease;
    filter: drop-shadow(0 3px 8px rgba(0,0,0,0.12));
    background: transparent;
  }
  .nv-uc:hover .nv-uc-img img { transform: scale(1.05); }
  .nv-uc-img-fallback {
    width: 200px; height: 150px; display: flex;
    align-items: center; justify-content: center; background: transparent;
  }

  .nv-uc-id {
    font-family: 'Playfair Display', serif;
    font-size: 13px; color: #1a1208; margin-bottom: 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.3;
  }
  .nv-uc-type {
    font-size: 11px; color: #18437e; margin-bottom: 4px;
    font-weight: 600; letter-spacing: 0.03em;
  }
  .nv-uc-price { font-size: 11px; color: #1a1208; font-weight: 500; margin-bottom: 5px; }
  .nv-uc-badge {
    font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 3px; display: inline-block;
    font-family: 'DM Sans', sans-serif; font-weight: 500;
  }
  .nv-b-avail { background: rgba(196,154,60,0.18); color: #7a5a10; border: 1px solid rgba(196,154,60,0.35); }
  .nv-b-hold  { background: rgba(42,95,165,0.16); color: #4A84D4; border: 1px solid rgba(74,132,212,0.3); }
  .nv-b-sold  { background: rgba(138,125,96,0.12); color: #8A7D60; border: 1px solid rgba(138,125,96,0.2); }

  /* Pagination */
  .nv-units-pagination {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 1.4rem; padding-top: 1.2rem;
    border-top: 1px solid rgba(196,154,60,0.25);
    flex-wrap: wrap; gap: 12px;
  }
  .nv-units-pag-info { font-size: 12px; color: #8A7D60; letter-spacing: 0.04em; }
  .nv-units-pag-info strong { color: #8A6820; }
  .nv-units-pag-controls { display: flex; align-items: center; gap: 6px; }
  .nv-units-pag-btn {
    width: 36px; height: 36px; border-radius: 3px;
    border: 1px solid rgba(196,154,60,0.3);
    background: rgba(255,255,255,0.4); color: #8A7D60; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .nv-units-pag-btn:hover:not(:disabled) {
    background: rgba(196,154,60,0.15); color: #8A6820; border-color: #C49A3C;
  }
  .nv-units-pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .nv-units-pag-btn.active {
    background: #C49A3C; color: #fff; border-color: #C49A3C; font-weight: 600;
  }
  .nv-units-pag-dots { font-size: 13px; color: #8A7D60; padding: 0 4px; }

  /* Selected unit detail panel */
  .nv-unit-detail {
    margin-top: 1.4rem; border: 1px solid #C49A3C; border-radius: 4px;
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    background: rgba(255,255,255,0.5);
  }
  .nv-detail-col { padding: 1.4rem; border-right: 1px solid rgba(196,154,60,0.25); }
  .nv-detail-col:last-child { border-right: none; }
  .nv-detail-hd {
    font-size: 9px; font-weight: 600; letter-spacing: 0.18em;
    text-transform: uppercase; color: #8A6820;
    padding-bottom: 8px; border-bottom: 1px solid rgba(196,154,60,0.3);
    margin-bottom: 12px;
  }
  .nv-detail-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
  .nv-detail-k { color: #8A7D60; }
  .nv-detail-v { color: #1a1208; font-weight: 500; }
  .nv-detail-price {
    font-family: 'Playfair Display', serif;
    font-size: 28px; color: #C49A3C; margin-top: 10px; line-height: 1;
  }
  .nv-detail-note { font-size: 10px; color: #8A7D60; margin-top: 4px; }
  .nv-expr-btn {
    width: 100%; background: #C49A3C; color: #1a1208;
    font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
    letter-spacing: 0.14em; text-transform: uppercase;
    padding: 12px; border: none; cursor: pointer; border-radius: 3px;
    transition: background 0.2s;
  }
  .nv-expr-btn:hover:not(:disabled) { background: #E2C47A; }
  .nv-expr-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Floating help bubble */
  .nv-help-bubble {
    position: fixed; bottom: 24px; right: 24px; z-index: 90;
    display: flex; align-items: center; gap: 10px;
    background: linear-gradient(135deg, #1e5fb8 0%, #2774d8 100%);
    color: #fff; padding: 10px 18px 10px 12px;
    border-radius: 999px;
    box-shadow: 0 6px 20px rgba(30, 95, 184, 0.35);
    cursor: pointer; border: none;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
    line-height: 1.2; transition: transform 0.2s, box-shadow 0.2s;
  }
  .nv-help-bubble:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(30, 95, 184, 0.45);
  }
  .nv-help-bubble-icon {
    width: 30px; height: 30px; border-radius: 50%;
    background: #fff; color: #1e5fb8;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .nv-help-bubble-text { display: flex; flex-direction: column; align-items: flex-start; }
  .nv-help-bubble-text small { font-size: 11px; opacity: 0.85; font-weight: 300; }

  /* ── Responsive ── */
  @media (max-width: 1200px) {
    .nv-units-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 900px) {
    .nv-overview-grid, .nv-typology-grid, .nv-location-grid, .nv-floor-layout {
      grid-template-columns: 1fr;
    }
    .nv-features-grid { grid-template-columns: repeat(2, 1fr); }
    .nv-amenities-grid { grid-template-columns: repeat(2, 1fr); }
    .nv-gallery-grid { grid-template-columns: repeat(2, 1fr); }
    .nv-gallery-item.tall { grid-row: unset; aspect-ratio: 4/3; }
    .nv-payment-grid { grid-template-columns: repeat(2, 1fr); }
    .nv-hero-content { left: 20px; bottom: 130px; }
    .nv-hero-stats { flex-wrap: wrap; }
    .nv-stat-item { flex: 0 0 50%; }
    .nv-floor-tabs { flex-direction: row; flex-wrap: wrap; }
    .nv-units-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .nv-uc-img, .nv-uc-img img, .nv-uc-img-fallback {
      width: 160px; height: 120px; flex: 0 0 160px;
    }
    .nv-unit-detail { grid-template-columns: 1fr; }
    .nv-detail-col { border-right: none; border-bottom: 1px solid rgba(196,154,60,0.25); }
    .nv-detail-col:last-child { border-bottom: none; }
  }
  @media (max-width: 640px) {
    .nv-features-grid, .nv-amenities-grid { grid-template-columns: repeat(2, 1fr); }
    .nv-gallery-grid { grid-template-columns: repeat(2, 1fr); }
    .nv-typology-specs { grid-template-columns: 1fr 1fr; }
    .nv-units-grid { grid-template-columns: 1fr; }
    .nv-uc {
      flex-direction: column-reverse; align-items: flex-start;
      padding: 0 0 10px 0; min-height: unset;
    }
    .nv-uc-text { flex: unset; width: 100%; padding: 10px 12px 0; }
    .nv-uc-img, .nv-uc-img-fallback {
      width: 100%; height: 160px; flex: unset;
    }
    .nv-uc-img img { width: 100%; }
    .nv-units-head { flex-direction: column; align-items: flex-start; }
    .nv-units-pagination { justify-content: center; }
    .nv-units-pag-info { width: 100%; text-align: center; }
    .nv-help-bubble { bottom: 16px; right: 16px; padding: 8px 14px 8px 10px; font-size: 12px; }
    .nv-payment-grid { grid-template-columns: 1fr; }
  }
`;

/* ═══════════════════════════════════════════════════════════
   STATIC DATA — NILE VALLEY
═══════════════════════════════════════════════════════════ */

const FLOOR_PLANS = [
  { id: "2bhk-990", label: "2 BHK · 990 sqft",
    sizes: [{ l: "Carpet", v: "699.94 sqft" }, { l: "Super Builtup", v: "990 sqft" }],
    img: "/media/project/floor_plans/990-SFT.png" },
  { id: "2bhk-1220", label: "2 BHK · 1220 sqft",
    sizes: [{ l: "Carpet", v: "853.08 sqft" }, { l: "Super Builtup", v: "1220 sqft" }],
    img: "/media/project/floor_plans/1220-SFT.png" },
  { id: "3bhk-1590", label: "3 BHK · 1590 sqft",
    sizes: [{ l: "Carpet", v: "993.19 sqft" }, { l: "Super Builtup", v: "1590 sqft" }],
    img: "/media/project/floor_plans/1590-SFT.png" },
  { id: "3bhk-1610", label: "3 BHK+ · 1610 sqft",
    sizes: [{ l: "Carpet", v: "993.62 sqft" },{ l: "Super Builtup", v: "1610 sqft" }],
    img: "/media/project/floor_plans/1610-SFT.png" },
	{ id: "3bhk-1625", label: "3 BHK+ · 1625 sqft",
    sizes: [{ l: "Carpet", v: "1006.97 sqft" },  { l: "Super Builtup", v: "1625 sqft" }],
    img: "/media/project/floor_plans/1625-SFT.png" },
];

const AMENITIES = [
  { icon: "🏊", name: "Infinity Pool" },
  { icon: "🏋️", name: "Modern Gym" },
  { icon: "🧘", name: "Yoga Pavilion" },
  { icon: "🎮", name: "Clubhouse" },
  { icon: "🌳", name: "Landscape Garden" },
  { icon: "🏃", name: "Jogging Track" },
  { icon: "🎭", name: "Banquet Hall" },
  { icon: "🏸", name: "Squash Court" },
  { icon: "🧒", name: "Kids' Play Area" },
  { icon: "🚗", name: "EV Charging" },
  { icon: "🔒", name: "24/7 Security" },
  { icon: "⚡", name: "Power Backup" },
  { icon: "💆", name: "Spa & Sauna" },
  { icon: "🌅", name: "Sky Lounge — 30F" },
  { icon: "🏛️", name: "Library" },
  { icon: "🌿", name: "Rainwater Harvest" },
];

const LOCATION_DATA = [
  {
    cat: "IT & Business Hubs",
    items: [
      { name: "HITEC City", dist: "25 min" },
      { name: "Gachibowli", dist: "29 min" },
      { name: "Financial District", dist: "35 min" },
      { name: "Raheja Mindspace", dist: "30 min" },
    ],
  },
  {
    cat: "Education & Healthcare",
    items: [
      { name: "Oakridge International", dist: "30 min" },
      { name: "ISB Hyderabad", dist: "30 min" },
      { name: "Continental Hospital", dist: "32 min" },
      { name: "Care Hospital", dist: "30 min" },
    ],
  },
  {
    cat: "Lifestyle & Connectivity",
    items: [
      { name: "Inorbit Mall", dist: "30 min" },
      { name: "Forum Sujana Mall", dist: "24 min" },
      { name: "Outer Ring Road", dist: "15 min" },
      { name: "RGIA Airport", dist: "40 min" },
    ],
  },
];

const PAYMENT_STEPS = [
  { num: "10%", label: "On Booking", milestone: "Token amount", when: "At agreement", active: true },
  { num: "20%", label: "Within 30 days", milestone: "Agreement to sale", when: "+ 10% booking" },
  { num: "30%", label: "Slab completion", milestone: "Floors 1–15", when: "Est. Q3 2026" },
  { num: "30%", label: "Super structure", milestone: "Floors 16–30", when: "Est. Q2 2027" },
  { num: "10%", label: "On possession", milestone: "Final handover", when: "Dec 2028" },
];

/* ═══════════════════════════════════════════════════════════
   3D RENDER LOOKUP — NILE VALLEY BLOCK 6
═══════════════════════════════════════════════════════════ */
const BASE_3D = "/media/series/Nilevalley/Block-6/3D";

const FLOOR_3D_MAP: Record<number, Array<{ facing: "East" | "West"; area: number }>> = {
  30: [{ facing: "West", area: 1525 }, { facing: "West", area: 1370 }],
  29: [{ facing: "West", area: 1050 }, { facing: "West", area: 990  }],
  28: [{ facing: "West", area: 1095 }, { facing: "West", area: 990  }],
  27: [{ facing: "East", area: 1635 }, { facing: "East", area: 1380 }],
  26: [{ facing: "East", area: 1255 }, { facing: "East", area: 1220 }],
  25: [{ facing: "West", area: 1620 }, { facing: "West", area: 1450 }],
  23: [{ facing: "West", area: 1605 }, { facing: "West", area: 1450 }],
  22: [{ facing: "East", area: 1590 }, { facing: "East", area: 1540 }],
  21: [{ facing: "East", area: 1590 }, { facing: "East", area: 1540 }],
  20: [{ facing: "West", area: 1090 }, { facing: "West", area: 990  }],
  19: [{ facing: "West", area: 1050 }, { facing: "West", area: 990  }],
  18: [{ facing: "West", area: 1515 }, { facing: "West", area: 1360 }],
  17: [{ facing: "East", area: 1255 }, { facing: "East", area: 1220 }],
  16: [{ facing: "East", area: 1605 }, { facing: "East", area: 1380 }],
  15: [{ facing: "West", area: 1590 }, { facing: "West", area: 1380 }],
  14: [{ facing: "West", area: 1285 }, { facing: "West", area: 1220 }],
  13: [{ facing: "East", area: 1570 }, { facing: "East", area: 1370 }],
  12: [{ facing: "East", area: 1050 }, { facing: "East", area: 990  }],
  11: [{ facing: "East", area: 1060 }, { facing: "East", area: 990  }],
  10: [{ facing: "West", area: 1625 }, { facing: "West", area: 1560 }],
  9:  [{ facing: "West", area: 1590 }, { facing: "West", area: 1540 }],
  8:  [{ facing: "East", area: 1625 }, { facing: "East", area: 1450 }],
  6:  [{ facing: "East", area: 1610 }, { facing: "East", area: 1450 }],
  5:  [{ facing: "West", area: 1255 }, { facing: "West", area: 1220 }],
  4:  [{ facing: "West", area: 1570 }, { facing: "West", area: 1370 }],
  3:  [{ facing: "East", area: 1055 }, { facing: "East", area: 990  }],
  2:  [{ facing: "East", area: 1055 }, { facing: "East", area: 990  }],
  1:  [{ facing: "East", area: 1520 }, { facing: "East", area: 1360 }],
};

function nearestFloor(floor: number): number {
  const keys = Object.keys(FLOOR_3D_MAP).map(Number);
  return keys.reduce((best, k) =>
    Math.abs(k - floor) < Math.abs(best - floor) ? k : best
  );
}

/* ═══════════════════════════════════════════════════════════
   UNIT DATA — Generated from FLOOR_3D_MAP + manual demo data
═══════════════════════════════════════════════════════════ */

type NvStatus = "available" | "hold" | "sold";
interface NvUnit {
  id: string;
  number: string;
  type: string;       // "2 BHK" | "3 BHK" | "2.5 BHK" | "3 BHK+"
  floor: number;
  area: number;
  facing: "East" | "West";
  priceCr: number;
  status: NvStatus;
}

/** Map area → unit type */
function areaToType(area: number): string {
  if (area <= 1000) return "2 BHK";
  if (area <= 1300) return "2.5 BHK";
  if (area <= 1550) return "3 BHK";
  return "3 BHK+";
}

/** Generate ~46 units across floors */
function buildUnits(): NvUnit[] {
  const units: NvUnit[] = [];
  const sortedFloors = Object.keys(FLOOR_3D_MAP).map(Number).sort((a, b) => a - b);
  let counter = 0;

  for (const floor of sortedFloors) {
    const entries = FLOOR_3D_MAP[floor];
    entries.forEach((e, idx) => {
      counter += 1;
      // status mix: ~85% available, 10% hold, 5% sold
      const r = (counter * 13) % 20;
      const status: NvStatus = r < 17 ? "available" : r < 19 ? "hold" : "sold";
      // pricing: rough rate ₹6,000-7,200/sqft based on floor
      const ratePerSqft = 5800 + floor * 50;
      const priceCr = +((e.area * ratePerSqft) / 1e7).toFixed(2);
      const unitNum = `${6000 + floor * 4 + idx}`.padStart(4, "0");
      units.push({
        id: `u-${unitNum}`,
        number: unitNum,
        type: areaToType(e.area),
        floor,
        area: e.area,
        facing: e.facing,
        priceCr,
        status,
      });
    });
    if (units.length >= 46) break;
  }
  return units.slice(0, 46);
}

const NV_UNITS: NvUnit[] = buildUnits();

/* ═══════════════════════════════════════════════════════════
   3D IMAGE PATH BUILDER
═══════════════════════════════════════════════════════════ */
function get3DPaths(u: NvUnit): string[] {
  function urlsForFloor(floorNum: number): string[] {
    const entries = FLOOR_3D_MAP[floorNum];
    if (!entries?.length) return [];
    const pad = String(floorNum).padStart(2, "0");
    const sorted = [...entries].sort((a, b) => {
      const aMatch = a.facing === u.facing ? 0 : 1;
      const bMatch = b.facing === u.facing ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return Math.abs(a.area - u.area) - Math.abs(b.area - u.area);
    });
    return sorted.map(e => `${BASE_3D}/${pad}-${e.facing}-${e.area}-SFT.png`);
  }
  const exact = urlsForFloor(u.floor);
  const closest = nearestFloor(u.floor);
  const fallback = closest !== u.floor ? urlsForFloor(closest) : [];
  return [...new Set([...exact, ...fallback])];
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTS — UNIT IMAGE WITH AUTO FALLBACK
═══════════════════════════════════════════════════════════ */
function UnitImageFallback() {
  return (
    <div className="nv-uc-img-fallback">
      <svg width="120" height="80" viewBox="0 0 100 70" style={{ opacity: 0.55 }}>
        <rect x="4" y="4" width="42" height="58" fill="rgba(196,154,60,0.1)" stroke="#C49A3C" strokeWidth="1" />
        <rect x="9" y="9" width="14" height="18" fill="rgba(196,154,60,0.08)" stroke="#C49A3C" strokeWidth="0.6" />
        <rect x="27" y="9" width="14" height="18" fill="rgba(196,154,60,0.08)" stroke="#C49A3C" strokeWidth="0.6" />
        <rect x="9" y="34" width="32" height="22" fill="rgba(196,154,60,0.08)" stroke="#C49A3C" strokeWidth="0.6" />
        <rect x="54" y="4" width="42" height="58" fill="rgba(74,132,212,0.1)" stroke="#4A84D4" strokeWidth="1" />
        <rect x="59" y="9" width="14" height="18" fill="rgba(74,132,212,0.08)" stroke="#4A84D4" strokeWidth="0.6" />
        <rect x="77" y="9" width="14" height="18" fill="rgba(74,132,212,0.08)" stroke="#4A84D4" strokeWidth="0.6" />
        <rect x="59" y="34" width="32" height="22" fill="rgba(74,132,212,0.08)" stroke="#4A84D4" strokeWidth="0.6" />
        <line x1="50" y1="4" x2="50" y2="62" stroke="#C49A3C" strokeWidth="0.5" strokeDasharray="3,2" />
        <text x="25" y="28" textAnchor="middle" fontSize="6" fill="#C49A3C" fontFamily="DM Sans">BED</text>
        <text x="75" y="28" textAnchor="middle" fontSize="6" fill="#4A84D4" fontFamily="DM Sans">BED</text>
        <text x="25" y="48" textAnchor="middle" fontSize="6" fill="#C49A3C" fontFamily="DM Sans">LIVING</text>
        <text x="75" y="48" textAnchor="middle" fontSize="6" fill="#4A84D4" fontFamily="DM Sans">LIVING</text>
      </svg>
    </div>
  );
}

function Unit3DImage({ unit }: { unit: NvUnit }) {
  const paths = get3DPaths(unit);
  const [tryIdx, setTryIdx] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  useEffect(() => { setTryIdx(0); setAllFailed(false); }, [unit.id]);

  const onError = () => {
    if (tryIdx + 1 < paths.length) setTryIdx(i => i + 1);
    else setAllFailed(true);
  };

  if (!paths.length || allFailed) return <UnitImageFallback />;
  return (
    <img
      key={paths[tryIdx]}
      src={paths[tryIdx]}
      alt={`Unit ${unit.number} 3D render`}
      onError={onError}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   SELECT-A-UNIT COMPONENT
═══════════════════════════════════════════════════════════ */
const STATUS_LABEL: Record<NvStatus, string> = {
  available: "Available", hold: "On Hold", sold: "Sold",
};
const STATUS_BADGE_CLS: Record<NvStatus, string> = {
  available: "nv-b-avail", hold: "nv-b-hold", sold: "nv-b-sold",
};

function pageNums(cur: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const set = new Set([0, total - 1, cur, cur - 1, cur + 1].filter(n => n >= 0 && n < total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - (sorted[i - 1] as number) > 1) out.push("…");
    out.push(n);
  });
  return out;
}

function SelectAUnit() {
  const PAGE_SIZE = 10;
  const ALL_TYPES = ["All Types", "2 BHK", "2.5 BHK", "3 BHK", "3 BHK+"];

  const [activeType, setActiveType] = useState<string>("All Types");
  const [selId, setSelId] = useState<string>(NV_UNITS[0].id);
  const [page, setPage] = useState(0);

  const filtered = activeType === "All Types"
    ? NV_UNITS
    : NV_UNITS.filter(u => u.type === activeType);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selected = NV_UNITS.find(u => u.id === selId) || NV_UNITS[0];

  const ucCls = (u: NvUnit) => [
    "nv-uc",
    u.status === "hold" ? "hold" : "",
    u.status === "sold" ? "unavail" : "",
    u.id === selId ? "sel" : "",
  ].filter(Boolean).join(" ");

  const handleClick = (u: NvUnit) => {
    if (u.status === "sold") return;
    setSelId(u.id);
  };

  return (
    <section className="nv-units-section" id="units">
      <div className="nv-container">
        {/* Header + Legend */}
        <div className="nv-units-head">
          <h2 className="nv-units-title">Select a <em>Unit</em></h2>
          <div className="nv-units-legend">
            <div className="nv-units-leg-item"><span className="nv-units-leg-dot nv-units-leg-avail" />Available</div>
            <div className="nv-units-leg-item"><span className="nv-units-leg-dot nv-units-leg-hold" />On Hold</div>
            <div className="nv-units-leg-item"><span className="nv-units-leg-dot nv-units-leg-sold" />Sold</div>
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="nv-units-tabs">
          {ALL_TYPES.map(t => (
            <button
              key={t}
              className={`nv-units-tab${activeType === t ? " on" : ""}`}
              onClick={() => { setActiveType(t); setPage(0); }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Unit grid */}
        {paginated.length > 0 ? (
          <div className="nv-units-grid">
            {paginated.map(u => (
              <button
                key={u.id}
                className={ucCls(u)}
                onClick={() => handleClick(u)}
                aria-label={`Select unit ${u.number}`}
              >
                <div className="nv-uc-text">
                  <div className="nv-uc-id">{u.number}</div>
                  <div className="nv-uc-type">{u.type} · Fl.{u.floor}</div>
                  <div className="nv-uc-price">₹{u.priceCr.toFixed(2)} Cr</div>
                  <span className={`nv-uc-badge ${STATUS_BADGE_CLS[u.status]}`}>
                    {STATUS_LABEL[u.status]}
                  </span>
                </div>
                <div className="nv-uc-img"><Unit3DImage unit={u} /></div>
              </button>
            ))}
          </div>
        ) : (
          <p style={{ color: "#8A7D60", fontSize: 13, padding: "1.5rem 0" }}>
            No units match this filter.
          </p>
        )}

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="nv-units-pagination">
            <div className="nv-units-pag-info">
              Showing <strong>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong> units
            </div>
            <div className="nv-units-pag-controls">
              <button className="nv-units-pag-btn" disabled={page === 0}
                onClick={() => setPage(p => p - 1)} aria-label="Previous page">‹</button>
              {pageNums(page, totalPages).map((n, i) =>
                n === "…"
                  ? <span key={`d${i}`} className="nv-units-pag-dots">…</span>
                  : <button key={n}
                      className={`nv-units-pag-btn${page === n ? " active" : ""}`}
                      onClick={() => setPage(n as number)}>
                      {(n as number) + 1}
                    </button>
              )}
              <button className="nv-units-pag-btn" disabled={page === totalPages - 1}
                onClick={() => setPage(p => p + 1)} aria-label="Next page">›</button>
            </div>
          </div>
        )}

        {/* Selected unit detail panel */}
        {selected && (
          <div className="nv-unit-detail">
            <div className="nv-detail-col">
              <div className="nv-detail-hd">Unit Details</div>
              <div className="nv-detail-row"><span className="nv-detail-k">Unit No.</span><span className="nv-detail-v">{selected.number}</span></div>
              <div className="nv-detail-row"><span className="nv-detail-k">Type</span><span className="nv-detail-v">{selected.type}</span></div>
              <div className="nv-detail-row"><span className="nv-detail-k">Floor</span><span className="nv-detail-v">{selected.floor}{selected.floor === 1 ? "st" : selected.floor === 2 ? "nd" : selected.floor === 3 ? "rd" : "th"} Floor</span></div>
              <div className="nv-detail-row"><span className="nv-detail-k">Carpet Area</span><span className="nv-detail-v">{selected.area.toLocaleString()} sqft</span></div>
              <div className="nv-detail-row"><span className="nv-detail-k">Builtup</span><span className="nv-detail-v">{Math.round(selected.area * 1.12).toLocaleString()} sqft</span></div>
              <div className="nv-detail-row"><span className="nv-detail-k">Facing</span><span className="nv-detail-v">{selected.facing}</span></div>
            </div>
            <div className="nv-detail-col">
              <div className="nv-detail-hd">Pricing</div>
              <div className="nv-detail-row"><span className="nv-detail-k">Base price</span><span className="nv-detail-v">₹{(selected.priceCr * 0.85).toFixed(2)} Cr</span></div>
              <div className="nv-detail-row"><span className="nv-detail-k">Floor rise</span><span className="nv-detail-v">₹{(selected.priceCr * 0.05).toFixed(2)} Cr</span></div>
              <div className="nv-detail-row"><span className="nv-detail-k">Car park</span><span className="nv-detail-v">₹0.06 Cr</span></div>
              <div className="nv-detail-row"><span className="nv-detail-k">Club membership</span><span className="nv-detail-v">₹0.04 Cr</span></div>
              <div className="nv-detail-price">₹{selected.priceCr.toFixed(2)} Cr</div>
              <div className="nv-detail-note">GST additional as applicable</div>
            </div>
            <div className="nv-detail-col">
              <div className="nv-detail-hd">Actions</div>
              <p style={{ fontSize: 12, color: "#8A7D60", lineHeight: 1.6, marginBottom: 14, marginTop: 4 }}>
                {selected.status === "available"
                  ? "This unit is available. Click below to express interest — our team will reach out within 2 hours."
                  : selected.status === "hold"
                  ? "This unit is currently on hold. You may still register your interest."
                  : "This unit has been sold. Browse other available units above."}
              </p>
              <button className="nv-expr-btn" disabled={selected.status === "sold"}
                onClick={() => { window.location.href = "/contact?unit=" + selected.number; }}>
                Express Interest →
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLOATING HELP BUBBLE
═══════════════════════════════════════════════════════════ */
function HelpBubble() {
  return (
    <button className="nv-help-bubble"
      onClick={() => { window.location.href = "/contact"; }}
      aria-label="Need help finding your home">
      <span className="nv-help-bubble-icon">📍</span>
      <span className="nv-help-bubble-text">
        <span>Need help finding</span>
        <small>your home?</small>
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO SECTION
═══════════════════════════════════════════════════════════ */
const HERO_SLIDES = [
  { src: "/media/project/images/d4d4f0629db2460bb11adc38be511af2.webp", alt: "Nile Valley — Project View" },
  { src: "/media/project/images/NileValley.jpg", alt: "Nile Valley — Tower View" },
  
];

function Hero() {
  const [idx, setIdx] = useState(0);
  const total = HERO_SLIDES.length;

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % total), 4000);
    return () => clearInterval(t);
  }, []);

  const prev = () => setIdx(i => (i - 1 + total) % total);
  const next = () => setIdx(i => (i + 1) % total);

  return (
    <div className="nv-hero">
      {HERO_SLIDES.map((slide, i) => (
        <img key={slide.src} src={slide.src} alt={slide.alt}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            opacity: i === idx ? 1 : 0,
            transition: "opacity 0.9s ease-in-out",
            zIndex: 0,
          }}
        />
      ))}
      <div className="nv-hero-overlay" />

      <button onClick={prev} aria-label="Previous slide"
        style={{
          position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)",
          zIndex: 20, background: "rgba(255,255,255,0.18)",
          border: "1.5px solid rgba(255,255,255,0.4)", color: "#fff",
          width: 44, height: 44, borderRadius: "50%", fontSize: 22, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>‹</button>
      <button onClick={next} aria-label="Next slide"
        style={{
          position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
          zIndex: 20, background: "rgba(255,255,255,0.18)",
          border: "1.5px solid rgba(255,255,255,0.4)", color: "#fff",
          width: 44, height: 44, borderRadius: "50%", fontSize: 22, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>›</button>

      <div className="nv-hero-content">
        <div className="nv-hero-eyebrow">Janapriya Projects · Hyderabad</div>
        <h1 className="nv-hero-title">Nile <em>Valley</em></h1>
        <p className="nv-hero-sub">
          Premium 2 &amp; 3 BHK Sky Residences · 30 floors of refined living<br />
          Starting ₹0.76 Cr Onwards · RERA Registered
        </p>
        <div className="nv-hero-btns">
          <a href="#units" className="nv-btn-primary">Select a Unit</a>
          <a href="#overview" className="nv-btn-outline">Explore Project</a>
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{
        position: "absolute", bottom: 96, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 6, zIndex: 20,
      }}>
        {HERO_SLIDES.map((_, i) => (
          <div key={i} onClick={() => setIdx(i)}
            style={{
              width: i === idx ? 24 : 8, height: 8, borderRadius: 4,
              background: i === idx ? "#C49A3C" : "rgba(255,255,255,0.5)",
              cursor: "pointer", transition: "width 0.3s",
            }}
          />
        ))}
      </div>

      {/* Stats bar */}
      <div className="nv-hero-stats">
        {[
          { num: "G+9",     label: "Floors" },
          { num: "2, 3",    label: "BHK Types" },
          { num: "980–1635",  label: "Sq ft range" },
          { num: "Ready To Move",    label: "Possession" },
          
        ].map(s => (
          <div key={s.label} className="nv-stat-item">
            <div className="nv-stat-num">{s.num}</div>
            <div className="nv-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW
═══════════════════════════════════════════════════════════ */
function Overview() {
  return (
    <section id="overview" className="nv-section" style={{ background: "#fff" }}>
      <div className="nv-container">
        <div className="nv-overview-grid">
          <div className="nv-overview-img">
            <img src="/media/project/images/NileValley-Overview.jpg" alt="Nile Valley Overview" />
          </div>
          <div className="nv-overview-body">
            <div className="nv-section-tag">Project Overview</div>
            <h2 className="nv-section-title">Sky Living, <em>Refined</em></h2>
            <p>
              Nile Valley is Janapriya's flagship high-rise destination — a 30-storey tower of meticulously crafted 2 &amp; 3 BHK residences in the heart of Hyderabad's growth corridor.
            </p>
            <p>
              Every unit is engineered for cross ventilation, panoramic city views and Vaastu-compliance, with premium finishes and floor-to-ceiling glazing that maximises natural light.
            </p>
            <ul className="nv-overview-list">
              <li>30-storey tower · 184 premium units</li>
              <li>2 BHK (990–1095 sqft) · 3 BHK (1220–1635 sqft)</li>
              <li>East &amp; West facing options on every floor</li>
              <li>Floor-to-ceiling windows · Italian marble flooring</li>
              <li>Modular kitchen · VRF AC provisions</li>
              <li>Sky lounge on the 30th floor with city views</li>
            </ul>
            <a href="#" className="nv-dl-btn">
              <span>↓</span> Download Brochure
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   TYPOLOGY
═══════════════════════════════════════════════════════════ */
function Typology() {
  return (
    <section className="nv-section nv-typology-section">
      <div className="nv-container">
        <div className="nv-typology-tag-row">
          <div className="nv-section-tag" style={{ margin: 0 }}>Residence Typology</div>
          <span className="nv-typology-badge">Sky Residences</span>
        </div>
        <h2 className="nv-section-title">High-Rise <em>Living</em></h2>
        <div className="nv-typology-grid">
          <div>
            <p style={{ fontSize: "0.95rem", color: "#666", fontWeight: 300, lineHeight: 1.8, marginBottom: "1.5rem" }}>
              Thirty floors of considered design — every unit positioned to capture light, ventilation and views. Choose your altitude, your orientation, your view.
            </p>
            <div className="nv-typology-specs">
              {[
                { label: "Floors", value: "G+9" },
                { label: "Configurations", value: "2 / 2.5 / 3 BHK" },
                { label: "Area Range", value: "990 – 1635 sqft" },
                { label: "Possession", value: "Ready To Move" },
              ].map(s => (
                <div key={s.label} className="nv-spec-box">
                  <div className="label">{s.label}</div>
                  <div className="value">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="nv-typology-img">
            <img src="/media/project/images/NileValley-Typology.jpg" alt="Tower Typology" style={{ height: 360 }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FEATURES
═══════════════════════════════════════════════════════════ */
function Features() {
  const features = [
    { icon: "🏢", name: "30-Storey Tower", desc: "Hyderabad's signature skyline destination", num: null },
    { icon: "🏊", name: "Sq Ft Pool Deck", desc: "", num: "8,500" },
    { icon: "🌅", name: "Sky Lounge", desc: "Top-floor lounge with panoramic views", num: null },
    { icon: "🏛️", name: "Sq Ft Clubhouse", desc: "", num: "12,000" },
  ];

  return (
    <section className="nv-section nv-features-section">
      <div className="nv-container">
        <div className="nv-features-title">
          <div className="nv-section-tag" style={{ textAlign: "center" }}>Highlights</div>
          <h2 className="nv-section-title" style={{ textAlign: "center", margin: "0 auto" }}>
            What Makes Nile Valley <em>Exceptional</em>
          </h2>
          <p style={{ fontSize: "0.95rem", color: "#888", fontWeight: 300, maxWidth: 580, margin: "0.5rem auto 0", textAlign: "center" }}>
            A confluence of altitude, design, and world-class amenities — engineered for elevated living.
          </p>
        </div>
        <div className="nv-features-grid">
          {features.map(f => (
            <div key={f.name} className="nv-feature-card">
              <div className="nv-feature-icon">{f.icon}</div>
              {f.num && <div className="nv-feature-num">{f.num}</div>}
              <div className="nv-feature-name">{f.name}</div>
              {f.desc && <div className="nv-feature-desc">{f.desc}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   AMENITIES
═══════════════════════════════════════════════════════════ */
function Amenities() {
  return (
    <section className="nv-section nv-amenities-section">
      <div className="nv-container">
        <div className="nv-section-tag">Lifestyle</div>
        <h2 className="nv-section-title">World-Class <em>Amenities</em></h2>
        <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.7)", fontWeight: 300, marginBottom: "2.5rem", maxWidth: 540 }}>
          Sixteen carefully curated amenities — each designed to transform routine into ritual.
        </p>
        <div className="nv-amenities-grid">
          {AMENITIES.map(a => (
            <div key={a.name} className="nv-amenity-item">
              <div className="nv-amenity-icon">{a.icon}</div>
              <div className="nv-amenity-name">{a.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   GALLERY
═══════════════════════════════════════════════════════════ */
function Gallery() {
  const items = [
    { src: "/media/project/images/g1.jpg", tall: true },
    { src: "/media/project/images/g2.jpg" },
    { src: "/media/project/images/g3.jpg" },
    { src: "/media/project/images/g4.jpg" },
    { src: "/media/project/images/g5.jpg" },
    { src: "/media/project/images/g6.jpg" },
    { src: "/media/project/images/g7.jpg" },
    { src: "/media/project/images/g8.jpg" },
    { src: "/media/project/images/g9.jpg" },
	{ src: "/media/project/images/g10.jpg" },
    { src: "/media/project/images/g11.jpg" },
  ];

  return (
    <section className="nv-gallery-section">
      <div className="nv-gallery-header">
        <div className="nv-section-tag">Visual Tour</div>
        <h2 className="nv-section-title">Project <em>Gallery</em></h2>
      </div>
      <div className="nv-gallery-grid">
        {items.map((item, i) => (
          <div key={i} className={`nv-gallery-item${item.tall ? " tall" : ""}`}>
            <img src={item.src} alt={`Nile Valley ${i + 1}`} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLOOR PLANS
═══════════════════════════════════════════════════════════ */
function FloorPlans() {
  const [active, setActive] = useState(FLOOR_PLANS[0].id);
  const plan = FLOOR_PLANS.find(p => p.id === active)!;

  return (
    <section className="nv-section nv-floor-section">
      <div className="nv-container">
        <div className="nv-section-tag">Layouts</div>
        <h2 className="nv-section-title">Floor <em>Plans</em></h2>
        <p style={{ fontSize: "0.95rem", color: "#888", fontWeight: 300, marginBottom: "2.5rem", maxWidth: 540 }}>
          Four meticulously planned configurations — designed for space, light, and family living at altitude.
        </p>
        <div className="nv-floor-layout">
          <div className="nv-floor-tabs">
            {FLOOR_PLANS.map(fp => (
              <button key={fp.id}
                className={`nv-floor-tab${active === fp.id ? " active" : ""}`}
                onClick={() => setActive(fp.id)}>
                {fp.label}
                <span className="nv-tab-size">{fp.sizes[0].v}</span>
              </button>
            ))}
          </div>
          <div className="nv-floor-panel">
            <div className="nv-floor-sizes">
              {plan.sizes.map(s => (
                <div key={s.l} className="nv-floor-size-item">
                  <div className="nv-floor-size-label">{s.l}</div>
                  <div className="nv-floor-size-val">{s.v}</div>
                </div>
              ))}
            </div>
            <img src={plan.img} alt={plan.label} className="nv-floor-img"
              style={{ maxHeight: 380, objectFit: "contain" }}
              onError={e => { (e.target as HTMLImageElement).src = "/nilevalley-fp-placeholder.jpg"; }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAYMENT PLAN
═══════════════════════════════════════════════════════════ */
function PaymentPlan() {
  return (
    <section className="nv-payment-section">
      <div className="nv-container">
        <div className="nv-section-tag">Construction-Linked Plan</div>
        <h2 className="nv-section-title">Payment <em>Schedule</em></h2>
        <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.7)", fontWeight: 300, marginBottom: "2.5rem", maxWidth: 540 }}>
          Transparent, milestone-based payments aligned with construction progress.
        </p>
        <div className="nv-payment-grid">
          {PAYMENT_STEPS.map(s => (
            <div key={s.label} className={`nv-payment-step${s.active ? " hi" : ""}`}>
              <div className="nv-payment-num">{s.num}</div>
              <div className="nv-payment-lbl">{s.label}</div>
              <div className="nv-payment-ms">{s.milestone}</div>
              <div className="nv-payment-wh">{s.when}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   LOCATION
═══════════════════════════════════════════════════════════ */
function Location() {
  return (
    <section className="nv-section nv-location-section">
      <div className="nv-container">
        <div className="nv-section-tag">Connectivity</div>
        <h2 className="nv-section-title">A Prime <em>Address</em><br />in Hyderabad</h2>
        <div className="nv-location-grid">
          <div className="nv-location-details">
            {LOCATION_DATA.map(cat => (
              <div key={cat.cat} className="nv-location-cat">
                <h4>{cat.cat}</h4>
                <div className="nv-location-items">
                  {cat.items.map(item => (
                    <div key={item.name} className="nv-location-row">
                      <span className="name">{item.name}</span>
                      <span className="dist">{item.dist}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="nv-map-placeholder">
            <iframe
              title="Nile Valley Location Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d30445.6!2d78.45!3d17.45!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDI3JzAwLjAiTiA3OMKwMjcnMDAuMCJF!5e0!3m2!1sen!2sin!4v1!5m2!1sen!2sin"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CTA
═══════════════════════════════════════════════════════════ */
function ContactCTA() {
  return (
    <div className="nv-cta-section">
      <h2>Interested in <em>Nile Valley</em>?</h2>
      <p>Schedule a site visit and experience the views first-hand.</p>
      <Link href="/contact" className="nv-cta-btn">Book a Site Visit →</Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function NileValleyPage() {
  return (
    <main className="nv-page" style={{ minHeight: "100vh", overflowX: "hidden" }}>
      <style>{PAGE_STYLES}</style>
      <Navbar />
      <Hero />
      <Overview />
      <Typology />
      <Features />
      <Amenities />
      <Gallery />
      <FloorPlans />
      <SelectAUnit />
      <PaymentPlan />
      <Location />
      <ContactCTA />
      <Footer />
      <HelpBubble />
    </main>
  );
}