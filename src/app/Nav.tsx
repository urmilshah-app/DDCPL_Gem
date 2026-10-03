'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/watchlists', label: 'Watchlists' },
  { href: '/solutions', label: 'Solutions' },
];

export default function Nav({ user }: { user: { email: string; name: string } | null }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <div className="site-nav-inner">
        <Link href="/" className="site-brand">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span className="brand-full">DDCPL Tender Monitor</span>
          <span className="brand-short">Monitor</span>
        </Link>
        <div className="site-links">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={active ? 'active' : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {l.label}
              </Link>
            );
          })}
          {user && (
            <span className="nav-user-group">
              <span className="nav-user" title={user.email}>
                {user.name || user.email}
              </span>
              <button type="button" className="nav-logout" onClick={logout}>
                Logout
              </button>
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
