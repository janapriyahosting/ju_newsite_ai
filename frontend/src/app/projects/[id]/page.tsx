'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DynamicFields from '@/components/DynamicFields';
import { customerApi } from '@/lib/customerAuth';
const API=process.env.NEXT_PUBLIC_API_URL||'';
const MEDIA='';

function useUtmParams(){
  const sp=typeof window!=='undefined'?new URLSearchParams(window.location.search):new URLSearchParams();
  return{utm_source:sp.get('utm_source')||undefined,utm_medium:sp.get('utm_medium')||undefined,utm_campaign:sp.get('utm_campaign')||undefined};
}
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
  const prices=units.map((u:any)=>{const ta=u.custom_fields?.total_amount;return ta&&parseFloat(ta)>0?parseFloat(ta):+u.base_price;}).filter((p:number)=>p>0);
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
      <Navbar />
      <div className="pt-16 py-12 px-4"style={{background:'linear-gradient(135deg,#262262,#2A3887)'}}>
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
          {(['overview','towers','units'] as const).map(t=>(
            <button key={t}onClick={()=>setTab(t)}className="px-6 py-4 text-sm font-bold capitalize border-b-2 transition-all"style={tab===t?{borderColor:'#2A3887',color:'#2A3887'}:{borderColor:'transparent',color:'#888'}}>
              {t}{t==='units'?` (${units.length})`:t==='towers'?` (${towers.length})`:''}
            </button>
          ))}
        </div>
      </div>
      {tab==='overview'&&(<div>{sections.filter((s:any)=>s.visible).map(renderSection)}{project?.id&&<div className="max-w-6xl mx-auto px-4 py-6"><DynamicFields entity="project" entityId={project.id} entityData={project}/></div>}<ProjectFormsSection projectName={project.name}/></div>)}
      {tab==='units'&&(<div className="max-w-6xl mx-auto px-4 py-8"><h2 className="text-2xl font-black mb-6"style={{color:'#262262'}}>All Units ({units.length})</h2>{units.length===0?<div className="rounded-2xl p-10 text-center"style={{border:'1.5px dashed #E2F1FC'}}><div className="text-5xl mb-4">🏠</div><p className="font-bold text-lg mb-2"style={{color:'#555'}}>No units available yet</p><p style={{color:'#999'}} className="text-sm">Units will be listed here once added by the team.</p></div>:<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{units.map((u:any)=>{
        const img3d=u.custom_fields?.series_floor_plan_3d;
        const imgUrl=img3d||'';
        const statusColor=u.status==='available'?'#22c55e':u.status==='booked'?'#ef4444':u.status==='sold'?'#dc2626':'#f59e0b';
        const price=(()=>{const ta=u.custom_fields?.total_amount;return ta&&parseFloat(ta)>0?parseFloat(ta):u.base_price?parseFloat(u.base_price):null;})();
        return(
        <div key={u.id} className="bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"style={{boxShadow:'0 4px 20px rgba(42,56,135,0.1)',border:'1.5px solid #E2F1FC'}}>
          <div className="h-44 relative flex flex-col justify-between p-4"style={{background:imgUrl?`url(${mUrl(imgUrl)}) center/cover no-repeat`:'linear-gradient(135deg,#2A3887,#29A9DF)'}}>
            {imgUrl&&<div className="absolute inset-0"style={{background:'linear-gradient(180deg,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0.55) 100%)'}}/>}
            <div className="relative z-10 flex justify-between items-start">
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white"style={{color:statusColor}}>● {(u.status||'available').charAt(0).toUpperCase()+(u.status||'available').slice(1)}</span>
            </div>
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-wide" style={{color:'rgba(255,255,255,0.65)'}}>
                {u.unit_type?.includes('BHK')?u.unit_type:`${u.unit_type||''}${u.bedrooms?(u.unit_type?' · ':'')+u.bedrooms+' BHK':''}`}
              </p>
              <h3 className="text-white font-black text-lg leading-tight">{u.unit_number}</h3>
            </div>
          </div>
          <div className="p-4 flex flex-col">
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              {[['🛏',u.bedrooms||'—','BHK'],['📐',u.area_sqft?`${parseFloat(u.area_sqft).toFixed(0)}`:'—','sqft'],['🏢',u.floor_number??'—','Floor']].map(([icon,val,lbl])=>(
                <div key={String(lbl)} className="rounded-xl py-2"style={{background:'#F8F9FB'}}>
                  <div className="text-base">{icon}</div>
                  <div className="font-black text-sm"style={{color:'#2A3887'}}>{val}</div>
                  <div className="text-xs"style={{color:'#999'}}>{lbl}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {u.bathrooms&&<span className="px-2 py-0.5 rounded-full text-xs"style={{background:'#F0F4FF',color:'#2A3887'}}>🚿 {u.bathrooms} Bath</span>}
              {u.facing&&<span className="px-2 py-0.5 rounded-full text-xs"style={{background:'#F0F4FF',color:'#2A3887'}}>🧭 {u.facing}</span>}
              {u.balconies>0&&<span className="px-2 py-0.5 rounded-full text-xs"style={{background:'#F0F4FF',color:'#2A3887'}}>🏡 {u.balconies} Balc</span>}
            </div>
            <div className="mt-auto flex items-center justify-between pt-3"style={{borderTop:'1px solid #F0F4FF'}}>
              <div>
                <div className="font-black text-lg"style={{color:'#2A3887'}}>{price?fmt(price):'—'}</div>
                {u.area_sqft&&price&&<div className="text-xs"style={{color:'#999'}}>₹{Math.round(price/parseFloat(u.area_sqft)).toLocaleString()}/sqft</div>}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Link href={`/units/${u.id}?enquire=true`} className="flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-colors"style={{border:'1.5px solid #2A3887',color:'#2A3887'}}>Enquire</Link>
              <Link href={`/units/${u.id}`} className="flex-1 text-center py-2.5 text-xs font-bold text-white rounded-xl"style={{background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}>Details →</Link>
            </div>
          </div>
        </div>
        );})}</div>}</div>)}
      {tab==='towers'&&(<div className="max-w-6xl mx-auto px-4 py-8"><h2 className="text-2xl font-black mb-6"style={{color:'#262262'}}>Towers ({towers.length})</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{towers.map((t:any)=>{const tThumb=t.thumbnail||t.images?.[0];return(<Link key={t.id}href={`/projects/${slug}/towers/${t.id}`}className="rounded-2xl overflow-hidden border hover:shadow-lg transition-all block"style={{borderColor:'#e2e8f0'}}>{tThumb?(<div className="relative"style={{height:180,background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}><img src={tThumb.split('/').map((s:string)=>encodeURIComponent(s)).join('/')}alt={t.name}className="absolute inset-0 w-full h-full object-cover"onError={(e:any)=>{e.target.style.display='none'}}/><div className="absolute inset-0"style={{background:'linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.5) 100%)'}}/><h3 className="absolute bottom-4 left-4 font-black text-xl text-white"style={{zIndex:1}}>{t.name}</h3></div>):(<div className="relative p-5"style={{height:180,background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}><h3 className="absolute bottom-4 left-4 font-black text-xl text-white">{t.name}</h3></div>)}<div className="p-5">{t.description&&<p className="text-sm text-gray-500 mb-3">{t.description}</p>}<div className="flex gap-4 text-sm font-medium"style={{color:'#2A3887'}}><span>{t.total_floors} Floors</span><span>{t.total_units} Units</span></div><div className="flex gap-2 mt-3 flex-wrap">{t.video_url&&<span className="text-xs px-2 py-1 rounded-full"style={{background:'#E2F1FC',color:'#2A3887'}}>▶ Video</span>}{t.walkthrough_url&&<span className="text-xs px-2 py-1 rounded-full"style={{background:'#E2F1FC',color:'#2A3887'}}>🥽 Tour</span>}{t.floor_plans?.length>0&&<span className="text-xs px-2 py-1 rounded-full"style={{background:'#E2F1FC',color:'#2A3887'}}>📐 Plans</span>}</div></div></Link>)})}</div></div>)}
      <Footer />
    </div>
  );
}

/* ── Inline Enquiry + Site Visit Forms ──────────────────────────────────────── */

const TIME_SLOTS=['10:00 AM','11:00 AM','12:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM'];
const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);const MIN_DATE=tomorrow.toISOString().split('T')[0];

function cleanPhone(p:string){return p.replace(/\D/g,'').replace(/^91/,'');}
function validatePhone(p:string){return /^[6-9]\d{9}$/.test(cleanPhone(p));}
function validateEmail(e:string){return !e||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}

function InlineOtp({phone,onVerified,loading:parentLoading,setLoading:setParentLoading}:{phone:string;onVerified:()=>void;loading:boolean;setLoading:(v:boolean)=>void}){
  const[otp,setOtp]=useState(['','','','','','']);
  const[err,setErr]=useState('');
  const[countdown,setCountdown]=useState(0);
  const[devOtp,setDevOtp]=useState<string|null>(null);
  const[sent,setSent]=useState(false);
  const refs=useRef<(HTMLInputElement|null)[]>([]);

  useEffect(()=>{if(countdown>0){const t=setTimeout(()=>setCountdown(c=>c-1),1000);return()=>clearTimeout(t);}},[countdown]);
  useEffect(()=>{if(sent)refs.current[0]?.focus();},[sent]);

  async function sendOtp(){
    setParentLoading(true);setErr('');
    try{
      const r=await customerApi('/auth/send-otp',{method:'POST',body:JSON.stringify({phone:cleanPhone(phone),purpose:'lead'})});
      if(r.dev_otp)setDevOtp(r.dev_otp);
      setSent(true);setCountdown(30);
    }catch(e:any){setErr(e.message||'Failed to send OTP');}
    finally{setParentLoading(false);}
  }

  async function resend(){setOtp(['','','','','','']);setDevOtp(null);await sendOtp();}

  async function doVerify(code:string){
    setParentLoading(true);setErr('');
    try{
      await customerApi('/auth/verify-phone',{method:'POST',body:JSON.stringify({phone:cleanPhone(phone),otp:code})});
      onVerified();
    }catch(e:any){setErr(e.message||'Invalid OTP');}
    finally{setParentLoading(false);}
  }
  async function verifyAuto(digits:string[]){const c=digits.join('');if(c.length===6&&!parentLoading)await doVerify(c);}
  async function verify(){const code=otp.join('');if(code.length!==6){setErr('Enter the 6-digit OTP');return;}await doVerify(code);}

  function onChange(i:number,v:string){if(v&&!/^\d$/.test(v))return;const n=[...otp];n[i]=v;setOtp(n);if(v&&i<5)refs.current[i+1]?.focus();if(v&&i===5&&n.join('').length===6)setTimeout(()=>verifyAuto(n),100);}
  function onKey(i:number,e:React.KeyboardEvent){if(e.key==='Backspace'&&!otp[i]&&i>0)refs.current[i-1]?.focus();}
  function onPaste(e:React.ClipboardEvent){e.preventDefault();const p=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);if(p.length===6){const d=p.split('');setOtp(d);refs.current[5]?.focus();setTimeout(()=>verifyAuto(d),100);}}

  if(!sent)return(
    <div className="space-y-3">
      {err&&<p className="text-red-500 text-sm">{err}</p>}
      <button type="button" onClick={sendOtp} disabled={parentLoading}
        className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
        style={{background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}>
        {parentLoading?'Sending OTP...':'Send OTP to verify'}
      </button>
    </div>
  );

  return(
    <div className="space-y-3 border-t pt-4"style={{borderColor:'#e2e8f0'}}>
      {err&&<p className="text-red-500 text-sm">{err}</p>}
      {devOtp&&<div className="px-3 py-1.5 rounded-lg text-xs"style={{background:'#FEF9C3',color:'#92400E',border:'1px solid #FDE68A'}}>Dev OTP: <strong>{devOtp}</strong></div>}
      <p className="text-sm text-gray-600">OTP sent to <strong>+91 {cleanPhone(phone)}</strong></p>
      <div className="flex gap-2 justify-center" onPaste={onPaste}>
        {otp.map((d,i)=><input key={i} ref={el=>{refs.current[i]=el;}} type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e=>onChange(i,e.target.value)} onKeyDown={e=>onKey(i,e)}
          className="w-11 h-13 text-center text-lg font-bold rounded-xl focus:outline-none"
          style={{background:'#fff',border:`1.5px solid ${d?'#F59E0B':'#E2F1FC'}`,color:'#333'}}/>)}
      </div>
      <button type="button" onClick={verify} disabled={parentLoading||otp.join('').length!==6}
        className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
        style={{background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}>
        {parentLoading?'Verifying...':'Verify & Submit'}
      </button>
      <div className="text-center">
        {countdown>0?<p className="text-xs text-gray-400">Resend in {countdown}s</p>
        :<button type="button" onClick={resend} disabled={parentLoading} className="text-xs font-bold hover:underline"style={{color:'#29A9DF'}}>Resend OTP</button>}
      </div>
    </div>
  );
}

function ProjectFormsSection({projectName}:{projectName:string}){
  const[activeForm,setActiveForm]=useState<'none'|'enquire'|'visit'>('none');
  const[enquiryDone,setEnquiryDone]=useState(false);
  const[visitDone,setVisitDone]=useState(false);

  return(
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6" id="enquire">
      {/* Buttons */}
      {activeForm==='none'&&!enquiryDone&&!visitDone&&(
        <div className="flex flex-col md:flex-row gap-4">
          <button onClick={()=>setActiveForm('enquire')} className="flex-1 py-4 rounded-2xl font-bold text-white text-lg transition-all hover:opacity-90"
            style={{background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}>Enquire Now</button>
          <button onClick={()=>setActiveForm('visit')} className="flex-1 py-4 rounded-2xl font-bold text-lg border-2 transition-all hover:bg-blue-50"
            style={{borderColor:'#2A3887',color:'#2A3887'}}>📅 Book Site Visit</button>
        </div>
      )}

      {/* Thank You — Enquiry */}
      {enquiryDone&&(
        <div className="rounded-3xl p-10 text-center"style={{background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)'}}>
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Thank You for Your Interest!</h3>
          <p className="text-gray-600 mb-1">We've received your enquiry about <strong>{projectName}</strong>.</p>
          <p className="text-gray-500 text-sm">Our sales team will get back to you within 24 hours.</p>
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={()=>{setEnquiryDone(false);setActiveForm('visit');}} className="px-6 py-2.5 rounded-full font-bold text-sm border-2"style={{borderColor:'#2A3887',color:'#2A3887'}}>📅 Book a Site Visit</button>
            <Link href="/units" className="px-6 py-2.5 rounded-full font-bold text-sm text-white"style={{background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}>Browse Units →</Link>
          </div>
        </div>
      )}

      {/* Thank You — Site Visit */}
      {visitDone&&(
        <div className="rounded-3xl p-10 text-center"style={{background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)'}}>
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Site Visit Confirmed!</h3>
          <p className="text-gray-600 mb-1">Thank you! Your visit to <strong>{projectName}</strong> has been scheduled.</p>
          <p className="text-gray-500 text-sm">Our team will call you to confirm the details.</p>
          <div className="flex gap-3 justify-center mt-6">
            <Link href="/" className="px-6 py-2.5 rounded-full font-bold text-sm border-2"style={{borderColor:'#2A3887',color:'#2A3887'}}>Back to Home</Link>
            <Link href="/units" className="px-6 py-2.5 rounded-full font-bold text-sm text-white"style={{background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}>Browse Units →</Link>
          </div>
        </div>
      )}

      {/* Enquiry Form */}
      {activeForm==='enquire'&&!enquiryDone&&(
        <EnquiryForm projectName={projectName} onDone={()=>{setActiveForm('none');setEnquiryDone(true);}} onCancel={()=>setActiveForm('none')}/>
      )}

      {/* Site Visit Form */}
      {activeForm==='visit'&&!visitDone&&(
        <SiteVisitForm projectName={projectName} onDone={()=>{setActiveForm('none');setVisitDone(true);}} onCancel={()=>setActiveForm('none')}/>
      )}
    </div>
  );
}

function EnquiryForm({projectName,onDone,onCancel}:{projectName:string;onDone:()=>void;onCancel:()=>void}){
  const utm=useUtmParams();
  const[form,setForm]=useState({name:'',phone:'',email:'',message:'',consent:false});
  const[errors,setErrors]=useState<Record<string,string>>({});
  const[otpPhase,setOtpPhase]=useState(false);
  const[loading,setLoading]=useState(false);
  const up=(k:string,v:any)=>{setForm(f=>({...f,[k]:v}));setErrors(e=>({...e,[k]:''}));};

  function validate(){
    const e:Record<string,string>={};
    if(!form.name.trim()||form.name.trim().length<2)e.name='Name is required (min 2 chars)';
    if(!validatePhone(form.phone))e.phone='Valid 10-digit Indian mobile required';
    if(!validateEmail(form.email))e.email='Invalid email format';
    if(!form.consent)e.consent='Consent is required';
    setErrors(e);return Object.keys(e).length===0;
  }

  function handleSubmit(e:React.FormEvent){e.preventDefault();if(!validate())return;setOtpPhase(true);}

  async function handleVerified(){
    setLoading(true);
    try{
      await fetch(`${API}/leads`,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:form.name.trim(),phone:cleanPhone(form.phone),email:form.email.trim()||undefined,
          message:form.message.trim(),source:utm.utm_source?'campaign':'project_page',
          project_interest:projectName,...utm})});
      onDone();
    }catch{setLoading(false);}
  }

  const ic='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white';
  const lc='block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide';

  return(
    <div className="rounded-3xl border p-8"style={{borderColor:'#E2F1FC',background:'#FAFCFF'}}>
      <div className="flex items-center justify-between mb-6">
        <div><h3 className="text-xl font-black"style={{color:'#262262'}}>Enquire About {projectName}</h3><p className="text-sm text-gray-500 mt-1">Fill in your details and we'll get back to you</p></div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={lc}>Name *</label>
            <input value={form.name} onChange={e=>up('name',e.target.value)} disabled={otpPhase} placeholder="Your full name"
              className={`${ic} ${errors.name?'!border-red-400':''} disabled:opacity-60 disabled:bg-gray-100`}/>
            {errors.name&&<p className="text-red-500 text-xs mt-1">{errors.name}</p>}</div>
          <div><label className={lc}>Phone *</label>
            <input value={form.phone} onChange={e=>up('phone',e.target.value)} disabled={otpPhase} placeholder="98765 43210" maxLength={13}
              className={`${ic} ${errors.phone?'!border-red-400':''} disabled:opacity-60 disabled:bg-gray-100`}/>
            {errors.phone&&<p className="text-red-500 text-xs mt-1">{errors.phone}</p>}</div>
        </div>
        <div><label className={lc}>Email</label>
          <input type="email" value={form.email} onChange={e=>up('email',e.target.value)} disabled={otpPhase} placeholder="you@email.com"
            className={`${ic} ${errors.email?'!border-red-400':''} disabled:opacity-60 disabled:bg-gray-100`}/>
          {errors.email&&<p className="text-red-500 text-xs mt-1">{errors.email}</p>}</div>
        <div><label className={lc}>Message</label>
          <textarea rows={3} value={form.message} onChange={e=>up('message',e.target.value)} disabled={otpPhase} placeholder="I'm interested in..."
            className={`${ic} resize-none disabled:opacity-60 disabled:bg-gray-100`}/></div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.consent} onChange={e=>up('consent',e.target.checked)} disabled={otpPhase} className="mt-0.5 w-4 h-4 accent-amber-500"/>
          <span className={`text-xs leading-relaxed ${errors.consent?'text-red-500':'text-gray-500'}`}>I consent to Janapriya contacting me via phone calls, SMS, WhatsApp, and email regarding property updates and enquiry follow-ups.</span>
        </label>
        {errors.consent&&<p className="text-red-500 text-xs ml-7">{errors.consent}</p>}

        {otpPhase
          ?<InlineOtp phone={form.phone} onVerified={handleVerified} loading={loading} setLoading={setLoading}/>
          :<button type="submit" className="w-full py-3.5 rounded-xl font-bold text-white text-sm"
              style={{background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}>Submit Enquiry</button>}
      </form>
    </div>
  );
}

function SiteVisitForm({projectName,onDone,onCancel}:{projectName:string;onDone:()=>void;onCancel:()=>void}){
  const utm=useUtmParams();
  const[form,setForm]=useState({name:'',phone:'',email:'',visit_date:'',visit_time:'',notes:'',consent:false});
  const[errors,setErrors]=useState<Record<string,string>>({});
  const[otpPhase,setOtpPhase]=useState(false);
  const[loading,setLoading]=useState(false);
  const up=(k:string,v:any)=>{setForm(f=>({...f,[k]:v}));setErrors(e=>({...e,[k]:''}));};

  function validate(){
    const e:Record<string,string>={};
    if(!form.name.trim()||form.name.trim().length<2)e.name='Name is required (min 2 chars)';
    if(!validatePhone(form.phone))e.phone='Valid 10-digit Indian mobile required';
    if(!validateEmail(form.email))e.email='Invalid email format';
    if(!form.visit_date)e.visit_date='Select a date';
    if(!form.visit_time)e.visit_time='Select a time slot';
    if(!form.consent)e.consent='Consent is required';
    setErrors(e);return Object.keys(e).length===0;
  }

  function handleSubmit(e:React.FormEvent){e.preventDefault();if(!validate())return;setOtpPhase(true);}

  async function handleVerified(){
    setLoading(true);
    try{
      const api=(await import('@/lib/api')).default;
      await api.post('/site-visits',{name:form.name.trim(),phone:cleanPhone(form.phone),
        email:form.email.trim()||undefined,visit_date:new Date(form.visit_date).toISOString(),
        visit_time:form.visit_time,notes:form.notes.trim()});
      onDone();
    }catch{setLoading(false);}
  }

  const ic='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white';
  const lc='block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide';

  return(
    <div className="rounded-3xl border p-8"style={{borderColor:'#E2F1FC',background:'#FAFCFF'}}>
      <div className="flex items-center justify-between mb-6">
        <div><h3 className="text-xl font-black"style={{color:'#262262'}}>📅 Book a Site Visit — {projectName}</h3><p className="text-sm text-gray-500 mt-1">Pick a date and time that works for you</p></div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={lc}>Name *</label>
            <input value={form.name} onChange={e=>up('name',e.target.value)} disabled={otpPhase} placeholder="Your full name"
              className={`${ic} ${errors.name?'!border-red-400':''} disabled:opacity-60 disabled:bg-gray-100`}/>
            {errors.name&&<p className="text-red-500 text-xs mt-1">{errors.name}</p>}</div>
          <div><label className={lc}>Phone *</label>
            <input value={form.phone} onChange={e=>up('phone',e.target.value)} disabled={otpPhase} placeholder="98765 43210" maxLength={13}
              className={`${ic} ${errors.phone?'!border-red-400':''} disabled:opacity-60 disabled:bg-gray-100`}/>
            {errors.phone&&<p className="text-red-500 text-xs mt-1">{errors.phone}</p>}</div>
        </div>
        <div><label className={lc}>Email</label>
          <input type="email" value={form.email} onChange={e=>up('email',e.target.value)} disabled={otpPhase} placeholder="you@email.com"
            className={`${ic} ${errors.email?'!border-red-400':''} disabled:opacity-60 disabled:bg-gray-100`}/>
          {errors.email&&<p className="text-red-500 text-xs mt-1">{errors.email}</p>}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={lc}>Preferred Date *</label>
            <input type="date" min={MIN_DATE} value={form.visit_date} onChange={e=>up('visit_date',e.target.value)} disabled={otpPhase}
              className={`${ic} ${errors.visit_date?'!border-red-400':''} disabled:opacity-60 disabled:bg-gray-100`}/>
            {errors.visit_date&&<p className="text-red-500 text-xs mt-1">{errors.visit_date}</p>}</div>
          <div><label className={`${lc} mb-2`}>Preferred Time *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TIME_SLOTS.map(s=><button key={s} type="button" disabled={otpPhase}
                onClick={()=>up('visit_time',s)}
                className={`py-2 px-2 rounded-lg text-xs border transition-colors disabled:opacity-60 ${form.visit_time===s?'text-white font-bold':'text-gray-600 hover:border-blue-400'}`}
                style={form.visit_time===s?{background:'#2A3887',borderColor:'#2A3887'}:{borderColor:'#e2e8f0'}}>{s}</button>)}
            </div>
            {errors.visit_time&&<p className="text-red-500 text-xs mt-1">{errors.visit_time}</p>}</div>
        </div>
        <div><label className={lc}>What are you looking for?</label>
          <textarea rows={2} value={form.notes} onChange={e=>up('notes',e.target.value)} disabled={otpPhase} placeholder="e.g. 2BHK, east facing, budget 60L..."
            className={`${ic} resize-none disabled:opacity-60 disabled:bg-gray-100`}/></div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.consent} onChange={e=>up('consent',e.target.checked)} disabled={otpPhase} className="mt-0.5 w-4 h-4 accent-amber-500"/>
          <span className={`text-xs leading-relaxed ${errors.consent?'text-red-500':'text-gray-500'}`}>I consent to Janapriya contacting me via phone calls, SMS, WhatsApp, and email regarding my site visit and property updates.</span>
        </label>
        {errors.consent&&<p className="text-red-500 text-xs ml-7">{errors.consent}</p>}

        {otpPhase
          ?<InlineOtp phone={form.phone} onVerified={handleVerified} loading={loading} setLoading={setLoading}/>
          :<button type="submit" className="w-full py-3.5 rounded-xl font-bold text-white text-sm"
              style={{background:'linear-gradient(135deg,#2A3887,#29A9DF)'}}>📅 Confirm Site Visit</button>}
      </form>
    </div>
  );
}
