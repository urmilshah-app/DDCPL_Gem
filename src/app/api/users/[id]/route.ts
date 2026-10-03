// ---------------------------------------------------------------------------
// API: /api/users/[id] — edit + delete a user (ADMIN only)
// Guards: can't delete yourself, can't disable/demote yourself,
//         can never remove the last ADMIN.
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

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().max(200).optional(),
    role: z.enum(['ADMIN', 'USER']).optional(),
    password: z.string().min(8).max(200).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

async function countAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: 'ADMIN' } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const { name, email, role, password, isActive } = parsed.data;
  const isSelf = params.id === guard.user.sub;

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (isSelf && role !== undefined && role !== target.role) {
    return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
  }
  if (isSelf && isActive === false) {
    return NextResponse.json({ error: 'You cannot disable your own account' }, { status: 400 });
  }
  if (target.role === 'ADMIN' && (role === 'USER' || isActive === false)) {
    const admins = await countAdmins();
    if (admins <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (password !== undefined) data.passwordHash = await bcrypt.hash(password, 12);
  if (email !== undefined) {
    const normalized = email.toLowerCase();
    if (normalized !== target.email) {
      const clash = await prisma.user.findUnique({ where: { email: normalized } });
      if (clash) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
      }
    }
    data.email = normalized;
  }

  const user = await prisma.user.update({ where: { id: params.id }, data, select: userSelect });
  return NextResponse.json({ data: user });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  if (params.id === guard.user.sub) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (target.role === 'ADMIN') {
    const admins = await countAdmins();
    if (admins <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
