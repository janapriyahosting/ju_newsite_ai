"use client";
import { useState, useRef, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// ─── Project filmstrip data — fetched from /api/v1/projects ──────────────────
// The backend's `/projects` endpoint owns the canonical list (name, location,
// price, construction stage, thumbnail). We adapt it into the filmstrip card
// shape below.
type ApiProject = {
  id: string;
  slug?: string;
  name: string;
  city?: string | null;
  location?: string | null;
  construction_stage?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  available_units?: number | null;
  total_units?: number | null;
  thumbnail?: string | null;
  images?: string[] | null;
};

type ProjectCard = {
  name: string;
  location: string;
  price: string;
  type: string;
  status: string;
  img: string;
  url: string;
};

// Strip `/api/v1` from NEXT_PUBLIC_API_URL to get the media-serving origin
// (`/media/...` paths come off the same FastAPI host).
const MEDIA_ORIGIN = (API || "").replace(/\/api\/v1\/?$/, "");

function fmtFrom(n?: number | null): string {
  if (!n) return "On enquiry";
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr+`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L+`;
  return `₹${n.toLocaleString("en-IN")}+`;
}

function statusLabel(stage?: string | null): string {
  if (!stage) return "Active";
  const s = stage.toLowerCase();
  if (s.includes("ready")) return "Ready to Move";
  if (s.includes("launch")) return "New Launch";
  if (s.includes("construction")) return "Under Construction";
  if (s.includes("upcoming")) return "Upcoming";
  return stage;
}

function projectImage(p: ApiProject): string {
  const path = p.thumbnail || (p.images && p.images[0]) || "";
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return MEDIA_ORIGIN + path;
}

function adaptProject(p: ApiProject): ProjectCard {
  return {
    name: p.name,
    location: p.location || p.city || "",
    price: fmtFrom(p.min_price ?? null),
    // We don't currently expose per-project BHK summary — derive when the
    // backend gains a `bhk_summary` column.
    type: "Residences",
    status: statusLabel(p.construction_stage),
    img: projectImage(p),
    url: `/projects/${p.slug || p.id}`,
  };
}

// ─── Prompt categories ─────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "life",
    icon: "🏠",
    label: "My Life",
    prompts: [
      "I want a home where my children can run freely and grow up safely",
      "We're 4 in the family — parents, spouse and I. Need the right space",
      "I work from home and need a quiet, well-lit space",
      "We're a young couple planning to start a family soon",
    ],
  },
  {
    id: "budget",
    icon: "💰",
    label: "Budget & Loans",
    prompts: [
      "What's the best flat I can get with a ₹40,000/month EMI?",
      "I earn ₹1.2 lakh/month — how much loan am I eligible for?",
      "Show me good options under ₹80 lakhs",
      "I have ₹30L ready — what's the smartest way to use it?",
    ],
  },
  {
    id: "location",
    icon: "📍",
    label: "Location",
    prompts: [
      "I work in Hitech City — which project is easiest to commute from?",
      "How good are schools near Bachupally or Chandanagar?",
      "Tell me about living in Sainikpuri — what's the lifestyle like?",
      "Which area has the best connectivity to the airport?",
    ],
  },
  {
    id: "market",
    icon: "📊",
    label: "Market Intel",
    prompts: [
      "What are current flat prices in Bachupally compared to Janapriya?",
      "Is now a smart time to buy in Hyderabad or should I wait?",
      "How does Janapriya pricing compare to other builders nearby?",
      "Which area in Hyderabad will appreciate the most in 5 years?",
    ],
  },
  {
    id: "amenities",
    icon: "🌿",
    label: "Amenities",
    prompts: [
      "Which projects have a swimming pool and a proper gym?",
      "I need a good children's play area and green spaces",
      "Tell me about clubhouse facilities across your projects",
      "Is there covered parking and 24x7 security?",
    ],
  },
  {
    id: "projects",
    icon: "🏗️",
    label: "Projects",
    prompts: [
      "Tell me everything about First Light in Bachupally",
      "What's the difference between Bahiti and Nile Valley?",
      "Which projects are ready to move in right now?",
      "I want a 3 BHK above ₹1 Cr — show me my best options",
    ],
  },
];

const GOLD = "#C4973A";
const GOLDB = "#E8CC87";
const BG = "#05070D";

// ─── Backend unit → PropCard shape ────────────────────────────────────────────
type BackendUnit = {
  id: string;
  unit_number?: string;
  unit_type?: string;
  bedrooms?: number;
  area_sqft?: number | null;
  base_price?: number | null;
  facing?: string | null;
  floor_number?: number | null;
  project_name?: string | null;
  tower_name?: string | null;
  is_riseup_eligible?: boolean;
  image?: string | null;
};
type CardUnit = {
  id: string;
  name: string;
  bhk: string;
  floor: string;
  price: string;
  area: string;
  tag: string;
  status: string;
  possession: string;
};

function fmtPrice(p?: number | null): string {
  if (!p) return "Price on request";
  if (p >= 10_000_000) return `₹${(p / 10_000_000).toFixed(2)} Cr`;
  if (p >= 100_000) return `₹${(p / 100_000).toFixed(0)} L`;
  return `₹${p.toLocaleString("en-IN")}`;
}

function floorSuffix(n: number): string {
  if (n === 0) return "";
  if (n >= 11 && n <= 13) return "th";
  const last = n % 10;
  return last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th";
}

function adaptUnits(units: BackendUnit[] | null | undefined): CardUnit[] {
  if (!units) return [];
  return units.map((u) => {
    const project = u.project_name || "—";
    const tower = u.tower_name ? ` · ${u.tower_name}` : "";
    const bhk = u.unit_type || (u.bedrooms ? `${u.bedrooms} BHK` : "—");
    const floor = typeof u.floor_number === "number" ? `${u.floor_number}${floorSuffix(u.floor_number)} Floor` : "—";
    const area = u.area_sqft ? `${Math.round(u.area_sqft).toLocaleString("en-IN")} sq ft` : "—";
    const tagParts: string[] = [];
    if (u.facing) tagParts.push(`${String(u.facing).toLowerCase()} facing`);
    if (u.is_riseup_eligible) tagParts.push("RiseUp eligible");
    return {
      id: u.id,
      name: `${project}${tower}${u.unit_number ? ` · ${u.unit_number}` : ""}`,
      bhk,
      floor,
      price: fmtPrice(u.base_price ?? null),
      area,
      tag: tagParts.join(" · ") || "Curated for you",
      status: "Available",
      possession: "Ready to view",
    };
  });
}

// ─── Backend message type ─────────────────────────────────────────────────────
type Msg = { role: "user" | "assistant"; content: string };

// ─── Property card ─────────────────────────────────────────────────────────────
function PropCard({ u, i }: { u: CardUnit; i: number }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ minWidth: 230, maxWidth: 248, flexShrink: 0, cursor: "pointer",
        background: hov ? "rgba(196,151,58,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hov ? "rgba(196,151,58,0.5)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 14, padding: "16px 16px 14px",
        transition: "all 0.28s cubic-bezier(0.2,0,0,1)",
        transform: hov ? "translateY(-4px)" : "none",
        animation: `cardIn 0.45s ease ${i * 0.09}s both` }}>
      <div style={{ fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase",
        fontWeight: 700, color: u.status === "Available" ? "#4ADE80" : "#FBBF24", marginBottom: 8 }}>
        {u.status} · {u.possession}
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16,
        fontWeight: 600, color: "#F5F0E8", marginBottom: 2, lineHeight: 1.3 }}>{u.name}</div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26,
        fontWeight: 500, color: GOLDB, marginBottom: 10 }}>{u.price}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 9 }}>
        {[u.bhk, u.floor, u.area].map(v => (
          <span key={v} style={{ fontSize: 11, color: "#6B7A9A",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 5, padding: "2px 7px" }}>{v}</span>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: GOLD, marginBottom: 12 }}>✦ {u.tag}</div>
      <button style={{ width: "100%", background: "transparent",
        border: `1px solid rgba(196,151,58,${hov ? "0.7" : "0.28"})`,
        borderRadius: 7, padding: "7px", color: hov ? GOLDB : GOLD,
        fontSize: 10.5, fontWeight: 600, cursor: "pointer",
        letterSpacing: "0.07em", transition: "all 0.2s",
        fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        VIEW FLOOR PLAN →
      </button>
    </div>
  );
}

// ─── Thinking indicator ────────────────────────────────────────────────────────
function Thinking() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, animation: "fadeIn .3s ease" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD,
            display: "inline-block", animation: `thinkDot 1.2s ease ${i * 0.18}s infinite` }} />
        ))}
      </div>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", fontWeight: 300 }}>
        Finding what fits your life...
      </span>
    </div>
  );
}

// ─── Project filmstrip at bottom ───────────────────────────────────────────────
// On mobile we keep the strip compact (110px) so it doesn't eat the viewport.
// On desktop we open it up to 160px with a wider image cell + slightly larger
// typography so the projects feel like a proper gallery rather than a footer.
function ProjectStrip({ projects, compact }: { projects: ProjectCard[]; compact: boolean }) {
  if (!projects.length) return null;
  const stripHeight = compact ? 110 : 160;
  const imgWidth = compact ? 90 : 150;
  // Duplicate the list 3× so the marquee animation can loop seamlessly when
  // translating -33.333%. Anchor links stay internal (/projects/<id>).
  const items = [...projects, ...projects, ...projects];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
      height: stripHeight, borderTop: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(5,7,13,0.97)", backdropFilter: "blur(24px)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "stretch", height: "100%",
        animation: "tickerScroll 55s linear infinite", width: "max-content" }}
        onMouseEnter={e => (e.currentTarget.style.animationPlayState = "paused")}
        onMouseLeave={e => (e.currentTarget.style.animationPlayState = "running")}>
        {items.map((p, i) => (
          <a key={i} href={p.url}
            style={{ display: "flex", alignItems: "stretch", textDecoration: "none",
              borderRight: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
            <ProjectStripCard p={p} imgWidth={imgWidth} compact={compact} />
          </a>
        ))}
      </div>
    </div>
  );
}

function ProjectStripCard({ p, imgWidth, compact }: { p: ProjectCard; imgWidth: number; compact: boolean }) {
  const [hov, setHov] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const nameSize = compact ? 16 : 19;
  const priceSize = compact ? 15 : 17;
  const metaSize = compact ? 11 : 12;
  const statusSize = compact ? 9 : 10;
  const initialSize = compact ? 22 : 32;
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "center", gap: 0, height: "100%",
        background: hov ? "rgba(196,151,58,0.05)" : "transparent",
        transition: "background 0.25s" }}>
      <div style={{ width: imgWidth, height: "100%", overflow: "hidden", flexShrink: 0 }}>
        {imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.img} alt={p.name}
            onError={() => setImgOk(false)}
            style={{ width: "100%", height: "100%", objectFit: "cover",
              filter: hov ? "brightness(1.1)" : "brightness(0.85)",
              transition: "filter 0.3s, transform 0.4s",
              transform: hov ? "scale(1.06)" : "scale(1)" }} />
        ) : (
          <div style={{ width: "100%", height: "100%",
            background: `linear-gradient(135deg, #0D1424, #1A2235)`,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: initialSize,
              color: GOLD, opacity: 0.4 }}>{p.name[0]}</span>
          </div>
        )}
      </div>
      <div style={{ padding: compact ? "0 18px 0 14px" : "0 24px 0 18px", minWidth: compact ? 150 : 190 }}>
        <div style={{ fontSize: statusSize, letterSpacing: "0.1em", textTransform: "uppercase",
          color: p.status === "Ready to Move" ? "#4ADE80" : p.status === "Upcoming" ? GOLD : "#94A3B8",
          fontWeight: 700, marginBottom: compact ? 3 : 5 }}>{p.status}</div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: nameSize,
          fontWeight: 600, color: hov ? GOLDB : "#F5F0E8",
          transition: "color 0.2s", marginBottom: compact ? 1 : 3, whiteSpace: "nowrap" }}>{p.name}</div>
        <div style={{ fontSize: metaSize, color: "rgba(255,255,255,0.35)",
          marginBottom: compact ? 4 : 6 }}>{p.location} · {p.type}</div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: priceSize,
          color: GOLD, fontWeight: 600 }}>{p.price}</div>
      </div>
    </div>
  );
}

// ─── Prompt category selector ──────────────────────────────────────────────────
function PromptSelector({ onSelect, visible }: { onSelect: (p: string) => void; visible: boolean }) {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  if (!visible) return null;
  return (
    <div style={{ width: "100%", maxWidth: 700, marginBottom: 12,
      animation: "fadeUp 0.35s ease" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center",
        marginBottom: activeCat ? 10 : 0 }}>
        {CATEGORIES.map(c => (
          <button key={c.id}
            onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
            style={{ background: activeCat === c.id ? "rgba(196,151,58,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${activeCat === c.id ? "rgba(196,151,58,0.5)" : "rgba(255,255,255,0.09)"}`,
              borderRadius: 20, padding: "6px 14px",
              color: activeCat === c.id ? GOLDB : "rgba(255,255,255,0.45)",
              fontSize: 12, fontWeight: activeCat === c.id ? 500 : 400,
              cursor: "pointer", transition: "all 0.2s", display: "flex",
              alignItems: "center", gap: 5,
              fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>
      {activeCat && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap",
          justifyContent: "center", animation: "fadeUp 0.25s ease" }}>
          {CATEGORIES.find(c => c.id === activeCat)?.prompts.map((p, i) => (
            <button key={i}
              onClick={() => { onSelect(p); setActiveCat(null); }}
              style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "7px 13px",
                color: "rgba(245,240,232,0.65)", fontSize: 12.5, cursor: "pointer",
                transition: "all 0.2s", textAlign: "left", fontWeight: 300,
                fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.4,
                maxWidth: 320 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(196,151,58,0.45)"; e.currentTarget.style.color = "#F5F0E8"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(245,240,232,0.65)"; }}>
              &ldquo;{p}&rdquo;
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Session id (kept stable per browser) ─────────────────────────────────────
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("jp_chat_session");
  if (!id) {
    id = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("jp_chat_session", id);
  }
  return id;
}

// ─── Main app ──────────────────────────────────────────────────────────────────
export default function HomeChat() {
  const [input, setInput]       = useState("");
  const [history, setHistory]   = useState<Msg[]>([]);
  const [response, setResponse] = useState("");
  const [units, setUnits]       = useState<CardUnit[] | null>(null);
  const [loading, setLoading]   = useState(false);
  const [active, setActive]     = useState(false);
  const [isListening, setListen]= useState(false);
  const [loanBadge, setLoan]    = useState<string | null>(null);
  const [focused, setFocused]   = useState(false);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  // SpeechRecognition is non-standard so any here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognRef = useRef<any>(null);

  // Track mobile viewport so we can shorten the composer placeholder and hide
  // the "HYDERABAD · EST. 1985" badge — both crowd the narrow phone layout.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Pull live projects for the filmstrip from the backend (canonical source).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/projects`);
        if (!res.ok) return;
        const raw = await res.json();
        const list: ApiProject[] = Array.isArray(raw) ? raw : (raw.items || raw.projects || []);
        if (cancelled) return;
        setProjects(list.map(adaptProject));
      } catch {
        // Silent failure — without projects, ProjectStrip just renders nothing
        // (better than showing stale hardcoded data).
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Inject fonts + keyframes
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
    const s = document.createElement("style");
    s.textContent = `
      @keyframes fadeIn  {from{opacity:0}to{opacity:1}}
      @keyframes fadeUp  {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes cardIn  {from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes thinkDot{0%,80%,100%{transform:scale(.5);opacity:.25}40%{transform:scale(1);opacity:1}}
      @keyframes pulseRing{0%{transform:scale(1);opacity:.7}100%{transform:scale(2);opacity:0}}
      @keyframes spin    {to{transform:rotate(360deg)}}
      @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-33.333%)}}
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{background:${BG};overflow-x:hidden}
      ::-webkit-scrollbar{width:0}
      input::placeholder{color:rgba(255,255,255,0.17)}
      button:focus{outline:none}
    `;
    document.head.appendChild(s);
  }, []);

  const toggleVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice works in Chrome — please switch."); return; }
    if (isListening) { recognRef.current?.stop(); setListen(false); return; }
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = "en-IN";
    recognRef.current = r;
    r.onstart = () => setListen(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => setInput(Array.from(e.results).map((x: any) => x[0].transcript).join(""));
    r.onend = () => setListen(false);
    r.onerror = () => setListen(false);
    r.start();
  };

  const submit = async (txt?: string) => {
    const t = (txt ?? input).trim();
    if (!t || loading) return;
    if (!active) setActive(true);
    const userMsg: Msg = { role: "user", content: t };
    const newHist = [...history, userMsg];
    setHistory(newHist);
    setInput("");
    setLoading(true);
    setUnits(null);

    try {
      const res = await fetch(`${API}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHist,
          context: { page: "home", session_id: getSessionId() },
          session_id: getSessionId(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply: string = data.reply || "";

      // Extract loan eligibility figure from the reply text if present.
      const lm = reply.match(/up to\s*₹\s*([\d.]+\s*(?:crore|cr|Cr|lakh|lakhs|L))/i);
      if (lm) setLoan(`Eligibility · Up to ₹${lm[1].trim()}`);

      const adapted = adaptUnits(data.suggested_units as BackendUnit[]);
      if (adapted.length) setUnits(adapted);

      setResponse(reply);
      setHistory(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setResponse("A brief pause — could you send that again?");
    } finally {
      setLoading(false);
    }
  };

  const handlePromptSelect = (p: string) => { setInput(p); inputRef.current?.focus(); };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex",
      flexDirection: "column", fontFamily: "'Plus Jakarta Sans',sans-serif",
      color: "#F5F0E8", position: "relative" }}>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse 80% 55% at 50% 18%, rgba(196,151,58,0.07), transparent 70%)` }} />
      {active && <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse 55% 35% at 50% 58%, rgba(196,151,58,0.04), transparent 70%)`,
        animation: "fadeIn 1s ease" }} />}

      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 300,
        padding: "16px 36px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: active ? "rgba(5,7,13,0.88)" : "transparent",
        backdropFilter: active ? "blur(20px)" : "none",
        borderBottom: active ? "1px solid rgba(255,255,255,0.05)" : "none",
        transition: "all 0.45s ease" }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22,
          fontWeight: 600, letterSpacing: "0.02em" }}>
          janapriya<span style={{ color: GOLD }}>.ai</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {loanBadge && (
            <div style={{ fontSize: 11, color: "#4ADE80", letterSpacing: "0.06em",
              background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.18)",
              borderRadius: 20, padding: "5px 13px", animation: "fadeIn 0.5s ease", fontWeight: 500 }}>
              {loanBadge}
            </div>
          )}
          {!isMobile && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Hyderabad · Est. 1985
            </span>
          )}
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: `${active ? 108 : 0}px 20px ${isMobile ? 130 : 180}px`,
        minHeight: "100vh", position: "relative", zIndex: 1,
        transition: "padding 0.5s cubic-bezier(0.2,0,0,1)" }}>

        <div style={{ textAlign: "center", marginBottom: active ? 26 : 48,
          transform: `scale(${active ? 0.78 : 1})`, opacity: active ? 0.45 : 1,
          transformOrigin: "center bottom",
          transition: "all 0.5s cubic-bezier(0.2,0,0,1)" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif",
            fontSize: "clamp(44px, 7.5vw, 86px)",
            fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.025em" }}>
            Ask more of<br />
            your <em style={{ fontStyle: "italic", color: GOLD }}>next home.</em>
          </h1>
          {!active && (
            <p style={{ marginTop: 16, fontSize: "clamp(13px,1.6vw,15px)",
              color: "rgba(255,255,255,0.28)", fontWeight: 300, letterSpacing: "0.03em",
              animation: "fadeUp 0.9s ease 0.4s both" }}>
              Prices · locations · loans · lifestyle — ask anything about Hyderabad real estate.
            </p>
          )}
        </div>

        {(response || loading) && (
          <div style={{ maxWidth: 640, width: "100%", marginBottom: 28,
            animation: "fadeUp 0.4s cubic-bezier(0.2,0,0,1)" }}>
            {loading ? <Thinking /> : (
              <p style={{ fontSize: "clamp(15px,2vw,18px)", lineHeight: 1.82,
                color: "rgba(245,240,232,0.82)", fontWeight: 300, letterSpacing: "0.005em" }}>
                {response}
              </p>
            )}
          </div>
        )}

        {units && units.length > 0 && (
          <div style={{ width: "100%", maxWidth: 820, marginBottom: 28,
            display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4,
            animation: "fadeUp 0.45s ease 0.12s both" }}>
            {units.map((u, i) => <PropCard key={u.id} u={u} i={i} />)}
          </div>
        )}

        <PromptSelector onSelect={handlePromptSelect} visible={!loading} />

        <div style={{ width: "100%", maxWidth: 700, position: "relative" }}>
          {(focused || isListening) && (
            <div style={{ position: "absolute", inset: -3, borderRadius: 32,
              background: `radial-gradient(ellipse 100% 130%, rgba(196,151,58,0.16), transparent 70%)`,
              pointerEvents: "none", zIndex: 0, animation: "fadeIn 0.3s ease" }} />
          )}
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center",
            background: focused ? "rgba(255,255,255,0.065)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isListening ? "rgba(196,151,58,0.72)" : focused ? "rgba(196,151,58,0.52)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 30, padding: "7px 7px 7px 22px", backdropFilter: "blur(24px)",
            boxShadow: focused ? `0 0 0 1px rgba(196,151,58,0.1), 0 14px 50px rgba(0,0,0,0.5)` : "0 10px 48px rgba(0,0,0,0.35)",
            transition: "all 0.3s cubic-bezier(0.2,0,0,1)" }}>

            <span style={{ fontSize: 13, color: GOLD, opacity: 0.7, marginRight: 11, flexShrink: 0 }}>✦</span>

            <input ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              placeholder={
                isMobile
                  ? (active ? "Ask anything more…" : "Tell me about your life…")
                  : (active ? "Ask anything more — about prices, locations, lifestyle..." : "Tell me about your family, your life, your dream home...")
              }
              disabled={loading}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#F5F0E8", fontSize: "clamp(14px,1.8vw,16px)", fontWeight: 300,
                letterSpacing: "0.01em", padding: "11px 0",
                fontFamily: "'Plus Jakarta Sans',sans-serif" }} />

            <button onClick={toggleVoice}
              style={{ position: "relative", width: 46, height: 46, borderRadius: "50%",
                background: isListening ? "rgba(196,151,58,0.15)" : "transparent",
                border: `1px solid ${isListening ? "rgba(196,151,58,0.55)" : "rgba(255,255,255,0.09)"}`,
                color: isListening ? GOLD : "rgba(255,255,255,0.35)",
                cursor: "pointer", fontSize: 17, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginRight: 7, transition: "all 0.25s" }}>
              {isListening && <>
                <span style={{ position: "absolute", inset: -5, borderRadius: "50%",
                  border: `2px solid rgba(196,151,58,0.6)`, animation: "pulseRing 1.1s ease-out infinite" }} />
                <span style={{ position: "absolute", inset: -11, borderRadius: "50%",
                  border: `1px solid rgba(196,151,58,0.2)`, animation: "pulseRing 1.1s ease-out .3s infinite" }} />
              </>}
              🎙️
            </button>

            <button onClick={() => submit()} disabled={loading || !input.trim()}
              style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                background: input.trim() && !loading ? `linear-gradient(135deg,#7A5C10,${GOLD})` : "rgba(255,255,255,0.05)",
                border: "none", color: input.trim() && !loading ? BG : "rgba(255,255,255,0.2)",
                fontSize: 18, fontWeight: 700, cursor: input.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.25s", opacity: input.trim() && !loading ? 1 : 0.35 }}>
              {loading
                ? <span style={{ width: 15, height: 15, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.15)", borderTopColor: GOLD,
                    display: "inline-block", animation: "spin 0.75s linear infinite" }} />
                : "↑"}
            </button>
          </div>

          {isListening && (
            <div style={{ textAlign: "center", marginTop: 9, fontSize: 12,
              color: GOLD, letterSpacing: "0.05em", animation: "fadeIn 0.2s ease" }}>
              Listening — speak now
            </div>
          )}
        </div>

        {active && history.filter(m => m.role === "user").length > 1 && (
          <div style={{ marginTop: 20, display: "flex", gap: 6, flexWrap: "wrap",
            justifyContent: "center", maxWidth: 640, animation: "fadeIn 0.5s ease" }}>
            {history.filter(m => m.role === "user").slice(-4).map((m, i) => (
              <span key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, padding: "3px 9px", maxWidth: 200,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.content.slice(0, 50)}{m.content.length > 50 ? "…" : ""}
              </span>
            ))}
          </div>
        )}
      </main>

      <ProjectStrip projects={projects} compact={isMobile} />
    </div>
  );
}
