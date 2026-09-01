import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import Credentials from 'next-auth/providers/credentials';
import { queryOne } from '@/lib/db';
import {
  getTestAuthConfig,
  isTestAuthHostAllowed,
  normalizeTestCode,
  testPasswordMatches,
} from '@/lib/test-auth.mjs';
import { AppRole, isAppRole } from '@/lib/roles';

export interface AgentRecord {
  id: number;
  name: string;
  email: string;
  code: string;
  role: AppRole;
}

declare module 'next-auth' {
  interface Session {
    agentId: number | null;
    role: AppRole | null;
    code: string | null;
    authorized: boolean;
  }

  interface User {
    agentId?: number;
    role?: AppRole;
    code?: string;
    authorized?: boolean;
  }
}

// NextAuth's JWT type augmentation (`declare module 'next-auth/jwt'`) doesn't
// resolve reliably under `moduleResolution: bundler` in this TS/Next.js
// combination, so the extra fields we stash on the token are typed via this
// local interface instead and applied with a cast at the two call sites below.
interface AppToken {
  agentId?: number | null;
  role?: AppRole | null;
  code?: string | null;
  authorized?: boolean;
  name?: string | null;
  email?: string | null;
}

function setAgentOnToken(token: AppToken, agent: AgentRecord | null | undefined): void {
  token.agentId = agent?.id ?? null;
  token.role = agent && isAppRole(agent.role) ? agent.role : null;
  token.code = agent?.code ?? null;
  token.authorized = !!agent && isAppRole(agent.role);
  if (agent) {
    token.name = agent.name;
    token.email = agent.email;
  }
}

const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const testAuth = getTestAuthConfig();

const providers = testAuth.enabled
  ? [
      Credentials({
        id: 'test-credentials',
        name: 'Test server login',
        credentials: {
          code: { label: 'Agent code', type: 'text' },
          password: { label: 'Test password', type: 'password' },
        },
        async authorize(credentials, request) {
          if (!isTestAuthHostAllowed(request.headers, testAuth.allowedHosts)) return null;

          const code = normalizeTestCode(credentials.code);
          const password = typeof credentials.password === 'string' ? credentials.password : '';
          if (
            !code ||
            !testAuth.allowedCodes.has(code) ||
            !testPasswordMatches(password, testAuth.password)
          ) {
            return null;
          }

          const agent = await queryOne<AgentRecord>(
            'SELECT id, name, email, code, role FROM agents WHERE code = @code',
            { code }
          );
          if (!agent || !isAppRole(agent.role)) return null;

          return {
            id: String(agent.id),
            name: agent.name,
            email: agent.email,
            agentId: agent.id,
            role: agent.role,
            code: agent.code,
            authorized: true,
          };
        },
      }),
    ]
  : [
      MicrosoftEntraID({
        id: 'azure-ad', // pins the callback path to /api/auth/callback/azure-ad
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      }),
    ];

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Mounted under a sub-path (e.g. /cafnr/ced-direct). Auth.js must know the
  // full path its /api/auth routes live under, or /api/auth/* returns 400.
  basePath: `${BP}/api/auth`,
  providers,
  session: { strategy: 'jwt' },
  pages: {
    // Sign-in page is the app root, prefixed with the basePath so the redirect
    // lands on this app when mounted under a sub-path.
    signIn: `${BP}/`,
  },
  callbacks: {
    // Runs on sign-in and on subsequent authenticated requests. Re-checking
    // an existing account by id prevents stale JWT roles: an Admin Panel role
    // change (including manager -> agent) is enforced on the next request.
    async jwt({ token, user }) {
      const t = token as AppToken;
      const email = (user?.email ?? t.email) as string | undefined;
      if (user && typeof user.agentId === 'number' && user.authorized) {
        if (!isAppRole(user.role)) {
          setAgentOnToken(t, null);
        } else {
          setAgentOnToken(t, {
            id: user.agentId,
            name: user.name ?? '',
            email: user.email ?? '',
            code: user.code ?? '',
            role: user.role,
          });
        }
      } else if (user && email) {
        const agent = await queryOne<AgentRecord>(
          'SELECT id, name, email, code, role FROM agents WHERE email = @email',
          { email: email.toLowerCase() }
        );
        setAgentOnToken(t, agent);
      } else if (typeof t.agentId === 'number') {
        const agent = await queryOne<AgentRecord>(
          'SELECT id, name, email, code, role FROM agents WHERE id = @agentId',
          { agentId: t.agentId }
        );
        setAgentOnToken(t, agent);
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as AppToken;
      session.agentId = t.agentId ?? null;
      session.role = t.role ?? null;
      session.code = t.code ?? null;
      session.authorized = t.authorized ?? false;
      return session;
    },
  },
});
