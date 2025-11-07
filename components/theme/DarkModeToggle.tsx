'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder to avoid hydration mismatch
    return (
      <Button variant="ghost" size="icon" className="w-9 h-9">
        <div className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-9 h-9 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Moon className="h-4 w-4 text-emerald-600" />
      )}
    </Button>
  );
}

