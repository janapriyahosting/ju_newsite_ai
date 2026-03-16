'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API = 'http://173.168.0.81:8000/api/v1';
const MEDIA = 'http://173.168.0.81:8000';
const fmt = (p: any) => p && +p >= 100000 ? `₹${(+p/100000).toFixed(1)}L` : null;
const mUrl = (u: string) => u?.startsWith('/media') ? `${MEDIA}${u}` : u;

function toEmbed(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

function Gallery({ images }: { images: string[] }) {
  const [a, setA] = useState(0);
  if (!images?.length) return null;
  return (
    <div>
      <div className="rounded-2xl overflow-hidden w-full mb-3" style={{ aspectRatio:'16/9', background:'#f1f5f9' }}>
        <img src={mUrl(images[a])} alt="" className="w-full h-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <button key={i} onClick={() => setA(i)} className="w-20 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0"
              style={{ borderColor: a===i ? '#2A3887' : 'transparent' }}>
              <img src={mUrl(img)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FloorPlans({ plans, svgPlan }: { plans: string[]; svgPlan?: string }) {
  const [a, setA] = useState(0);
  const all = [...(plans||[]), ...(svgPlan ? ['__svg__'] : [])];
  if (!all.length) return null;
  const cur = all[a];
  return (
    <div>
      {all.length > 1 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {all.map((_,i) => (
            <button key={i} onClick={() => setA(i)} className="px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all"
              style={a===i ? {borderColor:'#2A3887',background:'#2A3887',color:'white'} : {borderColor:'#e2e8f0',color:'#666'}}>
              Plan {i+1}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-2xl overflow-hidden flex items-center justify-center p-4" style={{ background:'#f8f9fb', minHeight:280 }}>
        {cur==='__svg__'
          ? <div className="w-full" dangerouslySetInnerHTML={{ __html: svgPlan||'' }} />
          : cur?.endsWith('.pdf')
            ? <iframe src={mUrl(cur)} className="w-full" style={{ height:400 }} />
            : <img src={mUrl(cur)} alt="Floor Plan" className="max-w-full max-h-96 object-contain" />}
      </div>
    </div>
  );
}

function UnitCard({ unit }: { unit: any }) {
  const sc: Record<string,string> = { available:'#dcfce7', booked:'#fee2e2', hold:'#fef3c7', blocked:'#f3f4f6' };
  const tc: Record<string,string> = { available:'#16A34A', booked:'#DC2626', hold:'#d97706', blocked:'#6b7280' };
  const price = fmt(unit.base_price);
  return (
    <Link href={`/units/${unit.id}`} className="rounded-2xl p-5 border hover:shadow-lg transition-all block" style={{ borderColor:'#e2e8f0' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background:sc[unit.status]||'#f3f4f6', color:tc[unit.status]||'#666' }}>{unit.status}</span>
        <span className="text-sm font-bold" style={{ color:'#2A3887' }}>{unit.unit_type}</span>
      </div>
      <p className="font-black text-lg" style={{ color:'#262262' }}>{unit.unit_number}</p>
      <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
        {unit.bedrooms && <span>🛏 {unit.bedrooms} BHK</span>}
        {unit.floor_number && <span>🏢 F{unit.floor_number}</span>}
        {unit.area_sqft && <span>📐 {unit.area_sqft} sqft</span>}
        {unit.facing && <span>🧭 {unit.facing}</span>}
      </div>
      {price && <p className="font-bold mt-3" style={{ color:'#2A3887' }}>{price}</p>}
    </Link>
  );
}

export default function TowerDetailPage() {
  const params = useParams();
  const projSlug = params?.id as string;
  const towerId = params?.towerId as string;
  const [tower, setTower] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [floorF, setFloorF] = useState<number|'all'>('all');
  const [statF, setStatF] = useState('all');

  useEffect(() => {
    if (!towerId) return;
    (async () => {
      const projList = await fetch(`${API}/projects?limit=50`).then(r=>r.json());
      const proj = projList.items?.find((p: any) => p.slug===projSlug||p.id===projSlug);
      const [towerList, unitsRes, sectRes] = await Promise.all([
        proj ? fetch(`${API}/projects/${proj.id}/towers`).then(r=>r.json()) : Promise.resolve({items:[]}),
        fetch(`${API}/units?tower_id=${towerId}&limit=200`).then(r=>r.json()),
        fetch(`${API}/admin/sections/public/tower`).then(r=>r.json()),
      ]);
      setTower(towerList.items?.find((t: any) => t.id===towerId) || null);
      setProject(proj||null);
      setUnits(unitsRes.items||[]);
      setSections(Array.isArray(sectRes) ? sectRes : (sectRes?.sections||[]));
      setLoading(false);
    })();
  }, [towerId, projSlug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor:'#E2F1FC', borderTopColor:'#2A3887' }}/></div>;
  if (!tower) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Tower not found</p></div>;

  const floors = Array.from(new Set<number>(units.map((u: any) => u.floor_number))).sort((a,b) => a-b);
  const filtered = units.filter((u: any) => {
    if (floorF!=='all' && u.floor_number!==floorF) return false;
    if (statF!=='all' && u.status!==statF) return false;
    return true;
  });
  const avail = units.filter((u: any) => u.status==='available').length;
  const prices = units.map((u: any) => +u.base_price).filter(p => p>=100000);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;

  const renderSection = (s: any) => {
    const f: string[] = s.fields||[];
    const hasImg = f.includes('images') && tower.images?.length>0;
    const hasFP = (f.includes('floor_plans') && tower.floor_plans?.length>0)||(f.includes('svg_floor_plan') && tower.svg_floor_plan);
    const hasVid = (f.includes('video_url') && tower.video_url)||(f.includes('walkthrough_url') && tower.walkthrough_url);
    const hasDesc = f.includes('description') && tower.description;
    if (!hasImg && !hasFP && !hasVid && !hasDesc) return null;
    return (
      <section key={s.key} className="py-10 border-b" style={{ borderColor:'#e2e8f0' }}>
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-black mb-6" style={{ color:'#262262' }}>{s.label}</h2>
          <div className="space-y-6">
            {hasDesc && <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">About</p><p className="text-gray-700">{tower.description}</p></div>}
            {hasImg && <Gallery images={tower.images} />}
            {hasFP && <FloorPlans plans={f.includes('floor_plans') ? (tower.floor_plans||[]) : []} svgPlan={f.includes('svg_floor_plan') ? tower.svg_floor_plan : undefined} />}
            {f.includes('video_url') && tower.video_url && (
              <div>
                <p className="text-sm font-bold text-gray-500 mb-2">📹 Tower Video</p>
                <div className="rounded-2xl overflow-hidden" style={{ aspectRatio:'16/9', background:'#111' }}>
                  <iframe src={toEmbed(tower.video_url)} className="w-full h-full" allowFullScreen title="Video" />
                </div>
              </div>
            )}
            {f.includes('walkthrough_url') && tower.walkthrough_url && (
              <div>
                <p className="text-sm font-bold text-gray-500 mb-2">🥽 3D Walkthrough</p>
                <div className="rounded-2xl overflow-hidden" style={{ height:450, background:'#111' }}>
                  <iframe src={tower.walkthrough_url} className="w-full h-full" allowFullScreen title="Walkthrough" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="py-12 px-4" style={{ background:'linear-gradient(135deg,#262262,#2A3887)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm mb-4" style={{ color:'#93c5fd' }}>
            <Link href="/projects" className="hover:text-white">Projects</Link>
            <span>›</span>
            {project && <Link href={`/projects/${project.slug}`} className="hover:text-white">{project.name}</Link>}
            <span>›</span>
            <span className="text-white font-bold">{tower.name}</span>
          </div>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">{tower.name}</h1>
              {tower.description && <p className="text-blue-200">{tower.description}</p>}
            </div>
            {minP>0 && (
              <div className="text-right">
                <p className="text-xs text-blue-300 font-bold">Price Range</p>
                <p className="text-2xl font-black text-white">{fmt(minP)} – {fmt(maxP)}</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[{l:'Total Units',v:units.length},{l:'Available',v:avail},{l:'Booked',v:units.length-avail},{l:'Floors',v:tower.total_floors}].map(s => (
              <div key={s.l} className="rounded-2xl px-5 py-4" style={{ background:'rgba(255,255,255,0.1)' }}>
                <p className="text-2xl font-black text-white">{s.v}</p>
                <p className="text-blue-300 text-sm">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {sections.filter((s: any) => s.visible).map(renderSection)}

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-2xl font-black" style={{ color:'#262262' }}>Units ({filtered.length})</h2>
            <div className="flex gap-2 flex-wrap">
              {['all','available','booked','hold'].map(s => (
                <button key={s} onClick={() => setStatF(s)} className="px-3 py-1.5 rounded-full text-sm font-bold border transition-all capitalize"
                  style={statF===s ? {background:'#2A3887',color:'white',borderColor:'#2A3887'} : {background:'white',color:'#666',borderColor:'#e2e8f0'}}>
                  {s==='all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-sm font-bold text-gray-500 flex items-center mr-1">Floor:</span>
            {(['all', ...floors] as (number|'all')[]).map(f => (
              <button key={String(f)} onClick={() => setFloorF(f)} className="px-3 py-1.5 rounded-full text-sm font-bold border transition-all"
                style={floorF===f ? {background:'#2A3887',color:'white',borderColor:'#2A3887'} : {background:'white',color:'#666',borderColor:'#e2e8f0'}}>
                {f==='all' ? 'All' : f}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((u: any) => <UnitCard key={u.id} unit={u} />)}
          </div>
          {!filtered.length && <p className="text-center text-gray-400 py-12">No units match the selected filters</p>}
        </div>
      </section>
    </div>
      {/* Brochure Download */}
      {tower?.brochure_url && (
        <div className="mt-8 p-5 rounded-2xl max-w-sm" style={{background:"#F8F9FB", border:"1px solid #E2F1FC"}}>
          <p className="text-sm font-black mb-3" style={{color:"#2A3887"}}>📄 Tower Brochure</p>
          <button onClick={() => {
            const user = typeof window !== 'undefined' ? localStorage.getItem('jp_token') : null;
            if (!user) window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname) + '&reason=brochure';
            else window.open('http://173.168.0.81:8000' + tower.brochure_url, '_blank');
          }} className="w-full py-3 font-black rounded-xl text-sm flex items-center justify-center gap-2"
          style={{background:"linear-gradient(135deg,#2A3887,#29A9DF)", color:"white"}}>
            ⬇️ Download Brochure
          </button>
          <p className="text-xs text-center mt-2" style={{color:"#94a3b8"}}>Login required to download</p>
        </div>
      )}

  );
}
