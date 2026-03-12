"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/adminAuth";
import Link from "next/link";

interface Stats { total_registrations:number; active_customers:number; registrations_last_30_days:number; registrations_last_7_days:number; }
interface RecentLogin { id:string; name:string; email:string; phone:string; last_login:string; is_active:boolean; }
interface ChartDay { date:string; count:number; }

function timeAgo(iso:string) {
  const diff = Date.now()-new Date(iso).getTime();
  const m=Math.floor(diff/60000),h=Math.floor(m/60),d=Math.floor(h/24);
  if(d>0)return`${d}d ago`;if(h>0)return`${h}h ago`;if(m>0)return`${m}m ago`;return"Just now";
}

export default function AdminDashboard() {
  const [stats,setStats]=useState<Stats|null>(null);
  const [logins,setLogins]=useState<RecentLogin[]>([]);
  const [chart,setChart]=useState<ChartDay[]>([]);
  const [leads,setLeads]=useState<any[]>([]);
  const [visits,setVisits]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [pwModal,setPwModal]=useState(false);
  const [pwForm,setPwForm]=useState({current:"",newPw:"",confirm:""});
  const [pwMsg,setPwMsg]=useState("");
  const [pwSaving,setPwSaving]=useState(false);

  useEffect(()=>{loadAll();},[]);

  async function loadAll(){
    setLoading(true);
    const [s,lg,ch,l,v]=await Promise.allSettled([
      adminApi("/admin/customers/stats"),
      adminApi("/admin/customers/recent-logins?limit=8"),
      adminApi("/admin/customers/registrations/chart?days=30"),
      adminApi("/leads?limit=5"),
      adminApi("/site-visits?limit=5"),
    ]);
    if(s.status==="fulfilled")setStats(s.value as unknown as Stats);
    if(lg.status==="fulfilled"){const lv=lg.value as any;setLogins(Array.isArray(lv)?lv:[]);}
    if(ch.status==="fulfilled"){const cv=ch.value as any;setChart(Array.isArray(cv)?cv:[]);}
    if(l.status==="fulfilled"){const lv=l.value as any;setLeads(Array.isArray(lv)?lv:(lv?.items||[]));}
    if(v.status==="fulfilled"){const vv=v.value as any;setVisits(Array.isArray(vv)?vv:(vv?.items||[]));}
    setLoading(false);
  }

  async function handleChangePw(e:React.FormEvent){
    e.preventDefault();
    if(pwForm.newPw!==pwForm.confirm){setPwMsg("❌ Passwords don't match");return;}
    if(pwForm.newPw.length<8){setPwMsg("❌ Minimum 8 characters");return;}
    setPwSaving(true);setPwMsg("");
    try{
      await adminApi("/admin/change-password",{method:"POST",body:JSON.stringify({current_password:pwForm.current,new_password:pwForm.newPw})});
      setPwMsg("✅ Password changed!");
      setPwForm({current:"",newPw:"",confirm:""});
      setTimeout(()=>{setPwModal(false);setPwMsg("");},2000);
    }catch(err:any){setPwMsg("❌ "+(err.message||"Incorrect current password"));}
    setPwSaving(false);
  }

  const chartMax=chart.length>0?Math.max(...chart.map(d=>d.count),1):1;
  const STAT_CARDS=stats?[
    {label:"Total Customers",value:stats.total_registrations,icon:"👥",color:"#2A3887",bg:"#E2F1FC"},
    {label:"Active Customers",value:stats.active_customers,icon:"✅",color:"#16A34A",bg:"#DCFCE7"},
    {label:"Last 30 Days",value:stats.registrations_last_30_days,icon:"📅",color:"#29A9DF",bg:"#E0F7FF"},
    {label:"This Week",value:stats.registrations_last_7_days,icon:"🔥",color:"#D97706",bg:"#FEF3C7"},
  ]:[];
  const QUICK=[
    {href:"/admin/customers",icon:"👥",label:"Customers",desc:"Manage registrations"},
    {href:"/admin/crud",icon:"🏠",label:"Properties",desc:"Units & projects"},
    {href:"/admin/fields",icon:"⚙",label:"Fields",desc:"Custom field config"},
    {href:"/admin/cms",icon:"📄",label:"CMS",desc:"Pages & content"},
  ];

  return (
    <div style={{fontFamily:"'Lato',sans-serif"}}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{color:"#262262"}}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{color:"#999"}}>Welcome back — here&apos;s what&apos;s happening</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadAll} className="px-4 py-2 text-xs font-bold rounded-xl border" style={{borderColor:"#E2F1FC",color:"#2A3887"}}>↻ Refresh</button>
          <button onClick={()=>{setPwModal(true);setPwMsg("");}} className="px-4 py-2 text-xs font-bold text-white rounded-xl" style={{background:"linear-gradient(135deg,#2A3887,#29A9DF)"}}>
            🔑 Change Password
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {loading?[1,2,3,4].map(i=><div key={i} className="h-24 rounded-2xl animate-pulse" style={{background:"#E2F1FC"}}/>)
        :STAT_CARDS.map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-5 flex items-center gap-4" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{background:s.bg}}>{s.icon}</div>
            <div>
              <p className="text-2xl font-black" style={{color:s.color}}>{s.value??0}</p>
              <p className="text-xs font-semibold" style={{color:"#777"}}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-black text-base" style={{color:"#262262"}}>New Registrations</h2>
              <p className="text-xs" style={{color:"#999"}}>Last 30 days</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{background:"#E2F1FC",color:"#2A3887"}}>{chart.reduce((s,d)=>s+d.count,0)} total</span>
          </div>
          {chart.length===0?(
            <div className="h-44 flex flex-col items-center justify-center gap-2" style={{color:"#ccc"}}>
              <div className="text-4xl">📊</div><p className="text-sm">No data yet — registrations will appear here</p>
            </div>
          ):(
            <div className="flex items-end gap-1 h-44">
              {chart.map((d,i)=>{
                const pct=Math.max((d.count/chartMax)*100,5);
                const lbl=new Date(d.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
                return(
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                      <div className="px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap" style={{background:"#2A3887"}}>{d.count} · {lbl}</div>
                      <div className="w-2 h-2 rotate-45 -mt-1" style={{background:"#2A3887"}}/>
                    </div>
                    <div className="w-full rounded-t-md" style={{height:`${pct}%`,background:"linear-gradient(180deg,#29A9DF,#2A3887)",minHeight:"4px"}}/>
                    {chart.length<=14&&<span style={{color:"#ccc",fontSize:"9px"}}>{new Date(d.date).getDate()}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-2xl p-6" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <h2 className="font-black text-base mb-5" style={{color:"#262262"}}>Quick Access</h2>
          <div className="space-y-2">
            {QUICK.map(q=>(
              <Link key={q.href} href={q.href} className="flex items-center gap-3 p-3 rounded-xl transition-all hover:-translate-y-0.5" style={{background:"#F8F9FB",border:"1px solid #E2F1FC"}}>
                <span className="text-xl w-8 text-center">{q.icon}</span>
                <div><p className="font-bold text-sm" style={{color:"#2A3887"}}>{q.label}</p><p className="text-xs" style={{color:"#999"}}>{q.desc}</p></div>
                <span className="ml-auto text-xs" style={{color:"#ccc"}}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Logins */}
        <div className="bg-white rounded-2xl p-6" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-black text-base" style={{color:"#262262"}}>Recent Logins</h2>
              <p className="text-xs" style={{color:"#999"}}>Customer portal activity</p>
            </div>
            <Link href="/admin/customers" className="text-xs font-bold" style={{color:"#29A9DF"}}>All customers →</Link>
          </div>
          {logins.length===0?(
            <div className="py-10 text-center flex flex-col items-center gap-2" style={{color:"#ccc"}}>
              <div className="text-3xl">🔐</div>
              <p className="text-sm">No logins recorded yet</p>
              <p className="text-xs">Tracked automatically when customers sign in</p>
            </div>
          ):logins.map((u,i)=>(
            <div key={i} className="flex items-center gap-3 py-2.5" style={{borderBottom:"1px solid #F0F4FF"}}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{background:"linear-gradient(135deg,#2A3887,#29A9DF)"}}>
                {u.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{color:"#2A3887"}}>{u.name}</p>
                <p className="text-xs truncate" style={{color:"#999"}}>{u.email}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold" style={{color:"#29A9DF"}}>{timeAgo(u.last_login)}</p>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{background:u.is_active?"#DCFCE7":"#FEE2E2",color:u.is_active?"#16A34A":"#DC2626"}}>
                  {u.is_active?"Active":"Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Leads + Visits */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-base" style={{color:"#262262"}}>Recent Leads</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:"#E2F1FC",color:"#2A3887"}}>{leads.length}</span>
            </div>
            {leads.length===0?<p className="text-sm text-center py-6" style={{color:"#ccc"}}>No leads yet</p>
            :leads.slice(0,4).map((l:any,i:number)=>(
              <div key={i} className="flex items-center justify-between py-2" style={{borderBottom:"1px solid #F0F4FF"}}>
                <div><p className="font-bold text-sm" style={{color:"#2A3887"}}>{l.name}</p><p className="text-xs" style={{color:"#999"}}>{l.phone}</p></div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:"#FEF3C7",color:"#D97706"}}>{l.status||"new"}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-6" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-base" style={{color:"#262262"}}>Site Visits</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:"#E2F1FC",color:"#2A3887"}}>{visits.length}</span>
            </div>
            {visits.length===0?<p className="text-sm text-center py-6" style={{color:"#ccc"}}>No visits scheduled</p>
            :visits.slice(0,4).map((v:any,i:number)=>(
              <div key={i} className="flex items-center justify-between py-2" style={{borderBottom:"1px solid #F0F4FF"}}>
                <div>
                  <p className="font-bold text-sm" style={{color:"#2A3887"}}>{v.name}</p>
                  <p className="text-xs" style={{color:"#999"}}>{v.visit_date?new Date(v.visit_date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}{v.visit_time?` · ${v.visit_time}`:""}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                  background:v.status==="confirmed"?"#DCFCE7":v.status==="completed"?"#E2F1FC":"#FEF3C7",
                  color:v.status==="confirmed"?"#16A34A":v.status==="completed"?"#2A3887":"#D97706"
                }}>{v.status||"pending"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {pwModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.55)"}}>
          <div className="bg-white rounded-3xl p-7 w-full max-w-md" style={{boxShadow:"0 25px 60px rgba(0,0,0,0.25)"}}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-black text-xl" style={{color:"#262262"}}>Change Admin Password</h3>
                <p className="text-xs mt-0.5" style={{color:"#999"}}>Update your admin credentials securely</p>
              </div>
              <button onClick={()=>setPwModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            {pwMsg&&(
              <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium" style={{background:pwMsg.includes("✅")?"#F0FDF4":"#FEF2F2",color:pwMsg.includes("✅")?"#16A34A":"#DC2626"}}>
                {pwMsg}
              </div>
            )}
            <form onSubmit={handleChangePw} className="space-y-4">
              {[
                {key:"current",label:"Current Password",ph:"Enter current password"},
                {key:"newPw",label:"New Password",ph:"Minimum 8 characters"},
                {key:"confirm",label:"Confirm New Password",ph:"Repeat new password"},
              ].map(f=>(
                <div key={f.key}>
                  <label className="block text-xs font-black mb-1.5" style={{color:"#2A3887"}}>{f.label}</label>
                  <input type="password" required placeholder={f.ph}
                    value={(pwForm as any)[f.key]}
                    onChange={e=>setPwForm(p=>({...p,[f.key]:e.target.value}))}
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                    style={{background:"#F8F9FB",border:"1.5px solid #E2F1FC"}}
                    onFocus={e=>e.target.style.borderColor="#29A9DF"}
                    onBlur={e=>e.target.style.borderColor="#E2F1FC"}/>
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={()=>setPwModal(false)} className="flex-1 py-3 text-sm font-bold rounded-xl" style={{border:"1.5px solid #ddd",color:"#555"}}>Cancel</button>
                <button type="submit" disabled={pwSaving} className="flex-1 py-3 text-sm font-bold text-white rounded-xl disabled:opacity-60" style={{background:"linear-gradient(135deg,#2A3887,#29A9DF)"}}>
                  {pwSaving?"Saving...":"Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
