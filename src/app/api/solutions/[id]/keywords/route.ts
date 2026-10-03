// ---------------------------------------------------------------------------
// API: /api/solutions/[id]/keywords — manage keywords for a solution
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().cuid() });

const createSchema = z.object({
  keyword: z.string().min(1).max(200),
  weight: z.coerce.number().min(0).max(10).optional(),
  matchType: z.enum(['EXACT', 'PHRASE', 'CONTAINS', 'FUZZY']).optional(),
  isNegative: z.boolean().optional(),
  synonyms: z.string().max(500).optional().nullable(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = paramsSchema.parse(await params);
    const solution = await prisma.solutionCategory.findUnique({ where: { id } });
    if (!solution) return NextResponse.json({ error: 'Solution not found' }, { status: 404 });

    const items = await prisma.solutionKeyword.findMany({
      where: { solutionId: id },
      orderBy: [{ weight: 'desc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json({ data: items, total: items.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    console.error('GET /api/solutions/[id]/keywords error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = paramsSchema.parse(await params);
    const body = await req.json().catch(() => ({}));
    const data = createSchema.parse(body);

    const solution = await prisma.solutionCategory.findUnique({ where: { id } });
    if (!solution) return NextResponse.json({ error: 'Solution not found' }, { status: 404 });

    const created = await prisma.solutionKeyword.create({
      data: {
        solutionId: id,
        keyword: data.keyword,
        weight: data.weight ?? 1,
        matchType: data.matchType ?? 'CONTAINS',
        isNegative: data.isNegative ?? false,
        synonyms: data.synonyms ?? undefined,
        minConfidence: data.minConfidence ?? 0.5,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Keyword already exists for this solution' }, { status: 409 });
    }
    console.error('POST /api/solutions/[id]/keywords error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
