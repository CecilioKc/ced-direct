import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Protects the internal dashboards behind Azure AD SSO. The public survey
// form (/survey/*) and its supporting APIs are intentionally left open since
// participants are anonymous and never sign in.
// When mounted under a sub-path (e.g. /cafnr/ced-direct), Next strips basePath
// from req.nextUrl.pathname and it is absent from origin, so redirect targets
// must be prefixed with basePath to land on the right app.
const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default auth((req) => {
  // Normalize to the app-relative path so the startsWith checks work whether or
  // not Next includes the basePath in middleware; redirects re-add BP.
  const rawPathname = req.nextUrl.pathname;
  const pathname =
    BP && rawPathname.startsWith(BP) ? rawPathname.slice(BP.length) || '/' : rawPathname;
  const session = req.auth;

  const isAuthed = !!session?.authorized;
  const isManager = session?.role === 'manager';

  if (pathname.startsWith('/admin') && !isManager) {
    return NextResponse.redirect(new URL(`${BP}${isAuthed ? '/agent' : '/'}`, req.nextUrl.origin));
  }

  if ((pathname.startsWith('/agent') || pathname.startsWith('/manager')) && !isAuthed) {
    return NextResponse.redirect(new URL(`${BP}/`, req.nextUrl.origin));
  }
});

export const config = {
  matcher: ['/admin/:path*', '/agent/:path*', '/manager/:path*'],
};
