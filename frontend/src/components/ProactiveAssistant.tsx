"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

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
  type: "message" | "options" | "input" | "show_units" | "show_brochure" | "collect_lead" | "end";
  text: string;
  options?: { label: string; value: string; next: string }[];
  field?: string;        // for input steps: budget | name | phone | bhk
  next?: string;         // for non-branching steps
  placeholder?: string;
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
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#2A3887,#29A9DF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", flexShrink: 0 }}>✦</div>
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
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#2A3887,#29A9DF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", flexShrink: 0 }}>✦</div>
        <div style={{ background: "#F0F4FF", borderRadius: "0 10px 10px 10px", padding: "8px 12px", fontSize: 13, color: "#333", maxWidth: "85%", lineHeight: 1.5 }}>{step.text}</div>
      </div>

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

      {/* Message-only: auto-advance button */}
      {step.type === "message" && step.next && (
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
}

export default function ProactiveAssistant({
  searchCount = 0,
  lastResultsCount = -1,
  lastQuery = "",
  budget = 0,
  pageContext,
}: Props) {
  const [visible, setVisible]           = useState(false);
  const [open, setOpen]                 = useState(false);
  const [tab, setTab]                   = useState<"chat" | "flow" | "riseup" | "callback">("chat");
  const [messages, setMessages]         = useState<{ role: string; content: string; brochure?: any; riseup?: any; units?: any[]; action?: AssistantAction }[]>([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [riseupData, setRiseupData]     = useState<any>(null);
  const [suggestedUnits, setSuggestedUnits] = useState<any[]>([]);
  const [callbackForm, setCallbackForm] = useState({ name: "", phone: "" });
  const [callbackSent, setCallbackSent] = useState(false);
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

  // Trigger: 45s timer
  useEffect(() => {
    if (triggered.current) return;
    timerRef.current = setTimeout(() => { triggered.current = true; setVisible(true); }, 10_000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Load active flow on open
  useEffect(() => {
    if (!open || activeFlow !== null) return;
    fetch(`${API}/assistant/flows/active?trigger=on_open`)
      .then(r => r.json())
      .then((flows: any[]) => { if (flows.length) setActiveFlow(flows[0]); })
      .catch(() => {});
  }, [open]);  // eslint-disable-line

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

  async function handleCallback(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch(`${API}/leads`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: callbackForm.name, phone: callbackForm.phone, message: `Callback from assistant. Searched: "${lastQuery}"`, source: "proactive_assistant" }),
      });
      setCallbackSent(true);
    } catch {}
  }

  function handleFlowSearchUnits(query: string) {
    setTab("chat");
    const userMsg = { role: "user", content: `Show me ${query}` };
    setMessages(m => [...m, userMsg]);
    setLoading(true);
    callAssistant([{ role: "user", content: query }]).then(res => {
      if (res) {
        setMessages(m => [...m, { role: "assistant", content: res.reply, units: res.suggested_units }]);
        if (res.suggested_units?.length) setSuggestedUnits(res.suggested_units);
      }
      setLoading(false);
    });
  }

  function handleFlowComplete(data: Record<string, string>) {
    if (data.phone) {
      setCallbackForm({ name: data.name || "", phone: data.phone });
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
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white", border: "none", borderRadius: 50, padding: "13px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 8px 30px rgba(42,56,135,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>✦</span>
          <span>Need help finding<br /><strong>your home?</strong></span>
        </button>
      )}

      {open && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, width: 370, maxHeight: "82vh", display: "flex", flexDirection: "column", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", border: "1px solid rgba(42,56,135,0.12)" }}>

          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)", padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
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
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#2A3887,#29A9DF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", flexShrink: 0 }}>✦</div>
                    <div style={{ background: "#F0F4FF", borderRadius: "0 12px 12px 12px", padding: "10px 12px", fontSize: 13, color: "#888" }}>typing…</div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", gap: 8, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                      {m.role === "assistant" && (
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#2A3887,#29A9DF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", flexShrink: 0 }}>✦</div>
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
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#2A3887,#29A9DF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white" }}>✦</div>
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
          {tab === "riseup" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "white" }}>
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 32 }}>🚀</div>
                <h3 style={{ fontWeight: 900, color: "#2A3887", fontSize: 17, margin: "6px 0 4px" }}>RiseUp Offer</h3>
                <p style={{ color: "#666", fontSize: 13 }}>Buy a bigger home with a smaller budget</p>
              </div>
              <div style={{ background: "#F0F4FF", borderRadius: 14, padding: 14, marginBottom: 12 }}>
                {[
                  ["Pay only 80% now",             "Lock in the home at 80% of total cost"],
                  ["Bank funds up to 90%",         "Of the 80% — down payment is just 8–16%"],
                  ["20% after final demand",       "Paid once the builder raises the final demand"],
                  ["Save on interest",             "EMI only on 80% during construction"],
                ].map(([t, d]) => (
                  <div key={t} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: "#29A9DF", fontWeight: 900, fontSize: 15 }}>✓</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 12, color: "#2A3887" }}>{t}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
              {riseupData && <RiseUpCard data={riseupData} />}
              <div style={{ background: "#FFF8E1", borderRadius: 12, padding: 12, marginTop: 12 }}>
                <p style={{ fontWeight: 800, fontSize: 12, color: "#92400E", marginBottom: 4 }}>Example: ₹1 Crore unit</p>
                <div style={{ fontSize: 11, color: "#666", lineHeight: 1.7 }}>
                  → Pay for ₹80L only<br />
                  → Down payment: ₹8L (10%) or ₹16L (20%)<br />
                  → Bank funds: ₹64L–₹72L<br />
                  → After final demand: ₹20L (top-up / personal loan)<br />
                  → <strong style={{ color: "#2A3887" }}>Own a ₹1Cr home at the cost of ₹80L!</strong>
                </div>
              </div>
              <a href="https://riseup.house" target="_blank" rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", marginTop: 14, background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 900, textDecoration: "none" }}>
                Explore at riseup.house →
              </a>
            </div>
          )}

          {/* ── CALLBACK TAB ── */}
          {tab === "callback" && (
            <div style={{ flex: 1, padding: 16, background: "white" }}>
              {callbackSent ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 40 }}>✅</div>
                  <h3 style={{ fontWeight: 900, color: "#2A3887", marginTop: 10 }}>We'll call you soon!</h3>
                  <p style={{ color: "#666", fontSize: 13, marginTop: 6 }}>Our advisor will reach out within 30 minutes during business hours.</p>
                  <button onClick={() => setTab("chat")} style={{ marginTop: 14, background: "#F0F4FF", border: "none", borderRadius: 10, padding: "10px 20px", color: "#2A3887", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Continue Chat</button>
                </div>
              ) : (
                <>
                  <h3 style={{ fontWeight: 900, color: "#2A3887", marginBottom: 4 }}>Request a Callback</h3>
                  <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>Our advisor will call within 30 minutes.</p>
                  <form onSubmit={handleCallback} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input required value={callbackForm.name} onChange={e => setCallbackForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your name" style={{ border: "1.5px solid #E2F1FC", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    <input required value={callbackForm.phone} onChange={e => setCallbackForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="Phone number" type="tel" style={{ border: "1.5px solid #E2F1FC", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                    <button type="submit" style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)", color: "white", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 900, cursor: "pointer" }}>
                      Request Callback →
                    </button>
                  </form>
                  <div style={{ marginTop: 14, textAlign: "center" }}>
                    <p style={{ fontSize: 11, color: "#aaa" }}>Or call us directly</p>
                    <a href="tel:+914012345678" style={{ fontWeight: 800, color: "#2A3887", fontSize: 14, textDecoration: "none" }}>+91 40 1234 5678</a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
