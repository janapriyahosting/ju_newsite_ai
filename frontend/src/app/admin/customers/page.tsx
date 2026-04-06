"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "";
function getToken(){ return typeof window!=="undefined"?localStorage.getItem("admin_token")||"":""; }
async function apiFetch(path:string){
  const r=await fetch(`${API}${path}`,{headers:{"Authorization":`Bearer ${getToken()}`}});
  if(!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
function timeAgo(iso:string){if(!iso)return"—";const d=Date.now()-new Date(iso).getTime();const m=Math.floor(d/60000),h=Math.floor(m/60),dy=Math.floor(h/24);if(dy>0)return`${dy}d ago`;if(h>0)return`${h}h ago`;if(m>0)return`${m}m ago`;return"Just now";}

export default function CustomersPage(){
  const [customers,setCustomers]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState<any>(null);
  const [stats,setStats]=useState<any>(null);

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true);
    try{
      const [c,s]=await Promise.all([
        apiFetch("/admin/customers?limit=200"),
        apiFetch("/admin/customers/stats"),
      ]);
      setCustomers(Array.isArray(c)?c:c.items||c.customers||[]);
      setStats(s);
    }catch(e){console.error(e);}
    setLoading(false);
  }

  const filtered = customers.filter(c=>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{color:"#262262"}}>Customers</h1>
          <p className="text-sm mt-0.5" style={{color:"#999"}}>All registered customer accounts</p>
        </div>
        <button onClick={load} className="px-4 py-2 text-xs font-bold rounded-xl border" style={{borderColor:"#E2F1FC",color:"#2A3887"}}>↻ Refresh</button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {label:"Total",value:stats.total_registrations??customers.length,color:"#2A3887",bg:"#E2F1FC"},
            {label:"Active",value:stats.active_customers??0,color:"#16A34A",bg:"#DCFCE7"},
            {label:"This Month",value:stats.registrations_last_30_days??0,color:"#D97706",bg:"#FEF3C7"},
            {label:"This Week",value:stats.registrations_last_7_days??0,color:"#7C3AED",bg:"#F3E8FF"},
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-2xl p-4 flex items-center gap-3" style={{border:"1px solid #E2F1FC"}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg" style={{background:s.bg,color:s.color}}>{s.value}</div>
              <p className="text-sm font-bold" style={{color:"#555"}}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Customer list */}
        <div className="lg:col-span-2 bg-white rounded-2xl" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <div className="p-4 border-b" style={{borderColor:"#F0F4FF"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search by name, email or phone..."
              className="w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none"
              style={{borderColor:"#E2F1FC"}}/>
          </div>
          {loading?(
            <div className="p-4 space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-14 rounded-xl animate-pulse" style={{background:"#F0F4FF"}}/>)}</div>
          ):(
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{borderBottom:"2px solid #E2F1FC"}}>
                    {["Customer","Phone","Joined","Last Login","Status"].map(h=>(
                      <th key={h} className="text-left py-3 px-4 font-black" style={{color:"#2A3887"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length===0?(
                    <tr><td colSpan={5} className="text-center py-10" style={{color:"#ccc"}}>No customers found</td></tr>
                  ):filtered.map((c:any)=>(
                    <tr key={c.id}
                      onClick={()=>setSelected(c)}
                      className="cursor-pointer transition-colors hover:bg-blue-50"
                      style={{borderBottom:"1px solid #F8F9FB", background: selected?.id===c.id?"#EEF2FF":""}}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-900 text-xs font-black flex-shrink-0"
                            style={{background:"linear-gradient(135deg,#2A3887,#29A9DF)"}}>
                            {c.name?.[0]?.toUpperCase()||"?"}
                          </div>
                          <div>
                            <p className="font-bold" style={{color:"#262262"}}>{c.name||"—"}</p>
                            <p style={{color:"#aaa"}}>{c.email||"—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4" style={{color:"#555"}}>{c.phone||"—"}</td>
                      <td className="py-3 px-4" style={{color:"#999"}}>{timeAgo(c.created_at)}</td>
                      <td className="py-3 px-4" style={{color:"#999"}}>{c.last_login?timeAgo(c.last_login):"Never"}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full font-bold"
                          style={c.is_active?{background:"#DCFCE7",color:"#16A34A"}:{background:"#FEE2E2",color:"#DC2626"}}>
                          {c.is_active?"Active":"Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-3 text-xs text-center" style={{color:"#aaa",borderTop:"1px solid #F0F4FF"}}>
            {filtered.length} of {customers.length} customers
          </div>
        </div>

        {/* Customer detail panel */}
        <div className="bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          {!selected?(
            <div className="h-full flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="text-4xl">👥</div>
              <p className="font-bold text-sm" style={{color:"#555"}}>Select a customer</p>
              <p className="text-xs" style={{color:"#aaa"}}>Click any row to view details</p>
            </div>
          ):(
            <CustomerDetail customer={selected} onClose={()=>setSelected(null)}/>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerDetail({customer:c, onClose}:{customer:any; onClose:()=>void}){
  const [searches,setSearches]=useState<any[]>([]);
  const [loadingSearches,setLoadingSearches]=useState(false);

  useEffect(()=>{
    if(!c?.id) return;
    setLoadingSearches(true);
    const token = typeof window!=="undefined"?localStorage.getItem("admin_token")||"":"";
    fetch(`${API}/admin/analytics?days=90`,{headers:{"Authorization":`Bearer ${token}`}})
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(d?.searches){
          const mine = d.searches.filter((s:any)=>s.customer_email===c.email||s.customer_name===c.name);
          setSearches(mine.slice(0,10));
        }
      })
      .catch(()=>{})
      .finally(()=>setLoadingSearches(false));
  },[c?.id]);

  function timeAgo(iso:string){if(!iso)return"—";const d=Date.now()-new Date(iso).getTime();const m=Math.floor(d/60000),h=Math.floor(m/60),dy=Math.floor(h/24);if(dy>0)return`${dy}d ago`;if(h>0)return`${h}h ago`;if(m>0)return`${m}m ago`;return"Just now";}

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-gray-900 text-2xl font-black"
            style={{background:"linear-gradient(135deg,#262262,#29A9DF)"}}>
            {c.name?.[0]?.toUpperCase()||"?"}
          </div>
          <div>
            <h3 className="font-black text-base" style={{color:"#262262"}}>{c.name}</h3>
            <p className="text-xs" style={{color:"#999"}}>{c.email}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-600 text-lg">✕</button>
      </div>

      <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
        style={c.is_active?{background:"#DCFCE7",color:"#16A34A"}:{background:"#FEE2E2",color:"#DC2626"}}>
        {c.is_active?"✅ Active Account":"❌ Inactive"}
      </span>

      {/* Details grid */}
      <div className="space-y-2 mb-5">
        {[
          {label:"📱 Phone",value:c.phone},
          {label:"📅 Joined",value:timeAgo(c.created_at)},
          {label:"🔐 Last Login",value:c.last_login?timeAgo(c.last_login):"Never logged in"},
          {label:"🏠 Interests",value:c.preferences||c.interests||"—"},
          {label:"💬 WhatsApp",value:c.whatsapp||c.phone||"—"},
        ].map(r=>(
          <div key={r.label} className="flex justify-between py-2" style={{borderBottom:"1px solid #F8F9FB"}}>
            <span className="text-xs" style={{color:"#999"}}>{r.label}</span>
            <span className="text-xs font-bold text-right max-w-[60%] truncate" style={{color:"#555"}}>{r.value||"—"}</span>
          </div>
        ))}
      </div>

      {/* Search history */}
      <div>
        <h4 className="font-black text-xs mb-2" style={{color:"#2A3887"}}>🔍 Search History</h4>
        {loadingSearches?(
          <div className="text-xs text-center py-4" style={{color:"#ccc"}}>Loading...</div>
        ):searches.length===0?(
          <div className="text-xs text-center py-4" style={{color:"#ccc"}}>No searches recorded yet</div>
        ):searches.map((s:any,i:number)=>(
          <div key={i} className="flex justify-between py-1.5" style={{borderBottom:"1px solid #F8F9FB"}}>
            <span className="text-xs truncate max-w-[70%]" style={{color:"#555"}}>"{s.query}"</span>
            <span className="text-xs" style={{color:"#aaa"}}>{timeAgo(s.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
