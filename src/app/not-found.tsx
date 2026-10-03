// ---------------------------------------------------------------------------
// 404 page
// ---------------------------------------------------------------------------

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container narrow">
      <section className="section">
        <div className="empty">
          <div className="empty-code">404</div>
          <h1>Page not found</h1>
          <p className="page-subtitle">
            The page you are looking for does not exist or the record was deleted.
          </p>
          <div className="actions actions-center">
            <Link href="/" className="btn">
              Back to dashboard
            </Link>
            <Link href="/watchlists" className="btn btn-secondary">
              Watchlists
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
