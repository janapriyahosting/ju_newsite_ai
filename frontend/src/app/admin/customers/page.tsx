"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/adminAuth";

interface Customer {
  id: string; name: string; email: string; phone: string;
  is_active: boolean; is_verified: boolean; created_at: string;
}
interface Stats {
  total_registrations: number; active_customers: number;
  verified_customers: number; registrations_last_30_days: number;
  registrations_last_7_days: number;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resetModal, setResetModal] = useState<Customer | null>(null);
  const [newPw, setNewPw] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        adminApi("/admin/customers/stats"),
        adminApi("/admin/customers?limit=100"),
      ]);
      setStats(s as unknown as Stats);
      setCustomers(((c as any).items || []) as Customer[]);
    } catch {}
    setLoading(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetMsg("");
    if (!resetModal) return;
    try {
      const res = await adminApi(`/admin/customers/${resetModal.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ new_password: newPw }),
      }) as any;
      setResetMsg(res.message || "Password reset successfully!");
      setNewPw("");
      setTimeout(() => { setResetModal(null); setResetMsg(""); }, 2000);
    } catch (err: any) {
      setResetMsg(err.message || "Failed to reset password");
    }
  }

  async function handleToggleActive(id: string) {
    try {
      const res = await adminApi(`/admin/customers/${id}/toggle-active`, { method: "PATCH" }) as any;
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, is_active: res.is_active } : c));
    } catch {}
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const STAT_CARDS = stats ? [
    { label: "Total Registrations", value: stats.total_registrations, icon: "👥", color: "#2A3887" },
    { label: "Active Customers", value: stats.active_customers, icon: "✅", color: "#16A34A" },
    { label: "Last 30 Days", value: stats.registrations_last_30_days, icon: "📅", color: "#29A9DF" },
    { label: "This Week", value: stats.registrations_last_7_days, icon: "🔥", color: "#f59e0b" },
  ] : [];

  return (
    <div style={{ fontFamily: "'Lato',sans-serif" }}>
      <h1 className="text-2xl font-black mb-6" style={{ color: "#262262" }}>Customer Management</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5"
            style={{ border: "1px solid #E2F1FC", boxShadow: "0 2px 10px rgba(42,56,135,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-3xl font-black" style={{ color: s.color }}>{s.value ?? "—"}</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: "#555A5C" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 mb-4 flex items-center gap-3"
        style={{ border: "1px solid #E2F1FC" }}>
        <span style={{ color: "#29A9DF" }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or phone..."
          className="flex-1 text-sm focus:outline-none bg-transparent" style={{ color: "#333" }} />
        <span className="text-xs font-bold" style={{ color: "#999" }}>{filtered.length} customers</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1px solid #E2F1FC", boxShadow: "0 2px 10px rgba(42,56,135,0.06)" }}>
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading customers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ background: "#F8F9FB", borderBottom: "1px solid #E2F1FC" }}>
                  {["Customer","Email","Phone","Registered","Status","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-black" style={{ color: "#2A3887" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #F0F4FF", background: i%2===0?"white":"#FAFBFF" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>
                          {c.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-bold" style={{ color: "#2A3887" }}>{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#555" }}>{c.email}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#555" }}>{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#999" }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: c.is_active ? "#DCFCE7":"#FEE2E2", color: c.is_active?"#16A34A":"#DC2626" }}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setResetModal(c); setNewPw(""); setResetMsg(""); }}
                          className="px-3 py-1 text-xs font-bold rounded-lg"
                          style={{ background: "#E2F1FC", color: "#2A3887" }}>
                          Reset PW
                        </button>
                        <button onClick={() => handleToggleActive(c.id)}
                          className="px-3 py-1 text-xs font-bold rounded-lg"
                          style={{ background: c.is_active?"#FEE2E2":"#DCFCE7", color: c.is_active?"#DC2626":"#16A34A" }}>
                          {c.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">No customers found</div>
            )}
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 className="font-black text-lg mb-1" style={{ color: "#2A3887" }}>Reset Password</h3>
            <p style={{ color: "#555" }} className="text-sm mb-5">
              Set a new password for <strong>{resetModal.name}</strong>
            </p>
            {resetMsg && (
              <div className="mb-4 px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background: resetMsg.includes("success") ? "#F0FDF4":"#FEF2F2",
                  color: resetMsg.includes("success") ? "#16A34A":"#DC2626" }}>
                {resetMsg}
              </div>
            )}
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input type="password" required minLength={8} value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="New password (min. 8 chars)"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ background: "#F8F9FB", border: "1.5px solid #E2F1FC" }}
                onFocus={e => e.target.style.borderColor="#29A9DF"}
                onBlur={e => e.target.style.borderColor="#E2F1FC"} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setResetModal(null)}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl"
                  style={{ border: "1.5px solid #ddd", color: "#555" }}>Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl"
                  style={{ background: "linear-gradient(135deg,#2A3887,#29A9DF)" }}>Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
