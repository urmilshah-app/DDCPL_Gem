// ---------------------------------------------------------------------------
// API: /api/health — public liveness probe (Docker HEALTHCHECK / uptime checks)
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, time: new Date().toISOString() });
}
