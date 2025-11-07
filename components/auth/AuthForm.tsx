import React from 'react';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit?: (data: { name?: string; email: string; password: string }) => void;
}

export default function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [form, setForm] = React.useState({ name: '', email: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(form);
  };

  return (
    <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
      {mode === 'signup' && (
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Your Name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="you@email.com"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>
      <button
        type="submit"
        className={`w-full font-semibold py-3 rounded-lg shadow transition ${mode === 'login' ? 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white hover:from-emerald-700 hover:to-blue-700' : 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:from-blue-700 hover:to-emerald-700'}`}
      >
        {mode === 'login' ? 'Sign In' : 'Sign Up'}
      </button>
    </form>
  );
}

