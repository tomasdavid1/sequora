import React, { useState, useRef, useEffect } from 'react';
import { useSession } from './SessionManager';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function UserDropdown() {
  const { user, logout } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-blue-100 text-emerald-700 font-semibold shadow hover:from-emerald-200 hover:to-blue-200 transition"
      >
        <span className="font-bold">{user.name || user.email}</span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
          <a
            href="/settings"
            className="block px-4 py-3 text-gray-700 hover:bg-emerald-50 rounded-t-xl transition"
          >
            Settings
          </a>
          <button
            onClick={async () => {
              try {
                // Sign out from Supabase auth and clear local session overlay
                await supabase.auth.signOut();
              } catch (e) {
                // no-op
              } finally {
                try {
                  // brute-force clear any SB tokens lingering
                  const keys = Object.keys(localStorage);
                  for (const k of keys) if (/^sb-[a-z0-9-]+-auth-token$/i.test(k)) localStorage.removeItem(k);
                  sessionStorage.clear();
                } catch {}
                logout();
                router.replace('/login');
              }
            }}
            className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-b-xl transition"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
} 