// ---------------------------------------------------------------------------
// Watchlists list page (server component)
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { DeleteWatchlistButton } from './WatchlistControls';

export const dynamic = 'force-dynamic';

async function getWatchlists() {
  return prisma.watchlist.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { watchlistKeyword: true, watchlistLocation: true },
      },
    },
  });
}

export default async function WatchlistsPage() {
  const watchlists = await getWatchlists();

  return (
    <div className="container">
      <Link href="/" className="back-link">&lt;- Back to dashboard</Link>
      <header>
        <h1>Watchlists</h1>
        <div className="actions">
          <Link href="/watchlists/new" className="button">
            New Watchlist
          </Link>
        </div>
      </header>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Keywords</th>
            <th>Locations</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {watchlists.length === 0 ? (
            <tr>
              <td colSpan={7} className="empty">
                No watchlists yet.{' '}
                <Link href="/watchlists/new" className="button">
                  Create your first watchlist
                </Link>
              </td>
            </tr>
          ) : (
            watchlists.map((w) => (
              <tr key={w.id}>
                <td className="name-cell">
                  <Link href={`/watchlists/${w.id}`}>{w.name}</Link>
                </td>
                <td className="desc-cell">{w.description ?? '-'}</td>
                <td>
                  <div className="counts">
                    <span className="count">{w._count.watchlistKeyword} keyword(s)</span>
                  </div>
                </td>
                <td>
                  <div className="counts">
                    <span className="count">{w._count.watchlistLocation} location(s)</span>
                  </div>
                </td>
                <td>
                  <span className={`status ${w.isActive ? 'status-ok' : 'status-err'}`}>
                    {w.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="row-actions">
                    <Link href={`/watchlists/${w.id}`} className="button secondary btn-sm">
                      View
                    </Link>
                    <Link href={`/watchlists/${w.id}/edit`} className="button secondary btn-sm">
                      Edit
                    </Link>
                    <DeleteWatchlistButton watchlistId={w.id} />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
