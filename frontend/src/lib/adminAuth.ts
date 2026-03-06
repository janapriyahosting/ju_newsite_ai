import { create } from 'zustand';

interface AdminState {
  token: string | null;
  username: string | null;
  role: string | null;
  fullName: string | null;
  setAdmin: (token: string, username: string, role: string, fullName: string) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null,
  username: typeof window !== 'undefined' ? localStorage.getItem('admin_username') : null,
  role: typeof window !== 'undefined' ? localStorage.getItem('admin_role') : null,
  fullName: typeof window !== 'undefined' ? localStorage.getItem('admin_fullname') : null,
  setAdmin: (token, username, role, fullName) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_username', username);
    localStorage.setItem('admin_role', role);
    localStorage.setItem('admin_fullname', fullName);
    set({ token, username, role, fullName });
  },
  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_fullname');
    set({ token: null, username: null, role: null, fullName: null });
  },
}));

export const adminApi = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login';
  }
  return res;
};
