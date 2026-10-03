// ---------------------------------------------------------------------------
// API: /api/watchlists/[id]/keywords/[keywordId] — delete keyword from watchlist
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().cuid(),
  keywordId: z.string().cuid(),
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; keywordId: string }> }
) {
  try {
    const { id, keywordId } = paramsSchema.parse(await params);

    await prisma.watchlistKeyword.delete({
      where: {
        watchlistId_keywordId: {
          watchlistId: id,
          keywordId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid id', details: err.flatten() }, { status: 400 });
    }
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Keyword not in watchlist' }, { status: 404 });
    }
    console.error('DELETE /api/watchlists/[id]/keywords/[keywordId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; keywordId: string }> }
) {
  try {
    const { id, keywordId } = paramsSchema.parse(await params);
    const body = await req.json();

    const updateSchema = z.object({
      isActive: z.boolean(),
    });
    const data = updateSchema.parse(body);

    const wlKeyword = await prisma.watchlistKeyword.update({
      where: {
        watchlistId_keywordId: {
          watchlistId: id,
          keywordId,
        },
      },
      data: { isActive: data.isActive },
    });

    return NextResponse.json({ data: wlKeyword });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.flatten() }, { status: 400 });
    }
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Keyword not in watchlist' }, { status: 404 });
    }
    console.error('PUT /api/watchlists/[id]/keywords/[keywordId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}