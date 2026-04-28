'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import type { Edge, Node, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Step, StepType, TYPE_META, TYPE_GROUPS, STEP_TYPE_LIST, StepInspector,
} from './AssistantFlowInspector';

export type { Step, StepType };

// ── Hierarchical layout (longest-path from start) ─────────────────────────────
function computeLayout(steps: Step[]): Record<string, { x: number; y: number }> {
  if (!steps.length) return {};
  const ids = new Set(steps.map(s => s.id));
  const preds: Record<string, string[]> = {};
  for (const s of steps) {
    const targets: string[] = [];
    if (s.next && ids.has(s.next)) targets.push(s.next);
    for (const o of s.options || []) if (o.next && ids.has(o.next)) targets.push(o.next);
    for (const t of targets) (preds[t] ??= []).push(s.id);
  }
  const start = steps[0].id;
  const NEG = -Infinity;
  const depth: Record<string, number> = {};
  for (const s of steps) depth[s.id] = s.id === start ? 0 : NEG;
  for (let iter = 0; iter < steps.length + 2; iter++) {
    let changed = false;
    for (const s of steps) {
      const ps = preds[s.id] || [];
      if (!ps.length) continue;
      const best = Math.max(...ps.map(p => depth[p] ?? NEG));
      if (best > NEG && best + 1 > depth[s.id]) {
        depth[s.id] = best + 1;
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const s of steps) if (depth[s.id] === NEG) depth[s.id] = 0;
  const byDepth: Record<number, string[]> = {};
  for (const s of steps) (byDepth[depth[s.id]] ??= []).push(s.id);
  const COLW = 300;
  const ROWH = 150;
  const positions: Record<string, { x: number; y: number }> = {};
  for (const [d, list] of Object.entries(byDepth)) {
    list.forEach((id, i) => { positions[id] = { x: 60 + Number(d) * COLW, y: 60 + i * ROWH }; });
  }
  return positions;
}

// ── Custom node renderer ──────────────────────────────────────────────────────
type NodeData = { step: Step };

function StepNode({ data, id }: NodeProps) {
  const step = (data as NodeData).step;
  const meta = TYPE_META[step.type];
  if (!meta) {
    return (
      <div style={{ background: '#fff', border: '2px dashed #ef4444', borderRadius: 12, padding: 10, fontSize: 12, color: '#b91c1c' }}>
        <Handle type="target" position={Position.Top} />
        Unknown type: {step.type}
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }
  const isEnd = step.type === 'end';
  const isStart = step.type === 'start';
  const cfg = step.config || {};
  return (
    <div
      style={{
        background: 'white',
        border: `2px solid ${meta.color}`,
        borderRadius: 12,
        minWidth: 220,
        maxWidth: 240,
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {!isStart && <Handle type="target" position={Position.Top} style={{ background: meta.color, width: 8, height: 8 }} />}
      <div style={{ background: meta.color, color: 'white', padding: '5px 10px', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase' }}>
        <span>{meta.icon}</span>
        <span>{meta.label}</span>
        <span style={{ marginLeft: 'auto', opacity: 0.85, fontFamily: 'ui-monospace, monospace', fontSize: 9 }}>{id}</span>
      </div>

      {/* Body — varies by type */}
      <div style={{ padding: 10, fontSize: 12, color: '#1f2937', lineHeight: 1.4, minHeight: 24 }}>
        {step.type === 'image' && cfg.url ? <img src={cfg.url} alt="" style={{ width: '100%', borderRadius: 4, marginBottom: 4 }} /> : null}
        {step.type === 'video' && cfg.url ? <div style={{ background: '#fee2e2', borderRadius: 4, padding: 6, fontSize: 11, color: '#991b1b', marginBottom: 4 }}>🎬 {cfg.url.split('/').pop()}</div> : null}
        {step.type === 'document' && (cfg.title || cfg.url) ? <div style={{ background: '#fef3c7', borderRadius: 4, padding: 6, fontSize: 11, color: '#92400e', marginBottom: 4 }}>📎 {cfg.title || cfg.url}</div> : null}
        {step.type === 'carousel' ? <div style={{ fontSize: 11, color: '#6b7280' }}>{(cfg.cards || []).length} card(s)</div> : null}
        {step.type === 'condition' ? <div style={{ fontSize: 11, color: '#6b7280' }}>{(cfg.rules || []).length} rule(s) · {cfg.logic || 'and'}</div> : null}
        {step.type === 'api' ? <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'ui-monospace, monospace' }}>{cfg.method || 'POST'} {(cfg.url || '').slice(0, 30) || '(no url)'}</div> : null}
        {step.type === 'form' ? <div style={{ fontSize: 11, color: '#6b7280' }}>{(cfg.fields || []).length} field(s)</div> : null}
        {step.type === 'otp' ? <div style={{ fontSize: 11, color: '#6b7280' }}>verify {cfg.phone_field || 'phone'}</div> : null}
        {step.type === 'ai' ? <div style={{ fontSize: 11, color: '#6b7280' }}>{(cfg.system_prompt || '').slice(0, 40) || 'no prompt'}</div> : null}
        {step.type === 'handoff' ? <div style={{ fontSize: 11, color: '#6b7280' }}>{cfg.ai_fallback ? 'live agent + AI fallback' : 'live agent'}</div> : null}
        {step.type === 'schedule' ? <div style={{ fontSize: 11, color: '#6b7280' }}>{cfg.title || 'site visit'}</div> : null}
        {(step.text || ['message', 'options', 'input', 'collect_lead', 'show_units', 'show_brochure', 'end'].includes(step.type)) && (
          <div style={{ color: step.text ? '#1f2937' : '#9ca3af', fontStyle: step.text ? 'normal' : 'italic' }}>
            {step.text || '(no text)'}
          </div>
        )}
      </div>

      {/* Options preview */}
      {step.type === 'options' && (step.options || []).length > 0 && (
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(step.options || []).map((o, i) => (
            <div key={i} style={{ fontSize: 11, color: '#374151', background: '#f3f4f6', borderRadius: 6, padding: '3px 7px' }}>{o.label || <em style={{ color: '#9ca3af' }}>(blank)</em>}</div>
          ))}
        </div>
      )}
      {(step.type === 'input' || step.type === 'collect_lead') && step.field && (
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '5px 10px', fontSize: 10, color: '#6b7280', fontFamily: 'ui-monospace, monospace' }}>→ answers.{step.field}</div>
      )}
      {meta.runtime === 'authoring' && (
        <div style={{ borderTop: '1px solid #fde68a', background: '#fffbeb', padding: '4px 8px', fontSize: 9, color: '#92400e', fontWeight: 700 }}>⚠ NEEDS BACKEND WIRING</div>
      )}

      {!isEnd && <Handle type="source" position={Position.Bottom} style={{ background: meta.color, width: 8, height: 8 }} />}
    </div>
  );
}

const NODE_TYPES = { stepNode: StepNode };

// ── Helpers ───────────────────────────────────────────────────────────────────
function genStepId(existing: Set<string>, type: StepType): string {
  const base = type === 'end' ? 'end' : type;
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

function buildEdges(steps: Step[]): Edge[] {
  const ids = new Set(steps.map(s => s.id));
  const out: Edge[] = [];
  for (const s of steps) {
    if (s.type === 'options' && s.options) {
      s.options.forEach((o, i) => {
        if (o.next && ids.has(o.next)) {
          out.push({
            id: `${s.id}__opt_${i}__${o.next}`,
            source: s.id,
            target: o.next,
            label: o.label,
            labelBgPadding: [6, 3],
            labelBgBorderRadius: 4,
            labelBgStyle: { fill: '#eef2ff' },
            style: { stroke: '#8b5cf6' },
          });
        }
      });
    } else if (s.next && ids.has(s.next)) {
      out.push({
        id: `${s.id}__next__${s.next}`,
        source: s.id,
        target: s.next,
        style: { stroke: TYPE_META[s.type]?.color || '#3b82f6' },
      });
    }
  }
  return out;
}

const LAYOUT_KEY = (flowId: string | null | undefined) => `jp_assistant_flow_layout_${flowId || 'draft'}`;

function loadSavedPositions(flowId: string | null | undefined): Record<string, { x: number; y: number }> {
  if (typeof window === 'undefined') return {};
  try { const raw = window.localStorage.getItem(LAYOUT_KEY(flowId)); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function savePositions(flowId: string | null | undefined, positions: Record<string, { x: number; y: number }>) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(LAYOUT_KEY(flowId), JSON.stringify(positions)); } catch {}
}

// ── Default config seeds for new node types ──────────────────────────────────
function seedNewStep(id: string, type: StepType): Step {
  const base: Step = { id, type, text: '' };
  switch (type) {
    case 'message':       return { ...base, text: 'New message', next: 'end' };
    case 'options':       return { ...base, text: 'Pick one', options: [{ label: 'Option', value: 'opt', next: 'end' }] };
    case 'input':         return { ...base, text: 'Type your answer', field: '', placeholder: '', next: 'end' };
    case 'collect_lead':  return { ...base, text: "What's your phone?", field: 'phone', placeholder: 'Phone number', next: 'end' };
    case 'show_units':    return { ...base, text: 'Here are the best matches!', next: 'end' };
    case 'show_brochure': return { ...base, text: "Here's the brochure", next: 'end' };
    case 'start':         return { ...base, text: 'Flow start', next: 'end' };
    case 'end':           return { ...base, text: 'Thank you!' };
    case 'image':         return { ...base, config: { url: '', caption: '' }, next: 'end' };
    case 'video':         return { ...base, config: { url: '', caption: '' }, next: 'end' };
    case 'document':      return { ...base, config: { url: '', title: '', description: '' }, next: 'end' };
    case 'carousel':      return { ...base, config: { cards: [] }, next: 'end' };
    case 'form':          return { ...base, config: { intro: '', fields: [], submit_label: 'Submit' }, next: 'end' };
    case 'schedule':      return { ...base, config: { title: 'Schedule a visit', field: 'site_visit', min_days: 0, max_days: 30, time_slots: [] }, next: 'end' };
    case 'condition':     return { ...base, config: { rules: [], logic: 'and' }, next: 'end' };
    case 'otp':           return { ...base, config: { phone_field: 'phone', body: "We'll send an OTP." }, next: 'end' };
    case 'api':           return { ...base, config: { method: 'POST', url: '', headers: {}, body: {}, save_as: '' }, next: 'end' };
    case 'ai':            return { ...base, config: { body: '', system_prompt: '' }, next: 'end' };
    case 'handoff':       return { ...base, config: { body: 'Connecting you to our team…' }, next: 'end' };
  }
}

// ── Main canvas component ────────────────────────────────────────────────────
export interface AssistantFlowCanvasProps {
  flowId: string | null;
  steps: Step[];
  onStepsChange: (steps: Step[]) => void;
}

function CanvasInner({ flowId, steps, onStepsChange }: AssistantFlowCanvasProps) {
  const buildNodes = useCallback((stepsArr: Step[], existingPositions: Record<string, { x: number; y: number }>): Node[] => {
    const auto = computeLayout(stepsArr);
    const positions = { ...auto, ...existingPositions };
    return stepsArr.map(s => ({
      id: s.id,
      type: 'stepNode',
      position: positions[s.id] || { x: 60, y: 60 },
      data: { step: s } as NodeData,
    }));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(buildNodes(steps, loadSavedPositions(flowId)));
  const [edges, setEdges] = useEdgesState<Edge>(buildEdges(steps));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const stepsRef = useRef(steps); stepsRef.current = steps;

  // Lock body scroll while fullscreen so the underlying admin page can't peek through.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [fullscreen]);

  useEffect(() => {
    const currentPositions: Record<string, { x: number; y: number }> = {};
    setNodes(prev => {
      for (const n of prev) currentPositions[n.id] = n.position;
      return buildNodes(steps, currentPositions);
    });
    setEdges(buildEdges(steps));
  }, [steps, buildNodes, setNodes, setEdges]);

  useEffect(() => {
    const positions = Object.fromEntries(nodes.map(n => [n.id, n.position]));
    savePositions(flowId, positions);
  }, [nodes, flowId]);

  const selected = selectedId ? steps.find(s => s.id === selectedId) || null : null;

  const updateSelectedStep = (patch: Partial<Step>) => {
    if (!selected) return;
    const oldId = selected.id;
    const newId = patch.id ?? oldId;
    onStepsChange(
      steps.map(s => {
        if (s.id !== oldId) {
          if (oldId !== newId) {
            const r = { ...s };
            if (r.next === oldId) r.next = newId;
            if (r.options) r.options = r.options.map(o => (o.next === oldId ? { ...o, next: newId } : o));
            return r;
          }
          return s;
        }
        return { ...s, ...patch };
      })
    );
    if (oldId !== newId) setSelectedId(newId);
  };

  const deleteSelected = () => {
    if (!selected) return;
    const removed = selected.id;
    onStepsChange(
      steps.filter(s => s.id !== removed).map(s => ({
        ...s,
        next: s.next === removed ? undefined : s.next,
        options: s.options?.map(o => (o.next === removed ? { ...o, next: '' } : o)),
      }))
    );
    setSelectedId(null);
  };

  const addNodeOfType = (type: StepType) => {
    const taken = new Set(steps.map(s => s.id));
    const id = genStepId(taken, type);
    onStepsChange([...steps, seedNewStep(id, type)]);
    setSelectedId(id);
  };

  const autoLayout = () => {
    savePositions(flowId, {});
    const auto = computeLayout(stepsRef.current);
    setNodes(prev => prev.map(n => ({ ...n, position: auto[n.id] || n.position })));
  };

  const containerStyle: React.CSSProperties = fullscreen
    ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#fff' }
    : { display: 'flex', flexDirection: 'column', height: '76vh', minHeight: 560, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' };

  return (
    <div style={containerStyle}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 8, borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexWrap: 'wrap' }}>
        <button onClick={() => setPaletteOpen(o => !o)} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: 'pointer', color: '#374151', fontWeight: 600 }}>
          {paletteOpen ? '◀ Hide palette' : '▶ Show palette'}
        </button>
        {fullscreen && (
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6, fontWeight: 600 }}>
            🎨 Flow canvas — fullscreen
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={autoLayout} title="Reset positions to auto-computed hierarchical layout"
          style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: 'pointer', color: '#374151', fontWeight: 600 }}>⟳ Auto-layout</button>
        <button onClick={() => setFullscreen(f => !f)} title={fullscreen ? 'Exit fullscreen (Esc)' : 'Expand to fullscreen'}
          style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: fullscreen ? '#273b84' : 'white', cursor: 'pointer', color: fullscreen ? 'white' : '#374151', fontWeight: 600 }}>
          {fullscreen ? '✕ Exit fullscreen' : '⛶ Fullscreen'}
        </button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Palette */}
        {paletteOpen && (
          <div style={{ width: 180, borderRight: '1px solid #e5e7eb', background: '#fff', overflowY: 'auto', padding: 8 }}>
            {TYPE_GROUPS.map(g => (
              <div key={g.group} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', padding: '4px 6px', letterSpacing: 0.5 }}>{g.group}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {g.types.map(t => {
                    const m = TYPE_META[t];
                    return (
                      <button key={t} onClick={() => addNodeOfType(t)}
                        title={m.runtime === 'authoring' ? 'Authoring-only — needs backend wiring' : m.runtime === 'display' ? 'Renders as media bubble' : 'Live in widget runtime'}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', border: `1px solid ${m.color}33`, borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 11, color: '#374151', textAlign: 'left', position: 'relative' }}>
                        <span>{m.icon}</span>
                        <span style={{ flex: 1 }}>{m.label}</span>
                        {m.runtime === 'authoring' && <span title="Authoring-only" style={{ fontSize: 9, color: '#92400e' }}>⚠</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Canvas */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onSelectionChange={({ nodes: sn }) => setSelectedId(sn?.[0]?.id ?? null)}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            nodesConnectable={false}
            edgesReconnectable={false}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap pannable zoomable />
            <Controls />
            <Background />
          </ReactFlow>
        </div>

        {/* Inspector */}
        <div style={{ width: 320, borderLeft: '1px solid #e5e7eb', background: '#fff', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <StepInspector
              key={selected.id}
              step={selected}
              allSteps={steps}
              onChange={updateSelectedStep}
              onDelete={deleteSelected}
            />
          ) : (
            <div style={{ padding: 16, fontSize: 12, color: '#6b7280', fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
              <strong style={{ color: '#374151', fontSize: 13 }}>Canvas mode</strong>
              <p style={{ marginTop: 8 }}>Click a node to edit it. Use the left palette to add new steps. Drag to reposition (saved per flow in your browser).</p>
              <p style={{ marginTop: 8 }}>
                Node groups:
              </p>
              <ul style={{ marginTop: 4, paddingLeft: 16, fontSize: 11 }}>
                <li><strong>Conversation / Janapriya / Flow</strong> — live in the widget runtime.</li>
                <li><strong>Media</strong> — render as media bubbles (image / video / document / carousel).</li>
                <li><strong>Capture / Logic</strong> — author now (⚠), need backend wiring before they execute for visitors.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssistantFlowCanvas(props: AssistantFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
