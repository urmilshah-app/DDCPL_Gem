// ---------------------------------------------------------------------------
// /users — user management (ADMIN only; non-admins get a 403 panel)
// ---------------------------------------------------------------------------

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import UsersManager, { UserView } from './UsersManager';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Users · DDCPL Tender Monitor' };

export default async function UsersPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  if (session.role !== 'ADMIN') {
    return (
      <div className="section alert-error">
        <h3>403 — Admins only</h3>
        <p>You need an Administrator account to manage users.</p>
        <p>
          <Link className="button secondary btn-sm" href="/">
            Back to dashboard
          </Link>
        </p>
      </div>
    );
  }

  const rows = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const users: UserView[] = rows.map((u) => ({
    ...u,
    role: u.role as 'ADMIN' | 'USER',
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="container">
      <h1>Users &amp; Access Control</h1>
      <p className="page-subtitle">
        Only administrators can create, edit or delete accounts.
      </p>
      <UsersManager initial={users} meId={session.sub} />
    </div>
  );
}
