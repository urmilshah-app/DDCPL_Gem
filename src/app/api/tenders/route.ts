// ---------------------------------------------------------------------------
// API: /api/tenders — list with pagination + filters, and create (demo only)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  keyword: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

const createSchema = z.object({
  bidNumber: z.string().min(1),
  title: z.string().min(3).max(500),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  organization: z.string().optional().nullable(),
  consigneeState: z.string().optional().nullable(),
  consigneeCity: z.string().optional().nullable(),
  consigneeAddress: z.string().optional().nullable(),
  bidEndDate: z.string().datetime().optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = querySchema.parse(Object.fromEntries(url.searchParams));

    const where: Record<string, unknown> = {};
    if (params.keyword) where.title = { contains: params.keyword, mode: 'insensitive' };
    if (params.city) where.consigneeCity = { equals: params.city, mode: 'insensitive' };
    if (params.state) where.consigneeState = { equals: params.state, mode: 'insensitive' };
    // Note: relevanceScore doesn't exist in schema - skipping minScore filter for now
    if (params.fromDate || params.toDate) {
      where.bidEndDate = {};
      if (params.fromDate) (where.bidEndDate as Record<string, Date>).gte = new Date(params.fromDate);
      if (params.toDate) (where.bidEndDate as Record<string, Date>).lte = new Date(params.toDate);
    }

    const [tenders, total] = await Promise.all([
      prisma.tender.findMany({
        where,
        orderBy: { bidEndDate: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.tender.count({ where }),
    ]);

    return NextResponse.json({
      data: tenders,
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
    console.error('GET /api/tenders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const tender = await prisma.tender.create({
      data: {
        bidNumber: data.bidNumber,
        title: data.title,
        description: data.description,
        category: data.category,
        organization: data.organization,
        consigneeState: data.consigneeState,
        consigneeCity: data.consigneeCity,
        consigneeAddress: data.consigneeAddress,
        bidEndDate: data.bidEndDate ? new Date(data.bidEndDate) : null,
        sourceUrl: data.sourceUrl,
        status: 'NEW',
      },
    });

    return NextResponse.json({ data: tender }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Duplicate bidNumber' }, { status: 409 });
    }
    console.error('POST /api/tenders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}