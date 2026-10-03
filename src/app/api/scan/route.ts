// ---------------------------------------------------------------------------
// API: /api/scan — trigger a live GeM collection + matching run
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { runLiveScan } from '@/services/liveScan';
import { z } from 'zod';

const bodySchema = z.object({
  deep: z.boolean().optional().default(false),
  maxRecords: z.coerce.number().int().positive().max(1200).optional(),
  enrichLimit: z.coerce.number().int().min(0).max(150).optional(),
  trigger: z.enum(['MANUAL', 'SCHEDULED']).optional().default('MANUAL'),
});

// Hobby plan on Vercel caps functions at 300s
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid scan payload' }, { status: 400 });
  }
  const { deep, maxRecords, enrichLimit, trigger } = parsed.data;

  const stats = await runLiveScan({
    trigger,
    maxRecords: maxRecords ?? (deep ? 600 : 400),
    maxPages: deep ? 120 : 60,
    keywordTerms: deep ? 20 : 14,
    keywordPagesPerTerm: deep ? 8 : 4,
    enrichLimit: enrichLimit ?? (deep ? 150 : 60),
  });

  if (stats.error && stats.fetched === 0) {
    return NextResponse.json({ error: stats.error, stats }, { status: 502 });
  }
  return NextResponse.json({ message: 'Scan complete', ...stats });
}

export async function GET() {
  return NextResponse.json({ message: 'POST to trigger a scan' });
}
