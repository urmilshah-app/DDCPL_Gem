// ---------------------------------------------------------------------------
// Client component for interactive dashboard buttons
// ---------------------------------------------------------------------------

'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function DashboardClient() {
  const [scanning, setScanning] = useState<null | 'normal' | 'deep'>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleScan = async (deep: boolean) => {
    if (scanning) return;
    const mode = deep ? 'deep' : 'normal';
    setScanning(mode);
    setMessage(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(deep ? { deep: true } : {}),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const parts: string[] = [];
        if (data && typeof data === 'object') {
          if (typeof data.fetched === 'number') parts.push(`${data.fetched} fetched`);
          if (typeof data.created === 'number') parts.push(`${data.created} new`);
          if (typeof data.updated === 'number') parts.push(`${data.updated} updated`);
          if (typeof data.enriched === 'number') parts.push(`${data.enriched} enriched`);
          if (typeof data.errorCount === 'number' && data.errorCount > 0) {
            parts.push(`${data.errorCount} errors`);
          }
        }
        setMessage({
          ok: true,
          text: parts.length > 0 ? `Scan complete: ${parts.join(', ')}. Reloading…` : 'Scan complete. Reloading…',
        });
        window.location.reload();
      } else {
        let detail = '';
        try {
          const body = await res.json();
          detail = body?.error ? ` - ${body.error}` : '';
        } catch {
          detail = '';
        }
        setMessage({ ok: false, text: `Scan failed (${res.status})${detail}. Try again in a moment.` });
        setScanning(null);
      }
    } catch {
      setMessage({ ok: false, text: 'Scan failed - network error. Try again.' });
      setScanning(null);
    }
  };

  return (
    <div>
      <div className="actions dashboard-actions">
        <button
          onClick={() => handleScan(false)}
          disabled={scanning !== null}
          title="Scan up to 400 live GeM bid records across 14 keywords"
        >
          {scanning === 'normal' ? 'Scanning… (up to 2 min)' : 'Run Scan Now (400)'}
        </button>
        <button
          onClick={() => handleScan(true)}
          disabled={scanning !== null}
          title="Scan up to 600 live GeM bid records with PDF enrichment"
        >
          {scanning === 'deep' ? 'Deep scanning… (up to 3 min)' : 'Deep Scan (600 + enrichment)'}
        </button>
        <span className="action-divider" aria-hidden="true" />
        <Link href="/solutions" className="button secondary" title="Add, edit or disable solution options and their keywords">
          Manage Solutions
        </Link>
        <Link href="/watchlists" className="button secondary" title="Create and manage tender watchlists">
          Watchlists
        </Link>
      </div>
      {message ? (
        <p className={message.ok ? 'scan-message scan-ok' : 'scan-message scan-err'} role="status">
          {message.text}
        </p>
      ) : scanning ? (
        <p className="scan-message scan-run" role="status">
          Contacting GeM and fetching live bids… this page reloads automatically when the scan finishes.
        </p>
      ) : null}
    </div>
  );
}
