'use client';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

type RiseupBullet = { heading: string; description: string };
type RiseupContent = {
  title?: string;
  subtitle?: string;
  bullets?: RiseupBullet[];
  example_title?: string;
  example_lines?: string[];
  cta_label?: string;
  cta_url?: string;
};
type CallbackContent = {
  heading?: string;
  subheading?: string;
  success_heading?: string;
  success_body?: string;
  direct_call_label?: string;
  phone_display?: string;
  phone_tel?: string;
};

const RISEUP_DEFAULT: RiseupContent = {
  title: 'RiseUp Offer',
  subtitle: 'Buy a bigger home with a smaller budget',
  bullets: [],
  example_title: '',
  example_lines: [],
  cta_label: '',
  cta_url: '',
};
const CALLBACK_DEFAULT: CallbackContent = {
  heading: 'Request a Callback',
  subheading: '',
  success_heading: '',
  success_body: '',
  direct_call_label: 'Or call us directly',
  phone_display: '',
  phone_tel: '',
};

const inputCls = 'w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm';
const labelCls = 'block text-xs text-gray-500 mb-1';

export default function AssistantContentPage() {
  const [riseup, setRiseup] = useState<RiseupContent>(RISEUP_DEFAULT);
  const [callback, setCallback] = useState<CallbackContent>(CALLBACK_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/assistant/content`);
        const d = await r.json();
        if (d?.riseup) setRiseup({ ...RISEUP_DEFAULT, ...d.riseup });
        if (d?.callback) setCallback({ ...CALLBACK_DEFAULT, ...d.callback });
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function save(key: 'riseup' | 'callback', data: any) {
    setSavingKey(key);
    setSavedKey(null);
    try {
      await fetch(`${API_BASE}/assistant/admin/content/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(s => (s === key ? null : s)), 2000);
    } catch {}
    setSavingKey(null);
  }

  // ── RiseUp helpers ─────────────────────────────────────────────────────────
  const updateBullet = (i: number, patch: Partial<RiseupBullet>) => {
    const bullets = [...(riseup.bullets || [])];
    const current: RiseupBullet = bullets[i] || { heading: '', description: '' };
    bullets[i] = { ...current, ...patch };
    setRiseup({ ...riseup, bullets });
  };
  const addBullet = () => setRiseup({ ...riseup, bullets: [...(riseup.bullets || []), { heading: '', description: '' }] });
  const removeBullet = (i: number) => setRiseup({ ...riseup, bullets: (riseup.bullets || []).filter((_, j) => j !== i) });

  const updateExampleLine = (i: number, value: string) => {
    const lines = [...(riseup.example_lines || [])];
    lines[i] = value;
    setRiseup({ ...riseup, example_lines: lines });
  };
  const addExampleLine = () => setRiseup({ ...riseup, example_lines: [...(riseup.example_lines || []), ''] });
  const removeExampleLine = (i: number) => setRiseup({ ...riseup, example_lines: (riseup.example_lines || []).filter((_, j) => j !== i) });

  if (loading) return <div className="text-gray-500 text-sm">Loading…</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#273b84]">Widget Content</h1>
        <p className="text-gray-500 text-sm mt-1">Edit the copy and contact details that appear inside the in-app assistant widget. Changes show up in the live widget on the next page load.</p>
      </div>

      {/* ── RiseUp ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-gray-900 font-bold text-lg">🚀 RiseUp tab</h2>
          <div className="flex items-center gap-3">
            {savedKey === 'riseup' && <span className="text-xs text-green-600 font-bold">✓ Saved</span>}
            <button onClick={() => save('riseup', riseup)} disabled={savingKey === 'riseup'}
              className="px-4 py-2 bg-[#273b84] hover:bg-[#1e2d6b] disabled:opacity-50 text-white font-bold rounded-lg text-sm">
              {savingKey === 'riseup' ? 'Saving…' : 'Save RiseUp'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={riseup.title || ''} onChange={e => setRiseup({ ...riseup, title: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Subtitle</label>
            <input className={inputCls} value={riseup.subtitle || ''} onChange={e => setRiseup({ ...riseup, subtitle: e.target.value })} />
          </div>
        </div>

        {/* Bullets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls}>Bullets ({(riseup.bullets || []).length})</label>
            <button onClick={addBullet} className="text-xs text-blue-600 hover:text-blue-700 font-bold">+ Add bullet</button>
          </div>
          <div className="space-y-2">
            {(riseup.bullets || []).map((b, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start border border-gray-200 rounded-lg p-3">
                <div className="col-span-5">
                  <input className={inputCls} placeholder="Heading" value={b.heading} onChange={e => updateBullet(i, { heading: e.target.value })} />
                </div>
                <div className="col-span-6">
                  <input className={inputCls} placeholder="Description" value={b.description} onChange={e => updateBullet(i, { description: e.target.value })} />
                </div>
                <div className="col-span-1 text-right">
                  <button onClick={() => removeBullet(i)} className="text-red-500 hover:text-red-600 text-sm">✕</button>
                </div>
              </div>
            ))}
            {(riseup.bullets || []).length === 0 && <div className="text-xs text-gray-400 italic">No bullets — click "+ Add bullet"</div>}
          </div>
        </div>

        {/* Example */}
        <div>
          <label className={labelCls}>Example title</label>
          <input className={inputCls} placeholder="e.g. Example: ₹1 Crore unit" value={riseup.example_title || ''} onChange={e => setRiseup({ ...riseup, example_title: e.target.value })} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls}>Example lines</label>
            <button onClick={addExampleLine} className="text-xs text-blue-600 hover:text-blue-700 font-bold">+ Add line</button>
          </div>
          <div className="space-y-2">
            {(riseup.example_lines || []).map((line, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputCls} value={line} onChange={e => updateExampleLine(i, e.target.value)} />
                <button onClick={() => removeExampleLine(i)} className="text-red-500 hover:text-red-600 text-sm px-2">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>CTA button label</label>
            <input className={inputCls} placeholder="Explore at riseup.house →" value={riseup.cta_label || ''} onChange={e => setRiseup({ ...riseup, cta_label: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>CTA URL</label>
            <input className={inputCls} placeholder="https://riseup.house" value={riseup.cta_url || ''} onChange={e => setRiseup({ ...riseup, cta_url: e.target.value })} />
          </div>
        </div>
      </section>

      {/* ── Callback ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-gray-900 font-bold text-lg">📞 Callback tab</h2>
          <div className="flex items-center gap-3">
            {savedKey === 'callback' && <span className="text-xs text-green-600 font-bold">✓ Saved</span>}
            <button onClick={() => save('callback', callback)} disabled={savingKey === 'callback'}
              className="px-4 py-2 bg-[#273b84] hover:bg-[#1e2d6b] disabled:opacity-50 text-white font-bold rounded-lg text-sm">
              {savingKey === 'callback' ? 'Saving…' : 'Save Callback'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Heading</label>
            <input className={inputCls} value={callback.heading || ''} onChange={e => setCallback({ ...callback, heading: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Subheading</label>
            <input className={inputCls} value={callback.subheading || ''} onChange={e => setCallback({ ...callback, subheading: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Success heading (after callback submitted)</label>
            <input className={inputCls} value={callback.success_heading || ''} onChange={e => setCallback({ ...callback, success_heading: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Success body</label>
            <input className={inputCls} value={callback.success_body || ''} onChange={e => setCallback({ ...callback, success_body: e.target.value })} />
          </div>
        </div>

        <div>
          <label className={labelCls}>"Or call us directly" label</label>
          <input className={inputCls} value={callback.direct_call_label || ''} onChange={e => setCallback({ ...callback, direct_call_label: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Phone — display format</label>
            <input className={inputCls} placeholder="+91 40 1234 5678" value={callback.phone_display || ''} onChange={e => setCallback({ ...callback, phone_display: e.target.value })} />
            <p className="text-xs text-gray-400 mt-1">Shown to visitors as text.</p>
          </div>
          <div>
            <label className={labelCls}>Phone — tel: link target</label>
            <input className={inputCls} placeholder="+914012345678" value={callback.phone_tel || ''} onChange={e => setCallback({ ...callback, phone_tel: e.target.value })} />
            <p className="text-xs text-gray-400 mt-1">No spaces — what the tap-to-call link dials.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
