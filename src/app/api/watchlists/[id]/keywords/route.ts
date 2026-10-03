// ---------------------------------------------------------------------------
// API: /api/watchlists/[id]/keywords — manage keywords for a watchlist
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().cuid(),
});

const createSchema = z.object({
  keyword: z.string().min(1).max(200),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  isActive: z.coerce.boolean().optional(),
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

    const where: Record<string, unknown> = { watchlistId: id };
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const [items, total] = await Promise.all([
      prisma.watchlistKeyword.findMany({
        where,
        include: { keyword: true },
        orderBy: { createdAt: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.watchlistKeyword.count({ where }),
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
    console.error('GET /api/watchlists/[id]/keywords error:', err);
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

    const createSchema = z.object({
      keyword: z.string().min(1).max(200),
      categoryId: z.string().cuid().optional().nullable(),
    });
    const data = createSchema.parse(body);

    let keyword = await prisma.keyword.findUnique({
      where: { keyword: body.keyword },
    });

    if (!keyword) {
      keyword = await prisma.keyword.create({
        data: {
          keyword: body.keyword,
          categoryId: body.categoryId,
        },
      });
    }

    const wlKeyword = await prisma.watchlistKeyword.upsert({
      where: {
        watchlistId_keywordId: {
          watchlistId: id,
          keywordId: keyword.id,
        },
      },
      create: {
        watchlistId: id,
        keywordId: keyword.id,
        isActive: true,
      },
      update: {
        isActive: true,
      },
      include: { keyword: true },
    });

    return NextResponse.json({ data: wlKeyword }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Keyword already in watchlist' }, { status: 409 });
    }
    console.error('POST /api/watchlists/[id]/keywords error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}