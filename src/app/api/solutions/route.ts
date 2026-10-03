// ---------------------------------------------------------------------------
// API: /api/solutions — manage solution categories (custom classification rules)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/strings';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, digits and dashes')
    .optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().max(32).optional().nullable(),
  icon: z.string().max(32).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const isActiveParam = url.searchParams.get('isActive');
    const where = isActiveParam === null ? {} : { isActive: isActiveParam === 'true' };

    const items = await prisma.solutionCategory.findMany({
      where,
      include: {
        keywords: { orderBy: [{ weight: 'desc' }, { createdAt: 'asc' }] },
        _count: { select: { tenders: true, children: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: items, total: items.length });
  } catch (err) {
    console.error('GET /api/solutions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = createSchema.parse(body);
    const slug = data.slug ?? slugify(data.name);

    const created = await prisma.solutionCategory.create({
      data: {
        name: data.name,
        slug,
        description: data.description ?? undefined,
        color: data.color ?? undefined,
        icon: data.icon ?? undefined,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
      include: { keywords: true, _count: { select: { tenders: true } } },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A solution with this slug already exists' }, { status: 409 });
    }
    console.error('POST /api/solutions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
