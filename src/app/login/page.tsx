// ---------------------------------------------------------------------------
// Login page (server component) — redirects away if already signed in
// ---------------------------------------------------------------------------

import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

function safeNext(v: string | undefined): string {
  if (!v) return '/';
  return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/login') ? v : '/';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getSessionUser();
  if (user) redirect(safeNext(searchParams.next));

  return (
    <div className="container login-wrap">
      <div className="card login-card">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">G</span>
          <strong>DDCPL Tender Monitor</strong>
        </div>
        <p className="page-subtitle">Sign in to access the dashboard</p>
        <LoginForm next={safeNext(searchParams.next)} />
      </div>
    </div>
  );
}
