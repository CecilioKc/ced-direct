'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    // Azure AD (Microsoft Entra ID) handles the credential check; NextAuth then
    // looks the signed-in email up against the agents table (see auth.ts) to
    // decide whether the person is an authorized agent/manager and which
    // dashboard to land on.
    await signIn('azure-ad', { callbackUrl: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/post-login` });
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

          <div className="p-8 space-y-5 text-center">
            <p className="text-sm" style={{ color: '#4F2D7F' }}>
              Sign in with your PVAMU Microsoft account to access the Agent or Manager dashboard.
            </p>

            <button
              onClick={handleSignIn}
              disabled={loading}
              style={{ backgroundColor: loading ? '#6b42a8' : '#4F2D7F' }}
              className="w-full flex items-center justify-center gap-3 text-white py-4 rounded-xl text-lg font-bold transition hover:opacity-90 disabled:opacity-60"
            >
              <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              {loading ? 'Redirecting…' : 'Sign in with Microsoft'}
            </button>

            <p className="text-xs text-gray-400">
              Only accounts added to CED-Direct by an administrator can access agent or manager tools.
            </p>
          </div>
        </div>

        <p className="text-center text-purple-300 text-xs mt-6">
          Prairie View A&M University © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
