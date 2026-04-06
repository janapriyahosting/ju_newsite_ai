'use client';
import { useState, useRef } from 'react';

const API_BASE = '';

function mediaUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return API_BASE + url;
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

interface Props {
  unit: any;
}

export default function UnitMediaSlider({ unit }: Props) {
  const [active, setActive] = useState(0);
  const thumbsRef = useRef<HTMLDivElement>(null);

  // Build media list: images → floor plans → video → walkthrough
  const items: MediaItem[] = [];

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

  // Fallback placeholder if no media
  if (items.length === 0) {
    return (
      <div className="w-full rounded-2xl overflow-hidden flex items-center justify-center"
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

  const prev = () => setActive(a => (a - 1 + items.length) % items.length);
  const next = () => setActive(a => (a + 1) % items.length);

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
    // image or floorplan
    return (
      <img src={mediaUrl(cur.url)} alt={cur.label}
        className="w-full h-full object-contain"
        style={{ background: '#f8fafc' }} />
    );
  };

  const thumbIcon = (item: MediaItem) => {
    if (item.type === 'youtube' || item.type === 'video') return '▶';
    if (item.type === 'walkthrough') return '🔭';
    if (item.type === 'floorplan') return '📐';
    return null;
  };

  return (
    <div className="w-full space-y-3">
      {/* Main viewer */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-white"
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

        {/* Nav arrows */}
        {items.length > 1 && (
          <>
            <button onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg transition-all hover:scale-110"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>‹</button>
            <button onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg transition-all hover:scale-110"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>›</button>
          </>
        )}

        {/* Counter */}
        {items.length > 1 && (
          <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
            {active + 1} / {items.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip — Amazon style */}
      {items.length > 1 && (
        <div ref={thumbsRef} className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}>
          {items.map((item, i) => (
            <button key={i} onClick={() => setActive(i)}
              className="flex-shrink-0 relative rounded-xl overflow-hidden transition-all"
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
                  <span className="text-xs mt-0.5" style={{ fontSize: '9px' }}>{item.label}</span>
                </div>
              )}
              {/* Active indicator */}
              {active === i && (
                <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: '#2A3887' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
