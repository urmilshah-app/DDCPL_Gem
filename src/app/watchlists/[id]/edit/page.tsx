// ---------------------------------------------------------------------------
// Edit watchlist page (server component - loads current values)
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditWatchlistForm from './EditWatchlistForm';

export const dynamic = 'force-dynamic';

export default async function EditWatchlistPage({ params }: { params: { id: string } }) {
  const watchlist = await prisma.watchlist.findUnique({ where: { id: params.id } });

  if (!watchlist) notFound();

  return (
    <div className="container narrow">
      <Link href={`/watchlists/${watchlist.id}`} className="back-link">
        &lt;- Back to watchlist
      </Link>
      <header>
        <h1>Edit Watchlist</h1>
      </header>
      <div className="card">
        <EditWatchlistForm
          initial={{
            id: watchlist.id,
            name: watchlist.name,
            description: watchlist.description ?? '',
            isActive: watchlist.isActive,
          }}
        />
      </div>
    </div>
  );
}
