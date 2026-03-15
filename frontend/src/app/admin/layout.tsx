'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminStore } from '@/lib/adminAuth';

const navItems = [
  { href: '/admin/dashboard',  label: 'Dashboard',   icon: '📊' },
  { href: '/admin/analytics',  label: 'Analytics',   icon: '📈' },
  { href: '/admin/customers',  label: 'Customers',   icon: '👥' },
  { href: '/admin/leads',      label: 'Leads',       icon: '📋' },
  { href: '/admin/site-visits',label: 'Site Visits', icon: '🏡' },
  { href: '/admin/units',      label: 'Units',       icon: '🏠' },
  { href: '/admin/crud',       label: 'Data Manager',icon: '🗄️' },
  { href: '/admin/fields',     label: 'Fields',      icon: '⚙️' },
  { href: '/admin/cms',        label: 'CMS',         icon: '📄' },
{ href: '/admin/media',        label: 'Media',         icon: '🖼️' },
{ href: '/admin/sections',        label: 'Sections',         icon: '🧩' },
  { href: '/admin/users',      label: 'Admin Users', icon: '🔐' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, role, fullName, logout } = useAdminStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSidebarOpen(true);
    if (!token && pathname !== '/admin/login') router.push('/admin/login');
  }, [token, pathname]);

  if (pathname === '/admin/login') return <>{children}</>;
  if (!token) return null;

  if (!mounted) return null;
  const sidebarIsOpen = sidebarOpen ?? true;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className={`${sidebarIsOpen ? 'w-64' : 'w-16'} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 fixed h-full`}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {sidebarIsOpen && <span className="text-amber-400 font-bold text-lg">JP Admin</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white p-1 ml-auto">
            {sidebarIsOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            if (item.href === '/admin/users' && role !== 'superadmin') return null;
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm font-medium
                  ${active ? 'bg-amber-400/20 text-amber-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <span className="text-lg">{item.icon}</span>
                {sidebarIsOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-800">
          {sidebarIsOpen && (
            <div className="mb-2 px-3">
              <p className="text-white text-sm font-medium">{fullName}</p>
              <p className="text-gray-500 text-xs capitalize">{role}</p>
            </div>
          )}
          <button onClick={() => { logout(); router.push('/admin/login'); }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-red-400 transition w-full text-sm">
            <span>🚪</span>{sidebarIsOpen && 'Logout'}
          </button>
        </div>
      </aside>
      <main className={`flex-1 overflow-auto ${sidebarIsOpen ? 'ml-64' : 'ml-16'} transition-all duration-300`}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
