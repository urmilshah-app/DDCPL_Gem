// ---------------------------------------------------------------------------
// API: /api/watchlists — CRUD for watchlists
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.coerce.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = querySchema.parse(Object.fromEntries(url.searchParams));

    const where: Record<string, unknown> = {};
    if (params.isActive !== undefined) where.isActive = params.isActive;

    const [watchlists, total] = await Promise.all([
      prisma.watchlist.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: {
          _count: {
            select: { watchlistKeyword: true, watchlistLocation: true },
          },
        },
      }),
      prisma.watchlist.count({ where }),
    ]);

    return NextResponse.json({
      data: watchlists,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query', details: err.flatten() }, { status: 400 });
    }
    console.error('GET /api/watchlists error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    let user = await prisma.user.findFirst({ where: { email: 'system@ddcpl.internal' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'system@ddcpl.internal',
          name: 'System User',
          passwordHash: 'unused',
        },
      });
    }

    const watchlist = await prisma.watchlist.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        userId: user.id,
      },
    });

    return NextResponse.json({ data: watchlist }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Watchlist name already exists' }, { status: 409 });
    }
    console.error('POST /api/watchlists error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}