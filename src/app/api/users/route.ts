// ---------------------------------------------------------------------------
// API: /api/users — list + create users (ADMIN only)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { z } from 'zod';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  role: z.enum(['ADMIN', 'USER']).optional().default('USER'),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const users = await prisma.user.findMany({ select: userSelect, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ data: users });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid user payload (name, email, password ≥ 8 chars)' }, { status: 400 });
  }
  const { name, email, password, role } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, passwordHash, role },
    select: userSelect,
  });
  return NextResponse.json({ data: user }, { status: 201 });
}
