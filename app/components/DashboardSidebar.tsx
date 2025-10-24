import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './SessionManager';

const tocLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/toc/hospital', label: 'Hospital Dashboard', icon: '🏥' },
  { href: '/toc/tasks', label: 'Tasks', icon: '📋' },
  { href: '/toc/episodes', label: 'Episodes', icon: '🏥' },
  { href: '/toc/admin/onboard', label: 'Onboard Patient', icon: '👤' },
  { href: '/toc/admin/agents', label: 'Agents', icon: '🤖' },
  { href: '/toc/admin/questions', label: 'Catalog', icon: '⚙️' },
];

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function DashboardSidebar({ active }: { active?: string }) {
  const router = useRouter();
  const { logout } = useSession();

  return (
    <aside className="h-full w-64 bg-white border-r border-gray-100 shadow-lg flex flex-col py-8 px-4">
      <div className="mb-10 text-2xl font-extrabold text-emerald-600 tracking-tight text-center">HealthX</div>
      
      <nav className="flex-1 flex flex-col gap-2">
        <div className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase">
          Transition of Care
        </div>
        {tocLinks.map(link => (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium transition-all
              ${active === link.href ? 'bg-gradient-to-r from-emerald-100 to-blue-100 text-emerald-700 shadow' : 'text-gray-700 hover:bg-emerald-50'}`}
          >
            <span className="text-xl">{link.icon}</span>
            {link.label}
          </button>
        ))}

        <div className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase mt-4">
          Legacy
        </div>
        {links.map(link => (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium transition-all
              ${active === link.href ? 'bg-gradient-to-r from-emerald-100 to-blue-100 text-emerald-700 shadow' : 'text-gray-700 hover:bg-emerald-50'}`}
          >
            <span className="text-xl">{link.icon}</span>
            {link.label}
          </button>
        ))}
      </nav>
      <button
        onClick={logout}
        className="mt-8 flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-medium text-red-600 hover:bg-red-50 transition-all"
      >
        <span className="text-xl">🚪</span> Logout
      </button>
    </aside>
  );
} 