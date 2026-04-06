'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminAuth';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAdmin } = useAdminStore();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Login failed'); return; }
      setAdmin(data.access_token, data.username, data.role, data.full_name);
      router.push('/admin/dashboard');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#273b84]">Janapriya Upscale</h1>
          <p className="text-gray-500 mt-1">Admin Panel</p>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign In</h2>
          {error && <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-[#273b84]"
                placeholder="Enter username" required />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-[#273b84]"
                placeholder="Enter password" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#273b84] hover:bg-[#273b84] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
