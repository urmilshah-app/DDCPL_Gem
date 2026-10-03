// ---------------------------------------------------------------------------
// Client controls for watchlist pages (confirm dialogs need the browser)
// ---------------------------------------------------------------------------

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function request(path: string, method: string): Promise<boolean> {
  try {
    const res = await fetch(path, { method });
    return res.ok;
  } catch {
    return false;
  }
}

export function DeleteWatchlistButton({ watchlistId }: { watchlistId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm('Delete this watchlist?')) return;
    setBusy(true);
    setError(null);
    const ok = await request(`/api/watchlists/${watchlistId}`, 'DELETE');
    setBusy(false);
    if (ok) {
      router.push('/watchlists');
      router.refresh();
    } else {
      setError('Could not delete the watchlist. Please try again.');
    }
  };

  return (
    <>
      <button type="button" className="btn-sm btn-danger" onClick={handleDelete} disabled={busy}>
        {busy ? 'Deleting...' : 'Delete'}
      </button>
      {error && <p className="scan-message scan-err">{error}</p>}
    </>
  );
}

export function RemoveKeywordButton({
  watchlistId,
  keywordId,
}: {
  watchlistId: string;
  keywordId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async () => {
    if (!window.confirm('Remove this keyword?')) return;
    setBusy(true);
    setError(null);
    const ok = await request(`/api/watchlists/${watchlistId}/keywords/${keywordId}`, 'DELETE');
    setBusy(false);
    if (ok) router.refresh();
    else setError('Could not remove the keyword. Please try again.');
  };

  return (
    <>
      <button type="button" className="btn-sm btn-danger" onClick={handleRemove} disabled={busy}>
        {busy ? 'Removing...' : 'Remove'}
      </button>
      {error && <p className="scan-message scan-err">{error}</p>}
    </>
  );
}

export function RemoveLocationButton({
  watchlistId,
  locationId,
}: {
  watchlistId: string;
  locationId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async () => {
    if (!window.confirm('Remove this location?')) return;
    setBusy(true);
    setError(null);
    const ok = await request(`/api/watchlists/${watchlistId}/locations/${locationId}`, 'DELETE');
    setBusy(false);
    if (ok) router.refresh();
    else setError('Could not remove the location. Please try again.');
  };

  return (
    <>
      <button type="button" className="btn-sm btn-danger" onClick={handleRemove} disabled={busy}>
        {busy ? 'Removing...' : 'Remove'}
      </button>
      {error && <p className="scan-message scan-err">{error}</p>}
    </>
  );
}

async function postJson(path: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function AddKeywordForm({ watchlistId }: { watchlistId: string }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!keyword.trim()) return;
    setBusy(true);
    setError(null);
    const ok = await postJson(`/api/watchlists/${watchlistId}/keywords`, { keyword: keyword.trim() });
    setBusy(false);
    if (ok) {
      setKeyword('');
      router.refresh();
    } else {
      setError('Could not add the keyword. It may already exist.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group grow-2">
          <label htmlFor="new-keyword">Keyword</label>
          <input
            id="new-keyword"
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Enter keyword (e.g., supply, installation)"
            required
          />
        </div>
        <div className="form-group fixed">
          <label>&nbsp;</label>
          <button type="submit" disabled={busy}>
            {busy ? 'Adding...' : 'Add Keyword'}
          </button>
        </div>
      </div>
      {error && <p className="scan-message scan-err">{error}</p>}
    </form>
  );
}

type StateOption = { id: string; name: string; code: string };
type CityOption = { id: string; name: string; stateCode: string };

export function AddLocationForm({
  watchlistId,
  states,
  cities,
}: {
  watchlistId: string;
  states: StateOption[];
  cities: CityOption[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'STATE' | 'CITY'>('STATE');
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await postJson(`/api/watchlists/${watchlistId}/locations`, {
      mode,
      stateId: mode === 'STATE' ? stateId : undefined,
      cityId: mode === 'CITY' ? cityId : undefined,
    });
    setBusy(false);
    if (ok) {
      setStateId('');
      setCityId('');
      router.refresh();
    } else {
      setError('Could not add the location. It may already be on this watchlist.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="loc-mode">Mode</label>
          <select id="loc-mode" value={mode} onChange={(e) => setMode(e.target.value as 'STATE' | 'CITY')}>
            <option value="STATE">State</option>
            <option value="CITY">City</option>
          </select>
        </div>
        {mode === 'STATE' ? (
          <div className="form-group">
            <label htmlFor="state-field">State</label>
            <select id="state-field" value={stateId} onChange={(e) => setStateId(e.target.value)} required>
              <option value="">Select state</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="city-field">City</label>
            <select id="city-field" value={cityId} onChange={(e) => setCityId(e.target.value)} required>
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.stateCode})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="form-group fixed">
          <label>&nbsp;</label>
          <button type="submit" disabled={busy}>
            {busy ? 'Adding...' : 'Add Location'}
          </button>
        </div>
      </div>
      {error && <p className="scan-message scan-err">{error}</p>}
    </form>
  );
}
