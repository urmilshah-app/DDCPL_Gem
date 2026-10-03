// ---------------------------------------------------------------------------
// Admin guard for API route handlers — middleware already ensures authentication;
// this adds the ADMIN role check (403 for everyone else).
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { getSessionUser, SessionUser } from '@/lib/session';

export type AdminResult =
  | { user: SessionUser; error?: undefined }
  | { user?: undefined; error: NextResponse };

export async function requireAdmin(): Promise<AdminResult> {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Admins only' }, { status: 403 }) };
  }
  return { user };
}
