// ---------------------------------------------------------------------------
// API: /api/cron/scan — scheduled scan endpoint (Vercel Cron, once/day on Hobby)
// Vercel calls this with GET and "Authorization: Bearer $CRON_SECRET".
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { runLiveScan } from '@/services/liveScan';

// Hobby plan maximum is 300s — keep the daily batch safely inside it
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = await runLiveScan({
    trigger: 'SCHEDULED',
    maxRecords: 300,
    maxPages: 45,
    keywordTerms: 12,
    keywordPagesPerTerm: 4,
    enrichLimit: 50,
  });

  if (stats.error && stats.fetched === 0) {
    return NextResponse.json({ error: stats.error, stats }, { status: 502 });
  }
  return NextResponse.json({ message: 'Scheduled scan complete', ...stats });
}
