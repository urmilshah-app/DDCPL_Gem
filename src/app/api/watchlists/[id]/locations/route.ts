// ---------------------------------------------------------------------------
// API: /api/watchlists/[id]/locations — manage locations for a watchlist
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().cuid(),
});

const createSchema = z.object({
  mode: z.enum(['STATE', 'CITY']),
  stateId: z.string().cuid().optional().nullable(),
  cityId: z.string().cuid().optional().nullable(),
}).refine((data) => (data.mode === 'STATE' && data.stateId) || (data.mode === 'CITY' && data.cityId), {
  message: 'stateId required for STATE mode, cityId required for CITY mode',
  path: ['stateId', 'cityId'],
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = paramsSchema.parse(await params);
    const url = new URL(req.url);
    const query = querySchema.parse(Object.fromEntries(url.searchParams));

    const watchlist = await prisma.watchlist.findUnique({ where: { id } });
    if (!watchlist) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    const [items, total] = await Promise.all([
      prisma.watchlistLocation.findMany({
        where: { watchlistId: id },
        include: { state: true, city: true },
        orderBy: { createdAt: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.watchlistLocation.count({ where: { watchlistId: id } }),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query', details: err.flatten() }, { status: 400 });
    }
    console.error('GET /api/watchlists/[id]/locations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = paramsSchema.parse(await params);
    const body = await req.json();

    const watchlist = await prisma.watchlist.findUnique({ where: { id } });
    if (!watchlist) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    const data = createSchema.parse(body);

    const location = await prisma.watchlistLocation.create({
      data: {
        watchlistId: id,
        mode: data.mode,
        stateId: data.stateId,
        cityId: data.cityId,
      },
      include: { state: true, city: true },
    });

    return NextResponse.json({ data: location }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Location already in watchlist' }, { status: 409 });
    }
    console.error('POST /api/watchlists/[id]/locations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}