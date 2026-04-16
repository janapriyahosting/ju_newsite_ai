'use client';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}`, 'Content-Type': 'application/json' });

const LABEL_GROUPS: Record<string, { labels: string[]; color: string }> = {
  'Core Search':       { labels: ['BHK_TYPE', 'PRICE', 'FACING', 'FLOOR', 'AREA', 'LOCATION', 'STATUS', 'EMI'], color: '#3B82F6' },
  'Property':          { labels: ['UNIT_NUMBER', 'BEDROOMS', 'BATHROOMS', 'BALCONIES', 'UNIT_TYPE'], color: '#8B5CF6' },
  'Pricing':           { labels: ['DOWN_PAYMENT', 'BUDGET', 'BASIC_COST', 'GST', 'TOTAL_COST', 'LOAN_AMOUNT', 'BOOKING_AMOUNT', 'TOKEN_AMOUNT'], color: '#10B981' },
  'Area':              { labels: ['CARPET_AREA', 'PLOT_AREA', 'BALCONY_AREA', 'SALABLE_AREA'], color: '#EC4899' },
  'Charges':           { labels: ['MAINTENANCE', 'PARKING', 'DOCUMENTATION', 'UTILITIES', 'CLUB_HOUSE'], color: '#F59E0B' },
  'Project/Tower':     { labels: ['PROJECT', 'TOWER', 'TYPOLOGY', 'CONSTRUCTION_STAGE'], color: '#06B6D4' },
  'Features':          { labels: ['AMENITY', 'LIFTS', 'CORRIDOR', 'OPEN_SPACE'], color: '#14B8A6' },
  'Availability':      { labels: ['AVAILABILITY', 'TRENDING', 'FEATURED'], color: '#EF4444' },
};
const LABELS = Object.values(LABEL_GROUPS).flatMap(g => g.labels);
const LABEL_COLORS: Record<string, string> = {};
Object.values(LABEL_GROUPS).forEach(g => {
  g.labels.forEach((l, i) => {
    // Vary brightness slightly per label within group
    const base = g.color;
    LABEL_COLORS[l] = base;
  });
});

export default function NlpTrainingPage() {
  const [tab, setTab] = useState<'data' | 'train' | 'test' | 'logs'>('data');
  const [examples, setExamples] = useState<any[]>([]);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [trainingStatus, setTrainingStatus] = useState<any>({ status: 'idle' });
  const [logs, setLogs] = useState<any[]>([]);
  const [parserStats, setParserStats] = useState<any>({});
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // New example form
  const [newText, setNewText] = useState('');
  const [newEntities, setNewEntities] = useState<number[][]>([]);
  const [selectedLabel, setSelectedLabel] = useState('BHK_TYPE');
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); loadModelInfo(); }, []);

  async function loadData() {
    const res = await fetch(`${API}/admin/nlp/training-data`, { headers: hdrs() });
    const d = await res.json();
    setExamples(d.examples || []);
  }

  async function loadModelInfo() {
    const res = await fetch(`${API}/admin/nlp/model-info`, { headers: hdrs() });
    setModelInfo(await res.json());
  }

  async function loadLogs() {
    const res = await fetch(`${API}/admin/nlp/search-logs?page_size=100`, { headers: hdrs() });
    const d = await res.json();
    setLogs(d.items || []);
    setParserStats(d.parser_stats || {});
  }

  async function handleSeed() {
    setLoading(true);
    await fetch(`${API}/admin/nlp/seed`, { method: 'POST', headers: hdrs() });
    await loadData();
    setLoading(false);
  }

  async function handleAutoGenerate() {
    setLoading(true);
    const res = await fetch(`${API}/admin/nlp/auto-generate`, {
      method: 'POST', headers: hdrs(), body: JSON.stringify({ count: 100 }),
    });
    const d = await res.json();
    alert(`Generated ${d.new_added} new examples from search logs`);
    await loadData();
    setLoading(false);
  }

  async function handleDelete(index: number) {
    await fetch(`${API}/admin/nlp/training-data/${index}`, { method: 'DELETE', headers: hdrs() });
    await loadData();
  }

  async function handleTrain() {
    const res = await fetch(`${API}/admin/nlp/train`, { method: 'POST', headers: hdrs() });
    if (!res.ok) { alert('Training already in progress'); return; }
    pollStatus();
  }

  async function pollStatus() {
    const poll = setInterval(async () => {
      const res = await fetch(`${API}/admin/nlp/training-status`, { headers: hdrs() });
      const d = await res.json();
      setTrainingStatus(d);
      if (d.status === 'complete' || d.status === 'error' || d.status === 'idle') {
        clearInterval(poll);
        if (d.status === 'complete') loadModelInfo();
      }
    }, 1500);
  }

  async function handleTest() {
    if (!testQuery.trim()) return;
    const res = await fetch(`${API}/admin/nlp/test`, {
      method: 'POST', headers: hdrs(), body: JSON.stringify({ text: testQuery }),
    });
    setTestResult(await res.json());
  }

  function handleTextSelect() {
    const input = textRef.current;
    if (!input || input.selectionStart === input.selectionEnd) return;
    const start = input.selectionStart!;
    const end = input.selectionEnd!;
    // Check no overlap
    const overlap = newEntities.some(e => !(end <= e[0] || start >= e[1]));
    if (overlap) return;
    setNewEntities([...newEntities, [start, end, LABELS.indexOf(selectedLabel)]]);
  }

  async function handleAddExample() {
    if (!newText.trim() || newEntities.length === 0) return;
    const ents = newEntities.map(e => [e[0], e[1], LABELS[e[2]]]);
    await fetch(`${API}/admin/nlp/training-data`, {
      method: 'POST', headers: hdrs(),
      body: JSON.stringify({ examples: [{ text: newText, entities: ents }] }),
    });
    setNewText(''); setNewEntities([]);
    await loadData();
  }

  function renderAnnotatedText(text: string, entities: any[]) {
    if (!entities || entities.length === 0) return <span>{text}</span>;
    const sorted = [...entities].sort((a, b) => a[0] - b[0]);
    const parts: JSX.Element[] = [];
    let last = 0;
    sorted.forEach((ent, i) => {
      if (ent[0] > last) parts.push(<span key={`t${i}`}>{text.slice(last, ent[0])}</span>);
      const label = ent[2];
      const color = LABEL_COLORS[label] || '#666';
      parts.push(
        <span key={`e${i}`} style={{ background: color + '20', border: `1px solid ${color}`, borderRadius: 4, padding: '1px 4px', margin: '0 1px' }}>
          {text.slice(ent[0], ent[1])}
          <sup style={{ fontSize: 9, color, fontWeight: 700, marginLeft: 2 }}>{label}</sup>
        </span>
      );
      last = ent[1];
    });
    if (last < text.length) parts.push(<span key="end">{text.slice(last)}</span>);
    return <>{parts}</>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>NLP Training</h1>
          <p style={{ color: '#888', fontSize: 13 }}>Train spaCy NER model for property search</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {modelInfo?.trained && (
            <span style={{ background: '#D1FAE5', color: '#065F46', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
              Model trained {modelInfo.last_trained ? new Date(modelInfo.last_trained).toLocaleDateString() : ''}
            </span>
          )}
          <span style={{ background: '#EEF2FF', color: '#3730A3', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
            {examples.length} examples
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #f0f0f0', paddingBottom: 0 }}>
        {[
          { key: 'data', label: 'Training Data', icon: '📝' },
          { key: 'train', label: 'Train Model', icon: '🚀' },
          { key: 'test', label: 'Test Model', icon: '🧪' },
          { key: 'logs', label: 'Search Logs', icon: '📊' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key as any); if (t.key === 'logs') loadLogs(); }}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: tab === t.key ? '#2A3887' : 'transparent',
              color: tab === t.key ? 'white' : '#666',
              borderRadius: '8px 8px 0 0',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Training Data Tab ── */}
      {tab === 'data' && (
        <div>
          {/* Add new example */}
          <div style={{ background: '#F8F9FB', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Add Training Example</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input ref={textRef} value={newText} onChange={e => { setNewText(e.target.value); setNewEntities([]); }}
                onMouseUp={handleTextSelect}
                placeholder="Type a search query, e.g. 'looking for 3 bhk in 90l budget'"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 14 }} />
              <select value={selectedLabel} onChange={e => setSelectedLabel(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontWeight: 600 }}>
                {Object.entries(LABEL_GROUPS).map(([group, { labels }]) => (
                  <optgroup key={group} label={group}>
                    {labels.map(l => <option key={l} value={l}>{l}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            {newText && (
              <div style={{ marginBottom: 10, padding: 10, background: 'white', borderRadius: 8, fontSize: 14, lineHeight: 2 }}>
                {renderAnnotatedText(newText, newEntities.map(e => [e[0], e[1], LABELS[e[2]]]))}
              </div>
            )}
            <p style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>Select text in the input, then it auto-labels with the chosen entity type. </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddExample} disabled={!newText || newEntities.length === 0}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2A3887', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (!newText || newEntities.length === 0) ? 0.5 : 1 }}>
                Add Example
              </button>
              <button onClick={() => { setNewEntities([]); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #ddd', background: 'white', fontSize: 13, cursor: 'pointer' }}>
                Clear Labels
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={handleSeed} disabled={loading}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #2A3887', color: '#2A3887', background: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              Seed 15 Examples
            </button>
            <button onClick={handleAutoGenerate} disabled={loading}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #10B981', color: '#10B981', background: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              Auto-Generate from Search Logs
            </button>
          </div>

          {/* Entity label legend — grouped */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {Object.entries(LABEL_GROUPS).map(([group, { labels, color }]) => (
              <div key={group} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#999', width: 90, flexShrink: 0 }}>{group}</span>
                {labels.map(l => (
                  <span key={l} style={{ background: color + '15', color, border: `1px solid ${color}40`, padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
                    {l}
                  </span>
                ))}
              </div>
            ))}
          </div>

          {/* Examples list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {examples.map((ex, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'white', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                <span style={{ color: '#ccc', fontSize: 11, fontWeight: 700, width: 30 }}>#{i + 1}</span>
                <div style={{ flex: 1, fontSize: 13, lineHeight: 1.8 }}>
                  {renderAnnotatedText(ex.text, ex.entities)}
                </div>
                <button onClick={() => handleDelete(i)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16 }}>x</button>
              </div>
            ))}
            {examples.length === 0 && (
              <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>No training examples yet. Click "Seed 15 Examples" to start.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Train Tab ── */}
      {tab === 'train' && (
        <div>
          <div style={{ background: '#F8F9FB', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Train spaCy NER Model</h3>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
              Trains a custom Named Entity Recognition model using your annotated examples.
              The model learns to recognize BHK types, prices, facing directions, floor levels, and more.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13 }}>Training examples: <strong>{examples.length}</strong></span>
              {examples.length < 5 && <span style={{ color: '#EF4444', fontSize: 12 }}>Need at least 5 examples</span>}
            </div>
            <button onClick={handleTrain} disabled={examples.length < 5 || trainingStatus.status === 'training'}
              style={{
                padding: '12px 28px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                background: trainingStatus.status === 'training' ? '#ccc' : 'linear-gradient(135deg, #2A3887, #29A9DF)',
                color: 'white',
              }}>
              {trainingStatus.status === 'training' ? 'Training...' : 'Start Training'}
            </button>
          </div>

          {/* Progress */}
          {trainingStatus.status !== 'idle' && (
            <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize',
                  color: trainingStatus.status === 'error' ? '#EF4444' : trainingStatus.status === 'complete' ? '#10B981' : '#2A3887' }}>
                  {trainingStatus.status}
                </span>
                <span style={{ fontSize: 12, color: '#999' }}>{trainingStatus.progress}%</span>
              </div>
              <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, transition: 'width 0.5s',
                  width: `${trainingStatus.progress}%`,
                  background: trainingStatus.status === 'error' ? '#EF4444' : trainingStatus.status === 'complete' ? '#10B981' : '#2A3887',
                }} />
              </div>
              <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>{trainingStatus.message}</p>
            </div>
          )}

          {/* Model info */}
          {modelInfo?.trained && (
            <div style={{ background: '#F0FDF4', borderRadius: 12, padding: 20, marginTop: 16, border: '1px solid #BBF7D0' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#065F46', marginBottom: 8 }}>Current Model</h4>
              <p style={{ fontSize: 12, color: '#047857' }}>Last trained: {modelInfo.last_trained ? new Date(modelInfo.last_trained).toLocaleString() : 'Unknown'}</p>
              <p style={{ fontSize: 12, color: '#047857' }}>Pipeline: {modelInfo.pipeline?.join(', ')}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Test Tab ── */}
      {tab === 'test' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input value={testQuery} onChange={e => setTestQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTest()}
              placeholder="Type a search query to test NER..."
              style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1.5px solid #ddd', fontSize: 14 }} />
            <button onClick={handleTest}
              style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#2A3887', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Test
            </button>
          </div>
          {testResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {testResult.custom_model !== null ? (
                <div style={{ background: '#F0FDF4', borderRadius: 12, padding: 20, border: '1px solid #BBF7D0' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#065F46', marginBottom: 10 }}>Custom Trained Model</h4>
                  {testResult.custom_model.length === 0 ? (
                    <p style={{ color: '#999', fontSize: 13 }}>No entities detected</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {testResult.custom_model.map((e: any, i: number) => (
                        <span key={i} style={{ background: (LABEL_COLORS[e.label] || '#666') + '20', border: `1px solid ${LABEL_COLORS[e.label] || '#666'}`, borderRadius: 6, padding: '4px 10px', fontSize: 13 }}>
                          <strong>{e.text}</strong> <sup style={{ color: LABEL_COLORS[e.label], fontSize: 10 }}>{e.label}</sup>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: '#FEF3C7', borderRadius: 12, padding: 20, border: '1px solid #FDE68A' }}>
                  <p style={{ color: '#92400E', fontSize: 13, fontWeight: 600 }}>No custom model trained yet. Go to "Train Model" tab to train one.</p>
                </div>
              )}
              {testResult.spacy_default && (
                <div style={{ background: '#F8F9FB', borderRadius: 12, padding: 20, border: '1px solid #E5E7EB' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>spaCy Default (en_core_web_sm)</h4>
                  {testResult.spacy_default.length === 0 ? (
                    <p style={{ color: '#999', fontSize: 13 }}>No entities detected</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {testResult.spacy_default.map((e: any, i: number) => (
                        <span key={i} style={{ background: '#E5E7EB', borderRadius: 6, padding: '4px 10px', fontSize: 13 }}>
                          <strong>{e.text}</strong> <sup style={{ color: '#6B7280', fontSize: 10 }}>{e.label}</sup>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Search Logs Tab ── */}
      {tab === 'logs' && (
        <div>
          {/* Parser stats */}
          {(parserStats.groq > 0 || parserStats.spacy > 0 || parserStats.regex > 0) && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {[
                { key: 'groq', label: 'Groq LLM', color: '#10B981', bg: '#D1FAE5', icon: '🤖' },
                { key: 'spacy', label: 'spaCy NLP', color: '#3B82F6', bg: '#DBEAFE', icon: '🧠' },
                { key: 'regex', label: 'Regex', color: '#F59E0B', bg: '#FEF3C7', icon: '⚡' },
                { key: 'unknown', label: 'Unknown', color: '#9CA3AF', bg: '#F3F4F6', icon: '❓' },
              ].filter(p => (parserStats[p.key] || 0) > 0).map(p => {
                const count = parserStats[p.key] || 0;
                const total = Object.values(parserStats).reduce((a: number, b: any) => a + (b || 0), 0) as number;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={p.key} style={{ flex: 1, background: p.bg, borderRadius: 12, padding: '16px 20px', border: `1px solid ${p.color}30` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.icon} {p.label}</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: p.color }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: `${p.color}20`, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: p.color, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, color: p.color, marginTop: 4, display: 'block' }}>{pct}% of searches</span>
                  </div>
                );
              })}
            </div>
          )}

          <p style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>Recent searches — click to add as training data</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {logs.map((log) => {
              const parserColor: Record<string, string> = { groq: '#10B981', spacy: '#3B82F6', regex: '#F59E0B', unknown: '#9CA3AF' };
              const parserBg: Record<string, string> = { groq: '#D1FAE5', spacy: '#DBEAFE', regex: '#FEF3C7', unknown: '#F3F4F6' };
              const parser = log.parser || 'unknown';
              return (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'white', borderRadius: 8, border: '1px solid #f0f0f0', cursor: 'pointer' }}
                  onClick={() => { setNewText(log.query || ''); setNewEntities([]); setTab('data'); }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                    background: parserBg[parser] || '#F3F4F6', color: parserColor[parser] || '#9CA3AF',
                    textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0, minWidth: 48, textAlign: 'center',
                  }}>{parser}</span>
                  <span style={{ fontSize: 13, flex: 1, fontWeight: 500 }}>{log.query}</span>
                  <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>{log.results_count} results</span>
                  <span style={{ fontSize: 11, color: '#bbb', flexShrink: 0 }}>{log.created_at ? new Date(log.created_at).toLocaleDateString() : ''}</span>
                </div>
              );
            })}
            {logs.length === 0 && <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>No search logs yet</p>}
          </div>
        </div>
      )}
    </div>
  );
}
