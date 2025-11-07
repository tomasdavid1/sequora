module.exports.theme = {
  extend: {
    colors: {
      primary: '#10b981', // emerald-500
      secondary: '#3b82f6', // blue-500
      accent: '#6366f1', // indigo-500
      background: '#f0fdf4', // emerald-50
      surface: '#ffffff',
      muted: '#e5e7eb', // gray-200
      danger: '#ef4444', // red-500
      warning: '#f59e42', // orange-400
      success: '#22c55e', // green-500
    },
    fontFamily: {
      sans: ['var(--font-exon)', 'Inter', 'sans-serif'],
      heading: ['var(--font-exon)', 'Inter', 'sans-serif'],
    },
    borderRadius: {
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
    },
    boxShadow: {
      card: '0 4px 32px 0 rgba(16,185,129,0.10)',
    },
  },
}; 