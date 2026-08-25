'use client';

import { SessionProvider } from 'next-auth/react';

// The next-auth/react client (signIn/signOut/useSession) defaults its base path
// to /api/auth and can't read the server-only AUTH_URL. When the app is mounted
// under a sub-path we must tell the client the full base path, or sign-in posts
// to the wrong URL and bounces to /api/auth/error (404).
const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath={`${BP}/api/auth`}>{children}</SessionProvider>;
}
