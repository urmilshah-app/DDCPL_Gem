// ---------------------------------------------------------------------------
// Create watchlist page (client component with form)
// ---------------------------------------------------------------------------

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewWatchlistPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to create watchlist');
      }
      const data = await res.json();
      router.push(`/watchlists/${data.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create watchlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container narrow">
      <Link href="/watchlists" className="back-link">
        &lt;- Back to watchlists
      </Link>
      <header>
        <h1>New Watchlist</h1>
      </header>
      <div className="card">
        <form onSubmit={handleSubmit}>
          {error && <p className="scan-message scan-err">{error}</p>}
          <div className="form-group">
            <label htmlFor="name">
              Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              minLength={1}
              maxLength={100}
              placeholder="e.g., Gujarat Government Tenders"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Optional description for this watchlist"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="actions mt-24">
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Watchlist'}
            </button>
            <a href="/watchlists" className="button secondary">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
