"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "";

type Msg = { role: "user" | "assistant"; content: string };

type Unit = {
  id: string;
  unit_number?: string;
  unit_type?: string;
  bedrooms?: number;
  area_sqft?: number;
  base_price?: number;
  facing?: string;
  floor_number?: number;
  project_name?: string;
  tower_name?: string;
  is_riseup_eligible?: boolean;
  image?: string | null;
};

type AssistantTurn = {
  reply: string;
  suggested_units?: Unit[];
  model_used?: string | null;
  escalated?: boolean;
  action?: { type: string; url?: string | null; label?: string | null } | null;
};

const QUICK_STARTS = [
  "I'm looking for a home for my family",
  "What's a good 3BHK around ₹1Cr?",
  "How does RiseUp actually save me money?",
  "I'd like to book a site visit",
];

function fmtPrice(p?: number | null) {
  if (!p) return "Price on request";
  if (p >= 10_000_000) return `₹${(p / 10_000_000).toFixed(2)} Cr`;
  if (p >= 100_000) return `₹${(p / 100_000).toFixed(0)} L`;
  return `₹${p.toLocaleString("en-IN")}`;
}

function modelBadge(model?: string | null, escalated?: boolean) {
  if (!model) return null;
  if (model.startsWith("claude:sonnet") || escalated) return { label: "Sonnet", color: "#7C3AED", bg: "#F3E8FF" };
  if (model.startsWith("claude:haiku")) return { label: "Haiku", color: "#16A34A", bg: "#DCFCE7" };
  if (model.startsWith("groq")) return { label: "Groq", color: "#D97706", bg: "#FEF3C7" };
  if (model.startsWith("gemini")) return { label: "Gemini", color: "#2A3887", bg: "#E2F1FC" };
  return { label: model, color: "#555", bg: "#F0F4FF" };
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("jp_chat_session");
  if (!id) {
    id = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("jp_chat_session", id);
  }
  return id;
}

export default function HomeChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [lastModel, setLastModel] = useState<{ model?: string | null; escalated?: boolean } | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || sending) return;
    setError("");
    const nextMessages: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const r = await fetch(`${API}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          context: { page: "home", session_id: getSessionId() },
          session_id: getSessionId(),
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: AssistantTurn = await r.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "" }]);
      if (data.suggested_units && data.suggested_units.length) {
        setUnits(data.suggested_units);
      }
      setLastModel({ model: data.model_used, escalated: data.escalated });
      // Honor server-provided navigation actions (e.g. "go to store with filters")
      if (data.action?.type === "navigate_store" && data.action.url) {
        // surface as a CTA below — frontend renders this manually via the action field
      }
    } catch (e: any) {
      setError(e?.message || "Couldn't reach the assistant — please try again.");
    } finally {
      setSending(false);
      // re-focus the input for fast follow-ups
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const badge = modelBadge(lastModel?.model, lastModel?.escalated);
  const empty = messages.length === 0;

  // Navy-gold-white-red palette. Scoped to this homepage only — the rest of the
  // site keeps the navy/light-blue brand palette (per saved brand guidance).
  const NAVY_BG = "#0F1430";    // deep navy background
  const NAVY = "#262262";        // primary brand navy
  const NAVY_2 = "#2A3887";      // gradient companion
  const GOLD = "#C9A84C";        // brand.gold token (from tailwind.config.ts)
  const GOLD_SOFT = "#E5C77A";   // lighter gold for hovers / subtle borders
  const RED = "#E91E3D";         // logo red (used sparingly — escalation, errors)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `radial-gradient(ellipse at top, #1a2050 0%, ${NAVY_BG} 60%, #07091C 100%)`, color: "#fff" }}>
      {/* Thin top nav */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-3" style={{ borderBottom: `1px solid ${GOLD}33`, background: "rgba(15,20,48,0.7)", backdropFilter: "blur(10px)" }}>
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight" style={{ color: "#fff" }}>Janapriya</span>
          <span className="text-lg font-light tracking-widest" style={{ color: GOLD }}>UPSCALE</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-5 text-sm">
          <Link href="/projects" className="hidden sm:inline font-bold transition-colors" style={{ color: "#E5E7EB" }}>Projects</Link>
          <Link href="/store" className="hidden sm:inline font-bold transition-colors" style={{ color: "#E5E7EB" }}>Units</Link>
          <Link href="/welcome" className="hidden md:inline font-bold transition-colors" style={{ color: "#E5E7EB" }}>Why Upscale</Link>
          <Link href="/site-visit" className="hidden sm:inline font-bold transition-colors" style={{ color: "#E5E7EB" }}>Site Visit</Link>
          <Link href="/login" className="px-3 py-1.5 rounded-xl text-xs font-black" style={{ background: GOLD, color: NAVY }}>Login</Link>
        </div>
      </nav>

      {/* Main chat region */}
      <div className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-3xl flex-1 flex flex-col">
          {empty ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <div className="text-3xl sm:text-5xl font-black mb-3" style={{ color: "#fff" }}>
                Ask more of <span style={{ color: GOLD }}>life</span>.
              </div>
              <p className="text-sm sm:text-base mb-7 max-w-lg" style={{ color: "#C7CAD8" }}>
                Hi, I&apos;m Priya from Janapriya Upscale. Tell me a little about what you&apos;re looking for and I&apos;ll help you find the right home — and arrange a visit so you can see it in person.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                {QUICK_STARTS.map((q) => (
                  <button key={q}
                    onClick={() => send(q)}
                    className="px-3 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all hover:-translate-y-0.5"
                    style={{ background: "rgba(255,255,255,0.06)", border: `1.5px solid ${GOLD}66`, color: "#fff" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={listRef} className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4" style={{ minHeight: "55vh", maxHeight: "calc(100vh - 280px)" }}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed`}
                    style={m.role === "user"
                      ? { background: `linear-gradient(135deg, ${GOLD}, ${GOLD_SOFT})`, color: NAVY, borderBottomRightRadius: "6px", boxShadow: `0 4px 14px ${GOLD}33` }
                      : { background: "#fff", color: NAVY, borderBottomLeftRadius: "6px", boxShadow: "0 2px 14px rgba(0,0,0,0.25)" }
                    }>
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl text-sm bg-white">
                    <span className="inline-flex gap-1" aria-label="Thinking">
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: GOLD, animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: GOLD, animationDelay: "120ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: GOLD, animationDelay: "240ms" }} />
                    </span>
                  </div>
                </div>
              )}

              {/* Best-fit recommendation rail — at most 3 visible to stay curated */}
              {units.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>Best fit for you</p>
                    <Link href="/store" className="text-xs font-bold" style={{ color: GOLD }}>Browse all →</Link>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                    {units.slice(0, 3).map((u) => (
                      <Link key={u.id} href={`/units/${u.id}`}
                        className="flex-shrink-0 w-56 rounded-2xl p-3 bg-white transition-all hover:-translate-y-0.5"
                        style={{ border: `1px solid ${GOLD}66`, boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}
                        title={u.unit_number ? `${u.unit_type} ${u.unit_number} — ${u.project_name}` : ""}>
                        <div className="w-full h-28 rounded-xl mb-2 flex items-center justify-center"
                          style={u.image
                            ? { backgroundImage: `url(${u.image})`, backgroundSize: "cover", backgroundPosition: "center" }
                            : { background: `linear-gradient(135deg, ${NAVY_2}, ${NAVY})` }}>
                          {!u.image && <span className="text-2xl" style={{ color: GOLD }}>🏠</span>}
                        </div>
                        <p className="text-xs font-black truncate" style={{ color: NAVY }}>
                          {u.unit_type || `${u.bedrooms || "?"}BHK`} · {u.unit_number || "—"}
                        </p>
                        <p className="text-xs truncate" style={{ color: "#666" }}>
                          {u.project_name || "—"}{u.tower_name ? ` · ${u.tower_name}` : ""}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-black" style={{ color: NAVY }}>{fmtPrice(u.base_price)}</span>
                          {u.is_riseup_eligible && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: GOLD, color: NAVY }}>RiseUp</span>
                          )}
                        </div>
                        <p className="text-xs mt-1" style={{ color: "#888" }}>
                          {u.area_sqft ? `${Math.round(u.area_sqft)} sqft` : ""}
                          {u.facing ? ` · ${u.facing}-facing` : ""}
                          {typeof u.floor_number === "number" ? ` · Fl ${u.floor_number}` : ""}
                        </p>
                      </Link>
                    ))}
                  </div>

                  {/* Conversion CTA — visible only once Priya has a recommendation on screen */}
                  <div className="mt-3 rounded-2xl p-4 flex items-center gap-3"
                    style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_SOFT})`, color: NAVY, boxShadow: `0 6px 20px ${GOLD}55` }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm leading-tight">Seeing is believing.</p>
                      <p className="text-xs leading-snug">Book a site visit — pick a time that works and we&apos;ll show you around.</p>
                    </div>
                    <Link href="/site-visit"
                      className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-transform hover:-translate-y-0.5"
                      style={{ background: NAVY, color: "#fff" }}>
                      Book site visit →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-2 px-3 py-2 rounded-xl text-xs" style={{ background: `${RED}22`, color: "#fff", border: `1px solid ${RED}` }}>
              {error}
            </div>
          )}

          {/* Composer */}
          <div className="rounded-2xl p-2 flex items-end gap-2" style={{ background: "rgba(255,255,255,0.06)", border: `1.5px solid ${GOLD}66`, boxShadow: `0 8px 30px rgba(0,0,0,0.3), 0 0 0 1px ${GOLD}22 inset` }}>
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Tell me what you're looking for — budget, BHK, facing, EMI…"
              className="flex-1 resize-none px-3 py-2 text-sm focus:outline-none bg-transparent placeholder:text-white/40"
              style={{ maxHeight: "120px", color: "#fff" }}
              disabled={sending}
            />
            <button
              onClick={() => send(input)}
              disabled={sending || !input.trim()}
              className="px-4 py-2 rounded-xl text-sm font-black disabled:opacity-40 transition-transform hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_SOFT})`, color: NAVY }}
            >
              {sending ? "…" : "Send"}
            </button>
          </div>

          {/* Footer line: model badge + reset */}
          <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "#9CA0B5" }}>
            <div className="flex items-center gap-2">
              {badge && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
              )}
              {lastModel?.escalated && <span style={{ color: RED }}>· escalated for complexity</span>}
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setUnits([]); setLastModel(null); setError(""); }}
                className="font-bold"
                style={{ color: GOLD }}
              >
                New chat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
