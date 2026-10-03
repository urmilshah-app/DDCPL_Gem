'use client';

// ---------------------------------------------------------------------------
// Users admin client component — create / edit / deactivate / delete users.
// Self-protections (can't delete/disable/demote yourself) are mirrored from
// the API so the UI disables those controls too.
// ---------------------------------------------------------------------------

import { useState } from 'react';

export interface UserView {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
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

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

export default function UsersManager({
  initial,
  meId,
}: {
  initial: UserView[];
  meId: string;
}) {
  const [users, setUsers] = useState<UserView[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'USER'>('USER');

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'ADMIN' | 'USER'>('USER');
  const [editPassword, setEditPassword] = useState('');
  const [editActive, setEditActive] = useState(true);

  const fail = (err: unknown) => {
    setSuccess(null);
    setError(err instanceof Error ? err.message : 'Something went wrong');
  };
  const ok = (msg: string) => {
    setError(null);
    setSuccess(msg);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ data: UserView }>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      });
      setUsers((prev) => [...prev, res.data]);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('USER');
      ok(`User ${res.data.email} created`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (u: UserView) => {
    setEditingId(u.id);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPassword('');
    setEditActive(u.isActive);
    setError(null);
    setSuccess(null);
  };

  const saveEdit = async (id: string) => {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name: editName.trim(),
        email: editEmail.trim(),
      };
      if (editPassword) payload.password = editPassword;
      if (id !== meId) {
        payload.role = editRole;
        payload.isActive = editActive;
      }
      const res = await api<{ data: UserView }>(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...res.data } : u)));
      setEditingId(null);
      ok(`Updated ${res.data.email}`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (u: UserView) => {
    if (!confirm(`Delete ${u.email}? Their watchlists and data are removed too.`)) return;
    setBusy(true);
    try {
      await api(`/api/users/${u.id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      ok(`Deleted ${u.email}`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={createUser} className="section mb-16">
        <div className="section-header">
          <h3>Add user</h3>
        </div>
        <div className="form-row">
          <div className="form-group grow-2">
            <label className="detail-label" htmlFor="u-name">Full name</label>
            <input id="u-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Ravi Sharma" maxLength={120} required />
          </div>
          <div className="form-group grow-2">
            <label className="detail-label" htmlFor="u-email">Email (login)</label>
            <input id="u-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@company.com" maxLength={200} required />
          </div>
          <div className="form-group grow-2">
            <label className="detail-label" htmlFor="u-pass">Password (min 8)</label>
            <input id="u-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} maxLength={200} required autoComplete="new-password" />
          </div>
          <div className="form-group fixed">
            <label className="detail-label" htmlFor="u-role">Role</label>
            <select id="u-role" value={newRole} onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'USER')}>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="form-group fixed">
            <label className="detail-label">&nbsp;</label>
            <button className="btn" type="submit" disabled={busy || !newName || !newEmail || newPassword.length < 8}>
              Add User
            </button>
          </div>
        </div>
      </form>

      {error && <div className="section alert-error">{error}</div>}
      {success && <div className="section alert-ok">{success}</div>}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last login</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((u) =>
            editingId === u.id ? (
              <tr key={u.id}>
                <td>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={120} />
                </td>
                <td>
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} maxLength={200} />
                </td>
                <td>
                  <select
                    value={editRole}
                    disabled={u.id === meId}
                    onChange={(e) => setEditRole(e.target.value as 'ADMIN' | 'USER')}
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td>
                  <label className="check-label">
                    <input type="checkbox" checked={editActive} disabled={u.id === meId} onChange={(e) => setEditActive(e.target.checked)} />
                    Active
                  </label>
                  <input
                    type="password"
                    placeholder="New password (optional)"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                  />
                </td>
                <td colSpan={2}>
                  <div className="row-actions">
                    <button className="btn btn-sm" type="button" disabled={busy} onClick={() => saveEdit(u.id)}>
                      Save
                    </button>
                    <button className="button secondary btn-sm" type="button" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                  {u.id === meId && <span className="counts"> (you)</span>}
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`status ${u.role === 'ADMIN' ? 'status-ok' : ''}`}>{u.role}</span>
                </td>
                <td>
                  <span className={`status ${u.isActive ? 'status-ok' : 'status-err'}`}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>{fmt(u.lastLoginAt)}</td>
                <td>
                  <div className="row-actions">
                    <button className="button secondary btn-sm" type="button" onClick={() => startEdit(u)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      type="button"
                      disabled={u.id === meId}
                      title={u.id === meId ? 'You cannot delete yourself' : undefined}
                      onClick={() => deleteUser(u)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      {users.length === 0 && <div className="empty">No users yet.</div>}
    </div>
  );
}
