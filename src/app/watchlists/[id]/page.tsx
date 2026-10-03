// ---------------------------------------------------------------------------
// Watchlist detail page (server component)
// Shows keywords and locations; interactive bits live in WatchlistControls.
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  AddKeywordForm,
  AddLocationForm,
  DeleteWatchlistButton,
  RemoveKeywordButton,
  RemoveLocationButton,
} from '../WatchlistControls';

export const dynamic = 'force-dynamic';

async function getWatchlist(id: string) {
  return prisma.watchlist.findUnique({
    where: { id },
    include: {
      watchlistKeyword: {
        where: { isActive: true },
        include: { keyword: { include: { category: true } } },
        orderBy: { createdAt: 'asc' },
      },
      watchlistLocation: {
        include: { state: true, city: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

async function getStates() {
  return prisma.state.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true },
  });
}

async function getCities() {
  return prisma.city.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, state: { select: { code: true } } },
  });
}

export default async function WatchlistDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [watchlist, states, cities] = await Promise.all([
    getWatchlist(id),
    getStates(),
    getCities(),
  ]);

  if (!watchlist) notFound();

  const cityOptions = cities.map((c) => ({ id: c.id, name: c.name, stateCode: c.state.code }));

  return (
    <div className="container">
      <Link href="/watchlists" className="back-link">
        &lt;- Back to watchlists
      </Link>

      <div className="watchlist-header">
        <div className="watchlist-title">
          <h1>{watchlist.name}</h1>
          {watchlist.description && <p className="watchlist-desc">{watchlist.description}</p>}
        </div>
        <div className="header-actions">
          <span className={`badge ${watchlist.isActive ? 'badge-ok' : 'badge-err'}`}>
            {watchlist.isActive ? 'Active' : 'Inactive'}
          </span>
          <Link href={`/watchlists/${watchlist.id}/edit`} className="button secondary">
            Edit
          </Link>
          <DeleteWatchlistButton watchlistId={watchlist.id} />
        </div>
      </div>

      <nav className="jump-links" aria-label="Page sections">
        <a href="#keywords">Keywords ({watchlist.watchlistKeyword.length})</a>
        <a href="#locations">Locations ({watchlist.watchlistLocation.length})</a>
      </nav>

      <section id="keywords" className="section" aria-labelledby="keywords-heading">
        <div className="section-header">
          <h2 id="keywords-heading">Keywords ({watchlist.watchlistKeyword.length})</h2>
        </div>
        <AddKeywordForm watchlistId={watchlist.id} />
        <div className="table-wrap mt-16">
          <table>
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Category</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.watchlistKeyword.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    No keywords yet. Add one above to start matching tenders.
                  </td>
                </tr>
              ) : (
                watchlist.watchlistKeyword.map((wk) => (
                  <tr key={wk.id}>
                    <td className="keyword-cell">{wk.keyword.keyword}</td>
                    <td>
                      {wk.keyword.category ? (
                        <span className="category-tag">{wk.keyword.category.name}</span>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td>{new Date(wk.createdAt).toLocaleDateString()}</td>
                    <td>
                      <RemoveKeywordButton watchlistId={watchlist.id} keywordId={wk.keywordId} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="locations" className="section" aria-labelledby="locations-heading">
        <div className="section-header">
          <h2 id="locations-heading">Locations ({watchlist.watchlistLocation.length})</h2>
        </div>
        <AddLocationForm watchlistId={watchlist.id} states={states} cities={cityOptions} />
        <div className="table-wrap mt-16">
          <table>
            <thead>
              <tr>
                <th>Mode</th>
                <th>State</th>
                <th>City</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.watchlistLocation.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    No locations yet. Add a state or city above.
                  </td>
                </tr>
              ) : (
                watchlist.watchlistLocation.map((loc) => (
                  <tr key={loc.id}>
                    <td>
                      <span className={`mode-badge ${loc.mode === 'STATE' ? 'mode-state' : 'mode-city'}`}>
                        {loc.mode}
                      </span>
                    </td>
                    <td>{loc.state?.name ?? '-'}</td>
                    <td>{loc.city?.name ?? '-'}</td>
                    <td>{new Date(loc.createdAt).toLocaleDateString()}</td>
                    <td>
                      <RemoveLocationButton watchlistId={watchlist.id} locationId={loc.id} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
