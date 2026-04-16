'use client';
import { useState, useRef, createContext, useContext, useMemo } from 'react';

const API_BASE = '';

function mediaUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return API_BASE + url.split('/').map(s => encodeURIComponent(s)).join('/');
}

function isVideo(url: string) {
  return url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('youtube') || url?.includes('youtu.be') || url?.includes('vimeo');
}

function isYouTube(url: string) {
  return url?.includes('youtube.com') || url?.includes('youtu.be');
}

function getYouTubeId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return m ? m[1] : null;
}

function isPdf(url: string) {
  return url?.match(/\.pdf$/i);
}

interface MediaItem {
  type: 'image' | 'video' | 'youtube' | 'walkthrough' | 'floorplan';
  url: string;
  label: string;
}

// Ordered: 2D → 3D → Model Flat Video → Tower Elevation → Project Image → Project Video → Walk Through Video → rest
const SERIES_MEDIA_ORDERED: [string, { type: MediaItem['type']; label: string }][] = [
  ['series_floor_plan_2d',       { type: 'floorplan', label: '2D Plan' }],
  ['series_floor_plan_3d',       { type: 'floorplan', label: '3D Plan' }],
  ['series_floor_plan',          { type: 'floorplan', label: 'Floor Plan' }],
  ['series_model_flat_video',    { type: 'video',     label: 'Model Flat Video' }],
  ['series_tower_elevation',     { type: 'image',     label: 'Tower Elevation' }],
  ['series_project_image',       { type: 'image',     label: 'Project Image' }],
  ['series_project_video',       { type: 'video',     label: 'Project Video' }],
  ['series_walkthrough_video',   { type: 'video',     label: 'Walk Through Video' }],
  // series_brochure excluded from slider — shown as download button instead
  ['series_unit_image',          { type: 'image',     label: 'Unit Photo' }],
];

interface MediaContextType {
  items: MediaItem[];
  active: number;
  setActive: (i: number) => void;
  prev: () => void;
  next: () => void;
  unit: any;
}

const MediaContext = createContext<MediaContextType | null>(null);

function useMedia() {
  const ctx = useContext(MediaContext);
  if (!ctx) throw new Error('useMedia must be used within UnitMediaProvider');
  return ctx;
}

function buildItems(unit: any, seriesFields?: Record<string, { value: any; field_type: string; label: string }>): MediaItem[] {
  const items: MediaItem[] = [];

  // Series media first — in defined order
  if (seriesFields) {
    for (const [key, meta] of SERIES_MEDIA_ORDERED) {
      const cf = seriesFields[key];
      if (cf && cf.value && String(cf.value).trim()) {
        const url = String(cf.value).trim();
        if (isYouTube(url)) {
          items.push({ type: 'youtube', url, label: meta.label });
        } else if (isVideo(url)) {
          items.push({ type: 'video', url, label: meta.label });
        } else {
          items.push({ type: meta.type, url, label: meta.label });
        }
      }
    }
  }

  // Then unit-level media
  (unit.images || []).forEach((url: string) => {
    if (!isPdf(url)) items.push({ type: 'image', url, label: 'Photo' });
  });

  if (unit.floor_plan_img) {
    items.push({ type: 'floorplan', url: unit.floor_plan_img, label: 'Floor Plan' });
  }

  (unit.floor_plans || []).forEach((url: string, i: number) => {
    if (!isPdf(url)) items.push({ type: 'floorplan', url, label: `Floor Plan ${i + 1}` });
  });

  if (unit.video_url) {
    if (isYouTube(unit.video_url)) {
      items.push({ type: 'youtube', url: unit.video_url, label: 'Video' });
    } else {
      items.push({ type: 'video', url: unit.video_url, label: 'Video' });
    }
  }

  if (unit.walkthrough_url) {
    if (isYouTube(unit.walkthrough_url)) {
      items.push({ type: 'youtube', url: unit.walkthrough_url, label: '3D Tour' });
    } else {
      items.push({ type: 'walkthrough', url: unit.walkthrough_url, label: '3D Tour' });
    }
  }

  return items;
}

/* ── Provider: wraps both thumbnails and main viewer ── */
export function UnitMediaProvider({ unit, seriesFields, children }: {
  unit: any;
  seriesFields?: Record<string, { value: any; field_type: string; label: string }>;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const items = useMemo(() => buildItems(unit, seriesFields), [unit, seriesFields]);
  const prev = () => setActive(a => (a - 1 + items.length) % items.length);
  const next = () => setActive(a => (a + 1) % items.length);

  return (
    <MediaContext.Provider value={{ items, active, setActive, prev, next, unit }}>
      {children}
    </MediaContext.Provider>
  );
}

/* ── Vertical thumbnail strip (renders outside the box) ── */
export function UnitMediaThumbs() {
  const { items, active, setActive } = useMedia();
  const thumbsRef = useRef<HTMLDivElement>(null);

  if (items.length <= 1) return null;

  const thumbIcon = (item: MediaItem) => {
    if (item.type === 'youtube' || item.type === 'video') return '▶';
    if (item.type === 'walkthrough') return '🔭';
    if (item.type === 'floorplan') return '📐';
    return null;
  };

  return (
    <div ref={thumbsRef} className="flex-shrink-0 flex flex-col gap-2 overflow-y-auto"
      style={{ scrollbarWidth: 'none', maxHeight: '450px', width: '80px' }}>
      {items.map((item, i) => (
        <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1">
          <button onClick={() => setActive(i)}
            className="relative rounded-xl overflow-hidden transition-all"
            style={{
              width: '72px', height: '60px',
              border: active === i ? '2px solid #2A3887' : '2px solid #e2e8f0',
              opacity: active === i ? 1 : 0.7,
              transform: active === i ? 'scale(1.05)' : 'scale(1)',
            }}>
            {(item.type === 'image' || item.type === 'floorplan') ? (
              <img src={mediaUrl(item.url)} alt={item.label}
                className="w-full h-full object-cover"
                style={{ background: '#f8fafc' }} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-xs font-bold"
                style={{ background: item.type === 'youtube' || item.type === 'video' ? '#1a1a2e' : '#EFF6FF',
                  color: item.type === 'youtube' || item.type === 'video' ? 'white' : '#2A3887' }}>
                <span className="text-lg">{thumbIcon(item)}</span>
              </div>
            )}
            {active === i && (
              <div className="absolute inset-y-0 left-0 w-0.5" style={{ background: '#2A3887' }} />
            )}
          </button>
          <span className="text-center leading-tight"
            style={{ fontSize: '9px', color: active === i ? '#2A3887' : '#64748b', fontWeight: active === i ? 700 : 500, maxWidth: '76px' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Main viewer (renders inside the box) ── */
export function UnitMediaMain() {
  const { items, active, prev, next, unit } = useMedia();

  if (items.length === 0) {
    return (
      <div className="w-full overflow-hidden flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)', aspectRatio: '16/9' }}>
        <div className="text-center text-white p-8">
          <p className="text-6xl mb-4">🏢</p>
          <p className="text-2xl font-black">{unit.unit_number}</p>
          <p className="text-lg opacity-80">{unit.unit_type}</p>
        </div>
      </div>
    );
  }

  const cur = items[active];

  const renderMain = () => {
    if (cur.type === 'youtube') {
      const ytId = getYouTubeId(cur.url);
      return (
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen style={{ border: 'none' }} />
      );
    }
    if (cur.type === 'walkthrough') {
      return (
        <iframe src={cur.url} className="w-full h-full" style={{ border: 'none' }} allowFullScreen />
      );
    }
    if (cur.type === 'video') {
      return (
        <video src={mediaUrl(cur.url)} controls className="w-full h-full object-cover" />
      );
    }
    return (
      <img src={mediaUrl(cur.url)} alt={cur.label}
        className="w-full h-full object-contain"
        style={{ background: '#f8fafc' }} />
    );
  };

  return (
    <div className="relative w-full overflow-hidden bg-white"
      style={{ aspectRatio: '16/9', minHeight: '300px' }}>

      {renderMain()}

      {/* Status badge */}
      <div className="absolute top-4 left-4">
        <span className="px-3 py-1 rounded-full text-xs font-black"
          style={{
            background: unit.status === 'available' ? '#16A34A' :
              unit.status === 'booked' ? '#DC2626' : '#F59E0B',
            color: 'white'
          }}>
          ● {unit.status?.charAt(0).toUpperCase() + unit.status?.slice(1)}
        </span>
      </div>

      {/* Media type badge */}
      {(cur.type === 'floorplan' || cur.type === 'youtube' || cur.type === 'walkthrough') && (
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
            {cur.label}
          </span>
        </div>
      )}


      {/* Counter */}
      {items.length > 1 && (
        <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
          {active + 1} / {items.length}
        </div>
      )}
    </div>
  );
}

/* ── Default export for backward compat (not used in new layout) ── */
export default function UnitMediaSlider({ unit, seriesFields }: {
  unit: any;
  seriesFields?: Record<string, { value: any; field_type: string; label: string }>;
}) {
  return (
    <UnitMediaProvider unit={unit} seriesFields={seriesFields}>
      <UnitMediaMain />
    </UnitMediaProvider>
  );
}
