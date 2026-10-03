'use client';

// ---------------------------------------------------------------------------
// Solutions admin client component — CRUD for solutions + their keywords
// ---------------------------------------------------------------------------

import { useState } from 'react';

export interface KeywordView {
  id: string;
  keyword: string;
  weight: number;
  matchType: string;
  isNegative: boolean;
  minConfidence: number;
}

export interface SolutionView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  color: string | null;
  tenderCount: number;
  keywords: KeywordView[];
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

export function SolutionsAdmin({ initial }: { initial: SolutionView[] }) {
  const [solutions, setSolutions] = useState<SolutionView[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const fail = (err: unknown) => setError(err instanceof Error ? err.message : 'Something went wrong');

  const createSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ data: SolutionView }>('/api/solutions', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
      });
      setSolutions((prev) => [...prev, { ...res.data, tenderCount: 0 }]);
      setNewName('');
      setNewDesc('');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const patchSolution = async (id: string, data: Record<string, unknown>) => {
    setError(null);
    try {
      const res = await api<{ data: SolutionView }>(`/api/solutions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setSolutions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...res.data, tenderCount: s.tenderCount } : s)),
      );
    } catch (err) {
      fail(err);
    }
  };

  const deleteSolution = async (id: string) => {
    if (!confirm('Delete this solution and all its keywords?')) return;
    setError(null);
    try {
      await api(`/api/solutions/${id}`, { method: 'DELETE' });
      setSolutions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      fail(err);
    }
  };

  const addKeyword = async (
    solution: SolutionView,
    keyword: string,
    weight: number,
    isNegative: boolean,
  ): Promise<boolean> => {
    if (!keyword.trim()) return false;
    setError(null);
    try {
      const res = await api<{ data: KeywordView }>(`/api/solutions/${solution.id}/keywords`, {
        method: 'POST',
        body: JSON.stringify({ keyword: keyword.trim(), weight, isNegative }),
      });
      setSolutions((prev) =>
        prev.map((s) =>
          s.id === solution.id ? { ...s, keywords: [...s.keywords, res.data] } : s,
        ),
      );
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  };

  const deleteKeyword = async (solutionId: string, keywordId: string, label: string) => {
    if (!confirm(`Remove keyword "${label}" from this solution?`)) return;
    setError(null);
    try {
      await api(`/api/solutions/${solutionId}/keywords/${keywordId}`, { method: 'DELETE' });
      setSolutions((prev) =>
        prev.map((s) =>
          s.id === solutionId
            ? { ...s, keywords: s.keywords.filter((k) => k.id !== keywordId) }
            : s,
        ),
      );
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div>
      <form onSubmit={createSolution} className="form-row mb-20">
        <div className="form-group grow-2">
          <label className="detail-label" htmlFor="sol-name">New solution name</label>
          <input
            id="sol-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Networking & Wi-Fi"
            maxLength={120}
          />
        </div>
        <div className="form-group grow-3">
          <label className="detail-label" htmlFor="sol-desc">Description</label>
          <input
            id="sol-desc"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="What this solution covers"
            maxLength={500}
          />
        </div>
        <div className="form-group fixed">
          <button className="btn" type="submit" disabled={busy || newName.trim().length < 2}>
            Add Solution
          </button>
        </div>
      </form>

      {error && (
        <div className="section alert-error">
          {error}
        </div>
      )}

      {solutions.length === 0 ? (
        <div className="empty">No solutions yet — add your first one above.</div>
      ) : (
        solutions.map((solution) => (
          <SolutionCard
            key={solution.id}
            solution={solution}
            onToggle={() => patchSolution(solution.id, { isActive: !solution.isActive })}
            onDelete={() => deleteSolution(solution.id)}
            onAddKeyword={addKeyword}
            onDeleteKeyword={deleteKeyword}
          />
        ))
      )}
    </div>
  );
}

function SolutionCard({
  solution,
  onToggle,
  onDelete,
  onAddKeyword,
  onDeleteKeyword,
}: {
  solution: SolutionView;
  onToggle: () => void;
  onDelete: () => void;
  onAddKeyword: (
    solution: SolutionView,
    keyword: string,
    weight: number,
    isNegative: boolean,
  ) => Promise<boolean>;
  onDeleteKeyword: (solutionId: string, keywordId: string, label: string) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [weight, setWeight] = useState(1);
  const [negative, setNegative] = useState(false);

  return (
    <div className="section mb-16">
      <div className="section-header">
        <div>
          <h3>
            {solution.name}{' '}
            <span className="counts">({solution.slug})</span>
          </h3>
          <div className="counts">
            {solution.keywords.length} keyword(s) · {solution.tenderCount} matched tender(s)
          </div>
        </div>
        <div className="header-actions">
          <span className={`status ${solution.isActive ? 'status-ok' : 'status-err'}`}>
            {solution.isActive ? 'Active' : 'Inactive'}
          </span>
          <button type="button" className="button secondary btn-sm" onClick={onToggle}>
            {solution.isActive ? 'Disable' : 'Enable'}
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      {solution.description && <p className="block-desc">{solution.description}</p>}

      {solution.keywords.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Match</th>
              <th>Weight</th>
              <th>Type</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {solution.keywords.map((k) => (
              <tr key={k.id}>
                <td>{k.keyword}</td>
                <td>{k.matchType}</td>
                <td>{k.weight}</td>
                <td>
                  <span className={`status ${k.isNegative ? 'status-err' : 'status-ok'}`}>
                    {k.isNegative ? 'Negative' : 'Positive'}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => onDeleteKeyword(solution.id, k.id, k.keyword)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form
        className="form-row mt-12"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await onAddKeyword(solution, keyword, weight, negative);
          if (ok) {
            setKeyword('');
            setNegative(false);
          }
        }}
      >
        <div className="form-group grow-3">
          <label className="detail-label">Add keyword</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. access control"
            maxLength={200}
          />
        </div>
        <div className="form-group grow-1">
          <label className="detail-label">Weight</label>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
          />
        </div>
        <div className="form-group fixed">
          <label className="detail-label">&nbsp;</label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={negative}
              onChange={(e) => setNegative(e.target.checked)}
            />
            Negative
          </label>
        </div>
        <div className="form-group fixed">
          <label className="detail-label">&nbsp;</label>
          <button className="btn" type="submit" disabled={keyword.trim().length === 0}>
            Add Keyword
          </button>
        </div>
      </form>
    </div>
  );
}
