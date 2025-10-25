import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6">
      <Card className="w-full min-w-[320px] max-w-[420px] shadow-lg bg-white">
        <CardHeader className="text-center space-y-3 px-6 pt-8 pb-6">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-emerald-100 rounded-full">
              <Activity className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {title}
          </CardTitle>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          {children}
        </CardContent>
      </Card>
    </div>
  );
} 