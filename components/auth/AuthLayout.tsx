import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-emerald-600 tracking-tight">Sequora</h1>
          {subtitle && <p className="mt-2 text-gray-600 text-sm">{subtitle}</p>}
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
        {children}
      </div>
    </div>
  );
}

