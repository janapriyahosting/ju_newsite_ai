"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AiIcon from "@/components/AiIcon";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const MEDIA_BASE = "";

// ── Visitor / session identifiers (reuse what SessionTracker already sets) ──

function getOrCreateLocalId(key: string): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `${key}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function collectCookies(): Record<string, string> {
  if (typeof document === "undefined" || !document.cookie) return {};
  const out: Record<string, string> = {};
  document.cookie.split(";").forEach(pair => {
    const eq = pair.indexOf("=");
    if (eq === -1) return;
    const k = pair.slice(0, eq).trim();
    const v = pair.slice(eq + 1).trim();
    if (k) out[k] = v;
  });
  return out;
}

function collectVisitorMeta(): Record<string, any> {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const meta: Record<string, any> = {
    referrer: document.referrer || null,
    landing_page: localStorage.getItem("jp_landing_page") || window.location.pathname,
    cookies: collectCookies(),
  };
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = url.searchParams.get(k);
    if (v) meta[k] = v;
  }
  // Stash landing page on first visit so we keep it across navigations
  if (!localStorage.getItem("jp_landing_page")) {
    localStorage.setItem("jp_landing_page", window.location.pathname);
  }
  return meta;
}

function fmt(p: number) {
  if (!p) return "Price on request";
  if (p >= 10_000_000) return `₹${(p / 10_000_000).toFixed(1)} Cr`;
  if (p >= 100_000)    return `₹${(p / 100_000).toFixed(0)}L`;
  return `₹${p.toLocaleString()}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BrochureCard({ brochure }: { brochure: any }) {
  if (!brochure) return null;
  return (
    <div style={{ background: "#F0F4FF", border: "1.5px solid #c7d4f8", borderRadius: 12, padding: 12, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 22 }}>📄</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: "#2A3887" }}>{brochure.name} — Brochure</div>
          {brochure.url ? (
            <a href={brochure.url} target="_blank" rel="noopener noreferrer" download
              style={{ display: "inline-block", marginTop: 4, background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white", borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
              ⬇ Download Brochure
            </a>
          ) : (
            <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Brochure not uploaded yet — request via callback.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RiseUpCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div style={{ background: "linear-gradient(135deg,#1a1060,#2A3887)", borderRadius: 14, padding: 14, marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>🚀</span>
        <span style={{ color: "#29A9DF", fontWeight: 900, fontSize: 13 }}>RiseUp Offer</span>
      </div>
      <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginBottom: 8 }}>Pay only 80% now. 20% after the final demand is raised.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { label: "Unit Price",          val: fmt(data.unit_price) },
          { label: "Pay Now (80%)",       val: fmt(data.riseup_price), hi: true },
          { label: "On Final Demand",     val: fmt(data.possession_amount) },
          { label: "Min Down Pmt",        val: fmt(data.down_payment_10) },
        ].map(r => (
          <div key={r.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 8px" }}>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>{r.label}</div>
            <div style={{ color: r.hi ? "#29A9DF" : "white", fontWeight: 800, fontSize: 13 }}>{r.val}</div>
          </div>
        ))}
      </div>
      <a href="https://riseup.house" target="_blank" rel="noopener noreferrer"
        style={{ display: "block", textAlign: "center", marginTop: 10, background: "#29A9DF", color: "white", borderRadius: 8, padding: "7px 0", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
        Learn more at riseup.house →
      </a>
    </div>
  );
}

function ActionCard({ action }: { action: AssistantAction }) {
  if (!action || action.type === "none") return null;

  // Primary CTA button — navigate_* variants
  if (action.type === "navigate_store" || action.type === "navigate_unit" || action.type === "navigate_project") {
    if (!action.url) return null;
    return (
      <div style={{ marginTop: 8 }}>
        <a href={action.url}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white",
            borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 800,
            textDecoration: "none", boxShadow: "0 4px 12px rgba(42,56,135,0.25)",
          }}>
          <span style={{ fontSize: 14 }}>✨</span>
          {action.label || "Open"}
        </a>
      </div>
    );
  }

  // Pick-a-project follow-up: render options as buttons
  if (action.type === "ask_which" && action.options?.length) {
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#999", marginBottom: 6 }}>
          {action.label || "CHOOSE ONE"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {action.options.map(opt => (
            <a key={opt.value} href={opt.url || "#"}
              style={{
                background: "white", border: "1.5px solid #2A3887", borderRadius: 20,
                padding: "5px 12px", fontSize: 11, fontWeight: 700, color: "#2A3887",
                textDecoration: "none",
              }}>
              {opt.label}
            </a>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function SuggestedUnit({ unit }: { unit: any }) {
  const img = unit.images?.[0] ? `${MEDIA_BASE}${unit.images[0]}` : null;
  return (
    <Link href={`/units/${unit.id}`} style={{ textDecoration: "none" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#F8F9FB", borderRadius: 10, padding: 8, marginTop: 6, border: "1px solid #E2F1FC" }}>
        <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
          {img && <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: "#2A3887" }}>{unit.unit_number}</div>
          <div style={{ fontSize: 11, color: "#666" }}>{unit.unit_type?.includes("BHK") ? unit.unit_type : `${unit.unit_type || ""}${unit.bedrooms ? (unit.unit_type ? " · " : "") + unit.bedrooms + "BHK" : ""}`}{unit.area_sqft ? ` · ${Math.round(unit.area_sqft)}sqft` : ""}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 12, color: "#2A3887" }}>{fmt(unit.custom_fields?.total_amount || unit.base_price)}</div>
          {unit.riseup_price > 0 && (
            <div style={{ fontSize: 10, color: "#29A9DF", fontWeight: 700 }}>🚀 {fmt(unit.riseup_price)} RiseUp</div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Interactive Flow renderer ─────────────────────────────────────────────────

interface FlowStep {
  id: string;
  type:
    | "message" | "options" | "input" | "show_units" | "show_brochure" | "collect_lead" | "end"
    // Display-only types — render as media bubbles, then auto-advance via `next`.
    | "image" | "video" | "document" | "carousel"
    // Authoring-only types — runtime treats them as a "Continue" message bubble.
    | "start" | "form" | "schedule" | "condition" | "otp" | "api" | "ai" | "handoff";
  text: string;
  options?: { label: string; value: string; next: string }[];
  field?: string;        // for input steps: budget | name | phone | bhk
  next?: string;         // for non-branching steps
  placeholder?: string;
  // Free-form config used by canvas-authored types (image url, carousel cards,
  // condition rules, etc.). Unknown to the live runtime except for media types
  // which read url/caption/title/cards.
  config?: {
    url?: string;
    caption?: string;
    title?: string;
    description?: string;
    cards?: { title?: string; subtitle?: string; image?: string }[];
    [k: string]: any;
  };
}

interface FlowState {
  currentStepId: string;
  collected: Record<string, string>;
}

function FlowRenderer({ steps, onComplete, onSearchUnits }: {
  steps: FlowStep[];
  onComplete: (data: Record<string, string>) => void;
  onSearchUnits: (query: string) => void;
}) {
  const [state, setState] = useState<FlowState>({ currentStepId: steps[0]?.id || "", collected: {} });
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<{ step: FlowStep; chosen?: string }[]>([]);

  const step = steps.find(s => s.id === state.currentStepId);

  function advance(nextId: string, chosen?: string) {
    if (!nextId || nextId === "end") {
      onComplete(state.collected);
      return;
    }
    const nextStep = steps.find(s => s.id === nextId);
    if (!nextStep) { onComplete(state.collected); return; }

    setHistory(h => [...h, { step: step!, chosen }]);

    if (nextStep.type === "show_units") {
      const { budget, bhk } = state.collected;
      const parts = [];
      if (bhk) parts.push(`${bhk}BHK`);
      if (budget) parts.push(`under ${fmt(parseInt(budget))}`);
      onSearchUnits(parts.join(" ") || "available units");
      setState(s => ({ ...s, currentStepId: nextStep.next || "end" }));
    } else {
      setState(s => ({ ...s, currentStepId: nextId }));
    }
    setInputVal("");
  }

  function handleOption(opt: { label: string; value: string; next: string }) {
    const field = step?.field;
    setState(s => ({
      currentStepId: opt.next,
      collected: field ? { ...s.collected, [field]: opt.value } : s.collected,
    }));
    setHistory(h => [...h, { step: step!, chosen: opt.label }]);

    const next = steps.find(s => s.id === opt.next);
    if (next?.type === "show_units") {
      const updated = field ? { ...state.collected, [field]: opt.value } : state.collected;
      const parts = [];
      if (updated.bhk) parts.push(`${updated.bhk}BHK`);
      if (updated.budget) parts.push(`under ${fmt(parseInt(updated.budget))}`);
      onSearchUnits(parts.join(" ") || "available units");
      setState(s => ({ ...s, currentStepId: next.next || "end" }));
    }
    setInputVal("");
  }

  function handleInput() {
    if (!inputVal.trim() || !step) return;
    const field = step.field || "input";
    setState(s => ({
      currentStepId: step.next || "end",
      collected: { ...s.collected, [field]: inputVal.trim() },
    }));
    setHistory(h => [...h, { step, chosen: inputVal.trim() }]);
    if (step.type === "collect_lead") onComplete({ ...state.collected, [field]: inputVal.trim() });
    setInputVal("");
  }

  if (!step) return null;

  return (
    <div>
      {/* History (collapsed) */}
      {history.map((h, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <AiIcon size={24} />
            <div style={{ background: "#F0F4FF", borderRadius: "0 10px 10px 10px", padding: "7px 10px", fontSize: 12, color: "#444", maxWidth: "80%" }}>{h.step.text}</div>
          </div>
          {h.chosen && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <div style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white", borderRadius: "10px 0 10px 10px", padding: "5px 10px", fontSize: 12, maxWidth: "70%" }}>{h.chosen}</div>
            </div>
          )}
        </div>
      ))}

      {/* Current step */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <AiIcon size={24} />
        <div style={{ background: "#F0F4FF", borderRadius: "0 10px 10px 10px", padding: "8px 12px", fontSize: 13, color: "#333", maxWidth: "85%", lineHeight: 1.5 }}>
          {step.text || (step.type === "image" ? "" : "…")}
        </div>
      </div>

      {/* Media bubbles (display-only types) */}
      {step.type === "image" && step.config?.url && (
        <div style={{ paddingLeft: 32, marginBottom: 10 }}>
          <img src={step.config.url} alt={step.config.caption || ""} style={{ maxWidth: "100%", borderRadius: 10 }} />
          {step.config.caption && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{step.config.caption}</div>}
        </div>
      )}
      {step.type === "video" && step.config?.url && (
        <div style={{ paddingLeft: 32, marginBottom: 10 }}>
          <video src={step.config.url} controls style={{ maxWidth: "100%", borderRadius: 10 }} />
          {step.config.caption && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{step.config.caption}</div>}
        </div>
      )}
      {step.type === "document" && step.config?.url && (
        <div style={{ paddingLeft: 32, marginBottom: 10 }}>
          <a href={step.config.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 8, background: "#F0F4FF", border: "1px solid #c7d4f8", borderRadius: 10, padding: "8px 12px", textDecoration: "none", color: "#2A3887", fontSize: 12, fontWeight: 700 }}>
            📎 {step.config.title || step.config.url.split("/").pop() || "Document"}
          </a>
          {step.config.description && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{step.config.description}</div>}
        </div>
      )}
      {step.type === "carousel" && step.config?.cards && step.config.cards.length > 0 && (
        <div style={{ paddingLeft: 32, marginBottom: 10, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {step.config.cards.map((card, i) => (
            <div key={i} style={{ minWidth: 140, background: "white", border: "1px solid #E2F1FC", borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
              {card.image && <img src={card.image} alt="" style={{ width: "100%", height: 80, objectFit: "cover" }} />}
              <div style={{ padding: 8 }}>
                {card.title && <div style={{ fontSize: 12, fontWeight: 700, color: "#2A3887" }}>{card.title}</div>}
                {card.subtitle && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{card.subtitle}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      {step.type === "options" && step.options && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 32 }}>
          {step.options.map(opt => (
            <button key={opt.value} onClick={() => handleOption(opt)}
              style={{ background: "white", border: "1.5px solid #2A3887", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#2A3887", cursor: "pointer" }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Text input */}
      {(step.type === "input" || step.type === "collect_lead") && (
        <div style={{ display: "flex", gap: 8, paddingLeft: 32 }}>
          <input value={inputVal} onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleInput()}
            placeholder={step.placeholder || "Type here…"}
            style={{ flex: 1, border: "1.5px solid #E2F1FC", borderRadius: 20, padding: "7px 14px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          <button onClick={handleInput} disabled={!inputVal.trim()}
            style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white", border: "none", borderRadius: "50%", width: 34, height: 34, fontSize: 15, cursor: "pointer", opacity: inputVal.trim() ? 1 : 0.4 }}>→</button>
        </div>
      )}

      {/* Continue → for any non-interactive type with a `next` pointer.
          Covers `message`, the display-only media types, and the authoring-only
          types (start/form/schedule/condition/otp/api/ai/handoff) which the
          runtime can't yet *execute* but should not freeze on. */}
      {step.next && step.type !== "options" && step.type !== "input" && step.type !== "collect_lead" && step.type !== "end" && (
        <div style={{ paddingLeft: 32 }}>
          <button onClick={() => advance(step.next!)}
            style={{ background: "#F0F4FF", border: "1.5px solid #c7d4f8", borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 700, color: "#2A3887", cursor: "pointer" }}>
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}


// ── Main Component ────────────────────────────────────────────────────────────

export interface AssistantPageContext {
  page?: "home" | "store" | "project" | "tower" | "unit";
  project_id?: string;
  project_slug?: string;
  project_name?: string;
  tower_id?: string;
  unit_id?: string;
  unit_number?: string;
}

interface AssistantAction {
  type: "navigate_store" | "navigate_unit" | "navigate_project" | "ask_which" | "none";
  url?: string;
  label?: string;
  options?: { label: string; value: string; url?: string }[];
  params?: Record<string, any>;
}

interface Props {
  searchCount?: number;
  lastResultsCount?: number;
  lastQuery?: string;
  budget?: number;
  pageContext?: AssistantPageContext;
  // When true, the launcher button shows on mount instead of waiting for the
  // dwell timer or a zero-results signal. Use on landing pages where we want
  // the assistant available right away.
  immediate?: boolean;
}

export default function ProactiveAssistant({
  searchCount = 0,
  lastResultsCount = -1,
  lastQuery = "",
  budget = 0,
  pageContext,
  immediate = false,
}: Props) {
  const [visible, setVisible]           = useState(immediate);
  const [open, setOpen]                 = useState(false);
  const [tab, setTab]                   = useState<"chat" | "flow" | "riseup" | "callback">("chat");
  const [messages, setMessages]         = useState<{ role: string; content: string; brochure?: any; riseup?: any; units?: any[]; action?: AssistantAction }[]>([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [riseupData, setRiseupData]     = useState<any>(null);
  const [suggestedUnits, setSuggestedUnits] = useState<any[]>([]);
  const [callbackForm, setCallbackForm] = useState({ name: "", phone: "", email: "" });
  const [callbackSent, setCallbackSent] = useState(false);
  const [callbackStep, setCallbackStep] = useState<"form" | "otp" | "verifying" | "submitting">("form");
  const [callbackOtp, setCallbackOtp] = useState(["", "", "", "", "", ""]);
  const [callbackError, setCallbackError] = useState("");
  const [callbackCountdown, setCallbackCountdown] = useState(0);
  const [callbackDevOtp, setCallbackDevOtp] = useState<string | null>(null);
  const callbackOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Admin-editable widget content fetched once per widget mount.
  const [widgetContent, setWidgetContent] = useState<{ riseup?: any; callback?: any }>({});
  const [activeFlow, setActiveFlow]     = useState<{ name: string; steps: FlowStep[] } | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef     = useRef<HTMLDivElement>(null);
  const triggered  = useRef(false);

  // Trigger: 0 results
  useEffect(() => {
    if (triggered.current) return;
    if (lastResultsCount === 0 && searchCount >= 1) {
      triggered.current = true;
      setVisible(true);
      fireGreeting();
    }
  }, [searchCount, lastResultsCount]);  // eslint-disable-line

  // Trigger: 45s timer (skipped when `immediate` — launcher already visible)
  useEffect(() => {
    if (triggered.current) return;
    if (immediate) { triggered.current = true; return; }
    timerRef.current = setTimeout(() => { triggered.current = true; setVisible(true); }, 10_000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [immediate]);

  // Load active flow on open
  useEffect(() => {
    if (!open || activeFlow !== null) return;
    fetch(`${API}/assistant/flows/active?trigger=on_open`)
      .then(r => r.json())
      .then((flows: any[]) => { if (flows.length) setActiveFlow(flows[0]); })
      .catch(() => {});
  }, [open]);  // eslint-disable-line

  // Load admin-editable widget content (RiseUp / Callback) once.
  useEffect(() => {
    fetch(`${API}/assistant/content`)
      .then(r => r.json())
      .then(data => { if (data && typeof data === "object") setWidgetContent(data); })
      .catch(() => {});
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Restore chat history for this session on mount (so reopening the widget
  // shows the visitor their prior conversation)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sid = localStorage.getItem("jp_session_id");
    if (!sid) return;
    try {
      const raw = localStorage.getItem(`jp_chat_${sid}`);
      if (raw) {
        const prior = JSON.parse(raw);
        if (Array.isArray(prior) && prior.length > 0) {
          setMessages(prior);
          triggered.current = true;  // don't fire greeting over existing history
          setVisible(true);          // show the launcher immediately
        }
      }
    } catch {}
  }, []);

  // Persist chat history whenever messages change
  useEffect(() => {
    if (typeof window === "undefined" || messages.length === 0) return;
    const sid = localStorage.getItem("jp_session_id");
    if (!sid) return;
    try { localStorage.setItem(`jp_chat_${sid}`, JSON.stringify(messages)); } catch {}
  }, [messages]);

  async function callAssistant(msgs: { role: string; content: string }[]) {
    try {
      const session_id = getOrCreateLocalId("jp_session_id");
      const visitor_id = getOrCreateLocalId("jp_visitor_id");
      const visitor_meta = collectVisitorMeta();
      const r = await fetch(`${API}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: msgs,
          session_id,
          context: {
            search_query: lastQuery,
            budget,
            results_count: lastResultsCount,
            session_id,
            visitor_id,
            visitor_meta,
            ...(pageContext || {}),
          },
        }),
      });
      return await r.json();
    } catch { return null; }
  }

  async function fireGreeting() {
    setLoading(true);
    // Context-aware opening message that reflects which page the visitor is on.
    let initMsg: string;
    if (lastResultsCount === 0) {
      initMsg = `I searched for "${lastQuery}" but found no results`;
    } else if (pageContext?.page === "unit" && pageContext.unit_number) {
      initMsg = `I'm looking at unit ${pageContext.unit_number} — give me a quick summary and what I should consider.`;
    } else if (pageContext?.page === "project" && pageContext.project_name) {
      initMsg = `I'm on the ${pageContext.project_name} project page — tell me briefly what it offers.`;
    } else if (pageContext?.page === "tower") {
      initMsg = "I'm viewing a tower — what's worth knowing here?";
    } else {
      initMsg = "I've been browsing for a while and need help";
    }
    const msgs = [{ role: "user", content: initMsg }];
    const res = await callAssistant(msgs);
    if (res) {
      setMessages([{ role: "assistant", content: res.reply, brochure: res.brochure, riseup: res.show_riseup ? res.riseup_data : null, units: res.suggested_units, action: res.action }]);
      if (res.suggested_units?.length) setSuggestedUnits(res.suggested_units);
      if (res.riseup_data) setRiseupData(res.riseup_data);
    }
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMsgs = [...messages.map(m => ({ role: m.role, content: m.content })), userMsg];
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);
    const res = await callAssistant(newMsgs);
    if (res) {
      setMessages(m => [...m, { role: "assistant", content: res.reply, brochure: res.brochure, riseup: res.show_riseup ? res.riseup_data : null, units: res.suggested_units?.length ? res.suggested_units : undefined, action: res.action }]);
      if (res.suggested_units?.length) setSuggestedUnits(res.suggested_units);
      if (res.riseup_data) setRiseupData(res.riseup_data);
    }
    setLoading(false);
  }

  // ── Callback flow: form → OTP → submit lead ─────────────────────────────────
  function cleanPhone(v: string) {
    return v.replace(/\D/g, "").replace(/^91/, "");
  }

  async function handleCallbackFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCallbackError("");
    const phone = cleanPhone(callbackForm.phone);
    if (!callbackForm.name.trim()) { setCallbackError("Please enter your name"); return; }
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) { setCallbackError("Enter a valid 10-digit Indian mobile"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(callbackForm.email.trim())) { setCallbackError("Enter a valid email"); return; }
    setCallbackStep("verifying");
    try {
      const r = await fetch(`${API}/auth/send-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "callback" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Failed to send OTP");
      setCallbackForm(f => ({ ...f, phone }));
      if (data.dev_otp) setCallbackDevOtp(data.dev_otp);
      setCallbackOtp(["", "", "", "", "", ""]);
      setCallbackStep("otp");
      setCallbackCountdown(30);
      setTimeout(() => callbackOtpRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      setCallbackError(err.message || "Couldn't send OTP. Try again.");
      setCallbackStep("form");
    }
  }

  async function verifyCallbackOtp(digits: string[]) {
    const code = digits.join("");
    if (code.length !== 6) return;
    setCallbackError(""); setCallbackStep("submitting");
    try {
      const r = await fetch(`${API}/auth/verify-phone`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: callbackForm.phone, otp: code }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Invalid OTP");
      // Phone verified — submit the lead.
      await fetch(`${API}/leads`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: callbackForm.name,
          phone: callbackForm.phone,
          email: callbackForm.email,
          message: `Callback from assistant (phone verified). Searched: "${lastQuery}"`,
          source: "proactive_assistant",
        }),
      });
      setCallbackSent(true);
      setCallbackStep("form");
      setCallbackDevOtp(null);
    } catch (err: any) {
      setCallbackError(err.message || "Verification failed. Try again.");
      setCallbackStep("otp");
    }
  }

  function handleCallbackOtpChange(idx: number, value: string) {
    if (value && !/^\d$/.test(value)) return;
    const next = [...callbackOtp]; next[idx] = value; setCallbackOtp(next);
    if (value && idx < 5) callbackOtpRefs.current[idx + 1]?.focus();
    if (value && idx === 5 && next.join("").length === 6) {
      setTimeout(() => verifyCallbackOtp(next), 80);
    }
  }
  function handleCallbackOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !callbackOtp[idx] && idx > 0) callbackOtpRefs.current[idx - 1]?.focus();
  }
  function handleCallbackOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setCallbackOtp(digits);
      callbackOtpRefs.current[5]?.focus();
      setTimeout(() => verifyCallbackOtp(digits), 80);
    }
  }
  async function resendCallbackOtp() {
    if (callbackCountdown > 0) return;
    setCallbackError("");
    try {
      const r = await fetch(`${API}/auth/send-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: callbackForm.phone, purpose: "callback" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Failed to resend");
      if (data.dev_otp) setCallbackDevOtp(data.dev_otp);
      setCallbackCountdown(30);
    } catch (err: any) { setCallbackError(err.message || "Resend failed"); }
  }

  // OTP resend countdown
  useEffect(() => {
    if (callbackCountdown <= 0) return;
    const t = setTimeout(() => setCallbackCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [callbackCountdown]);

  // Called when the guided flow reaches a `show_units` step. The flow has
  // already collected fields like budget/bhk and folded them into a query
  // string ("1BHK under ₹50L"). Previously this routed through /assistant/chat,
  // which only returns units for a narrow `results_count == 0` fallback path —
  // so the user finished the budget questionnaire and saw a generic reply
  // with no matches and no link. Hit /search/nlp directly so the budget is
  // actually parsed into max_price and applied as a filter.
  async function handleFlowSearchUnits(query: string) {
    setTab("chat");
    const userMsg = { role: "user", content: `Show me ${query}` };
    setMessages(m => [...m, userMsg]);
    setLoading(true);
    try {
      const session_id = getOrCreateLocalId("jp_session_id");
      const r = await fetch(`${API}/search/nlp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, session_id }),
      });
      const d = await r.json();
      const items: any[] = Array.isArray(d?.items) ? d.items : [];
      // Build a /store deep link from the filters the parser extracted, so the
      // user can keep browsing with the same budget/BHK pre-applied.
      const f = (d?.interpreted_as || {}) as Record<string, any>;
      const params = new URLSearchParams();
      if (f.max_price) params.set("max_price", String(f.max_price));
      if (f.min_price) params.set("min_price", String(f.min_price));
      if (f.unit_type) params.set("unit_type", String(f.unit_type));
      if (f.facing)    params.set("facing", String(f.facing));
      const storeHref = "/store" + (params.toString() ? `?${params}` : "");

      const reply = items.length
        ? d.message || `Found ${d.total ?? items.length} match${(d.total ?? items.length) === 1 ? "" : "es"} for "${query}".`
        : (d.suggestions && d.suggestions[0]) || `I couldn't find an exact match for "${query}". Want to broaden the search?`;
      const action: AssistantAction = {
        type: "navigate_store",
        url: storeHref,
        label: items.length ? "Browse all on Store →" : "Open Store with these filters →",
      };
      setMessages(m => [...m, {
        role: "assistant",
        content: reply,
        units: items.slice(0, 6),
        action,
      }]);
      if (items.length) setSuggestedUnits(items.slice(0, 6));
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Couldn't load results — please try again." }]);
    }
    setLoading(false);
  }

  function handleFlowComplete(data: Record<string, string>) {
    if (data.phone) {
      setCallbackForm({ name: data.name || "", phone: data.phone, email: data.email || "" });
      setTab("callback");
    } else {
      setTab("chat");
      fireGreeting();
    }
  }

  if (!visible) return null;

  const TABS = [
    { key: "chat",     label: "💬 Chat" },
    ...(activeFlow ? [{ key: "flow", label: "🗺 Guide" }] : []),
    { key: "riseup",   label: "🚀 RiseUp" },
    { key: "callback", label: "📞 Callback" },
  ] as { key: typeof tab; label: string }[];

  return (
    <>
      {!open && (
        <button onClick={() => { setOpen(true); if (messages.length === 0) fireGreeting(); }}
          style={{ position: "fixed", bottom: 100, right: 24, zIndex: 1000, background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white", border: "none", borderRadius: 50, padding: "13px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 8px 30px rgba(42,56,135,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
          <AiIcon size={22} style={{ background: "white", borderRadius: 6, padding: 2 }} />
          <span>Need help finding<br /><strong>your home?</strong></span>
        </button>
      )}

      {open && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, width: 370, maxHeight: "82vh", display: "flex", flexDirection: "column", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", border: "1px solid rgba(42,56,135,0.12)" }}>

          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)", padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AiIcon size={32} style={{ background: "white", borderRadius: 8, padding: 3 }} />
              <div>
                <div style={{ color: "white", fontWeight: 900, fontSize: 14 }}>Janapriya AI</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Online · Here to help</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "white", cursor: "pointer", fontSize: 13 }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", background: "#F8F9FB", borderBottom: "1px solid #E2F1FC", flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ flex: 1, padding: "9px 2px", border: "none", background: "transparent", fontSize: 11, fontWeight: tab === t.key ? 800 : 600, color: tab === t.key ? "#2A3887" : "#888", borderBottom: tab === t.key ? "2px solid #2A3887" : "2px solid transparent", cursor: "pointer" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── CHAT TAB ── */}
          {tab === "chat" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: 14, background: "white", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
                {messages.length === 0 && loading && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <AiIcon size={26} />
                    <div style={{ background: "#F0F4FF", borderRadius: "0 12px 12px 12px", padding: "10px 12px", fontSize: 13, color: "#888" }}>typing…</div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", gap: 8, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                      {m.role === "assistant" && (
                        <AiIcon size={26} />
                      )}
                      <div style={{
                        background: m.role === "user" ? "linear-gradient(135deg,#2A3887,#29A9DF)" : "#F0F4FF",
                        color: m.role === "user" ? "white" : "#333",
                        borderRadius: m.role === "user" ? "12px 0 12px 12px" : "0 12px 12px 12px",
                        padding: "9px 12px", fontSize: 13, maxWidth: "82%", lineHeight: 1.5,
                      }}>{m.content}</div>
                    </div>
                    {m.brochure && <div style={{ marginLeft: 34 }}><BrochureCard brochure={m.brochure} /></div>}
                    {m.riseup   && <div style={{ marginLeft: 34 }}><RiseUpCard data={m.riseup} /></div>}
                    {m.units?.length ? (
                      <div style={{ marginLeft: 34, marginTop: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#999", marginBottom: 4 }}>MATCHES</div>
                        {m.units.map((u: any) => <SuggestedUnit key={u.id} unit={u} />)}
                      </div>
                    ) : null}
                    {m.action && <div style={{ marginLeft: 34 }}><ActionCard action={m.action} /></div>}
                  </div>
                ))}

                {loading && messages.length > 0 && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <AiIcon size={26} />
                    <div style={{ background: "#F0F4FF", borderRadius: "0 12px 12px 12px", padding: "9px 12px", fontSize: 13, color: "#888" }}>typing…</div>
                  </div>
                )}

                {suggestedUnits.length > 0 && messages.length > 0 && !messages[messages.length - 1].units?.length && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#999", marginBottom: 4 }}>SUGGESTED</div>
                    {suggestedUnits.map(u => <SuggestedUnit key={u.id} unit={u} />)}
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Quick actions — tailored to page context */}
              {messages.length <= 1 && !loading && (
                <div style={{ padding: "8px 14px", background: "#F8F9FB", display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                  {(
                    pageContext?.page === "unit"
                      ? [
                          "Get this brochure",
                          "Does RiseUp apply here?",
                          "Book a site visit",
                          "Show similar units",
                        ]
                      : pageContext?.page === "project"
                      ? [
                          `Which units fit a ₹80L budget?`,
                          "Get the brochure",
                          "Book a site visit",
                          "Show me 3BHKs here",
                        ]
                      : pageContext?.page === "tower"
                      ? [
                          "Show available units in this tower",
                          "Get floor plans",
                          "Tell me about RiseUp",
                          "Book a site visit",
                        ]
                      : pageContext?.page === "store"
                      ? [
                          "Spacious 3BHK under ₹1Cr",
                          "East-facing, ready to move",
                          "What's the cheapest available?",
                          "Tell me about RiseUp",
                        ]
                      : [
                          "My salary is ₹1.5L, what fits?",
                          "Show 3BHK under ₹1Cr",
                          "Which projects are ready to move?",
                          "Tell me about RiseUp",
                        ]
                  ).map(q => (
                    <button key={q} onClick={() => { setInput(q); }}
                      style={{ background: "white", border: "1px solid #E2F1FC", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#2A3887", cursor: "pointer" }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{ padding: "10px 12px", background: "white", borderTop: "1px solid #F0F4FF", display: "flex", gap: 8, flexShrink: 0 }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Ask anything…"
                  style={{ flex: 1, border: "1px solid #E2F1FC", borderRadius: 20, padding: "8px 14px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                <button onClick={sendMessage} disabled={loading || !input.trim()}
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white", border: "none", borderRadius: "50%", width: 36, height: 36, fontSize: 15, cursor: "pointer", opacity: loading || !input.trim() ? 0.45 : 1 }}>→</button>
              </div>
            </>
          )}

          {/* ── GUIDED FLOW TAB ── */}
          {tab === "flow" && activeFlow && (
            <div style={{ flex: 1, overflowY: "auto", padding: 14, background: "white" }}>
              <p style={{ fontSize: 11, color: "#999", marginBottom: 12, fontWeight: 700 }}>GUIDED: {activeFlow.name.toUpperCase()}</p>
              <FlowRenderer
                steps={activeFlow.steps}
                onComplete={handleFlowComplete}
                onSearchUnits={handleFlowSearchUnits}
              />
            </div>
          )}

          {/* ── RISEUP TAB ── */}
          {tab === "riseup" && (() => {
            const r = widgetContent.riseup || {};
            const bullets: { heading: string; description: string }[] = Array.isArray(r.bullets) ? r.bullets : [];
            const exampleLines: string[] = Array.isArray(r.example_lines) ? r.example_lines : [];
            return (
              <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "white" }}>
                <div style={{ textAlign: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 32 }}>🚀</div>
                  <h3 style={{ fontWeight: 900, color: "#2A3887", fontSize: 17, margin: "6px 0 4px" }}>{r.title || "RiseUp Offer"}</h3>
                  <p style={{ color: "#666", fontSize: 13 }}>{r.subtitle || ""}</p>
                </div>
                {bullets.length > 0 && (
                  <div style={{ background: "#F0F4FF", borderRadius: 14, padding: 14, marginBottom: 12 }}>
                    {bullets.map((b, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <span style={{ color: "#29A9DF", fontWeight: 900, fontSize: 15 }}>✓</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 12, color: "#2A3887" }}>{b.heading}</div>
                          <div style={{ fontSize: 11, color: "#666" }}>{b.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {riseupData && <RiseUpCard data={riseupData} />}
                {(r.example_title || exampleLines.length > 0) && (
                  <div style={{ background: "#FFF8E1", borderRadius: 12, padding: 12, marginTop: 12 }}>
                    {r.example_title && <p style={{ fontWeight: 800, fontSize: 12, color: "#92400E", marginBottom: 4 }}>{r.example_title}</p>}
                    <div style={{ fontSize: 11, color: "#666", lineHeight: 1.7 }}>
                      {exampleLines.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
                {r.cta_url && (
                  <a href={r.cta_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "block", textAlign: "center", marginTop: 14, background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 900, textDecoration: "none" }}>
                    {r.cta_label || "Learn more →"}
                  </a>
                )}
              </div>
            );
          })()}

          {/* ── CALLBACK TAB ── */}
          {tab === "callback" && (() => {
            const c = widgetContent.callback || {};
            const heading       = c.heading        || "Request a Callback";
            const subheading    = c.subheading     || "Our advisor will call within 30 minutes after a quick OTP check.";
            const successHead   = c.success_heading|| "We'll call you soon!";
            const successBody   = c.success_body   || "Our advisor will reach out within 30 minutes during business hours.";
            const directLabel   = c.direct_call_label || "Or call us directly";
            const phoneDisplay  = c.phone_display  || "+91 40 1234 5678";
            const phoneTel      = c.phone_tel      || "+914012345678";
            return (
            <div style={{ flex: 1, padding: 16, background: "white", overflowY: "auto" }}>
              {callbackSent ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 40 }}>✅</div>
                  <h3 style={{ fontWeight: 900, color: "#2A3887", marginTop: 10 }}>{successHead}</h3>
                  <p style={{ color: "#666", fontSize: 13, marginTop: 6 }}>{successBody}</p>
                  <button onClick={() => setTab("chat")} style={{ marginTop: 14, background: "#F0F4FF", border: "none", borderRadius: 10, padding: "10px 20px", color: "#2A3887", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Continue Chat</button>
                </div>
              ) : callbackStep === "otp" || callbackStep === "submitting" ? (
                <>
                  <h3 style={{ fontWeight: 900, color: "#2A3887", marginBottom: 4 }}>Verify your phone</h3>
                  <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>
                    We sent a 6-digit code to <strong>+91 {callbackForm.phone}</strong>.{" "}
                    <button onClick={() => { setCallbackStep("form"); setCallbackError(""); setCallbackDevOtp(null); }}
                      style={{ background: "transparent", border: "none", color: "#2A3887", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 }}>
                      Edit
                    </button>
                  </p>
                  {callbackError && (
                    <div style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: 10, padding: "8px 12px", fontSize: 12, marginBottom: 10 }}>
                      {callbackError}
                    </div>
                  )}
                  {callbackDevOtp && (
                    <div style={{ background: "#FEF9C3", color: "#92400E", border: "1px solid #FDE68A", borderRadius: 10, padding: "6px 10px", fontSize: 11, marginBottom: 10 }}>
                      Dev OTP: <strong>{callbackDevOtp}</strong>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, justifyContent: "space-between", marginBottom: 10 }}>
                    {callbackOtp.map((d, i) => (
                      <input
                        key={i}
                        ref={el => { callbackOtpRefs.current[i] = el; }}
                        value={d}
                        onChange={e => handleCallbackOtpChange(i, e.target.value)}
                        onKeyDown={e => handleCallbackOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleCallbackOtpPaste : undefined}
                        inputMode="numeric"
                        maxLength={1}
                        disabled={callbackStep === "submitting"}
                        style={{ flex: 1, textAlign: "center", border: "1.5px solid #E2F1FC", borderRadius: 10, padding: "10px 0", fontSize: 18, fontWeight: 800, color: "#2A3887", outline: "none", fontFamily: "inherit", minWidth: 0 }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#666" }}>
                    <span>{callbackStep === "submitting" ? "Verifying…" : ""}</span>
                    <button onClick={resendCallbackOtp} disabled={callbackCountdown > 0}
                      style={{ background: "transparent", border: "none", color: callbackCountdown > 0 ? "#aaa" : "#2A3887", fontWeight: 700, fontSize: 12, cursor: callbackCountdown > 0 ? "default" : "pointer", padding: 0 }}>
                      {callbackCountdown > 0 ? `Resend in ${callbackCountdown}s` : "Resend OTP"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={{ fontWeight: 900, color: "#2A3887", marginBottom: 4 }}>{heading}</h3>
                  <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>{subheading}</p>
                  {callbackError && (
                    <div style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: 10, padding: "8px 12px", fontSize: 12, marginBottom: 10 }}>
                      {callbackError}
                    </div>
                  )}
                  <form onSubmit={handleCallbackFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input required value={callbackForm.name} onChange={e => setCallbackForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your name" style={{ border: "1.5px solid #E2F1FC", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    <input required value={callbackForm.phone} onChange={e => setCallbackForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="Phone number (10-digit)" type="tel" inputMode="numeric"
                      style={{ border: "1.5px solid #E2F1FC", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    <input required value={callbackForm.email} onChange={e => setCallbackForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="Email address" type="email"
                      style={{ border: "1.5px solid #E2F1FC", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    <button type="submit" disabled={callbackStep === "verifying"}
                      style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 900, cursor: callbackStep === "verifying" ? "default" : "pointer", opacity: callbackStep === "verifying" ? 0.7 : 1 }}>
                      {callbackStep === "verifying" ? "Sending OTP…" : "Send OTP →"}
                    </button>
                  </form>
                  <div style={{ marginTop: 14, textAlign: "center" }}>
                    <p style={{ fontSize: 11, color: "#aaa" }}>{directLabel}</p>
                    <a href={`tel:${phoneTel}`} style={{ fontWeight: 800, color: "#2A3887", fontSize: 14, textDecoration: "none" }}>{phoneDisplay}</a>
                  </div>
                </>
              )}
            </div>
            );
          })()}
        </div>
      )}
    </>
  );
}
