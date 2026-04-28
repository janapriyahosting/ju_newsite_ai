'use client';
import { useMemo } from 'react';

// ── Step model shared with AssistantFlowCanvas ───────────────────────────────
export type StepType =
  // Existing janapriya runtime types (live in ProactiveAssistant.tsx):
  | 'message' | 'options' | 'input' | 'collect_lead' | 'show_units' | 'show_brochure' | 'end'
  // Canvas-authoring types ported from chatbot.janapriyahomes.com:
  | 'start' | 'image' | 'video' | 'document' | 'carousel'
  | 'form' | 'schedule' | 'condition' | 'otp' | 'api' | 'ai' | 'handoff';

export type Step = {
  id: string;
  type: StepType;
  text?: string;
  options?: { label: string; value: string; next: string }[];
  field?: string;
  next?: string;
  placeholder?: string;
  // Free-form config used by node types ported from the chatbot. Existing
  // janapriya types (message/options/input/collect_lead/show_units/
  // show_brochure/end) keep using the flat fields above so the live runtime
  // is undisturbed; new types stash their settings under `config`.
  config?: Record<string, any>;
};

// types/runtime support — see TYPE_META below for icon/label/colour/runtime hint
export const RUNTIME_SUPPORTED: StepType[] = [
  'message', 'options', 'input', 'collect_lead', 'show_units', 'show_brochure', 'end',
];
// Display-only types that the live runtime renders as media bubbles (handled
// by the runtime expansion in ProactiveAssistant.tsx).
export const RUNTIME_DISPLAY_ONLY: StepType[] = ['image', 'video', 'document', 'carousel'];

export type TypeMeta = { icon: string; label: string; color: string; group: string; runtime: 'live' | 'display' | 'authoring' };

export const TYPE_META: Record<StepType, TypeMeta> = {
  // Janapriya runtime
  message:       { icon: '💬', label: 'Message',       color: '#3b82f6', group: 'Conversation', runtime: 'live' },
  options:       { icon: '🔘', label: 'Options',       color: '#8b5cf6', group: 'Conversation', runtime: 'live' },
  input:         { icon: '⌨️', label: 'Input',         color: '#06b6d4', group: 'Conversation', runtime: 'live' },
  collect_lead:  { icon: '📋', label: 'Collect Lead',  color: '#f59e0b', group: 'Conversation', runtime: 'live' },
  show_units:    { icon: '🏠', label: 'Show Units',    color: '#10b981', group: 'Janapriya',    runtime: 'live' },
  show_brochure: { icon: '📄', label: 'Show Brochure', color: '#ec4899', group: 'Janapriya',    runtime: 'live' },
  end:           { icon: '🏁', label: 'End',           color: '#6b7280', group: 'Flow',          runtime: 'live' },
  // Canvas-authoring types (display-only render at runtime)
  start:         { icon: '🚀', label: 'Start',         color: '#16a34a', group: 'Flow',          runtime: 'live' },
  image:         { icon: '🖼️', label: 'Image',         color: '#0ea5e9', group: 'Media',         runtime: 'display' },
  video:         { icon: '🎬', label: 'Video',         color: '#ef4444', group: 'Media',         runtime: 'display' },
  document:      { icon: '📎', label: 'Document',      color: '#a16207', group: 'Media',         runtime: 'display' },
  carousel:      { icon: '🎠', label: 'Carousel',      color: '#d946ef', group: 'Media',         runtime: 'display' },
  // Compute / integration types — author now, wire backend later
  form:          { icon: '📝', label: 'Form',          color: '#0891b2', group: 'Capture',       runtime: 'authoring' },
  schedule:      { icon: '📅', label: 'Schedule',      color: '#65a30d', group: 'Capture',       runtime: 'authoring' },
  condition:     { icon: '🔀', label: 'Condition',     color: '#7c3aed', group: 'Logic',         runtime: 'authoring' },
  otp:           { icon: '🔐', label: 'OTP Verify',    color: '#dc2626', group: 'Logic',         runtime: 'authoring' },
  api:           { icon: '🌐', label: 'API Call',      color: '#2563eb', group: 'Logic',         runtime: 'authoring' },
  ai:            { icon: '✨', label: 'AI Handoff',    color: '#9333ea', group: 'Logic',         runtime: 'authoring' },
  handoff:       { icon: '🙋', label: 'Live Agent',    color: '#e11d48', group: 'Logic',         runtime: 'authoring' },
};

export const TYPE_GROUPS: { group: string; types: StepType[] }[] = [
  { group: 'Conversation', types: ['message', 'options', 'input', 'collect_lead'] },
  { group: 'Media',        types: ['image', 'video', 'document', 'carousel'] },
  { group: 'Capture',      types: ['form', 'schedule'] },
  { group: 'Logic',        types: ['condition', 'otp', 'api', 'ai', 'handoff'] },
  { group: 'Janapriya',    types: ['show_units', 'show_brochure'] },
  { group: 'Flow',         types: ['start', 'end'] },
];

export const STEP_TYPE_LIST = TYPE_GROUPS.flatMap(g => g.types);

// ── Small helpers ────────────────────────────────────────────────────────────
const S = {
  label: { display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4, marginTop: 8 } as React.CSSProperties,
  input: { width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' } as React.CSSProperties,
  textarea: { width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, resize: 'vertical' as const, fontFamily: 'inherit' },
  hint: { fontSize: 11, color: '#6b7280', marginTop: 4, lineHeight: 1.4 } as React.CSSProperties,
  warn: { fontSize: 11, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: 8, marginTop: 8, lineHeight: 1.4 } as React.CSSProperties,
};

// ── Inspector ────────────────────────────────────────────────────────────────
export function StepInspector({
  step, allSteps, onChange, onDelete,
}: {
  step: Step;
  allSteps: Step[];
  onChange: (patch: Partial<Step>) => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[step.type];
  const cfg = step.config || {};
  const setCfg = (k: string, v: any) => onChange({ config: { ...cfg, [k]: v } });

  const idsForNext = useMemo(() => {
    const others = allSteps.map(s => s.id).filter(id => id !== step.id);
    return ['end', ...others.filter(id => id !== 'end')];
  }, [allSteps, step.id]);

  return (
    <div style={{ padding: 14, height: '100%', overflowY: 'auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{meta.icon}</span>
        <strong style={{ fontSize: 14, color: '#111827' }}>{meta.label}</strong>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'ui-monospace, monospace', color: '#6b7280' }}>{step.id}</span>
      </div>

      {/* Runtime badge */}
      {meta.runtime === 'authoring' && (
        <div style={S.warn}>
          ⚠ Authoring-only. This node saves into the flow definition but is not
          yet executed by the live widget — it needs backend wiring before it
          will run for visitors.
        </div>
      )}
      {meta.runtime === 'display' && (
        <div style={{ fontSize: 11, color: '#0c4a6e', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: 6, padding: 8, marginTop: 4, lineHeight: 1.4 }}>
          📺 Renders as a media bubble in the live widget.
        </div>
      )}

      {/* Common: id + type + text */}
      <label style={S.label}>Step ID</label>
      <input
        defaultValue={step.id}
        onBlur={e => {
          const v = e.target.value.trim().replace(/\s+/g, '_');
          if (v && v !== step.id) onChange({ id: v });
        }}
        style={{ ...S.input, fontFamily: 'ui-monospace, monospace' }}
      />

      <label style={S.label}>Type</label>
      <select value={step.type} onChange={e => onChange({ type: e.target.value as StepType })} style={S.input}>
        {TYPE_GROUPS.map(g => (
          <optgroup key={g.group} label={g.group}>
            {g.types.map(t => (
              <option key={t} value={t}>{TYPE_META[t].icon} {TYPE_META[t].label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Per-type panels */}
      {step.type === 'message' && <MessagePanel step={step} onChange={onChange} idsForNext={idsForNext} />}
      {step.type === 'options' && <OptionsPanel step={step} onChange={onChange} idsForNext={idsForNext} />}
      {(step.type === 'input' || step.type === 'collect_lead') && (
        <InputPanel step={step} onChange={onChange} idsForNext={idsForNext} />
      )}
      {step.type === 'show_units' && <ShowUnitsPanel step={step} onChange={onChange} idsForNext={idsForNext} />}
      {step.type === 'show_brochure' && <ShowBrochurePanel step={step} onChange={onChange} idsForNext={idsForNext} />}
      {step.type === 'start' && <StartPanel step={step} onChange={onChange} idsForNext={idsForNext} />}
      {step.type === 'end' && <EndPanel step={step} onChange={onChange} />}
      {step.type === 'image' && <MediaPanel step={step} cfg={cfg} setCfg={setCfg} onChange={onChange} idsForNext={idsForNext} accept="image/*" mediaLabel="Image URL" />}
      {step.type === 'video' && <MediaPanel step={step} cfg={cfg} setCfg={setCfg} onChange={onChange} idsForNext={idsForNext} accept="video/*" mediaLabel="Video URL (mp4 / webm)" />}
      {step.type === 'document' && <DocumentPanel step={step} cfg={cfg} setCfg={setCfg} onChange={onChange} idsForNext={idsForNext} />}
      {step.type === 'carousel' && <CarouselPanel step={step} cfg={cfg} setCfg={setCfg} onChange={onChange} idsForNext={idsForNext} />}
      {step.type === 'form' && <FormPanel step={step} cfg={cfg} setCfg={setCfg} onChange={onChange} idsForNext={idsForNext} />}
      {step.type === 'schedule' && <SchedulePanel step={step} cfg={cfg} setCfg={setCfg} onChange={onChange} idsForNext={idsForNext} />}
      {step.type === 'condition' && <ConditionPanel step={step} cfg={cfg} setCfg={setCfg} onChange={onChange} allSteps={allSteps} idsForNext={idsForNext} />}
      {step.type === 'otp' && <OtpPanel step={step} cfg={cfg} setCfg={setCfg} onChange={onChange} idsForNext={idsForNext} />}
      {step.type === 'api' && <ApiPanel step={step} cfg={cfg} setCfg={setCfg} onChange={onChange} idsForNext={idsForNext} />}
      {step.type === 'ai' && <AiPanel step={step} cfg={cfg} setCfg={setCfg} onChange={onChange} idsForNext={idsForNext} />}
      {step.type === 'handoff' && <HandoffPanel step={step} cfg={cfg} setCfg={setCfg} onChange={onChange} idsForNext={idsForNext} />}

      <button
        onClick={onDelete}
        style={{ width: '100%', padding: '6px 8px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600, marginTop: 16 }}
      >
        🗑 Delete step
      </button>
    </div>
  );
}

// ── Reusable subcomponents ───────────────────────────────────────────────────
function NextSelect({ value, onChange, idsForNext, label = 'Next step' }: {
  value: string | undefined; onChange: (v: string) => void; idsForNext: string[]; label?: string;
}) {
  return (
    <>
      <label style={S.label}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={S.input}>
        <option value="">— select —</option>
        {idsForNext.map(id => <option key={id} value={id}>{id}</option>)}
      </select>
    </>
  );
}

function TextField({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string;
}) {
  return (
    <>
      <label style={S.label}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={S.input} />
      {hint && <div style={S.hint}>{hint}</div>}
    </>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <>
      <label style={S.label}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={S.textarea} />
    </>
  );
}

// ── Panels for runtime-supported (existing) types ────────────────────────────
type PanelP = { step: Step; onChange: (patch: Partial<Step>) => void; idsForNext: string[] };

function MessagePanel({ step, onChange, idsForNext }: PanelP) {
  return (
    <>
      <TextArea label="Bot message" value={step.text || ''} onChange={v => onChange({ text: v })} />
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}

function OptionsPanel({ step, onChange, idsForNext }: PanelP) {
  const opts = step.options || [];
  const upd = (i: number, patch: Partial<{ label: string; value: string; next: string }>) =>
    onChange({ options: opts.map((o, j) => (i === j ? { ...o, ...patch } : o)) });
  const add = () => onChange({ options: [...opts, { label: 'New', value: 'new', next: 'end' }] });
  const del = (i: number) => onChange({ options: opts.filter((_, j) => j !== i) });
  return (
    <>
      <TextArea label="Bot message (prompt)" value={step.text || ''} onChange={v => onChange({ text: v })} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <label style={{ ...S.label, marginTop: 0 }}>Options</label>
        <button onClick={add} style={{ fontSize: 11, color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer' }}>+ add</button>
      </div>
      {opts.map((o, i) => (
        <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, marginBottom: 6, background: '#fafafa' }}>
          <input value={o.label} onChange={e => upd(i, { label: e.target.value })} placeholder="Label"
            style={{ ...S.input, marginBottom: 4 }} />
          <input value={o.value} onChange={e => upd(i, { value: e.target.value })} placeholder="Value"
            style={{ ...S.input, fontFamily: 'ui-monospace, monospace', marginBottom: 4 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <select value={o.next || ''} onChange={e => upd(i, { next: e.target.value })} style={{ ...S.input, flex: 1 }}>
              <option value="">next →</option>
              {idsForNext.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
            <button onClick={() => del(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
        </div>
      ))}
    </>
  );
}

function InputPanel({ step, onChange, idsForNext }: PanelP) {
  return (
    <>
      <TextArea label="Bot prompt" value={step.text || ''} onChange={v => onChange({ text: v })} />
      <TextField label="Save answer as" value={step.field || ''} onChange={v => onChange({ field: v })}
        placeholder="e.g. budget, phone" hint={step.field ? `Available later as answers.${step.field}` : undefined} />
      <TextField label="Placeholder" value={step.placeholder || ''} onChange={v => onChange({ placeholder: v })} placeholder="Type here…" />
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}

function ShowUnitsPanel({ step, onChange, idsForNext }: PanelP) {
  return (
    <>
      <TextArea label="Bot message (above units)" value={step.text || ''} onChange={v => onChange({ text: v })}
        placeholder="Here are the best matches for you!" />
      <div style={S.hint}>Search query is built from previously collected fields (budget / bhk).</div>
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}

function ShowBrochurePanel({ step, onChange, idsForNext }: PanelP) {
  return (
    <>
      <TextArea label="Bot message (above brochure card)" value={step.text || ''} onChange={v => onChange({ text: v })} />
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}

function StartPanel({ step, onChange, idsForNext }: PanelP) {
  return (
    <>
      <div style={S.hint}>This node marks the entry point of the flow. The live widget always starts at the first step in the list.</div>
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}

function EndPanel({ step, onChange }: { step: Step; onChange: (p: Partial<Step>) => void }) {
  return (
    <>
      <TextArea label="Closing message" value={step.text || ''} onChange={v => onChange({ text: v })}
        placeholder="Thank you! Our team will reach out shortly." />
    </>
  );
}

// ── Media panels (display-only at runtime) ───────────────────────────────────
type CfgP = PanelP & { cfg: any; setCfg: (k: string, v: any) => void };

function MediaPanel({ step, cfg, setCfg, onChange, idsForNext, accept, mediaLabel }: CfgP & { accept: string; mediaLabel: string }) {
  return (
    <>
      <TextField label={mediaLabel} value={cfg.url || ''} onChange={v => setCfg('url', v)}
        placeholder="https://…" hint={`Accepts ${accept}`} />
      {cfg.url && accept.startsWith('image') && (
        <img src={cfg.url} alt="" style={{ maxWidth: '100%', marginTop: 6, borderRadius: 6 }} />
      )}
      <TextField label="Caption (optional)" value={cfg.caption || ''} onChange={v => setCfg('caption', v)} />
      <TextArea label="Bot message (shown above media)" value={step.text || ''} onChange={v => onChange({ text: v })} />
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}

function DocumentPanel({ step, cfg, setCfg, onChange, idsForNext }: CfgP) {
  return (
    <>
      <TextField label="Document URL" value={cfg.url || ''} onChange={v => setCfg('url', v)}
        placeholder="https://…/brochure.pdf" hint="PDF / DOCX / XLSX / PPT / ZIP, etc." />
      <TextField label="Title (shown to visitor)" value={cfg.title || ''} onChange={v => setCfg('title', v)}
        placeholder="e.g. Janapriya Upscale Brochure" />
      <TextField label="Description (optional)" value={cfg.description || ''} onChange={v => setCfg('description', v)}
        placeholder="e.g. Master plan, pricing, amenities" />
      <TextArea label="Bot message" value={step.text || ''} onChange={v => onChange({ text: v })} />
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}

function CarouselPanel({ step, cfg, setCfg, onChange, idsForNext }: CfgP) {
  const cards = (cfg.cards || []) as { title?: string; subtitle?: string; image?: string }[];
  const upd = (i: number, k: string, v: string) => setCfg('cards', cards.map((c, j) => (i === j ? { ...c, [k]: v } : c)));
  const add = () => setCfg('cards', [...cards, { title: 'New card', subtitle: '', image: '' }]);
  const del = (i: number) => setCfg('cards', cards.filter((_, j) => j !== i));
  return (
    <>
      <TextArea label="Bot message (above cards)" value={step.text || ''} onChange={v => onChange({ text: v })} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <label style={{ ...S.label, marginTop: 0 }}>Cards</label>
        <button onClick={add} style={{ fontSize: 11, color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer' }}>+ add card</button>
      </div>
      {cards.map((c, i) => (
        <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, marginBottom: 6, background: '#fafafa' }}>
          <input value={c.title || ''} onChange={e => upd(i, 'title', e.target.value)} placeholder="Title" style={{ ...S.input, marginBottom: 4 }} />
          <input value={c.subtitle || ''} onChange={e => upd(i, 'subtitle', e.target.value)} placeholder="Subtitle" style={{ ...S.input, marginBottom: 4 }} />
          <input value={c.image || ''} onChange={e => upd(i, 'image', e.target.value)} placeholder="Image URL" style={{ ...S.input, marginBottom: 4 }} />
          {c.image && <img src={c.image} alt="" style={{ maxWidth: '100%', borderRadius: 4, marginBottom: 4 }} />}
          <button onClick={() => del(i)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>remove</button>
        </div>
      ))}
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}

// ── Form / Schedule panels ───────────────────────────────────────────────────
const FIELD_TYPES = ['text', 'email', 'tel', 'number', 'url', 'date', 'textarea', 'select', 'radio', 'checkbox', 'file'];

function FormPanel({ step, cfg, setCfg, onChange, idsForNext }: CfgP) {
  const fields = (cfg.fields || []) as any[];
  const upd = (i: number, patch: any) => setCfg('fields', fields.map((f, j) => (i === j ? { ...f, ...patch } : f)));
  const add = () => setCfg('fields', [...fields, { name: 'field', label: 'Field', type: 'text', required: true }]);
  const del = (i: number) => setCfg('fields', fields.filter((_, j) => j !== i));
  return (
    <>
      <TextArea label="Intro" value={cfg.intro || ''} onChange={v => setCfg('intro', v)}
        placeholder="Please fill out the form below" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <label style={{ ...S.label, marginTop: 0 }}>Fields</label>
        <button onClick={add} style={{ fontSize: 11, color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer' }}>+ add field</button>
      </div>
      {fields.map((f, i) => (
        <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, marginBottom: 6, background: '#fafafa' }}>
          <select value={f.type || 'text'} onChange={e => upd(i, { type: e.target.value })} style={{ ...S.input, marginBottom: 4 }}>
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={f.name || ''} onChange={e => upd(i, { name: e.target.value })} placeholder="Field name (key)" style={{ ...S.input, fontFamily: 'ui-monospace, monospace', marginBottom: 4 }} />
          <input value={f.label || ''} onChange={e => upd(i, { label: e.target.value })} placeholder="Label" style={{ ...S.input, marginBottom: 4 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#374151' }}>
            <input type="checkbox" checked={f.required !== false} onChange={e => upd(i, { required: e.target.checked })} />
            Required
          </label>
          <button onClick={() => del(i)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', marginTop: 4 }}>remove</button>
        </div>
      ))}
      <TextField label="Submit button label" value={cfg.submit_label || ''} onChange={v => setCfg('submit_label', v)} placeholder="Submit" />
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}

function SchedulePanel({ step, cfg, setCfg, onChange, idsForNext }: CfgP) {
  return (
    <>
      <TextField label="Title" value={cfg.title || ''} onChange={v => setCfg('title', v)}
        placeholder="When would you like to visit?" />
      <TextField label="Description" value={cfg.description || ''} onChange={v => setCfg('description', v)}
        placeholder="Our team will confirm on WhatsApp" />
      <TextField label="Save as" value={cfg.field || ''} onChange={v => setCfg('field', v)}
        placeholder="site_visit" hint={cfg.field ? `Available as answers.${cfg.field}` : undefined} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <TextField label="Earliest (days)" value={String(cfg.min_days ?? '0')} onChange={v => setCfg('min_days', v)} />
        </div>
        <div style={{ flex: 1 }}>
          <TextField label="Latest (days)" value={String(cfg.max_days ?? '30')} onChange={v => setCfg('max_days', v)} />
        </div>
      </div>
      <TextField label="Time slots (comma-separated)"
        value={(cfg.time_slots || []).join(', ')}
        onChange={v => setCfg('time_slots', v ? v.split(',').map(s => s.trim()).filter(Boolean) : [])}
        placeholder="10:00 AM, 12:00 PM, 4:00 PM" />
      <TextArea label="Bot message" value={step.text || ''} onChange={v => onChange({ text: v })} />
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}

// ── Logic / integration panels ───────────────────────────────────────────────
const OPS = [
  { label: 'equals', value: '==' },
  { label: 'not equals', value: '!=' },
  { label: 'greater than', value: '>' },
  { label: 'greater than or equal', value: '>=' },
  { label: 'less than', value: '<' },
  { label: 'less than or equal', value: '<=' },
  { label: 'contains', value: 'contains' },
  { label: 'does not contain', value: 'not_contains' },
  { label: 'is set', value: 'exists' },
  { label: 'is empty', value: 'not_exists' },
];

function ConditionPanel({ step, cfg, setCfg, onChange, allSteps, idsForNext }: CfgP & { allSteps: Step[] }) {
  const rules = (cfg.rules || []) as { left: string; op: string; right: string }[];
  const upd = (i: number, patch: any) => setCfg('rules', rules.map((r, j) => (i === j ? { ...r, ...patch } : r)));
  const add = () => setCfg('rules', [...rules, { left: 'answers.input', op: '==', right: '' }]);
  const del = (i: number) => setCfg('rules', rules.filter((_, j) => j !== i));

  const vars = useMemo(() => {
    const out: { label: string; value: string }[] = [];
    for (const s of allSteps) {
      if (s.type === 'input' && s.field) out.push({ label: `${s.field} (from ${s.id})`, value: `answers.${s.field}` });
      if (s.type === 'collect_lead' && s.field) out.push({ label: `${s.field} (from ${s.id})`, value: `answers.${s.field}` });
      if (s.type === 'options') out.push({ label: `${s.id} (option value)`, value: `answers.${s.id}` });
      const cfg2 = s.config || {};
      if (s.type === 'form' && Array.isArray(cfg2.fields)) {
        for (const f of cfg2.fields) {
          if (f.name) out.push({ label: `form.${f.name} (from ${s.id})`, value: `answers.form.${f.name}` });
        }
      }
      if (s.type === 'api' && cfg2.save_as) out.push({ label: `api.${cfg2.save_as}`, value: `api.${cfg2.save_as}` });
    }
    out.push({ label: 'utm_source', value: 'utm.utm_source' });
    out.push({ label: 'utm_campaign', value: 'utm.utm_campaign' });
    return out;
  }, [allSteps]);

  return (
    <>
      <label style={S.label}>Rules</label>
      {rules.length === 0 && <div style={S.hint}>No rules yet — click + rule. Connect two outgoing edges from this node and label them <code>true</code>/<code>false</code> on the canvas.</div>}
      {rules.map((r, i) => (
        <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, marginBottom: 6, background: '#fafafa' }}>
          <select value={r.left} onChange={e => upd(i, { left: e.target.value })} style={{ ...S.input, marginBottom: 4 }}>
            <option value="">Variable…</option>
            {vars.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
          <select value={r.op} onChange={e => upd(i, { op: e.target.value })} style={{ ...S.input, marginBottom: 4 }}>
            {OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {r.op !== 'exists' && r.op !== 'not_exists' && (
            <input value={r.right || ''} onChange={e => upd(i, { right: e.target.value })} placeholder="Value" style={{ ...S.input, marginBottom: 4 }} />
          )}
          <button onClick={() => del(i)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>remove rule</button>
        </div>
      ))}
      <button onClick={add} style={{ fontSize: 11, color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer' }}>+ rule</button>
      {rules.length > 1 && (
        <>
          <label style={S.label}>Combine with</label>
          <select value={cfg.logic || 'and'} onChange={e => setCfg('logic', e.target.value)} style={S.input}>
            <option value="and">AND (all match)</option>
            <option value="or">OR (any match)</option>
          </select>
        </>
      )}
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} label="Next step (when condition is true)" />
    </>
  );
}

function OtpPanel({ step, cfg, setCfg, onChange, idsForNext }: CfgP) {
  return (
    <>
      <TextField label="Phone field name" value={cfg.phone_field || 'phone'} onChange={v => setCfg('phone_field', v)}
        hint={`Reads from answers.${cfg.phone_field || 'phone'} or answers.form.${cfg.phone_field || 'phone'}`} />
      <TextArea label="Prompt" value={cfg.body || step.text || ''} onChange={v => setCfg('body', v)}
        placeholder="We'll send an OTP to your phone." />
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} label="Next step (after verification)" />
    </>
  );
}

function ApiPanel({ step, cfg, setCfg, onChange, idsForNext }: CfgP) {
  const auth = cfg.auth || { type: 'none' };
  const setAuth = (patch: any) => setCfg('auth', { ...auth, ...patch });
  return (
    <>
      <label style={S.label}>Method</label>
      <select value={cfg.method || 'POST'} onChange={e => setCfg('method', e.target.value)} style={S.input}>
        <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
      </select>
      <TextField label="URL" value={cfg.url || ''} onChange={v => setCfg('url', v)} placeholder="https://api.example.com/leads" />

      <label style={S.label}>Auth</label>
      <select value={auth.type || 'none'} onChange={e => setAuth({ type: e.target.value })} style={S.input}>
        <option value="none">None</option>
        <option value="bearer">Bearer token</option>
        <option value="api_key">API key header</option>
      </select>
      {auth.type === 'bearer' && (
        <TextField label="Token" value={auth.token || ''} onChange={v => setAuth({ token: v })} placeholder="sk_live_…" />
      )}
      {auth.type === 'api_key' && (
        <>
          <TextField label="Header name" value={auth.header || ''} onChange={v => setAuth({ header: v })} placeholder="X-API-Key" />
          <TextField label="Header value" value={auth.value || ''} onChange={v => setAuth({ value: v })} />
        </>
      )}

      <label style={S.label}>Body (JSON, templatable)</label>
      <textarea
        defaultValue={typeof cfg.body === 'string' ? cfg.body : JSON.stringify(cfg.body || {}, null, 2)}
        onBlur={e => { try { setCfg('body', JSON.parse(e.target.value || '{}')); } catch { setCfg('body', e.target.value); } }}
        rows={5}
        style={{ ...S.textarea, fontFamily: 'ui-monospace, monospace' }}
      />
      <TextField label="Save response as" value={cfg.save_as || ''} onChange={v => setCfg('save_as', v)}
        placeholder="api_response" hint={cfg.save_as ? `Read with api.${cfg.save_as}` : undefined} />
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}

function AiPanel({ step, cfg, setCfg, onChange, idsForNext }: CfgP) {
  return (
    <>
      <TextArea label="Intro message" value={cfg.body || step.text || ''} onChange={v => setCfg('body', v)}
        placeholder="I'm here to help. Ask me anything!" />
      <TextArea label="System prompt" value={cfg.system_prompt || ''} onChange={v => setCfg('system_prompt', v)}
        placeholder="You are a friendly Janapriya Upscale assistant. Answer in 1-3 sentences." rows={4} />
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} label="Next step (after AI mode ends)" />
    </>
  );
}

function HandoffPanel({ step, cfg, setCfg, onChange, idsForNext }: CfgP) {
  return (
    <>
      <TextArea label="Handoff message" value={cfg.body || step.text || ''} onChange={v => setCfg('body', v)}
        placeholder="Connecting you to our team…" />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#374151' }}>
        <input type="checkbox" checked={!!cfg.ai_fallback} onChange={e => setCfg('ai_fallback', e.target.checked)} />
        AI fallback when no agent available
      </label>
      {cfg.ai_fallback && (
        <TextArea label="AI fallback system prompt" value={cfg.ai_system_prompt || ''} onChange={v => setCfg('ai_system_prompt', v)} />
      )}
      <NextSelect value={step.next} onChange={v => onChange({ next: v })} idsForNext={idsForNext} />
    </>
  );
}
