import './globals.css';
import { inter } from '@/lib/fonts';
import Link from 'next/link';
import Navigation from '@/components/layout/Navigation';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export const metadata = {
  title: 'Sequora Platform',
  description: 'Personalized, science-backed wellness assessment',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: '128x128' }
    ],
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
    other: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        url: '/favicon.svg',
      },
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <div suppressHydrationWarning={true}>
          <ThemeProvider>
            {/* Header */}
            <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur border-b border-border shadow-sm py-3 sm:py-4 px-4 sm:px-6 flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-3">
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">Sequora</span>
                <Badge variant="secondary" className="text-xs">Beta</Badge>
              </Link>
              <Navigation />
            </header>
                    <main className="flex-1 flex flex-col items-center justify-center w-full">
              {children}
            </main>
            {/* Footer */}
            <footer className="border-t border-border bg-background py-6 px-4 sm:px-6 text-center text-sm text-muted-foreground">
              <p>&copy; 2025 Sequora. All rights reserved.</p>
            </footer>
            <Toaster />
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
