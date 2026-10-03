// ---------------------------------------------------------------------------
// Edit watchlist form (client component)
// ---------------------------------------------------------------------------

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type InitialValues = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

export default function EditWatchlistForm({ initial }: { initial: InitialValues }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/watchlists/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      router.push(`/watchlists/${initial.id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Failed to update watchlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <label htmlFor="isActive">Active</label>
      </div>
      {error && <p className="scan-message scan-err">{error}</p>}
      <div className="actions mt-24">
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <a href={`/watchlists/${initial.id}`} className="button secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}
