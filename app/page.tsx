import LoginForm from './login-form';
import { headers } from 'next/headers';
import { getTestAuthConfig, isTestAuthHostAllowed } from '@/lib/test-auth.mjs';

// Authentication mode is a runtime server setting, so do not bake it into a
// static page during `next build`.
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Computed on the server: no public environment variable can enable the
  // bypass or make the credentials provider available.
  const testAuth = getTestAuthConfig();
  if (testAuth.enabled && !isTestAuthHostAllowed(await headers(), testAuth.allowedHosts)) {
    throw new Error('[auth] Local authentication is not allowed on this host.');
  }

  return <LoginForm testAuthEnabled={testAuth.enabled} />;
}
