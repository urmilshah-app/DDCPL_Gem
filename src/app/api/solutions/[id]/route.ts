// ---------------------------------------------------------------------------
// API: /api/solutions/[id] — read, update or delete a solution category
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().cuid() });

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().max(32).optional().nullable(),
  icon: z.string().max(32).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().cuid().optional().nullable(),
});

async function resolve(params: Promise<{ id: string }>) {
  const { id } = paramsSchema.parse(await params);
  const solution = await prisma.solutionCategory.findUnique({
    where: { id },
    include: {
      keywords: { orderBy: [{ weight: 'desc' }, { createdAt: 'asc' }] },
      _count: { select: { tenders: true } },
    },
  });
  return { id, solution };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { solution } = await resolve(params);
    if (!solution) return NextResponse.json({ error: 'Solution not found' }, { status: 404 });
    return NextResponse.json({ data: solution });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    console.error('GET /api/solutions/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = paramsSchema.parse(await params);
    const body = await req.json().catch(() => ({}));
    const data = updateSchema.parse(body);

    const solution = await prisma.solutionCategory.update({
      where: { id },
      data,
      include: { keywords: true, _count: { select: { tenders: true } } },
    });

    return NextResponse.json({ data: solution });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Solution not found' }, { status: 404 });
    }
    console.error('PATCH /api/solutions/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = paramsSchema.parse(await params);
    const existing = await prisma.solutionCategory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Solution not found' }, { status: 404 });

    await prisma.solutionCategory.delete({ where: { id } });
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    console.error('DELETE /api/solutions/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
