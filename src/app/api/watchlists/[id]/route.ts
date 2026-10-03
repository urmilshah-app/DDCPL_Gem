// ---------------------------------------------------------------------------
// API: /api/watchlists/[id] — single watchlist CRUD
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().cuid(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = paramsSchema.parse(await params);

    const watchlist = await prisma.watchlist.findUnique({
      where: { id },
      include: {
        watchlistKeyword: {
          where: { isActive: true },
          include: { keyword: true },
          orderBy: { createdAt: 'asc' },
        },
        watchlistLocation: {
          where: { watchlistId: id },
          include: { state: true, city: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { watchlistKeyword: true, watchlistLocation: true },
        },
      },
    });

    if (!watchlist) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    return NextResponse.json({ data: watchlist });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid id', details: err.flatten() }, { status: 400 });
    }
    console.error('GET /api/watchlists/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = paramsSchema.parse(await params);
    const body = await req.json();
    const data = updateSchema.parse(body);

    const watchlist = await prisma.watchlist.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: watchlist });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Watchlist name already exists' }, { status: 409 });
    }
    console.error('PUT /api/watchlists/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = paramsSchema.parse(await params);

    await prisma.watchlist.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid id', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Record to delete not found')) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }
    console.error('DELETE /api/watchlists/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}