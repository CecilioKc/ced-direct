'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.role === 'manager') router.push('/manager');
      else router.push('/agent');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #3a1f60 0%, #4F2D7F 50%, #6b42a8 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ backgroundColor: '#FFB81C' }}>
            <svg className="w-10 h-10" style={{ color: '#4F2D7F' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">CED-Direct</h1>
          <p style={{ color: '#FFB81C' }} className="font-semibold mt-1">PVAMU Cooperative Extension</p>
          <p className="text-purple-200 text-sm mt-1">Demographics Collection Tool</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Gold top bar */}
          <div className="h-2" style={{ backgroundColor: '#FFB81C' }} />

          <form onSubmit={handleLogin} className="p-8 space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#4F2D7F' }}>Agent Code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AGENT-A"
                required
                style={{ color: '#111827', backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
                className="w-full border-2 rounded-xl px-4 py-3 text-base font-medium focus:outline-none transition"
                onFocus={e => e.target.style.borderColor = '#4F2D7F'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#4F2D7F' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{ color: '#111827', backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
                className="w-full border-2 rounded-xl px-4 py-3 text-base font-medium focus:outline-none transition"
                onFocus={e => e.target.style.borderColor = '#4F2D7F'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: loading ? '#6b42a8' : '#4F2D7F' }}
              className="w-full text-white py-4 rounded-xl text-lg font-bold transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-purple-300 text-xs mt-6">
          Prairie View A&M University © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
