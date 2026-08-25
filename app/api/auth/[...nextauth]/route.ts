import { handlers } from '@/auth';
import { NextRequest } from 'next/server';

// --- Sub-path fix for Auth.js v5 under a Next.js basePath -------------------
// Next.js strips its basePath (e.g. /cafnr/ced-direct) from the request before
// it reaches this handler, but Auth.js is configured with
// basePath = "<basePath>/api/auth" so its routes match and the OAuth callback
// URL includes the sub-path. Next only strips its own basePath, leaving
// "/api/auth/...", so we re-add the prefix here. Without this every
// /api/auth/* route 400s.
const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function withBasePath(req: NextRequest): NextRequest {
  if (!BP) return req;
  // Auth.js reads req.nextUrl, from which Next has already stripped its
  // basePath. Rebuild the request with the prefix restored on that pathname.
  const stripped = req.nextUrl.pathname;
  if (stripped.startsWith(`${BP}/`)) return req; // already prefixed
  const url = new URL(req.url);
  url.pathname = `${BP}${stripped}`;
  return new NextRequest(url, {
    method: req.method,
    headers: req.headers,
    body: req.body,
    redirect: req.redirect,
    duplex: 'half',
  });
}

export const GET = (req: NextRequest) => handlers.GET(withBasePath(req));
export const POST = (req: NextRequest) => handlers.POST(withBasePath(req));
