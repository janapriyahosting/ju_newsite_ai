"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://173.168.0.81:8000/api/v1";

function fmt(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

export default function ProjectDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"units"|"amenities">("overview");
  const [enquireOpen, setEnquireOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      try {
        // Fetch all projects and find by slug
        const res = await fetch(`${API}/projects?limit=50`);
        const data = await res.json();
        const proj = (data.items || []).find((p: any) => p.slug === slug);
        if (!proj) { router.push("/projects"); return; }
        setProject(proj);
        // Fetch units for this project
        const uRes = await fetch(`${API}/units?project_id=${proj.id}&limit=100`);
        const uData = await uRes.json();
        setUnits(uData.items || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{fontFamily:"'Lato',sans-serif"}}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4" style={{borderColor:"#29A9DF",borderTopColor:"transparent"}}/>
        <p style={{color:"#666"}}>Loading project details...</p>
      </div>
    </div>
  );

  if (!project) return null;

  const priceRange = units.length > 0 ? {
    min: Math.min(...units.map((u:any) => u.price || 0).filter(Boolean)),
    max: Math.max(...units.map((u:any) => u.price || 0).filter(Boolean)),
  } : null;

  const unitTypes = [...new Set(units.map((u:any) => u.unit_type).filter(Boolean))];
  const STATUS_COLOR: Record<string,{bg:string;color:string}> = {
    available:   {bg:"#DCFCE7", color:"#16A34A"},
    booked:      {bg:"#FEE2E2", color:"#DC2626"},
    hold:        {bg:"#FEF3C7", color:"#D97706"},
    sold:        {bg:"#F0F4FF", color:"#2A3887"},
  };

  return (
    <div style={{fontFamily:"'Lato',sans-serif", minHeight:"100vh", background:"#F8F9FB"}}>

      {/* Hero Banner */}
      <div style={{background:"linear-gradient(135deg,#262262 0%,#2A3887 50%,#29A9DF 100%)", minHeight:"340px", position:"relative"}}>
        {/* Back */}
        <div className="max-w-6xl mx-auto px-6 pt-6">
          <Link href="/projects" className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl"
            style={{background:"rgba(255,255,255,0.15)",color:"white",backdropFilter:"blur(8px)"}}>
            ← Back to Projects
          </Link>
        </div>
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-16">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              {project.status && (
                <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3"
                  style={{background:"rgba(255,255,255,0.2)",color:"white"}}>
                  {project.status.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
                </span>
              )}
              <h1 className="text-4xl font-black text-white mb-2">{project.name}</h1>
              <p className="text-lg mb-1" style={{color:"rgba(255,255,255,0.8)"}}>
                📍 {project.address || project.location}, {project.city}
              </p>
              {project.rera_number && (
                <p className="text-xs" style={{color:"rgba(255,255,255,0.6)"}}>RERA: {project.rera_number}</p>
              )}
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={()=>setEnquireOpen(true)}
                className="px-6 py-3 font-bold text-sm rounded-xl"
                style={{background:"white",color:"#262262"}}>
                📋 Enquire Now
              </button>
              <button onClick={()=>setVisitOpen(true)}
                className="px-6 py-3 font-bold text-sm rounded-xl"
                style={{background:"rgba(255,255,255,0.15)",color:"white",border:"2px solid rgba(255,255,255,0.4)"}}>
                🏡 Site Visit
              </button>
            </div>
          </div>
          {/* Stats bar */}
          <div className="flex flex-wrap gap-6 mt-8">
            {[
              {label:"Total Units", value: units.length || "—"},
              {label:"Available", value: units.filter((u:any)=>u.status==="available").length},
              {label:"Price Range", value: priceRange && priceRange.min > 0 ? `${fmt(priceRange.min)} – ${fmt(priceRange.max)}` : "On Request"},
              {label:"Unit Types", value: unitTypes.length > 0 ? unitTypes.join(", ") : "Mixed"},
            ].map(s => (
              <div key={s.label} className="text-white">
                <p className="text-2xl font-black">{String(s.value)}</p>
                <p className="text-xs opacity-70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 flex gap-0">
          {(["overview","units","amenities"] as const).map(t => (
            <button key={t} onClick={()=>setActiveTab(t)}
              className="px-6 py-4 text-sm font-bold capitalize transition-all"
              style={activeTab===t
                ? {borderBottom:"3px solid #29A9DF",color:"#2A3887"}
                : {color:"#999",borderBottom:"3px solid transparent"}}>
              {t === "units" ? `Units (${units.length})` : t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6" style={{border:"1px solid #E2F1FC"}}>
                <h2 className="font-black text-lg mb-3" style={{color:"#262262"}}>About the Project</h2>
                <p className="text-sm leading-relaxed" style={{color:"#555"}}>{project.description || "Premium residential project by Janapriya."}</p>
              </div>
              {project.video_url && (
                <div className="bg-white rounded-2xl p-6" style={{border:"1px solid #E2F1FC"}}>
                  <h2 className="font-black text-lg mb-3" style={{color:"#262262"}}>Project Video</h2>
                  <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
                    <iframe src={project.video_url} className="w-full h-full" allowFullScreen/>
                  </div>
                </div>
              )}
              {/* Unit type summary */}
              {unitTypes.length > 0 && (
                <div className="bg-white rounded-2xl p-6" style={{border:"1px solid #E2F1FC"}}>
                  <h2 className="font-black text-lg mb-4" style={{color:"#262262"}}>Unit Configuration</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {unitTypes.map(type => {
                      const typeUnits = units.filter((u:any) => u.unit_type === type);
                      const avail = typeUnits.filter((u:any) => u.status === "available").length;
                      const prices = typeUnits.map((u:any) => u.price).filter(Boolean);
                      return (
                        <div key={type} className="p-4 rounded-xl text-center cursor-pointer transition-all hover:-translate-y-0.5"
                          style={{background:"#F0F4FF",border:"2px solid #E2F1FC"}}
                          onClick={()=>setActiveTab("units")}>
                          <p className="font-black text-lg" style={{color:"#2A3887"}}>{type}</p>
                          <p className="text-xs font-bold mt-1" style={{color:"#16A34A"}}>{avail} available</p>
                          {prices.length > 0 && (
                            <p className="text-xs mt-1" style={{color:"#888"}}>
                              {fmt(Math.min(...prices))}+
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC"}}>
                <h3 className="font-black text-sm mb-4" style={{color:"#262262"}}>Project Details</h3>
                {[
                  {label:"📍 Location", value:`${project.city}, ${project.state}`},
                  {label:"📌 Pincode", value:project.pincode},
                  {label:"🏛️ RERA No.", value:project.rera_number||"Applied"},
                  {label:"🏠 Total Units", value:units.length||"—"},
                  {label:"✅ Available", value:units.filter((u:any)=>u.status==="available").length},
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2" style={{borderBottom:"1px solid #F8F9FB"}}>
                    <span className="text-xs" style={{color:"#999"}}>{r.label}</span>
                    <span className="text-xs font-bold" style={{color:"#555"}}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC"}}>
                <h3 className="font-black text-sm mb-4" style={{color:"#262262"}}>Get in Touch</h3>
                <button onClick={()=>setEnquireOpen(true)} className="w-full py-3 font-bold text-sm text-white rounded-xl mb-2"
                  style={{background:"linear-gradient(135deg,#262262,#29A9DF)"}}>
                  📋 Send Enquiry
                </button>
                <button onClick={()=>setVisitOpen(true)} className="w-full py-3 font-bold text-sm rounded-xl"
                  style={{border:"2px solid #E2F1FC",color:"#2A3887"}}>
                  🏡 Book Site Visit
                </button>
                {project.brochure_url && (
                  <a href={project.brochure_url} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-3 font-bold text-sm text-center rounded-xl mt-2"
                    style={{border:"2px solid #E2F1FC",color:"#29A9DF"}}>
                    📄 Download Brochure
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Units Tab */}
        {activeTab === "units" && (
          <div>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h2 className="font-black text-xl" style={{color:"#262262"}}>Available Units</h2>
              <div className="flex gap-2 flex-wrap">
                {unitTypes.map(type => (
                  <span key={type} className="px-3 py-1 text-xs font-bold rounded-full cursor-pointer"
                    style={{background:"#E2F1FC",color:"#2A3887"}}>{type}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((u:any) => {
                const sc = STATUS_COLOR[u.status] || {bg:"#F0F4FF",color:"#555"};
                return (
                  <div key={u.id} className="bg-white rounded-2xl p-5 transition-all hover:-translate-y-1"
                    style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-black text-lg" style={{color:"#262262"}}>{u.unit_type || "Unit"}</p>
                        <p className="text-xs font-bold" style={{color:"#999"}}>Unit {u.unit_number || u.name || u.id.slice(0,8)}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-full capitalize" style={sc}>
                        {u.status || "available"}
                      </span>
                    </div>
                    <div className="space-y-1 mb-4">
                      {u.floor && <p className="text-xs" style={{color:"#888"}}>🏢 Floor {u.floor}</p>}
                      {u.area_sqft && <p className="text-xs" style={{color:"#888"}}>📐 {u.area_sqft} sq.ft</p>}
                      {u.facing && <p className="text-xs" style={{color:"#888"}}>🧭 {u.facing} Facing</p>}
                    </div>
                    <div className="flex items-center justify-between pt-3" style={{borderTop:"1px solid #F0F4FF"}}>
                      <p className="font-black" style={{color:"#262262"}}>
                        {u.price ? fmt(u.price) : "On Request"}
                      </p>
                      <button onClick={()=>setEnquireOpen(true)}
                        className="px-3 py-1.5 text-xs font-bold text-white rounded-lg"
                        style={{background:"linear-gradient(135deg,#2A3887,#29A9DF)"}}>
                        Enquire
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {units.length === 0 && (
              <div className="text-center py-16" style={{color:"#ccc"}}>
                <p className="text-4xl mb-3">🏠</p>
                <p className="font-bold">No units found for this project</p>
              </div>
            )}
          </div>
        )}

        {/* Amenities Tab */}
        {activeTab === "amenities" && (
          <div className="bg-white rounded-2xl p-6" style={{border:"1px solid #E2F1FC"}}>
            <h2 className="font-black text-xl mb-6" style={{color:"#262262"}}>Amenities</h2>
            {project.amenities?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {project.amenities.map((a:string, i:number) => {
                  const icons: Record<string,string> = {
                    "Swimming Pool":"🏊","Gym":"💪","Clubhouse":"🏛️","24/7 Security":"🔐",
                    "Power Backup":"⚡","Children Play Area":"🎠","Landscaped Gardens":"🌳",
                    "Parking":"🅿️","Lift":"🛗","CCTV":"📷","Water Supply":"💧","Wi-Fi":"📶",
                  };
                  const icon = Object.entries(icons).find(([k])=>a.toLowerCase().includes(k.toLowerCase()))?.[1] || "✅";
                  return (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl"
                      style={{background:"#F0F4FF",border:"1px solid #E2F1FC"}}>
                      <span className="text-2xl">{icon}</span>
                      <span className="text-sm font-bold" style={{color:"#2A3887"}}>{a}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-8" style={{color:"#ccc"}}>No amenities listed</p>
            )}
          </div>
        )}
      </div>

      {/* Enquire Modal */}
      {enquireOpen && <EnquireModal project={project} onClose={()=>setEnquireOpen(false)}/>}
      {visitOpen && <SiteVisitModal project={project} onClose={()=>setVisitOpen(false)}/>}
    </div>
  );
}

function EnquireModal({project, onClose}: {project:any; onClose:()=>void}) {
  const [form, setForm] = useState({name:"",phone:"",email:"",message:""});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await fetch(`${API}/leads`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({...form, project_id: project.id, source:"website", interest: project.name})
      });
      setSent(true);
    } catch {}
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.55)"}}>
      <div className="bg-white rounded-3xl p-7 w-full max-w-md" style={{boxShadow:"0 25px 60px rgba(0,0,0,0.25)"}}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="font-black text-xl" style={{color:"#262262"}}>Enquire About</h3>
            <p className="text-sm" style={{color:"#29A9DF"}}>{project.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        {sent ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-black text-lg" style={{color:"#16A34A"}}>Enquiry Sent!</p>
            <p className="text-sm mt-1" style={{color:"#888"}}>Our team will contact you shortly.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 font-bold text-white rounded-xl text-sm"
              style={{background:"#16A34A"}}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {[{key:"name",label:"Full Name",type:"text",ph:"Your name"},
              {key:"phone",label:"Phone",type:"tel",ph:"Mobile number"},
              {key:"email",label:"Email",type:"email",ph:"your@email.com (optional)"},
              {key:"message",label:"Message",type:"textarea",ph:"Tell us what you're looking for..."}
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-black mb-1" style={{color:"#2A3887"}}>{f.label}</label>
                {f.type==="textarea" ? (
                  <textarea rows={3} placeholder={f.ph} required={f.key==="name"||f.key==="phone"}
                    value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none resize-none"
                    style={{borderColor:"#E2F1FC"}}/>
                ) : (
                  <input type={f.type} placeholder={f.ph} required={f.key==="name"||f.key==="phone"}
                    value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none"
                    style={{borderColor:"#E2F1FC"}}/>
                )}
              </div>
            ))}
            <button type="submit" disabled={sending} className="w-full py-3 font-bold text-white text-sm rounded-xl disabled:opacity-60"
              style={{background:"linear-gradient(135deg,#262262,#29A9DF)"}}>
              {sending ? "Sending..." : "Submit Enquiry"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SiteVisitModal({project, onClose}: {project:any; onClose:()=>void}) {
  const [form, setForm] = useState({name:"",phone:"",visit_date:"",visit_time:"9:00 AM"});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await fetch(`${API}/site-visits`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({...form, project_id: project.id,
          visit_date: form.visit_date ? new Date(form.visit_date).toISOString() : null})
      });
      setSent(true);
    } catch {}
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.55)"}}>
      <div className="bg-white rounded-3xl p-7 w-full max-w-md" style={{boxShadow:"0 25px 60px rgba(0,0,0,0.25)"}}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="font-black text-xl" style={{color:"#262262"}}>Book Site Visit</h3>
            <p className="text-sm" style={{color:"#29A9DF"}}>{project.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        {sent ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🏡</div>
            <p className="font-black text-lg" style={{color:"#16A34A"}}>Visit Booked!</p>
            <p className="text-sm mt-1" style={{color:"#888"}}>We'll confirm your slot shortly.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 font-bold text-white rounded-xl text-sm"
              style={{background:"#16A34A"}}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {[{key:"name",label:"Full Name",type:"text",ph:"Your name"},
              {key:"phone",label:"Phone",type:"tel",ph:"Mobile number"},
              {key:"visit_date",label:"Preferred Date",type:"date",ph:""},
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-black mb-1" style={{color:"#2A3887"}}>{f.label}</label>
                <input type={f.type} placeholder={f.ph} required
                  value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none"
                  style={{borderColor:"#E2F1FC"}}/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-black mb-1" style={{color:"#2A3887"}}>Preferred Time</label>
              <select value={form.visit_time} onChange={e=>setForm(p=>({...p,visit_time:e.target.value}))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none"
                style={{borderColor:"#E2F1FC"}}>
                {["9:00 AM","10:00 AM","11:00 AM","12:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"].map(t=>(
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={sending} className="w-full py-3 font-bold text-white text-sm rounded-xl disabled:opacity-60"
              style={{background:"linear-gradient(135deg,#262262,#29A9DF)"}}>
              {sending ? "Booking..." : "Book Site Visit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
