"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import Footer from "@/components/Footer";

/* ─────────────────────────────────────────
   Static project data (from WordPress source)
───────────────────────────────────────── */
interface Project {
  id: string;
  name: string;
  location: string;
  city: string;
  price?: string;
  typology?: string;
  plannedCompletion?: string;
  images: string[];
  url?: string;
  stage: "ongoing" | "upcoming" | "completed";
  completedYear?: string;
}

const PROJECTS: Project[] = [
  // ── Ongoing ──────────────────────────────────────────────────────────────
  {
    id: "first-light",
    name: "First Light",
    location: "Bachupally",
    city: "Hyderabad",
    price: "₹1 Cr Onwards",
    typology: "3 BHK",
    plannedCompletion: "October 2027",
    images: [
      "/FLimages-01.jpg",
      "/FLimages-02.jpg",
      "/FLimages-03.jpg",
    ],
    url: "/projects/first-light",
    stage: "ongoing",
  },
  {
    id: "bahiti",
    name: "Bahiti",
    location: "Chandanagar",
    city: "Hyderabad",
    price: "₹1.56 Cr Onwards",
    typology: "3 BHK",
    plannedCompletion: "December 2027",
    images: ["/Bahiti.webp"],
    url: "/projects/bahiti",
    stage: "ongoing",
  },
  {
    id: "altair",
    name: "Altair",
    location: "Sainikpuri",
    city: "Hyderabad",
    typology: "3 BHK",
    images: ["/altair-1-scaled.jpg"],
    url: "/projects/altair",
    stage: "ongoing",
  },
  {
    id: "nile-valley",
    name: "Nile Valley",
    location: "Chanda Nagar",
    city: "Hyderabad",
    price: "₹80.72 L Onwards",
    typology: "2 & 3 BHK",
    plannedCompletion: "December 2027",
    images: [
      "/nile-vally.webp",
      "/nile-valley-banner-01.webp",
      "/nile-valley-banner-02.webp",
    ],
    url: "/projects/nile-valley",
    stage: "ongoing",
  },
  {
    id: "sitara",
    name: "Sitara",
    location: "Sainikpuri",
    city: "Hyderabad",
    price: "₹35.72 L Onwards",
    typology: "2 BHK",
    plannedCompletion: "Ready To Move",
    images: [
      "/Sitara.webp",
      "/sitara-banner-01.webp",
      "/sitara-banner-02.webp",
    ],
    url: "/projects/sitara",
    stage: "ongoing",
  },
  {
    id: "lakefront",
    name: "Lakefront",
    location: "Sainikpuri",
    city: "Hyderabad",
    price: "₹50.55 L Onwards",
    typology: "2 & 3 BHK",
    plannedCompletion: "Ready To Move",
    images: [
      "/lakefront-gallery-01.webp",
    ],
    url: "/projects/lakefront",
    stage: "ongoing",
  },
  {
    id: "y-junction",
    name: "Y - Junction",
    location: "Kukatpally",
    city: "Hyderabad",
    price: "₹1.37 Cr Onwards",
    typology: "3 BHK",
    images: [
      "/Y-Junction.webp",
      "/y-junction-banner-02.webp",
      "/y-junction-banner-03.webp",
    ],
    url: "/project-y-junction-kukatpally",
    stage: "ongoing",
  },
  {
    id: "corner-office",
    name: "Corner Office",
    location: "Chanda Nagar",
    city: "Hyderabad",
    plannedCompletion: "Ready To Move",
    images: ["/corner-office.png"],
    url: "/projects/nubia",
    stage: "ongoing",
  },

  // ── Upcoming ──────────────────────────────────────────────────────────────
  {
    id: "batasingaram",
    name: "Batasingaram",
    location: "Ramoji Film City",
    city: "Hyderabad",
    typology: "Villa",
    images: [
      "/batasingaram.webp",
      "/batasingaram-banner-01.webp",
      "/batasingaram-banner-02.webp",
    ],
	url:"/projects/elysium",
    stage: "upcoming",
  },
  {
    id: "windsong",
    name: "Windsong",
    location: "Banashankari",
    city: "Bangalore",
    typology: "3 BHK",
    images: [
      "/windsong.webp",
      "/windsong-banner-01.webp",
      "/windsong-banner-02.webp",
    ],
    stage: "upcoming",
  },
  {
    id: "pinegrove",
    name: "Pinegrove",
    location: "Rayasandra",
    city: "Bangalore",
    typology: "3 BHK",
    images: [
      "/pinegrove-banner-01.webp",
      "/pinegrove-banner-02.webp",
      "/pinegrove-banner-03.webp",
    ],
    stage: "upcoming",
  },

  // ── Completed ─────────────────────────────────────────────────────────────
  {
    id: "office-one",
    name: "Office One",
    location: "White Field",
    city: "Bangalore",
    price: "48.42 L Onwards",
    typology: "Commercial",
    images: ["/Office-One.webp"],
    url: "/office-one-white-field",
    stage: "completed",
  },
  {
    id: "silver-crest",
    name: "Silver Crest",
    location: "Sainikpuri",
    city: "Hyderabad",
    typology: "Villa",
    completedYear: "2019",
    images: ["/silvercrest.webp"],
    stage: "completed",
  },
  {
    id: "silver-meadows",
    name: "Silver Meadows",
    location: "Sainikpuri",
    city: "Hyderabad",
    typology: "Studio & 1 BHK",
    images: ["/silver-meadow.webp"],
    stage: "completed",
  },
  {
    id: "metropolis",
    name: "Metropolis",
    location: "Moti Nagar",
    city: "Hyderabad",
    typology: "2 & 3 BHK",
    completedYear: "2010",
    images: ["/classichomes.webp"],
    stage: "completed",
  },
  {
    id: "classic-homes",
    name: "Classic Homes",
    location: "Moti Nagar",
    city: "Hyderabad",
    typology: "2 & 3 BHK",
    images: ["/metropolis.webp"],
    stage: "completed",
  },
  {
    id: "arcadia",
    name: "Arcadia",
    location: "Kowkur",
    city: "Hyderabad / Secunderabad",
    typology: "2 & 3 BHK",
    completedYear: "2010",
    images: ["/arcadia.webp"],
    stage: "completed",
  },
  {
    id: "grandeur",
    name: "Grandeur",
    location: "Himayath Nagar",
    city: "Hyderabad",
    typology: "3 BHK",
    completedYear: "2015",
    images: [
      "/janapriya-himayat-nagarREV01.webp",
      "/janapriya-himayat-nagarREV02.webp",
    ],
    stage: "completed",
  },
];

/* ─────────────────────────────────────────
   Global responsive styles injected once
───────────────────────────────────────── */
const GLOBAL_STYLES = `
  /* ── Chevron ── */
  .jp-chevron-wrap{position:absolute;width:100%;display:flex;justify-content:center;align-items:center;bottom:40px;height:30px;cursor:pointer;z-index:10;}
  .jp-chevron{position:relative;width:28px;height:8px;opacity:0;transform:scale3d(.5,.5,.5);animation:jpchevanim 3s ease-out infinite;}
  .jp-chevron:nth-child(1){animation-delay:0s;}.jp-chevron:nth-child(2){animation-delay:1s;}.jp-chevron:nth-child(3){animation-delay:2s;}
  .jp-chevron::before,.jp-chevron::after{content:'';position:absolute;top:0;height:100%;width:51%;background:#ed1a3b;}
  .jp-chevron::before{left:0;transform:skew(0deg,30deg);}.jp-chevron::after{right:0;width:50%;transform:skew(0deg,-30deg);}
  @keyframes jpchevanim{25%{opacity:1;}33%{opacity:1;transform:translateY(30px);}67%{opacity:1;transform:translateY(40px);}100%{opacity:0;transform:translateY(55px) scale3d(.5,.5,.5);}}
  @keyframes spin{to{transform:rotate(360deg);}}

  /* ── Project row layout ── */
  .jp-row {
    display: flex;
    min-height: 100vh;
  }
  .jp-col-image {
    position: relative;
    min-height: 100vh;
  }
  .jp-col-detail {
    background: #fff;
    display: flex;
    align-items: stretch;
  }

  /* ── Mobile overrides ── */
  @media (max-width: 767px) {
    .jp-row {
      flex-direction: column !important;
      min-height: unset !important;
    }
    .jp-row.jp-odd {
      flex-direction: column-reverse !important;
    }
    .jp-col-image {
      width: 100% !important;
      flex: none !important;
      min-height: 60vw !important;
      height: 72vw !important;
    }
    .jp-col-detail {
      width: 100% !important;
      flex: none !important;
      min-height: unset !important;
    }
    .jp-detail-inner {
      padding: 2rem 1.5rem !important;
      align-items: flex-start !important;
      text-align: left !important;
    }
    .jp-detail-inner h2 {
      font-size: 1.8rem !important;
      text-align: left !important;
    }
    .jp-detail-inner h3 {
      font-size: 0.95rem !important;
      text-align: left !important;
      margin-bottom: 1.5rem !important;
    }
    .jp-fields-grid {
      grid-template-columns: 1fr 1fr !important;
      column-gap: 1rem !important;
      row-gap: 1rem !important;
    }
    .jp-field-cell {
      text-align: left !important;
    }
    .jp-section-heading {
      padding: 2rem 1rem !important;
    }
    .jp-contact-section {
      padding: 3rem 1.5rem 4rem !important;
    }
    .jp-hero {
      height: 70vh !important;
    }
    .jp-hero-text {
      left: 20px !important;
      bottom: 12% !important;
    }
  }

  @media (max-width: 480px) {
    .jp-col-image {
      min-height: 56vw !important;
      height: 80vw !important;
    }
    .jp-detail-inner h2 {
      font-size: 1.5rem !important;
    }
    .jp-fields-grid {
      grid-template-columns: 1fr !important;
    }
    .jp-hero {
      height: 60vh !important;
    }
  }
`;

/* ─────────────────────────────────────────
   Build display fields from a Project
───────────────────────────────────────── */
function buildFields(p: Project) {
  return [
    { label: "City",               value: p.city },
    ...(p.price                    ? [{ label: "Price",              value: p.price }] : []),
    ...(p.typology                 ? [{ label: "Typology",           value: p.typology }] : []),
    ...(p.plannedCompletion        ? [{ label: "Planned Completion", value: p.plannedCompletion }] : []),
    ...(p.completedYear            ? [{ label: "Completed",          value: p.completedYear }] : []),
  ];
}

/* ─────────────────────────────────────────
   Chevron scroll-down
───────────────────────────────────────── */
function ChevronDown() {
  return (
    <div className="jp-chevron-wrap">
      <div className="jp-chevron" /><div className="jp-chevron" /><div className="jp-chevron" />
    </div>
  );
}

/* ─────────────────────────────────────────
   Hero banner carousel
───────────────────────────────────────── */
function HeroBanner() {
  const heroData = [
    { img: "/elysium.png",                  title: "Elysium",          location: "Batasingaram" },
    { img: "/first-light-banner.jpg",       title: "First Light",      location: "Bachupally"   },
    { img: "/nile-valley-main-banner.webp", title: "Nile Valley",      location: "Chanda Nagar" },
    { img: "/fulshear-main-banner.webp",    title: "Fulshear Central", location: "Texas"        },
    { img: "/sitara.webp",                  title: "Sitara",           location: "Sainikpuri"   },
    { img: "/pinegrove-main-banner.webp",   title: "Pine Grove",       location: "Rayasandra"   },
    { img: "/wing.webp",                    title: "Windsong",         location: "Banashankari" },
  ];

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % heroData.length), 3000);
    return () => clearInterval(t);
  }, []);

  const current = heroData[idx];

  return (
    <div className="jp-hero" style={{ position:"relative", width:"100%", height:"100vh", overflow:"hidden" }}>
      <img
        key={current.img}
        src={current.img}
        alt="Hero Banner"
        style={{
          position:"absolute", inset:0, width:"100%", height:"100%",
          objectFit:"cover", transition:"opacity 0.8s ease-in-out",
        }}
      />
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(80deg,rgba(20,20,30,0.72) 0%,transparent 65%)" }} />
      <div className="jp-hero-text" style={{ position:"absolute", bottom:"18%", left:50, color:"#fff" }}>
        <h2 style={{ fontSize:"clamp(2rem,5vw,3.8rem)", fontWeight:300, margin:0 }}>{current.title}</h2>
        <h3 style={{ fontSize:"clamp(1rem,2vw,1.4rem)", fontWeight:300, opacity:0.85, marginTop:6 }}>{current.location}</h3>
      </div>
      <button onClick={() => setIdx(i => (i - 1 + heroData.length) % heroData.length)}
        style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", width:40, height:40, borderRadius:"50%", cursor:"pointer" }}>
        ‹
      </button>
      <button onClick={() => setIdx(i => (i + 1) % heroData.length)}
        style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", width:40, height:40, borderRadius:"50%", cursor:"pointer" }}>
        ›
      </button>
      <ChevronDown />
    </div>
  );
}

/* ─────────────────────────────────────────
   Row image carousel — inset rounded on slab
───────────────────────────────────────── */
function RowCarousel({ images, alt, slabColor }: { images: string[]; alt: string; slabColor: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length]);

  const src = images[idx];
  return (
    <div style={{ position:"relative", width:"100%", height:"100%", background:slabColor }}>
      <div style={{
        position:"absolute", top:"8%", bottom:"8%", left:"5%", right:"5%",
        borderRadius:12, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.13)",
      }}>
        {src ? (
          <img
            src={src}
            alt={alt}
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
            onError={(e: any) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"#eee", fontSize:64 }}>🏗️</div>
        )}
      </div>
      {images.length > 1 && (
        <>
          <button onClick={() => setIdx(i => (i - 1 + images.length) % images.length)} aria-label="Prev"
            style={{ position:"absolute", left:"7%", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.82)", border:"none", borderRadius:"50%", width:36, height:36, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", zIndex:5, boxShadow:"0 2px 8px rgba(0,0,0,0.14)" }}>‹</button>
          <button onClick={() => setIdx(i => (i + 1) % images.length)} aria-label="Next"
            style={{ position:"absolute", right:"7%", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.82)", border:"none", borderRadius:"50%", width:36, height:36, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", zIndex:5, boxShadow:"0 2px 8px rgba(0,0,0,0.14)" }}>›</button>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Detail panel
───────────────────────────────────────── */
function DetailPanel({ p, nameColor, align }: { p: Project; nameColor: string; align: "left" | "right" }) {
  const fields = buildFields(p);
  const isRight = align === "right";

  return (
    <div
      className="jp-detail-inner"
      style={{
        display:"flex", flexDirection:"column", justifyContent:"center",
        alignItems: isRight ? "flex-start" : "flex-end",
        height:"100%", width:"100%",
        padding: isRight ? "4rem 3rem 4rem 2rem" : "4rem 2rem 4rem 3rem",
        background:"#fff",
      }}
    >
      <h2 style={{
        fontWeight:400, lineHeight:1.1, color:nameColor,
        fontSize:"clamp(1.8rem,3vw,3rem)", margin:"0 0 4px 0",
        textAlign: isRight ? "right" : "left",
      }}>
        {p.name}
      </h2>
      <h3 style={{
        fontWeight:600, fontSize:"clamp(0.85rem,1.3vw,1.1rem)", color:nameColor,
        margin:"0 0 2.5rem 0", textAlign: isRight ? "right" : "left",
      }}>
        {p.location}
      </h3>

      <div
        className="jp-fields-grid"
        style={{
          display:"grid", gridTemplateColumns:"1fr 1fr",
          columnGap:"2rem", rowGap:"1.2rem", width:"100%", maxWidth:440,
        }}
      >
        {fields.map(f => (
          <div key={f.label} className="jp-field-cell" style={{ textAlign: isRight ? "left" : "right" }}>
            <div style={{ fontSize:"0.78rem", fontWeight:300, color:"#888", lineHeight:1.3, marginBottom:2 }}>{f.label}</div>
            <div style={{ fontSize:"1.05rem", fontWeight:700, color:"#111", lineHeight:1.3 }}>{f.value}</div>
          </div>
        ))}
      </div>

      {p.url && (
        <div style={{ marginTop:"2.5rem" }}>
          <Link
            href={p.url}
            style={{ display:"inline-block", padding:"0.6rem 2rem", background:"#00c2ff", color:"#fff", borderRadius:4, fontWeight:600, fontSize:"0.95rem", textDecoration:"none", letterSpacing:"0.02em" }}
          >
            Know More
          </Link>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Full-height project row
───────────────────────────────────────── */
function ProjectRow({ p, even }: { p: Project; even: boolean }) {
  const slabColor = even ? "#dce8f5" : "#e0f5f0";
  const nameColor = "#2a3e86";

  if (even) {
    return (
      <div className="jp-row" style={{ display:"flex", minHeight:"100vh" }}>
        <div className="jp-col-image" style={{ flex:"0 0 50%", position:"relative", minHeight:"100vh" }}>
          <RowCarousel images={p.images} alt={p.name} slabColor={slabColor} />
        </div>
        <div className="jp-col-detail" style={{ flex:"0 0 50%", background:"#fff", display:"flex", alignItems:"stretch" }}>
          <DetailPanel p={p} nameColor={nameColor} align="right" />
        </div>
      </div>
    );
  }

  return (
    <div className="jp-row jp-odd" style={{ display:"flex", minHeight:"100vh" }}>
      <div className="jp-col-detail" style={{ flex:"0 0 50%", background:"#fff", display:"flex", alignItems:"stretch" }}>
        <DetailPanel p={p} nameColor={nameColor} align="left" />
      </div>
      <div className="jp-col-image" style={{ flex:"0 0 50%", position:"relative", minHeight:"100vh" }}>
        <RowCarousel images={p.images} alt={p.name} slabColor={slabColor} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Section heading
───────────────────────────────────────── */
function SectionHeading({ title }: { title: string }) {
  return (
    <div className="jp-section-heading" style={{ padding:"3rem 1rem", textAlign:"center", background:"#fff" }}>
      <h3 style={{ fontWeight:400, fontSize:"clamp(1.3rem,2.5vw,1.8rem)", color:"#1a1a1a", margin:0 }}>{title}</h3>
    </div>
  );
}

/* ─────────────────────────────────────────
   Contact Us section
───────────────────────────────────────── */
function ContactSection() {
  return (
    <section className="jp-contact-section" style={{ padding:"5rem 2rem 6rem", background:"#fff", textAlign:"center" }}>
      <h3 style={{ fontWeight:400, fontSize:"clamp(2rem,5vw,3.5rem)", color:"#222", margin:"0 0 0.5rem" }}>Contact Us</h3>
      <p style={{ fontWeight:300, fontSize:"1.15rem", color:"#555", margin:"0 0 0.3rem" }}>We will be glad to assist you!</p>
      <p style={{ fontWeight:300, fontSize:"1.05rem", color:"#666", marginBottom:"2.5rem" }}>
        Please send us your queries and one of our team members will reach out to you.
      </p>
      <Link href="/contact"
        style={{ display:"inline-block", padding:"0.75rem 2.5rem", background:"#00c2ff", color:"#fff", borderRadius:4, fontWeight:600, fontSize:"1rem", textDecoration:"none" }}>
        Get in Touch
      </Link>
    </section>
  );
}

/* ═══════════════════════════════════════════
   Page component
═══════════════════════════════════════════ */
export default function ProjectsPage() {
  const ongoing   = PROJECTS.filter(p => p.stage === "ongoing");
  const upcoming  = PROJECTS.filter(p => p.stage === "upcoming");
  const completed = PROJECTS.filter(p => p.stage === "completed");

  return (
    <main style={{ minHeight:"100vh", background:"#fff", overflowX:"hidden" }}>
      <style>{GLOBAL_STYLES}</style>

      <Navbar />
      <div style={{ paddingTop:64 }}><BackButton /></div>

      <HeroBanner />

      {ongoing.length > 0 && (
        <>
          <SectionHeading title="Ongoing Projects" />
          {ongoing.map((p, i) => <ProjectRow key={p.id} p={p} even={i % 2 === 0} />)}
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionHeading title="Upcoming Projects" />
          {upcoming.map((p, i) => <ProjectRow key={p.id} p={p} even={i % 2 === 0} />)}
        </>
      )}

      {completed.length > 0 && (
        <>
          <SectionHeading title="Completed Projects" />
          {completed.map((p, i) => <ProjectRow key={p.id} p={p} even={i % 2 === 0} />)}
        </>
      )}

      <ContactSection />
      <Footer />
    </main>
  );
}