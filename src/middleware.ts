// ---------------------------------------------------------------------------
// Auth middleware — protects every page and API route.
// Public: /login, /api/auth/login, /api/auth/logout, /api/health
// Cron bypass: Authorization: Bearer ${CRON_SECRET} (when CRON_SECRET is set)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

const PUBLIC_EXACT = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth === `Bearer ${cronSecret}`) return NextResponse.next();
  }

  if (PUBLIC_EXACT.has(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await verifySessionToken(token))) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  const target = pathname + req.nextUrl.search;
  if (target !== '/') url.searchParams.set('next', target);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)',
  ],
};
