// ---------------------------------------------------------------------------
// Tender detail page — server component (matches actual schema)
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString();
}

function statusBadge(status: string) {
  const cls =
    status === 'SHORTLISTED' || status === 'VIEWED'
      ? 'status-ok'
      : status === 'NEW' || status === 'UPDATED'
        ? 'status-warn'
        : 'status-err';
  return <span className={`status ${cls}`}>{status}</span>;
}

function daysLeft(d: Date | null | undefined): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default async function TenderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const tender = await prisma.tender.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      matches: {
        include: { keywordRel: true },
        orderBy: { createdAt: 'desc' },
      },
      solutions: { include: { solution: true } },
    },
  });

  if (!tender) notFound();

  return (
    <div className="container">
      <Link href="/" className="back-link">&lt;- Back to tenders</Link>

      <header>
        <h1>{tender.title}</h1>
        <div className="header-actions">
          {statusBadge(tender.status)}
          {tender.isDemo && <span className="badge badge-warn">Demo</span>}
          {tender.sourceUrl && (
            <a href={tender.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
              Open on GeM
            </a>
          )}
        </div>
      </header>

      <div className="grid">
        <div className="card">
          <h3>Organization</h3>
          <div className="value">{tender.organization ?? '—'}</div>
        </div>
        <div className="card">
          <h3>Category</h3>
          <div className="value">{tender.category ?? '—'}</div>
        </div>
        <div className="card">
          <h3>Deadline</h3>
          <div className="value">{formatDate(tender.bidEndDate)}</div>
        </div>
        <div className="card">
          <h3>Days Left</h3>
          <div className="value">
            {(() => {
              const dl = daysLeft(tender.bidEndDate);
              if (dl === null) return '—';
              if (dl < 0) return 'Closed';
              return dl;
            })()}
          </div>
          <div className="counts">{tender.bidEndDate ? `closes ${formatDate(tender.bidEndDate)}` : 'no deadline'}</div>
        </div>
      </div>

      <section className="section">
        <h2>Basic Information</h2>
        <div className="detail-grid mt-16">
          <div className="detail-group">
            <div className="detail-label">Bid Number</div>
            <div className="detail-value">{tender.bidNumber}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">RA Number</div>
            <div className="detail-value">{tender.raNumber ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Organization</div>
            <div className="detail-value">{tender.organization ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Department</div>
            <div className="detail-value">{tender.department ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Buyer</div>
            <div className="detail-value">{tender.buyerName ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Category</div>
            <div className="detail-value">{tender.category ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Sub-category</div>
            <div className="detail-value">{tender.subCategory ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Bid Type</div>
            <div className="detail-value">{tender.bidType ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Ministry</div>
            <div className="detail-value">{tender.ministry ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Bid Validity</div>
            <div className="detail-value">{tender.bidValidityDays ? `${tender.bidValidityDays} days` : '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Estimated Value</div>
            <div className="detail-value">{tender.estimatedValue ? `₹${Number(tender.estimatedValue).toLocaleString()}` : '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Quantity</div>
            <div className="detail-value">{tender.quantity ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">BOQ Title</div>
            <div className="detail-value">{tender.boqTitle ?? '—'}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Location & Dates</h2>
        <div className="detail-grid mt-16">
          <div className="detail-group">
            <div className="detail-label">State</div>
            <div className="detail-value">{tender.consigneeState ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">City</div>
            <div className="detail-value">{tender.consigneeCity ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Address</div>
            <div className="detail-value">{tender.consigneeAddress ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">State Code</div>
            <div className="detail-value">{tender.stateCode ?? '—'}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Released</div>
            <div className="detail-value">
              {formatDate(tender.publishedAt)}
              {tender.releaseDateSource ? ` (${tender.releaseDateSource})` : ''}
            </div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Bid Start</div>
            <div className="detail-value">{formatDate(tender.bidStartDate)}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Bid End</div>
            <div className="detail-value">{formatDate(tender.bidEndDate)}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Bid Opening</div>
            <div className="detail-value">{formatDate(tender.bidOpeningDate)}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Source URL</div>
            <div className="detail-value">
              {tender.sourceUrl ? (
                <a href={tender.sourceUrl} target="_blank" rel="noopener noreferrer">{tender.sourceUrl}</a>
              ) : (
                '—'
              )}
            </div>
          </div>
        </div>
      </section>

      {tender.description && (
        <section className="section">
          <h2>Description</h2>
          <div className="pre-wrap mt-16">{tender.description}</div>
        </section>
      )}

      {tender.solutions.length > 0 && (
        <section className="section">
          <h2>Solution Classification ({tender.solutions.length})</h2>
          <div className="table-wrap mt-16">
            <table>
              <thead>
                <tr>
                  <th>Solution</th>
                  <th>Confidence</th>
                  <th>Matched keywords</th>
                </tr>
              </thead>
              <tbody>
                {tender.solutions.map((ts) => (
                  <tr key={ts.id}>
                    <td className="name-cell">{ts.solution.name}</td>
                    <td>{Math.round(ts.confidence * 100)}%</td>
                    <td>
                      <div className="chips">
                        {ts.matchedKeywords.map((k) => (
                          <span key={k} className="chip">{k}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tender.categories.length > 0 && (
        <section className="section">
          <h2>Categories ({tender.categories.length})</h2>
          <div className="chips mt-16">
            {tender.categories.map((tc) => (
              <span key={tc.id} className="chip">{tc.category.name}</span>
            ))}
          </div>
        </section>
      )}

      {tender.matches.length > 0 && (
        <section className="section">
          <h2>Keyword Matches ({tender.matches.length})</h2>
          <div className="table-wrap mt-16">
            <table>
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Kind</th>
                  <th>Matched At</th>
                </tr>
              </thead>
              <tbody>
                {tender.matches.map((m) => (
                  <tr key={m.id}>
                    <td>{m.keyword}</td>
                    <td>{m.kind}</td>
                    <td>{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="actions mt-24">
        <Link href="/" className="btn btn-secondary">Back to Dashboard</Link>
        <Link href="/watchlists" className="btn btn-secondary">Watchlists</Link>
      </div>
    </div>
  );
}
