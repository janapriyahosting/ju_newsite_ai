'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminAuth';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#F59E0B','#3B82F6','#10B981','#EF4444','#8B5CF6'];

function StatCard({ label, value, sub, color }: any) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color || 'text-white'}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi('/admin/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-gray-400 text-center py-20 text-lg">Loading dashboard...</div>;
  if (!stats) return <div className="text-red-400 text-center py-20">Failed to load stats</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Units"  value={stats.units.total}    sub={`${stats.units.available} available`}   color="text-amber-400" />
        <StatCard label="Total Leads"  value={stats.leads.total}    sub={`${stats.leads.this_week} this week`}   color="text-blue-400" />
        <StatCard label="Site Visits"  value={stats.visits.total}   sub={`${stats.visits.pending} pending`}      color="text-green-400" />
        <StatCard label="Bookings"     value={stats.bookings.total} sub={`${stats.customers.total} customers`}   color="text-purple-400" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Available" value={stats.units.available} color="text-green-400" />
        <StatCard label="Booked"    value={stats.units.booked}    color="text-red-400" />
        <StatCard label="On Hold"   value={stats.units.hold}      color="text-yellow-400" />
        <StatCard label="Searches"  value={stats.searches.total}  sub={`${stats.searches.this_week} this week`} color="text-cyan-400" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Leads by Source</h3>
          {stats.leads_by_source.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.leads_by_source}>
                <XAxis dataKey="source" stroke="#6B7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1F2937', border: 'none', color: '#fff' }} />
                <Bar dataKey="count" fill="#F59E0B" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-8">No lead data yet</p>}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Units by Type</h3>
          {stats.units_by_type.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.units_by_type} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80}
                  label={({type,count}: any) => `${type}:${count}`}>
                  {stats.units_by_type.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1F2937', border: 'none', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-8">No unit data yet</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Recent Leads</h3>
          {stats.recent_leads.length === 0 && <p className="text-gray-500 text-sm">No leads yet</p>}
          {stats.recent_leads.map((l: any) => (
            <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <p className="text-white text-sm font-medium">{l.name}</p>
                <p className="text-gray-500 text-xs">{l.interest} · {l.source || 'direct'}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium
                ${l.status==='new'?'bg-blue-900/40 text-blue-300':l.status==='converted'?'bg-green-900/40 text-green-300':'bg-gray-800 text-gray-400'}`}>
                {l.status}
              </span>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Upcoming Site Visits</h3>
          {stats.upcoming_visits.length === 0 && <p className="text-gray-500 text-sm">No upcoming visits</p>}
          {stats.upcoming_visits.map((v: any) => (
            <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <p className="text-white text-sm font-medium">{v.name}</p>
                <p className="text-gray-500 text-xs">{v.visit_date} · {v.visit_time}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-amber-900/40 text-amber-300 font-medium">{v.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
