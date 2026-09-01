'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginForm({ testAuthEnabled }: { testAuthEnabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const postLoginUrl = `${basePath}/post-login`;

  const handleMicrosoftSignIn = async () => {
    setLoading(true);
    await signIn('azure-ad', { redirectTo: postLoginUrl });
  };

  const handleTestSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('test-credentials', {
        code,
        password,
        redirect: false,
        redirectTo: postLoginUrl,
      });

      if (!result || result.error) {
        setError('Invalid test account code or password.');
        return;
      }

      router.push(postLoginUrl);
      router.refresh();
    } catch {
      setError('Unable to sign in. Check the test server configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #3a1f60 0%, #4F2D7F 50%, #6b42a8 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ backgroundColor: '#FFB81C' }}>
            <svg className="w-10 h-10" style={{ color: '#4F2D7F' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Direct Contacts</h1>
          <p style={{ color: '#FFB81C' }} className="font-semibold mt-1">PVAMU Extension</p>
          <p className="text-purple-200 text-sm mt-1">Demographics Collection Tool</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-2" style={{ backgroundColor: '#FFB81C' }} />

          <div className="p-8 space-y-5">
            {testAuthEnabled ? (
              <>
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center">
                  <p className="font-bold text-amber-900">Test server login</p>
                  <p className="mt-1 text-xs text-amber-800">Microsoft sign-in is disabled in this environment.</p>
                </div>

                <form onSubmit={handleTestSignIn} className="space-y-4">
                  <div>
                    <label htmlFor="code" className="block text-sm font-bold text-gray-700 mb-1.5">Agent code</label>
                    <input
                      id="code"
                      name="code"
                      type="text"
                      autoComplete="username"
                      value={code}
                      onChange={(event) => setCode(event.target.value.toUpperCase())}
                      required
                      maxLength={50}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-1.5">Test password</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {error && (
                    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{ backgroundColor: loading ? '#6b42a8' : '#4F2D7F' }}
                    className="w-full text-white py-4 rounded-xl text-lg font-bold transition hover:opacity-90 disabled:opacity-60"
                  >
                    {loading ? 'Signing in…' : 'Sign in to test server'}
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-5 text-center">
                <p className="text-sm" style={{ color: '#4F2D7F' }}>
                  Sign in with your PVAMU Microsoft account to access the Agent or Manager dashboard.
                </p>

                <button
                  onClick={handleMicrosoftSignIn}
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
                  Only accounts added to Direct Contacts by an administrator can access agent or manager tools.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-purple-300 text-xs mt-6">
          Prairie View A&amp;M University © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
