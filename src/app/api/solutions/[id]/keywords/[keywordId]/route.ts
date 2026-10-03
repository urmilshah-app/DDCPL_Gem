// ---------------------------------------------------------------------------
// API: /api/solutions/[id]/keywords/[keywordId] — update or delete a keyword
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().cuid(), keywordId: z.string().cuid() });

const updateSchema = z.object({
  keyword: z.string().min(1).max(200).optional(),
  weight: z.coerce.number().min(0).max(10).optional(),
  matchType: z.enum(['EXACT', 'PHRASE', 'CONTAINS', 'FUZZY']).optional(),
  isNegative: z.boolean().optional(),
  synonyms: z.string().max(500).optional().nullable(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; keywordId: string }> },
) {
  try {
    const { id, keywordId } = paramsSchema.parse(await params);
    const body = await req.json().catch(() => ({}));
    const data = updateSchema.parse(body);

    const existing = await prisma.solutionKeyword.findUnique({
      where: { id: keywordId },
      select: { solutionId: true },
    });
    if (!existing || existing.solutionId !== id) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
    }

    const updated = await prisma.solutionKeyword.update({ where: { id: keywordId }, data });
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Keyword already exists for this solution' }, { status: 409 });
    }
    console.error('PATCH /api/solutions/[id]/keywords/[keywordId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; keywordId: string }> },
) {
  try {
    const { id, keywordId } = paramsSchema.parse(await params);
    const existing = await prisma.solutionKeyword.findUnique({
      where: { id: keywordId },
      select: { solutionId: true },
    });
    if (!existing || existing.solutionId !== id) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
    }

    await prisma.solutionKeyword.delete({ where: { id: keywordId } });
    return NextResponse.json({ data: { id: keywordId, deleted: true } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('DELETE /api/solutions/[id]/keywords/[keywordId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
