"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://173.168.0.81:8000/api/v1";
function getToken() { return typeof window!=="undefined"?localStorage.getItem("admin_token")||"":""; }
async function apiFetch(path:string) {
  const r = await fetch(`${API}${path}`,{headers:{"Authorization":`Bearer ${getToken()}`}});
  if(!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
function timeAgo(iso:string){const d=Date.now()-new Date(iso).getTime();const m=Math.floor(d/60000),h=Math.floor(m/60),dy=Math.floor(h/24);if(dy>0)return`${dy}d ago`;if(h>0)return`${h}h ago`;if(m>0)return`${m}m ago`;return"Just now";}
function fmtDuration(s:number){if(s<60)return`${s}s`;if(s<3600)return`${Math.floor(s/60)}m ${s%60}s`;return`${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"searches"|"sessions">("searches");
  const [searchQ, setSearchQ] = useState("");

  useEffect(()=>{load();},[days]);

  async function load(){
    setLoading(true);
    try{ setData(await apiFetch(`/admin/analytics?days=${days}`)); }catch(e){console.error(e);}
    setLoading(false);
  }

  const filteredSearches = (data?.searches||[]).filter((s:any)=>
    !searchQ || s.query?.toLowerCase().includes(searchQ.toLowerCase()) ||
    s.customer_name?.toLowerCase().includes(searchQ.toLowerCase())
  );
  const filteredSessions = (data?.sessions||[]).filter((s:any)=>
    !searchQ || s.customer_name?.toLowerCase().includes(searchQ.toLowerCase()) ||
    s.page_path?.toLowerCase().includes(searchQ.toLowerCase())
  );

  const SUMMARY = data ? [
    {label:"Total Searches",value:data.summary.total_searches,icon:"🔍",color:"#2A3887",bg:"#E2F1FC"},
    {label:"Visitor Sessions",value:data.summary.total_sessions,icon:"👤",color:"#7C3AED",bg:"#F3E8FF"},
    {label:"Customer Sessions",value:data.summary.customer_sessions,icon:"✅",color:"#16A34A",bg:"#DCFCE7"},
    {label:"Avg Time on Site",value:fmtDuration(data.summary.avg_duration_seconds),icon:"⏱",color:"#D97706",bg:"#FEF3C7"},
  ] : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{color:"#262262"}}>Visitor Analytics</h1>
          <p className="text-sm mt-0.5" style={{color:"#999"}}>Search behaviour, sessions & time on site</p>
        </div>
        <div className="flex gap-3 items-center">
          <select value={days} onChange={e=>setDays(Number(e.target.value))}
            className="px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none"
            style={{borderColor:"#E2F1FC",color:"#2A3887",background:"white"}}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load} className="px-4 py-2 text-xs font-bold rounded-xl border" style={{borderColor:"#E2F1FC",color:"#2A3887"}}>↻ Refresh</button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {loading?[...Array(4)].map((_,i)=><div key={i} className="h-24 rounded-2xl animate-pulse" style={{background:"#E2F1FC"}}/>)
        :SUMMARY.map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-4 flex items-center gap-3"
            style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{background:s.bg}}>{s.icon}</div>
            <div>
              <p className="text-2xl font-black" style={{color:s.color}}>{s.value}</p>
              <p className="text-xs font-bold" style={{color:"#777"}}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Top Search Queries */}
        <div className="bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <h2 className="font-black text-sm mb-4" style={{color:"#262262"}}>🔥 Top Search Queries</h2>
          {!data?.top_queries?.length?(
            <p className="text-xs text-center py-6" style={{color:"#ccc"}}>No searches yet</p>
          ):data.top_queries.map((q:any,i:number)=>{
            const max = data.top_queries[0]?.count||1;
            const pct = Math.round((q.count/max)*100);
            const colors=["#2A3887","#29A9DF","#D97706","#16A34A","#7C3AED","#DB2777","#0891B2","#059669","#DC2626","#555"];
            return(
              <div key={i} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold truncate max-w-[70%]" style={{color:"#555"}}>{q.query}</span>
                  <span className="font-black" style={{color:colors[i]}}>{q.count}x</span>
                </div>
                <div className="h-1.5 rounded-full" style={{background:"#F0F4FF"}}>
                  <div className="h-full rounded-full" style={{width:`${pct}%`,background:colors[i]}}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Daily Search Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
          <h2 className="font-black text-sm mb-4" style={{color:"#262262"}}>📊 Daily Search Activity</h2>
          {!data?.daily_searches?.length?(
            <div className="h-36 flex flex-col items-center justify-center" style={{color:"#ccc"}}>
              <div className="text-3xl mb-2">📈</div><p className="text-xs">No data yet</p>
            </div>
          ):(() => {
            const max = Math.max(...data.daily_searches.map((d:any)=>d.count),1);
            return(
              <div className="flex items-end gap-1 h-36">
                {data.daily_searches.map((d:any,i:number)=>{
                  const pct=Math.max((d.count/max)*100,4);
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
            );
          })()}
        </div>
      </div>

      {/* Tab: Searches / Sessions */}
      <div className="bg-white rounded-2xl" style={{border:"1px solid #E2F1FC",boxShadow:"0 2px 10px rgba(42,56,135,0.06)"}}>
        {/* Tab bar + search */}
        <div className="flex items-center justify-between p-5 pb-0 flex-wrap gap-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{background:"#F0F4FF"}}>
            {(["searches","sessions"] as const).map(t=>(
              <button key={t} onClick={()=>{setTab(t);setSearchQ("");}}
                className="px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all"
                style={tab===t?{background:"white",color:"#2A3887",boxShadow:"0 1px 6px rgba(0,0,0,0.1)"}:{color:"#999"}}>
                {t==="searches"?`🔍 Search Logs (${data?.searches?.length||0})`:`👤 Sessions (${data?.sessions?.length||0})`}
              </button>
            ))}
          </div>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
            placeholder={tab==="searches"?"Filter by query or customer...":"Filter by customer or page..."}
            className="px-3 py-2 text-xs rounded-xl border focus:outline-none"
            style={{borderColor:"#E2F1FC",minWidth:"220px"}}/>
        </div>

        <div className="p-5">
          {loading?(
            <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="h-10 rounded-xl animate-pulse" style={{background:"#F0F4FF"}}/>)}</div>
          ) : tab==="searches" ? (
            <>
              {/* Search logs table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{borderBottom:"2px solid #E2F1FC"}}>
                      {["Time","Query","Customer","Results","Type"].map(h=>(
                        <th key={h} className="text-left py-2 px-3 font-black" style={{color:"#2A3887"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSearches.length===0?(
                      <tr><td colSpan={5} className="text-center py-10" style={{color:"#ccc"}}>No searches found</td></tr>
                    ):filteredSearches.map((s:any,i:number)=>(
                      <tr key={i} style={{borderBottom:"1px solid #F8F9FB"}} className="hover:bg-blue-50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap" style={{color:"#999"}}>{s.created_at?timeAgo(s.created_at):"—"}</td>
                        <td className="py-2.5 px-3 max-w-[250px]">
                          <span className="font-bold" style={{color:"#262262"}}>{s.query||"—"}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          {s.customer_name?(
                            <div>
                              <p className="font-bold" style={{color:"#2A3887"}}>{s.customer_name}</p>
                              <p style={{color:"#aaa"}}>{s.customer_email}</p>
                            </div>
                          ):(
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{background:"#F0F4FF",color:"#999"}}>Guest</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold" style={{color:"#29A9DF"}}>{s.results_count||0}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full font-bold" style={{background:"#E2F1FC",color:"#2A3887"}}>NLP</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* Sessions table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{borderBottom:"2px solid #E2F1FC"}}>
                      {["Last Seen","Customer/Visitor","Last Page","Duration","Pages","Type"].map(h=>(
                        <th key={h} className="text-left py-2 px-3 font-black" style={{color:"#2A3887"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.length===0?(
                      <tr><td colSpan={6} className="text-center py-10" style={{color:"#ccc"}}>
                        No sessions yet — will populate as visitors browse the site
                      </td></tr>
                    ):filteredSessions.map((s:any,i:number)=>(
                      <tr key={i} style={{borderBottom:"1px solid #F8F9FB"}} className="hover:bg-blue-50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap" style={{color:"#999"}}>{s.last_seen_at?timeAgo(s.last_seen_at):"—"}</td>
                        <td className="py-2.5 px-3">
                          {s.customer_name?(
                            <div>
                              <p className="font-bold" style={{color:"#2A3887"}}>{s.customer_name}</p>
                              <p style={{color:"#aaa"}}>{s.customer_email}</p>
                            </div>
                          ):(
                            <span className="font-medium" style={{color:"#777"}}>Anonymous Visitor</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-[180px]">
                          <span className="truncate block font-mono" style={{color:"#555",fontSize:"10px"}}>{s.page_path||"/"}</span>
                        </td>
                        <td className="py-2.5 px-3 font-bold" style={{color:"#D97706"}}>{fmtDuration(s.duration_seconds||0)}</td>
                        <td className="py-2.5 px-3 font-bold" style={{color:"#29A9DF"}}>{s.page_views||1}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full font-bold"
                            style={s.is_customer?{background:"#DCFCE7",color:"#16A34A"}:{background:"#F0F4FF",color:"#777"}}>
                            {s.is_customer?"Customer":"Visitor"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
