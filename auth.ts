import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import { queryOne } from '@/lib/db';

export interface AgentRecord {
  id: number;
  name: string;
  code: string;
  role: 'agent' | 'manager';
}

declare module 'next-auth' {
  interface Session {
    agentId: number | null;
    role: 'agent' | 'manager' | null;
    code: string | null;
    authorized: boolean;
  }
}

// NextAuth's JWT type augmentation (`declare module 'next-auth/jwt'`) doesn't
// resolve reliably under `moduleResolution: bundler` in this TS/Next.js
// combination, so the extra fields we stash on the token are typed via this
// local interface instead and applied with a cast at the two call sites below.
interface AppToken {
  agentId?: number | null;
  role?: 'agent' | 'manager' | null;
  code?: string | null;
  authorized?: boolean;
  name?: string | null;
  email?: string | null;
}

const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Mounted under a sub-path (e.g. /cafnr/ced-direct). Auth.js must know the
  // full path its /api/auth routes live under, or /api/auth/* returns 400.
  basePath: `${BP}/api/auth`,
  providers: [
    MicrosoftEntraID({
      id: 'azure-ad', // pins the callback path to /api/auth/callback/azure-ad
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    // Sign-in page is the app root, prefixed with the basePath so the redirect
    // lands on this app when mounted under a sub-path.
    signIn: `${BP}/`,
  },
  callbacks: {
    // Runs on sign-in and on every subsequent request that reads the JWT.
    // We re-check the agents table on sign-in so role changes made in the
    // Admin Panel take effect the next time someone logs in.
    async jwt({ token, user }) {
      const t = token as AppToken;
      const email = (user?.email ?? t.email) as string | undefined;
      if (user && email) {
        const agent = await queryOne<AgentRecord>(
          'SELECT id, name, code, role FROM agents WHERE email = @email',
          { email: email.toLowerCase() }
        );
        t.agentId = agent?.id ?? null;
        t.role = agent?.role ?? null;
        t.code = agent?.code ?? null;
        t.authorized = !!agent;
        if (agent?.name) t.name = agent.name;
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
