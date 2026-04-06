'use client';
import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/lib/adminAuth';

const TRIGGER_EVENTS = [
  { id: 'booking_confirmed', label: 'Booking Confirmed', icon: '🏠' },
  { id: 'payment_received', label: 'Payment Received', icon: '💰' },
  { id: 'site_visit_requested', label: 'Site Visit Requested', icon: '📅' },
  { id: 'site_visit_confirmed', label: 'Site Visit Confirmed', icon: '✅' },
  { id: 'lead_created', label: 'Lead Created', icon: '📋' },
  { id: 'welcome', label: 'Welcome', icon: '👋' },
];

const CHANNEL_META: Record<string, { icon: string; color: string; label: string }> = {
  email: { icon: '📧', color: '#2A3887', label: 'Email' },
  sms: { icon: '💬', color: '#16A34A', label: 'SMS' },
  whatsapp: { icon: '🟢', color: '#25D366', label: 'WhatsApp' },
};

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState('booking_confirmed');
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState<string | null>(null);

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await adminApi('/admin/notification-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        console.error('[Notifications] API error:', res.status);
      }
    } catch (e) {
      console.error('[Notifications] Load error:', e);
    }
    setLoading(false);
  }

  async function toggleActive(t: any) {
    try {
      const res = await adminApi(`/admin/notification-templates/${t.id}`, {
        method: 'PATCH', body: JSON.stringify({ is_active: !t.is_active }),
      });
      if (res.ok) {
        setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !t.is_active } : x));
      }
    } catch {}
  }

  async function saveTemplate() {
    if (!editTemplate) return;
    setSaving(true);
    try {
      const { id, ...fields } = editTemplate;
      const res = await adminApi(`/admin/notification-templates/${id}`, {
        method: 'PATCH', body: JSON.stringify(fields),
      });
      if (res.ok) {
        const updated = await res.json();
        setTemplates(prev => prev.map(x => x.id === updated.id ? updated : x));
        setEditTemplate(null);
      }
    } catch {}
    setSaving(false);
  }

  async function sendTest(t: any) {
    setTestLoading(t.id); setTestResult(null);
    try {
      // Build test data from available variables
      const today = new Date();
      const fmtDate = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const futureDate = new Date(today.getTime() + 7 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const testDefaults: Record<string, string> = {
        customer_name: testPhone ? 'Test User' : 'Test User',
        customer_phone: testPhone || '9876543210',
        customer_email: testEmail || 'test@example.com',
        unit_number: 'A2-TEST', project_name: 'Janapriya Upscale',
        booking_amount: 'Rs.20,000', total_amount: 'Rs.30,00,000',
        payment_id: 'pay_test_' + Date.now().toString(36),
        booking_id: Math.random().toString(36).substring(2, 10).toUpperCase(),
        booked_at: fmtDate, amount: '20000',
        transaction_id: 'pay_test_' + Date.now().toString(36),
        name: 'Test User', phone: testPhone || '9876543210',
        email: testEmail || 'test@example.com',
        source: 'website', project_interest: 'Janapriya Upscale',
        visit_date: futureDate, visit_time: '11:00 AM',
      };
      const testData: Record<string, string> = {};
      (t.available_variables || []).forEach((v: string) => {
        testData[v] = testDefaults[v] || `[${v}]`;
      });
      const res = await adminApi('/admin/notification-templates/test', {
        method: 'POST', body: JSON.stringify({
          template_id: t.id, phone: testPhone || undefined, email: testEmail || undefined, test_data: testData,
        }),
      });
      setTestResult({ id: t.id, ...(await res.json()), ok: res.ok });
    } catch (e: any) {
      setTestResult({ id: t.id, ok: false, error: e.message });
    }
    setTestLoading(null);
  }

  function insertVar(varName: string) {
    // Insert {{var}} at cursor or append
    const tag = `{{${varName}}}`;
    if (editTemplate?.channel === 'email') {
      setEditTemplate((p: any) => ({ ...p, email_body: (p.email_body || '') + tag }));
    } else if (editTemplate?.channel === 'sms') {
      setEditTemplate((p: any) => ({ ...p, sms_text: (p.sms_text || '') + tag }));
    }
  }

  const eventTemplates = templates.filter(t => t.trigger_event === activeEvent);
  const inputCls = "w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#273b84]";

  return (
    <div>
      <h1 className="text-2xl font-black text-[#273b84] mb-1">Notification Templates</h1>
      <p className="text-gray-500 text-sm mb-6">Configure templates and triggers for Email, SMS, and WhatsApp notifications.</p>

      {/* Test Panel */}
      <div className="bg-white border border-[#273b84]/20 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🧪</span>
          <h3 className="text-gray-900 font-bold">Test Notifications</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone (SMS + WhatsApp)</label>
            <input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="9876543210"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-[#273b84]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
            <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="you@example.com"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-[#273b84]" />
          </div>
          <div className="flex items-end">
            <button
              onClick={async () => {
                const active = eventTemplates.filter(t => t.is_active);
                if (!active.length) return;
                for (const t of active) await sendTest(t);
              }}
              disabled={testLoading !== null || (!testPhone && !testEmail)}
              className="w-full py-2.5 text-sm font-bold text-black rounded-lg bg-[#273b84] hover:bg-[#273b84] disabled:opacity-30 transition-all">
              {testLoading ? 'Sending...' : `Test All Active (${eventTemplates.filter(t => t.is_active).length})`}
            </button>
          </div>
        </div>
        {/* Test Results Summary */}
        {testResult && (
          <div className={`rounded-lg p-3 text-sm ${testResult.ok ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-800'}`}>
            <span className="font-bold text-gray-700">{testResult.template}: </span>
            {testResult.ok
              ? Object.entries(testResult.results || {}).map(([k, v]) => (
                  <span key={k} className={`mr-3 ${v === 'sent' ? 'text-green-400' : 'text-red-400'}`}>{k}: <strong>{String(v)}</strong></span>
                ))
              : <span className="text-red-400">{testResult.error || 'Failed'}</span>}
          </div>
        )}
      </div>

      {/* Event Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TRIGGER_EVENTS.map(ev => (
          <button key={ev.id} onClick={() => setActiveEvent(ev.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeEvent === ev.id ? 'bg-[#273b84]/20 text-[#273b84] border border-[#273b84]/30' : 'bg-white text-gray-500 border border-gray-200 hover:text-gray-900'
            }`}>
            <span>{ev.icon}</span> {ev.label}
            <span className="ml-1 text-xs opacity-60">
              ({templates.filter(t => t.trigger_event === ev.id && t.is_active).length}/3)
            </span>
          </button>
        ))}
      </div>

      {/* Channel Cards */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['email', 'sms', 'whatsapp'].map(ch => {
            const t = eventTemplates.find(x => x.channel === ch);
            const meta = CHANNEL_META[ch];
            if (!t) return (
              <div key={ch} className="bg-white border border-gray-200 rounded-2xl p-6 opacity-50">
                <p className="text-gray-500 text-sm">No {meta.label} template</p>
              </div>
            );

            const tr = testResult?.id === t.id ? testResult : null;

            return (
              <div key={ch} className="bg-white border border-gray-200 rounded-2xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{meta.icon}</span>
                    <span className="text-gray-900 font-bold">{meta.label}</span>
                  </div>
                  <button onClick={() => toggleActive(t)}
                    className={`w-12 h-6 rounded-full transition-all relative ${t.is_active ? 'bg-green-500' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${t.is_active ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>

                <p className="text-gray-500 text-xs mb-4">{t.label}</p>

                {/* Preview */}
                <div className="bg-white rounded-xl p-3 mb-4 text-xs text-gray-500 max-h-32 overflow-y-auto">
                  {ch === 'email' && (
                    <>
                      <p className="text-[#273b84] font-bold mb-1">{t.email_subject || 'No subject'}</p>
                      <p className="truncate">{t.email_body ? t.email_body.replace(/<[^>]*>/g, '').substring(0, 120) + '...' : 'No body'}</p>
                    </>
                  )}
                  {ch === 'sms' && (
                    <>
                      {t.sms_dlt_content_id && <p className="text-green-400 mb-1">DLT: {t.sms_dlt_content_id}</p>}
                      <p>{t.sms_text || 'No text configured'}</p>
                    </>
                  )}
                  {ch === 'whatsapp' && (
                    <>
                      <p className="text-green-400 mb-1">Template: {t.wa_template_title || 'Not set'}</p>
                      {t.wa_param_mapping && Object.keys(t.wa_param_mapping).length > 0 && (
                        <p>Params: {Object.entries(t.wa_param_mapping).map(([k, v]) => `${k}=${String(v)}`).join(', ')}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Variables */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {(t.available_variables || []).map((v: string) => (
                      <span key={v} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-mono">{`{{${v}}}`}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setEditTemplate({ ...t })}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl text-gray-900"
                    style={{ background: meta.color }}>
                    Edit Template
                  </button>
                  <button onClick={() => sendTest(t)}
                    disabled={testLoading === t.id || (!testPhone && ch !== 'email') || (!testEmail && ch === 'email')}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-[#273b84]/10 text-[#273b84] hover:bg-[#273b84]/20 disabled:opacity-30 transition-all">
                    {testLoading === t.id ? 'Sending...' : `Send Test ${meta.label}`}
                  </button>
                </div>

                {/* Test Result */}
                {tr && (
                  <div className={`mt-3 rounded-lg p-2.5 text-xs ${tr.ok ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
                    {tr.ok ? Object.entries(tr.results || {}).map(([k, v]) => (
                      <span key={k} className={`mr-2 ${v === 'sent' ? 'text-green-400' : 'text-red-400'}`}>{k}: <strong>{String(v)}</strong></span>
                    )) : <span className="text-red-400">{tr.error || 'Failed'}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditTemplate(null)}>
          <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-[#273b84] font-black text-lg">
                {CHANNEL_META[editTemplate.channel]?.icon} Edit {editTemplate.label}
              </h3>
              <p className="text-gray-500 text-xs mt-1">
                Trigger: {TRIGGER_EVENTS.find(e => e.id === editTemplate.trigger_event)?.label}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Variable Chips */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Available Variables (click to insert)</p>
                <div className="flex flex-wrap gap-1.5">
                  {(editTemplate.available_variables || []).map((v: string) => (
                    <button key={v} onClick={() => insertVar(v)}
                      className="px-2.5 py-1 bg-[#273b84]/10 text-[#273b84] rounded-lg text-xs font-mono hover:bg-[#273b84]/20 transition-colors">
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Fields */}
              {editTemplate.channel === 'email' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subject</label>
                    <input value={editTemplate.email_subject || ''} onChange={e => setEditTemplate((p: any) => ({ ...p, email_subject: e.target.value }))}
                      className={inputCls} placeholder="Email subject with {{variables}}" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">HTML Body</label>
                    <textarea value={editTemplate.email_body || ''} onChange={e => setEditTemplate((p: any) => ({ ...p, email_body: e.target.value }))}
                      rows={15} className={`${inputCls} font-mono text-xs resize-y`} placeholder="<div>HTML email body with {{variables}}</div>" />
                  </div>
                </>
              )}

              {/* SMS Fields */}
              {editTemplate.channel === 'sms' && (
                <>
                  <div className="bg-[#273b84]/10 border border-[#273b84]/20 rounded-xl p-3">
                    <p className="text-[#273b84] text-xs font-bold">DLT Compliance</p>
                    <p className="text-gray-500 text-xs mt-1">SMS text must match the DLT-approved template exactly. Only variable values can change.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">DLT Content ID</label>
                    <input value={editTemplate.sms_dlt_content_id || ''} onChange={e => setEditTemplate((p: any) => ({ ...p, sms_dlt_content_id: e.target.value }))}
                      className={inputCls} placeholder="1707177528503543610" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">SMS Text</label>
                    <textarea value={editTemplate.sms_text || ''} onChange={e => setEditTemplate((p: any) => ({ ...p, sms_text: e.target.value }))}
                      rows={4} className={`${inputCls} resize-y`} placeholder="Your booking for Unit - {{unit_number}} is confirmed..." />
                  </div>
                </>
              )}

              {/* WhatsApp Fields */}
              {editTemplate.channel === 'whatsapp' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Chat360 Template Title</label>
                    <input value={editTemplate.wa_template_title || ''} onChange={e => setEditTemplate((p: any) => ({ ...p, wa_template_title: e.target.value }))}
                      className={inputCls} placeholder="bookingconfirmaton" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Parameter Mapping</label>
                    <p className="text-gray-500 text-xs mb-3">Map Chat360 template parameters to notification variables.</p>
                    {Object.entries(editTemplate.wa_param_mapping || {}).map(([key, val], i) => (
                      <div key={i} className="flex gap-2 mb-2 items-center">
                        <input value={key} className={`${inputCls} flex-1`} placeholder="Chat360 param"
                          onChange={e => {
                            const mapping = { ...(editTemplate.wa_param_mapping || {}) };
                            const oldVal = mapping[key];
                            delete mapping[key];
                            mapping[e.target.value] = oldVal;
                            setEditTemplate((p: any) => ({ ...p, wa_param_mapping: mapping }));
                          }} />
                        <span className="text-gray-500">=</span>
                        <select value={String(val)} className={`${inputCls} flex-1`}
                          onChange={e => {
                            const mapping = { ...(editTemplate.wa_param_mapping || {}) };
                            mapping[key] = e.target.value;
                            setEditTemplate((p: any) => ({ ...p, wa_param_mapping: mapping }));
                          }}>
                          <option value="">Select variable</option>
                          {(editTemplate.available_variables || []).map((v: string) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                        <button onClick={() => {
                          const mapping = { ...(editTemplate.wa_param_mapping || {}) };
                          delete mapping[key];
                          setEditTemplate((p: any) => ({ ...p, wa_param_mapping: mapping }));
                        }} className="text-red-400 hover:text-red-300 text-sm px-2">x</button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const mapping = { ...(editTemplate.wa_param_mapping || {}), '': '' };
                      setEditTemplate((p: any) => ({ ...p, wa_param_mapping: mapping }));
                    }} className="text-xs text-[#273b84] font-bold hover:underline mt-1">+ Add Parameter</button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button onClick={saveTemplate} disabled={saving}
                className="flex-1 py-3 text-sm font-bold text-[#273b84] rounded-xl disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
                {saving ? 'Saving...' : 'Save Template'}
              </button>
              <button onClick={() => setEditTemplate(null)}
                className="px-6 py-3 text-sm font-bold text-gray-500 rounded-xl border border-gray-300 hover:text-gray-900">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
