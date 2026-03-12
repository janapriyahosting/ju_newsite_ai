"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/adminAuth";
import Link from "next/link";

interface AdminStats {
  units: {total:number; available:number; booked:number; hold:number};
  leads: {total:number; new:number; this_week:number};
  visits: {total:number; pending:number};
  bookings: {total:number};
  customers: {total:number};
  projects: {total:number};
  searches: {total:number; this_week:number};
  leads_by_source: {source:string; count:number}[];
  units_by_type: {type:string; count:number}[];
  leads_by_status: Record<string,number>;
  site_visits_by_status: Record<string,number>;
  recent_leads: any[];
  recent_visits: any[];
}
interface RecentLogin { id:string; name:string; email:string; last_login:string; is_active:boolean; }
interface ChartDay { date:string; count:number; }

function timeAgo(iso:string) {
  const diff=Date.now()-new Date(iso).getTime();
  const m=Math.floor(diff/60000),h=Math.floor(m/60),d=Math.floor(h/24);
  if(d>0)return`${d}d ago`;if(h>0)return`${h}h ago`;if(m>0)return`${m}m ago`;return"Just now";
}
function fmt(n:number){if(n>=10000000)return`₹${(n/10000000).toFixed(1)}Cr`;if(n>=100000)return`₹${(n/100000).toFixed(1)}L`;return`₹${n.toLocaleString()}`;}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats|null>(null);
  const [logins, setLogins] = useState<RecentLogin[]>([]);
  const [chart, setChart] = useState<ChartDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({current:"",newPw:"",confirm:""});
  const [pwMsg, setPwMsg] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(()=>{loadAll();},[]);

  async function loadAll(){
    setLoading(true);
    const [s, lg, ch] = await Promise.allSettled([
      adminApi("/admin/stats"),
      adminApi("/admin/customers/recent-logins?limit=8"),
      adminApi("/admin/customers/registrations/chart?days=30"),
    ]);
    if(s.status==="fulfilled") setStats(s.value as unknown as AdminStats);
    if(lg.status==="fulfilled"){const v=lg.value as any;setLogins(Array.isArray(v)?v:[]);}
    if(ch.status==="fulfilled"){const v=ch.value as any;setChart(Array.isArray(v)?v:[]);}
    setLoading(false);
  }

  async function handleChangePw(e:React.FormEvent){
    e.preventDefault();
    if(pwForm.newPw!==pwForm.confirm){setPwMsg("❌ Passwords don't match");return;}
    if(pwForm.newPw.length<8){setPwMsg("❌ Minimum 8 characters");return;}
    setPwSaving(true);setPwMsg("");
    try{
      await adminApi("/admin/change-password",{method:"POST",body:JSON.stringify({current_password:pwForm.current,new_password:pwForm.newPw})});
      setPwMsg("✅ Password changed successfully!");
      setPwForm({current:"",newPw:"",confirm:""});
      setTimeout(()=>{setPwModal(false);setPwMsg("");},2000);
    }catch(err:any){setPwMsg("❌ "+(err.message||"Incorrect current password"));}
    setPwSaving(false);
  }

  const chartMax=chart.length>0?Math.max(...chart.map(d=>d.count),1):1;

  const MAIN_TILES = stats ? [
    {label:"Total Customers",value:stats.customers?.total??0,sub:"registered users",icon:"👥",color:"#2A3887",bg:"#E2F1FC"},
    {label:"Total Leads",value:stats.leads?.total??0,sub:`${stats.leads?.this_week??0} this week`,icon:"📋",color:"#D97706",bg:"#FEF3C7"},
    {label:"Site Visits",value:stats.visits?.total??0,sub:`${stats.visits?.pending??0} pending`,icon:"🏡",color:"#7C3AED",bg:"#F3E8FF"},
    {label:"Bookings",value:stats.bookings?.total??0,sub:"confirmed bookings",icon:"📅",color:"#DB2777",bg:"#FCE7F3"},
    {label:"Total Units",value:stats.units?.total??0,sub:`${stats.units?.available??0} available`,icon:"🏠",color:"#0891B2",bg:"#E0F7FF"},
    {label:"Available Units",value:stats.units?.available??0,sub:`${stats.units?.booked??0} booked`,icon:"🔑",color:"#29A9DF",bg:"#E0F7FF"},
    {label:"Projects",value:stats.projects?.total??0,sub:"active projects",icon:"🏗️",color:"#16A34A",bg:"#DCFCE7"},
    {label:"Searches (7d)",value:stats.searches?.this_week??0,sub:`${stats.searches?.total??0} total`,icon:"🔍",color:"#059669",bg:"#D1FAE5"},
  ] : [];

  const QUICK=[
    {href:"/admin/customers",icon:"👥",label:"Customers",desc:"Manage registrations"},
    {href:"/admin/crud",icon:"🏠",label:"Properties",desc:"Units & projects"},
    {href:"/admin/fields",icon:"⚙",label:"Fields",desc:"Custom field config"},
    {href:"/admin/cms",icon:"📄",label:"CMS",desc:"Pages & content"},
  ];

  const Skeleton = ()=><div className="h-24 rounded-2xl animate-pulse" style={{background:"#E2F1FC"}}/>;

  return (
    <div style={{fontFamily:"'Lato',sans-serif"}}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
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

      {/* Main 8 stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {loading?[...Array(8)].map((_,i)=><Skeleton key={i}/>)
        :MAIN_TILES.map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-4 flex items-center gap-3"
            style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{background:s.bg}}>{s.icon}</div>
            <div className="min-w-0">
              <p className="text-xl font-black leading-none" style={{color:s.color}}>{s.value}</p>
              <p className="text-xs font-bold truncate mt-0.5" style={{color:"#555"}}>{s.label}</p>
              <p className="text-xs truncate" style={{color:"#aaa"}}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Chart + Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Registration Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-black text-sm" style={{color:"#262262"}}>New Customer Registrations</h2>
              <p className="text-xs" style={{color:"#999"}}>Last 30 days</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{background:"#E2F1FC",color:"#2A3887"}}>{chart.reduce((s,d)=>s+d.count,0)} total</span>
          </div>
          {chart.length===0?(
            <div className="h-36 flex flex-col items-center justify-center gap-2" style={{color:"#ccc"}}>
              <div className="text-3xl">📊</div><p className="text-xs">No registration data yet</p>
            </div>
          ):(
            <div className="flex items-end gap-0.5 h-36">
              {chart.map((d,i)=>{
                const pct=Math.max((d.count/chartMax)*100,5);
                const lbl=new Date(d.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
                return(
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                      <div className="px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap" style={{background:"#2A3887"}}>{d.count} · {lbl}</div>
                      <div className="w-2 h-2 rotate-45 -mt-1" style={{background:"#2A3887"}}/>
                    </div>
                    <div className="w-full rounded-t" style={{height:`${pct}%`,background:"linear-gradient(180deg,#29A9DF,#2A3887)",minHeight:"3px"}}/>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <h2 className="font-black text-sm mb-4" style={{color:"#262262"}}>Quick Access</h2>
          <div className="space-y-2">
            {QUICK.map(q=>(
              <Link key={q.href} href={q.href} className="flex items-center gap-3 p-3 rounded-xl transition-all hover:-translate-y-0.5" style={{background:"#F8F9FB",border:"1px solid #E2F1FC"}}>
                <span className="text-lg w-7 text-center">{q.icon}</span>
                <div><p className="font-bold text-sm" style={{color:"#2A3887"}}>{q.label}</p><p className="text-xs" style={{color:"#999"}}>{q.desc}</p></div>
                <span className="ml-auto text-xs" style={{color:"#ccc"}}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Leads by Source + Units by Type + Visits by Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        {/* Leads by Source */}
        <div className="bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <h2 className="font-black text-sm mb-4" style={{color:"#262262"}}>Leads by Source</h2>
          {!stats||!(stats.leads_by_source?.length)?(
            <p className="text-xs text-center py-6" style={{color:"#ccc"}}>No leads data yet</p>
          ):(
            <div className="space-y-2">
              {stats.leads_by_source.slice(0,6).map((s,i)=>{
                const total=stats.leads_by_source.reduce((a,b)=>a+b.count,0);
                const pct=total>0?Math.round((s.count/total)*100):0;
                const colors=["#2A3887","#29A9DF","#D97706","#16A34A","#7C3AED","#DB2777"];
                return(
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold capitalize" style={{color:"#555"}}>{s.source||"direct"}</span>
                      <span className="font-bold" style={{color:colors[i%colors.length]}}>{s.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{background:"#F0F4FF"}}>
                      <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:colors[i%colors.length]}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Units by Type */}
        <div className="bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <h2 className="font-black text-sm mb-4" style={{color:"#262262"}}>Units by Type</h2>
          {!stats||!stats.units_by_type?.length?(
            <p className="text-xs text-center py-6" style={{color:"#ccc"}}>No units data yet</p>
          ):(
            <div className="space-y-2">
              {(stats.units_by_type||[]).map((u,i)=>{
                const total=(stats.units_by_type||[]).reduce((a,b)=>a+b.count,0);
                const pct=total>0?Math.round((u.count/total)*100):0;
                const colors=["#2A3887","#29A9DF","#D97706","#16A34A","#7C3AED","#DB2777"];
                return(
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold" style={{color:"#555"}}>{u.type||"Unknown"}</span>
                      <span className="font-bold" style={{color:colors[i%colors.length]}}>{u.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{background:"#F0F4FF"}}>
                      <div className="h-full rounded-full" style={{width:`${pct}%`,background:colors[i%colors.length]}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visits by Status */}
        <div className="bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <h2 className="font-black text-sm mb-4" style={{color:"#262262"}}>Site Visits by Status</h2>
          {!stats||!stats.site_visits_by_status||Object.keys(stats.site_visits_by_status||{}).length===0?(
            <p className="text-xs text-center py-6" style={{color:"#ccc"}}>No visit data yet</p>
          ):(
            <div className="space-y-3">
              {Object.entries(stats.site_visits_by_status).map(([status,count],i)=>{
                const statusColors:Record<string,{bg:string,color:string}>={
                  scheduled:{bg:"#FEF3C7",color:"#D97706"},
                  confirmed:{bg:"#DCFCE7",color:"#16A34A"},
                  completed:{bg:"#E2F1FC",color:"#2A3887"},
                  cancelled:{bg:"#FEE2E2",color:"#DC2626"},
                };
                const sc=statusColors[status]||{bg:"#F0F4FF",color:"#555"};
                return(
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl" style={{background:sc.bg}}>
                    <span className="text-xs font-bold capitalize" style={{color:sc.color}}>{status}</span>
                    <span className="text-lg font-black" style={{color:sc.color}}>{count as number}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Recent Logins + Leads by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Logins */}
        <div className="bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-black text-sm" style={{color:"#262262"}}>Recent Customer Logins</h2>
              <p className="text-xs" style={{color:"#999"}}>Customer portal activity</p>
            </div>
            <Link href="/admin/customers" className="text-xs font-bold" style={{color:"#29A9DF"}}>All →</Link>
          </div>
          {logins.length===0?(
            <div className="py-8 text-center flex flex-col items-center gap-2" style={{color:"#ccc"}}>
              <div className="text-2xl">🔐</div>
              <p className="text-xs">No logins recorded yet — tracked automatically when customers sign in</p>
            </div>
          ):logins.map((u,i)=>(
            <div key={i} className="flex items-center gap-3 py-2" style={{borderBottom:"1px solid #F0F4FF"}}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{background:"linear-gradient(135deg,#2A3887,#29A9DF)"}}>
                {u.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs truncate" style={{color:"#2A3887"}}>{u.name}</p>
                <p className="text-xs truncate" style={{color:"#aaa"}}>{u.email}</p>
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

        {/* Leads by Status */}
        <div className="bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <h2 className="font-black text-sm mb-4" style={{color:"#262262"}}>Leads by Status</h2>
          {!stats||!stats.leads_by_status||Object.keys(stats.leads_by_status||{}).length===0?(
            <p className="text-xs text-center py-8" style={{color:"#ccc"}}>No leads yet</p>
          ):(
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(stats.leads_by_status).map(([status,count],i)=>{
                const statusColors:Record<string,{bg:string,color:string}>={
                  new:{bg:"#E2F1FC",color:"#2A3887"},
                  contacted:{bg:"#FEF3C7",color:"#D97706"},
                  qualified:{bg:"#D1FAE5",color:"#059669"},
                  converted:{bg:"#DCFCE7",color:"#16A34A"},
                  lost:{bg:"#FEE2E2",color:"#DC2626"},
                  followup:{bg:"#F3E8FF",color:"#7C3AED"},
                };
                const sc=statusColors[status]||{bg:"#F0F4FF",color:"#555"};
                return(
                  <div key={i} className="rounded-2xl p-4 text-center" style={{background:sc.bg}}>
                    <p className="text-2xl font-black" style={{color:sc.color}}>{count as number}</p>
                    <p className="text-xs font-bold capitalize mt-1" style={{color:sc.color}}>{status}</p>
                  </div>
                );
              })}
            </div>
          )}
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
              <button onClick={()=>setPwModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            {pwMsg&&(
              <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
                style={{background:pwMsg.includes("✅")?"#F0FDF4":"#FEF2F2",color:pwMsg.includes("✅")?"#16A34A":"#DC2626"}}>
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
