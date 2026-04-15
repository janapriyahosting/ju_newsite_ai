'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAdminStore } from '@/lib/adminAuth';

const navItems = [
  { href: '/admin/dashboard',  label: 'Dashboard',   icon: '📊' },
  { href: '/admin/analytics',  label: 'Analytics',   icon: '📈' },
  { href: '/admin/customers',  label: 'Customers',   icon: '👥' },
  { href: '/admin/leads',      label: 'Leads',       icon: '📋' },
  { href: '/admin/visits',label: 'Site Visits', icon: '🏡' },
  { href: '/admin/home-loan-requests', label: 'Home Loans', icon: '🏦' },
  { href: '/admin/units',      label: 'Units',       icon: '🏠' },
  { href: '/admin/crud',       label: 'Data Manager',icon: '🗄️' },
  { href: '/admin/fields',     label: 'Fields',      icon: '⚙️' },
  { href: '/admin/cms',        label: 'CMS',         icon: '📄' },
  { href: '/admin/store-filters', label: 'Store Filters', icon: '🎛️' },
  { href: '/admin/filter-links', label: 'Filter Links', icon: '🔗' },
{ href: '/admin/towers', label: 'Towers', icon: '🏛' },
        { href: '/admin/media',        label: 'Media',         icon: '🖼️' },
        { href: '/admin/media/series', label: 'Series Media',  icon: '🎞️' },
{ href: '/admin/sections',        label: 'Sections',         icon: '🧩' },
  { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/admin/assistant',   label: 'AI Assistant', icon: '🤖' },
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
    <div className="min-h-screen flex font-sans" style={{ background: '#f5f6fa' }}>
      <aside className={`${sidebarIsOpen ? 'w-64' : 'w-16'} flex flex-col transition-all duration-300 fixed h-full`}
        style={{ backgroundColor: '#273b84' }}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          {sidebarIsOpen && (
            <Image src="/logo-dark.png" alt="Janapriya" width={180} height={56} style={{ objectFit: 'contain', maxHeight: 56 }} priority />
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 ml-auto text-white/70 hover:text-white">
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
                  ${active ? 'text-white' : 'text-white/70 hover:text-white'}`}
                style={active ? { backgroundColor: 'rgba(255,255,255,0.18)' } : undefined}>
                <span className="text-lg">{item.icon}</span>
                {sidebarIsOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          {sidebarIsOpen && (
            <div className="mb-2 px-3">
              <p className="text-white text-sm font-medium">{fullName}</p>
              <p className="text-white/50 text-xs capitalize">{role}</p>
            </div>
          )}
          <button onClick={() => { logout(); router.push('/admin/login'); }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition w-full text-sm">
            <span>🚪</span>{sidebarIsOpen && 'Logout'}
          </button>
        </div>
      </aside>
      <main className={`flex-1 overflow-auto ${sidebarIsOpen ? 'ml-64' : 'ml-16'} transition-all duration-300`}
        style={{ background: '#f4f6fb' }}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
