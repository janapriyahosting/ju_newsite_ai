'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
const API='http://173.168.0.81:8000/api/v1';
const MEDIA='http://173.168.0.81:8000';
const fmt=(p:any)=>p&&+p>0?`₹${(+p/100000).toFixed(1)}L`:'—';
const mUrl=(u:string)=>u?.startsWith('/media')?`${MEDIA}${u}`:u;
function toEmbed(url:string){if(!url)return'';const yt=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);if(yt)return`https://www.youtube.com/embed/${yt[1]}`;const vm=url.match(/vimeo\.com\/(\d+)/);if(vm)return`https://player.vimeo.com/video/${vm[1]}`;return url;}
function Gallery({images}:{images:string[]}){const[a,setA]=useState(0);if(!images?.length)return null;return(<div><div className="rounded-2xl overflow-hidden w-full mb-3"style={{background:'#f1f5f9',aspectRatio:'16/9'}}><img src={mUrl(images[a])}alt=""className="w-full h-full object-cover"/></div>{images.length>1&&<div className="flex gap-2 flex-wrap">{images.map((img,i)=><button key={i}onClick={()=>setA(i)}className="w-20 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all"style={{borderColor:a===i?'#2A3887':'transparent'}}><img src={mUrl(img)}alt=""className="w-full h-full object-cover"/></button>)}</div>}</div>);}
function FloorPlans({plans}:{plans:string[]}){const[a,setA]=useState(0);if(!plans?.length)return null;const cur=plans[a];return(<div>{plans.length>1&&<div className="flex gap-2 mb-3 flex-wrap">{plans.map((_,i)=><button key={i}onClick={()=>setA(i)}className="px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all"style={a===i?{borderColor:'#2A3887',background:'#2A3887',color:'white'}:{borderColor:'#e2e8f0',color:'#666'}}>Plan {i+1}</button>)}</div>}<div className="rounded-2xl overflow-hidden flex items-center justify-center p-4"style={{background:'#f8f9fb',minHeight:280}}>{cur?.endsWith('.pdf')?<iframe src={mUrl(cur)}className="w-full"style={{height:400}}/>:<img src={mUrl(cur)}alt=""className="max-w-full max-h-96 object-contain"/>}</div></div>);}
export default function ProjectDetailPage(){
  const params=useParams();const slug=params?.id as string;
  const[project,setProject]=useState<any>(null);const[towers,setTowers]=useState<any[]>([]);const[units,setUnits]=useState<any[]>([]);const[sections,setSections]=useState<any[]>([]);const[tab,setTab]=useState<'overview'|'units'|'towers'>('overview');const[loading,setLoading]=useState(true);
  useEffect(()=>{if(!slug)return;(async()=>{
    const list=await fetch(`${API}/projects?limit=50`).then(r=>r.json());
    const proj=list.items?.find((p:any)=>p.slug===slug||p.id===slug);
    if(!proj){setLoading(false);return;}
    const[fp,tr,sr]=await Promise.all([fetch(`${API}/projects/${proj.id}`).then(r=>r.json()),fetch(`${API}/projects/${proj.id}/towers`).then(r=>r.json()),fetch(`${API}/admin/sections/public/project`).then(r=>r.json())]);
    setProject(fp);const tList=tr.items||[];setTowers(tList);
    setSections(Array.isArray(sr)?sr:(sr?.sections||[]));
    const ur=await Promise.all(tList.map((t:any)=>fetch(`${API}/units?tower_id=${t.id}&limit=200`).then(r=>r.json())));
    setUnits(ur.flatMap((r:any)=>r.items||[]));setLoading(false);
  })();},[slug]);
  if(loading)return<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 rounded-full animate-spin"style={{borderColor:'#E2F1FC',borderTopColor:'#2A3887'}}/></div>;
  if(!project)return<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Project not found</p></div>;
  const avail=units.filter((u:any)=>u.status==='available');
  const prices=units.filter((u:any)=>+u.base_price>0).map((u:any)=>+u.base_price);
  const minP=prices.length?Math.min(...prices):0;const maxP=prices.length?Math.max(...prices):0;
  const LABELS:Record<string,string>={description:'About the Project',location:'Location',address:'Address',city:'City',state:'State',pincode:'Pincode',rera_number:'RERA Number'};
  const renderSection=(s:any)=>{
    const f=s.fields as string[];const parts:any[]=[];
    const textF=f.filter((k:string)=>LABELS[k]&&project[k]);
    if(textF.length)parts.push(<div key="text"className="grid md:grid-cols-2 gap-6">{textF.map((k:string)=><div key={k}className={k==='description'?'md:col-span-2':''}><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{LABELS[k]}</p><p className="text-gray-700 leading-relaxed">{project[k]}</p></div>)}</div>);
    if(f.includes('images')&&project.images?.length)parts.push(<Gallery key="gal"images={project.images}/>);
    if(f.includes('floor_plans')&&project.floor_plans?.length)parts.push(<FloorPlans key="fp"plans={project.floor_plans}/>);
    if(f.includes('video_url')&&project.video_url)parts.push(<div key="vid"><p className="text-sm font-bold text-gray-500 mb-2">📹 Project Video</p><div className="rounded-2xl overflow-hidden"style={{aspectRatio:'16/9',background:'#111'}}><iframe src={toEmbed(project.video_url)}className="w-full h-full"allowFullScreen title="Video"/></div></div>);
    if(f.includes('walkthrough_url')&&project.walkthrough_url)parts.push(<div key="wt"><p className="text-sm font-bold text-gray-500 mb-2">🥽 3D Walkthrough</p><div className="rounded-2xl overflow-hidden"style={{height:450,background:'#111'}}><iframe src={project.walkthrough_url}className="w-full h-full"allowFullScreen title="Tour"/></div></div>);
    if(f.includes('brochure_url')&&project.brochure_url)parts.push(<a key="br"href={mUrl(project.brochure_url)}target="_blank"rel="noopener noreferrer"className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-white"style={{background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}>📄 Download Brochure</a>);
    if(f.includes('amenities')&&project.amenities?.length)parts.push(<div key="am"className="flex flex-wrap gap-3">{project.amenities.map((a:string,i:number)=><span key={i}className="px-4 py-2 rounded-full text-sm font-medium"style={{background:'#E2F1FC',color:'#2A3887'}}>✓ {a}</span>)}</div>);
    if(f.includes('lat')&&project.lat&&project.lng)parts.push(<div key="map"className="rounded-2xl overflow-hidden"style={{height:350}}><iframe src={`https://maps.google.com/maps?q=${project.lat},${project.lng}&z=15&output=embed`}className="w-full h-full border-0"loading="lazy"title="Map"/></div>);
    if(!parts.length)return null;
    return(<section key={s.key}className="py-10 border-b"style={{borderColor:'#e2e8f0'}}><div className="max-w-6xl mx-auto px-4"><h2 className="text-2xl font-black mb-6"style={{color:'#262262'}}>{s.label}</h2><div className="space-y-6">{parts}</div></div></section>);
  };
  return(
    <div className="min-h-screen bg-white">
      <div className="py-12 px-4"style={{background:'linear-gradient(135deg,#262262,#2A3887)'}}>
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold tracking-widest mb-2"style={{color:'#29A9DF'}}>{project.city?.toUpperCase()}{project.rera_number?' · RERA REGISTERED':''}</p>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div><h1 className="text-4xl font-black text-white mb-2">{project.name}</h1>{project.address&&<p className="text-blue-200">📍 {project.address}</p>}</div>
            {minP>0&&<div className="text-right"><p className="text-xs text-blue-300 font-bold">Starting From</p><p className="text-3xl font-black text-white">{fmt(minP)}</p>{maxP!==minP&&<p className="text-blue-300 text-sm">Up to {fmt(maxP)}</p>}</div>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[{l:'Total Units',v:units.length},{l:'Available',v:avail.length},{l:'Towers',v:towers.length},{l:'RERA',v:project.rera_number||'—'}].map(s=>(
              <div key={s.l}className="rounded-2xl px-5 py-4"style={{background:'rgba(255,255,255,0.1)'}}><p className="text-2xl font-black text-white">{s.v}</p><p className="text-blue-300 text-sm">{s.l}</p></div>
            ))}
          </div>
        </div>
      </div>
      <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex">
          {(['overview','units','towers'] as const).map(t=>(
            <button key={t}onClick={()=>setTab(t)}className="px-6 py-4 text-sm font-bold capitalize border-b-2 transition-all"style={tab===t?{borderColor:'#2A3887',color:'#2A3887'}:{borderColor:'transparent',color:'#888'}}>
              {t}{t==='units'?` (${units.length})`:t==='towers'?` (${towers.length})`:''}
            </button>
          ))}
        </div>
      </div>
      {tab==='overview'&&(<div>{sections.filter((s:any)=>s.visible).map(renderSection)}<div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-4"><button className="flex-1 py-4 rounded-2xl font-bold text-white text-lg"style={{background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}>Enquire Now</button><button className="flex-1 py-4 rounded-2xl font-bold text-lg border-2"style={{borderColor:'#2A3887',color:'#2A3887'}}>📅 Book Site Visit</button></div></div>)}
      {tab==='units'&&(<div className="max-w-6xl mx-auto px-4 py-8"><h2 className="text-2xl font-black mb-6"style={{color:'#262262'}}>All Units ({units.length})</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{units.map((u:any)=><Link key={u.id}href={`/units/${u.id}`}className="rounded-2xl p-5 border hover:shadow-lg transition-all block"style={{borderColor:'#e2e8f0'}}><div className="flex items-center justify-between mb-3"><span className="text-xs font-bold px-2 py-1 rounded-full"style={{background:u.status==='available'?'#dcfce7':'#fee2e2',color:u.status==='available'?'#16A34A':'#DC2626'}}>{u.status}</span><span className="text-sm font-bold"style={{color:'#2A3887'}}>{u.unit_type}</span></div><p className="font-black text-lg"style={{color:'#262262'}}>{u.unit_number}</p><div className="flex gap-4 mt-2 text-sm text-gray-500"><span>Floor {u.floor_number}</span>{u.area_sqft&&<span>{u.area_sqft} sqft</span>}</div><p className="font-bold mt-3"style={{color:'#2A3887'}}>{fmt(u.base_price)}</p></Link>)}</div></div>)}
      {tab==='towers'&&(<div className="max-w-6xl mx-auto px-4 py-8"><h2 className="text-2xl font-black mb-6"style={{color:'#262262'}}>Towers ({towers.length})</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{towers.map((t:any)=><Link key={t.id}href={`/projects/${slug}/towers/${t.id}`}className="rounded-2xl p-6 border hover:shadow-lg transition-all block"style={{borderColor:'#e2e8f0'}}>{t.images?.[0]&&<div className="rounded-xl overflow-hidden mb-4"style={{aspectRatio:'16/9'}}><img src={mUrl(t.images[0])}alt=""className="w-full h-full object-cover"/></div>}<h3 className="font-black text-xl mb-1"style={{color:'#262262'}}>{t.name}</h3>{t.description&&<p className="text-sm text-gray-500 mb-3">{t.description}</p>}<div className="flex gap-4 text-sm font-medium"style={{color:'#2A3887'}}><span>{t.total_floors} Floors</span><span>{t.total_units} Units</span></div><div className="flex gap-2 mt-3 flex-wrap">{t.video_url&&<span className="text-xs px-2 py-1 rounded-full"style={{background:'#E2F1FC',color:'#2A3887'}}>▶ Video</span>}{t.walkthrough_url&&<span className="text-xs px-2 py-1 rounded-full"style={{background:'#E2F1FC',color:'#2A3887'}}>🥽 Tour</span>}{t.floor_plans?.length>0&&<span className="text-xs px-2 py-1 rounded-full"style={{background:'#E2F1FC',color:'#2A3887'}}>📐 Plans</span>}</div></Link>)}</div></div>)}
    </div>
  );
}
