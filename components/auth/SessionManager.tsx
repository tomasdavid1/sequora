import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  name?: string;
  email: string;
}

interface SessionContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    try {
      const stored = localStorage.getItem('session-user');
      if (stored) setUser(JSON.parse(stored));
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }
  }, [isClient]);

  const login = (user: User) => {
    setUser(user);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('session-user', JSON.stringify(user));
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('session-user');
        const url = (process as any).env?.NEXT_PUBLIC_SUPABASE_URL;
        const match = url?.match?.(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
        const ref = match?.[1];
        if (ref) localStorage.removeItem(`sb-${ref}-auth-token`);
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  };

  return (
    <SessionContext.Provider value={{ user, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}

