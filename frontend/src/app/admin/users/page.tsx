'use client';
import { useEffect, useState } from 'react';
import { adminApi, useAdminStore } from '@/lib/adminAuth';

export default function AdminUsersPage() {
  const { role } = useAdminStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState<string|null>(null);
  const [form, setForm] = useState({ username:'', email:'', full_name:'', password:'', role:'admin' });
  const [newPass, setNewPass] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const res = await adminApi('/admin/users');
    const data = await res.json();
    setUsers(data.items || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const createUser = async () => {
    setError(''); setMsg('');
    const res = await adminApi('/admin/users', { method: 'POST', body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.detail || 'Failed to create user'); return; }
    setMsg(data.message); setShowCreate(false);
    setForm({ username:'', email:'', full_name:'', password:'', role:'admin' });
    fetchUsers();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await adminApi(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !is_active }) });
    fetchUsers();
  };

  const resetPassword = async (id: string) => {
    if (newPass.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    const res = await adminApi(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password: newPass }) });
    const data = await res.json();
    if (!res.ok) { setError(data.detail || 'Failed'); return; }
    setMsg(data.message); setShowReset(null); setNewPass('');
  };

  if (role !== 'superadmin') return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-4xl mb-3">🔐</p><p>Superadmin access required</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Admin Users</h1>
        <button onClick={() => setShowCreate(true)}
          className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm transition">
          + New Admin User
        </button>
      </div>

      {msg && <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm">{msg}</div>}
      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-semibold text-lg mb-4">Create Admin User</h2>
            <div className="space-y-3">
              {[['username','Username'],['email','Email'],['full_name','Full Name'],['password','Password']].map(([k,l]) => (
                <div key={k}>
                  <label className="text-gray-400 text-sm block mb-1">{l}</label>
                  <input type={k==='password'?'password':'text'} value={(form as any)[k]}
                    onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
                </div>
              ))}
              <div>
                <label className="text-gray-400 text-sm block mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({...f,role:e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={createUser} className="flex-1 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold py-2 rounded-lg text-sm">Create</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showReset && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-white font-semibold text-lg mb-4">Reset Password</h2>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-amber-400" />
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => resetPassword(showReset)} className="flex-1 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold py-2 rounded-lg text-sm">Reset</button>
              <button onClick={() => { setShowReset(null); setNewPass(''); setError(''); }} className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['User','Role','Status','Created','Actions'].map(h => (
                <th key={h} className="text-left text-gray-400 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center text-gray-500 py-10">Loading...</td></tr>}
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{u.full_name || u.username}</p>
                  <p className="text-gray-500 text-xs">{u.username} · {u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium
                    ${u.role==='superadmin'?'bg-purple-900/40 text-purple-300':'bg-blue-900/40 text-blue-300'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium
                    ${u.is_active?'bg-green-900/40 text-green-300':'bg-red-900/40 text-red-300'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setShowReset(u.id); setError(''); }}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded transition">
                      Reset Pass
                    </button>
                    <button onClick={() => toggleActive(u.id, u.is_active)}
                      className={`text-xs px-2 py-1 rounded transition
                        ${u.is_active?'bg-red-900/30 hover:bg-red-900/50 text-red-300':'bg-green-900/30 hover:bg-green-900/50 text-green-300'}`}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
