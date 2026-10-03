// ---------------------------------------------------------------------------
// Root dashboard - independent GeM tender monitoring (server component)
// ---------------------------------------------------------------------------

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Prisma, TenderStatus } from '@prisma/client';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

const EXCLUDED_STATUS: TenderStatus[] = [TenderStatus.CLOSED, TenderStatus.EXPIRED];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthBounds(ym?: string): { start: Date; end: Date; label: string; value: string } {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  if (ym && /^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) {
    const parts = ym.split('-');
    y = Number(parts[0]);
    m = Number(parts[1]) - 1;
  }
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 1);
  const value = `${y}-${String(m + 1).padStart(2, '0')}`;
  const label = `${MONTH_NAMES[m]} ${y}`;
  return { start, end, label, value };
}

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return out;
}

function fmtDate(d: Date | null): string {
  if (!d) return '-';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

function enrichedOf(run: { details: unknown }): number | null {
  const d = run.details as { enriched?: unknown } | null;
  return d && typeof d.enriched === 'number' ? d.enriched : null;
}

function relTime(d: Date | null): string {
  if (!d) return '-';
  const secs = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  return fmtDate(d);
}

function daysLeft(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function statusCls(status: string, days: number | null): string {
  if (status === 'CLOSED' || status === 'EXPIRED') return 'status-err';
  if (status === 'SHORTLISTED' || status === 'VIEWED') return 'status-ok';
  if (days !== null && days <= 3) return 'status-err';
  if (days !== null && days <= 7) return 'status-warn';
  return 'status-ok';
}

function num(v: string | string[] | undefined): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

type Filters = {
  view: string;
  ym?: string;
  solutionId?: string;
  city?: string;
  state?: string;
  releaseFrom?: string;
  releaseTo?: string;
  endFrom?: string;
  endTo?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dateParam(v: string | string[] | undefined): string | undefined {
  const s = num(v);
  if (!s || !DATE_RE.test(s)) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? s : undefined;
}

function startOfDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function endOfDayExclusive(s: string): Date {
  const dt = startOfDay(s);
  dt.setDate(dt.getDate() + 1);
  return dt;
}

function readFilters(sp: { [key: string]: string | string[] | undefined }): Filters {
  const view = num(sp.view) || 'current';
  return {
    view: ['current', 'all', 'expired', 'total'].includes(view) ? view : 'current',
    ym: num(sp.month),
    solutionId: num(sp.solution),
    city: num(sp.city),
    state: num(sp.state),
    releaseFrom: dateParam(sp.relFrom),
    releaseTo: dateParam(sp.relTo),
    endFrom: dateParam(sp.endFrom),
    endTo: dateParam(sp.endTo),
  };
}

// Solution / city / state / date conditions (no view or month logic), so each
// section can ignore its own dimension while keeping the others.
function dimensionAnd(f: Filters, exclude?: 'solution' | 'city' | 'state'): Prisma.TenderWhereInput[] {
  const and: Prisma.TenderWhereInput[] = [];
  if (f.solutionId && exclude !== 'solution') {
    and.push({ solutions: { some: { solutionId: f.solutionId } } });
  }
  if (f.city && exclude !== 'city') and.push({ consigneeCity: { equals: f.city, mode: 'insensitive' } });
  if (f.state && exclude !== 'state') and.push({ consigneeState: { equals: f.state, mode: 'insensitive' } });

  const releaseRange: Prisma.DateTimeFilter = {};
  if (f.releaseFrom) releaseRange.gte = startOfDay(f.releaseFrom);
  if (f.releaseTo) releaseRange.lt = endOfDayExclusive(f.releaseTo);
  if (Object.keys(releaseRange).length > 0) and.push({ publishedAt: releaseRange });

  const endRange: Prisma.DateTimeFilter = {};
  if (f.endFrom) endRange.gte = startOfDay(f.endFrom);
  if (f.endTo) endRange.lt = endOfDayExclusive(f.endTo);
  if (Object.keys(endRange).length > 0) and.push({ bidEndDate: endRange });

  return and;
}

function baseWhere(f: Filters, exclude?: 'solution' | 'city' | 'state'): Prisma.TenderWhereInput {
  const now = new Date();
  const { start, end } = monthBounds(f.ym);
  const and: Prisma.TenderWhereInput[] = [];

  if (f.view === 'expired') {
    and.push({
      OR: [{ bidEndDate: { lt: now } }, { status: { in: EXCLUDED_STATUS } }],
    });
  } else {
    and.push({ bidEndDate: { gte: now }, status: { notIn: EXCLUDED_STATUS } });
    if (f.view === 'current') {
      and.push({ publishedAt: { gte: start, lt: end } });
    }
  }
  and.push(...dimensionAnd(f, exclude));

  return { AND: and };
}

// Build a dashboard href that keeps every other active filter in place, so
// clicking a solution / city / state card never silently drops the rest.
const URL_PARAM: Record<string, string> = {
  ym: 'month',
  solutionId: 'solution',
  city: 'city',
  state: 'state',
  releaseFrom: 'relFrom',
  releaseTo: 'relTo',
  endFrom: 'endFrom',
  endTo: 'endTo',
};

function hrefFor(
  f: Filters,
  override?: Partial<Record<keyof Filters, string | null>>,
): string {
  const next: Partial<Record<keyof Filters, string | null>> = { ...f };
  if (override) Object.assign(next, override);
  const p = new URLSearchParams();
  p.set('view', typeof next.view === 'string' && next.view ? next.view : f.view);
  for (const [key, param] of Object.entries(URL_PARAM)) {
    const value = next[key as keyof Filters];
    if (typeof value === 'string' && value) p.set(param, value);
  }
  return `/?${p.toString()}`;
}

async function getTenders(f: Filters) {
  return prisma.tender.findMany({
    where: baseWhere(f),
    orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { bidEndDate: 'asc' }],
    take: 250,
    include: { solutions: { include: { solution: true } } },
  });
}

async function getStats(f: Filters) {
  const now = new Date();
  const { start, end } = monthBounds(f.ym);
  const dims = dimensionAnd(f);
  const active = { bidEndDate: { gte: now }, status: { notIn: EXCLUDED_STATUS } };
  const expiredCond = { OR: [{ bidEndDate: { lt: now } }, { status: { in: EXCLUDED_STATUS } }] };
  const [total, released, monthActive, allActive, expired, shortlisted] = await Promise.all([
    prisma.tender.count(),
    prisma.tender.count({ where: { AND: [...dims, { publishedAt: { gte: start, lt: end } }] } }),
    prisma.tender.count({ where: { AND: [active, ...dims, { publishedAt: { gte: start, lt: end } }] } }),
    prisma.tender.count({ where: { AND: [active, ...dims] } }),
    prisma.tender.count({ where: { AND: [expiredCond, ...dims] } }),
    prisma.tender.count({ where: { AND: [{ status: TenderStatus.SHORTLISTED }, ...dims] } }),
  ]);
  return { total, released, monthActive, allActive, expired, shortlisted, monthLabel: monthBounds(f.ym).label };
}

async function getSolutionStats(f: Filters) {
  const [cats, counts] = await Promise.all([
    prisma.solutionCategory.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.tenderSolution.groupBy({
      by: ['solutionId'],
      _count: { _all: true },
      where: { tender: baseWhere(f, 'solution') },
    }),
  ]);
  const map = new Map(counts.map((c) => [c.solutionId, c._count._all]));
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    color: c.color,
    count: map.get(c.id) || 0,
  }));
}

async function getCityStats(f: Filters) {
  const rows = await prisma.tender.groupBy({
    by: ['consigneeCity'],
    _count: { _all: true },
    where: { AND: [...((baseWhere(f, 'city').AND as Prisma.TenderWhereInput[]) ?? []), { consigneeCity: { not: null } }] },
  });
  return rows
    .filter((r) => r.consigneeCity)
    .map((r) => ({ city: r.consigneeCity as string, count: r._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

async function getFilterOptions() {
  const [solutions, cities, states] = await Promise.all([
    prisma.solutionCategory.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.tender.findMany({
      where: { consigneeCity: { not: null } },
      distinct: ['consigneeCity'],
      orderBy: { consigneeCity: 'asc' },
      select: { consigneeCity: true },
    }),
    prisma.tender.findMany({
      where: { consigneeState: { not: null } },
      distinct: ['consigneeState'],
      orderBy: { consigneeState: 'asc' },
      select: { consigneeState: true },
    }),
  ]);
  return {
    solutions,
    cities: cities.map((c) => c.consigneeCity as string).filter(Boolean),
    states: states.map((s) => s.consigneeState as string).filter(Boolean),
  };
}

async function getLastRun() {
  return prisma.sourceRun.findFirst({ orderBy: { startedAt: 'desc' } });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const filters = readFilters(searchParams);
  const current = monthBounds();

  let stats: Awaited<ReturnType<typeof getStats>>;
  let tenders: Awaited<ReturnType<typeof getTenders>>;
  let solutionStats: Awaited<ReturnType<typeof getSolutionStats>>;
  let cityStats: Awaited<ReturnType<typeof getCityStats>>;
  let options: Awaited<ReturnType<typeof getFilterOptions>>;
  let lastRun: Awaited<ReturnType<typeof getLastRun>> = null;
  let dbError: string | null = null;

  try {
    [stats, tenders, solutionStats, cityStats, options, lastRun] = await Promise.all([
      getStats(filters),
      getTenders(filters),
      getSolutionStats(filters),
      getCityStats(filters),
      getFilterOptions(),
      getLastRun(),
    ]);
  } catch (e) {
    dbError = e instanceof Error ? e.message : 'Database unavailable';
    stats = {
      total: 0, released: 0, monthActive: 0, allActive: 0,
      expired: 0, shortlisted: 0, monthLabel: current.label,
    };
    tenders = [];
    solutionStats = [];
    cityStats = [];
    options = { solutions: [], cities: [], states: [] };
  }

  const viewTabs = [
    { key: 'current', label: 'Current Month Active' },
    { key: 'all', label: 'All Active' },
    { key: 'expired', label: 'Expired / Closed' },
    { key: 'total', label: 'Everything' },
  ];

  const activeFilters: { label: string; href: string }[] = [];
  if (filters.solutionId) {
    const name = options.solutions.find((s) => s.id === filters.solutionId)?.name ?? 'Solution';
    activeFilters.push({
      label: `Solution: ${name}`,
      href: hrefFor(filters, { solutionId: null }),
    });
  }
  if (filters.city) {
    activeFilters.push({ label: `City: ${filters.city}`, href: hrefFor(filters, { city: null }) });
  }
  if (filters.state) {
    activeFilters.push({ label: `State: ${filters.state}`, href: hrefFor(filters, { state: null }) });
  }
  if (filters.releaseFrom) {
    activeFilters.push({
      label: `Released from ${fmtDate(startOfDay(filters.releaseFrom))}`,
      href: hrefFor(filters, { releaseFrom: null }),
    });
  }
  if (filters.releaseTo) {
    activeFilters.push({
      label: `Released until ${fmtDate(startOfDay(filters.releaseTo))}`,
      href: hrefFor(filters, { releaseTo: null }),
    });
  }
  if (filters.endFrom) {
    activeFilters.push({
      label: `Deadline from ${fmtDate(startOfDay(filters.endFrom))}`,
      href: hrefFor(filters, { endFrom: null }),
    });
  }
  if (filters.endTo) {
    activeFilters.push({
      label: `Deadline until ${fmtDate(startOfDay(filters.endTo))}`,
      href: hrefFor(filters, { endTo: null }),
    });
  }
  if (filters.ym) {
    activeFilters.push({ label: `Month: ${monthBounds(filters.ym).label}`, href: hrefFor({ ...filters, ym: undefined }) });
  }

  return (
    <div className="container">
      <div className="section-header">
        <div>
          <h1>Tender Monitoring Dashboard</h1>
          <p className="page-subtitle">
            Independent read-only monitor - never bids or opens tenders on GeM.
            Server date: {current.label}
          </p>
        </div>
        <DashboardClient />
      </div>

      <div className="section scan-strip">
        <div className="section-header">
          <h2>Last scan run</h2>
          <span className="counts">{lastRun ? `started ${relTime(lastRun.startedAt)}` : 'not run yet'}</span>
        </div>
        {lastRun ? (
          <div className="counts">
            <span className="count">
              Status:{' '}
              <span className={`status ${lastRun.sourceOk ? 'status-ok' : 'status-err'}`}>{lastRun.status}</span>
            </span>
            <span className="count">Fetched: {lastRun.fetched}</span>
            <span className="count">New: {lastRun.newCount}</span>
            <span className="count">Updated: {lastRun.updatedCount}</span>
            <span className="count">Enriched: {enrichedOf(lastRun) ?? '-'}</span>
            <span className="count">Errors: {lastRun.errorCount}</span>
            {lastRun.error ? (
              <span className="count geo-no" title={lastRun.error}>
                Error: {lastRun.error.length > 90 ? `${lastRun.error.slice(0, 90)}…` : lastRun.error}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="empty">No scan has run yet. Use Run Scan Now above.</div>
        )}
      </div>

      {dbError && (
        <div className="section alert-error">
          <strong>Database unavailable:</strong> {dbError}
        </div>
      )}

      <div className="grid">
        <div className="card">
          <h3>Current Month Released</h3>
          <div className="value">{stats.released}</div>
          <div className="counts">release date in {stats.monthLabel}</div>
        </div>
        <div className="card">
          <h3>Current Month Active</h3>
          <div className="value">{stats.monthActive}</div>
          <div className="counts">released this month and still open</div>
        </div>
        <div className="card">
          <h3>All Active</h3>
          <div className="value">{stats.allActive}</div>
          <div className="counts">deadline not passed, any month</div>
        </div>
        <div className="card">
          <h3>Total In Database</h3>
          <div className="value">{stats.total}</div>
          <div className="counts">all tenders ever collected</div>
        </div>
        <div className="card">
          <h3>Expired / Closed</h3>
          <div className="value">{stats.expired}</div>
          <div className="counts">deadline passed or closed</div>
        </div>
        <div className="card">
          <h3>Shortlisted</h3>
          <div className="value">{stats.shortlisted}</div>
          <div className="counts">saved for review</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <div className="tabs">
            {viewTabs.map((t) => (
              <Link
                key={t.key}
                href={hrefFor({ ...filters, view: t.key })}
                className={`tab ${filters.view === t.key ? 'active' : ''}`}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <span className="counts">{tenders.length} shown (max 250)</span>
        </div>

        {activeFilters.length > 0 && (
          <div className="active-filters">
            <span className="counts">Active filters:</span>
            {activeFilters.map((af) => (
              <Link key={af.label} href={af.href} className="filter-chip" title="Remove this filter">
                {af.label} <span aria-hidden="true">✕</span>
              </Link>
            ))}
            <Link href={hrefFor({ view: filters.view })} className="filter-chip filter-clear" title="Clear all filters">
              Clear all
            </Link>
          </div>
        )}

        <form method="get" action="/" className="form-row">
          <div className="form-group">
            <label className="detail-label" htmlFor="view">View</label>
            <select id="view" name="view" defaultValue={filters.view}>
              {viewTabs.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="detail-label" htmlFor="month">Release month</label>
            <select id="month" name="month" defaultValue={filters.ym || current.value}>
              {monthOptions().map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="detail-label" htmlFor="solution">Solution</label>
            <select id="solution" name="solution" defaultValue={filters.solutionId || ''}>
              <option value="">All solutions</option>
              {options.solutions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="detail-label" htmlFor="city">City</label>
            <select id="city" name="city" defaultValue={filters.city || ''}>
              <option value="">All cities</option>
              {options.cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="detail-label" htmlFor="state">State</label>
            <select id="state" name="state" defaultValue={filters.state || ''}>
              <option value="">All states</option>
              {options.states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="detail-label" htmlFor="relFrom">Release date from</label>
            <input type="date" id="relFrom" name="relFrom" defaultValue={filters.releaseFrom || ''} />
          </div>
          <div className="form-group">
            <label className="detail-label" htmlFor="relTo">Release date to</label>
            <input type="date" id="relTo" name="relTo" defaultValue={filters.releaseTo || ''} />
          </div>
          <div className="form-group">
            <label className="detail-label" htmlFor="endFrom">Bid deadline from</label>
            <input type="date" id="endFrom" name="endFrom" defaultValue={filters.endFrom || ''} />
          </div>
          <div className="form-group">
            <label className="detail-label" htmlFor="endTo">Bid deadline to</label>
            <input type="date" id="endTo" name="endTo" defaultValue={filters.endTo || ''} />
          </div>
          <div className="form-group fixed">
            <button type="submit" className="btn">Apply Filters</button>
          </div>
          <div className="form-group fixed">
            <Link href="/" className="btn btn-secondary btn-sm">Reset</Link>
          </div>
        </form>

        <div className="table-wrap mt-16">
          {tenders.length === 0 ? (
            <div className="empty">No tenders match the selected filters.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tender ID</th>
                  <th>Solution</th>
                  <th>Tender</th>
                  <th>Organization</th>
                  <th>City</th>
                  <th>Released</th>
                  <th>Deadline</th>
                  <th>Days Left</th>
                  <th>Status</th>
                  <th>GeM</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((t) => {
                  const dl = daysLeft(t.bidEndDate);
                  return (
                    <tr key={t.id}>
                      <td><code>{t.bidNumber}</code></td>
                      <td>
                        <div className="chips">
                          {t.solutions.length === 0 ? (
                            <span className="chip">Unclassified</span>
                          ) : (
                            t.solutions.map((ts) => (
                              <span key={ts.id} className="chip">{ts.solution.name}</span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="name-cell">
                        <Link href={`/tenders/${t.id}`} title={t.title}>{t.title}</Link>
                      </td>
                      <td className="desc-cell">{t.organization || t.buyerName || '-'}</td>
                      <td>{t.consigneeCity || '-'}</td>
                      <td>{fmtDate(t.publishedAt)}</td>
                      <td>{fmtDate(t.bidEndDate)}</td>
                      <td className={dl !== null && dl <= 3 ? 'score-low' : ''}>
                        {dl === null ? '-' : dl}
                      </td>
                      <td>
                        <span className={`status ${statusCls(t.status, dl)}`}>{t.status}</span>
                      </td>
                      <td>
                        {t.sourceUrl ? (
                          <a
                            href={t.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm"
                          >
                            Open
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Solution-wise</h2>
          <span className="counts">click a solution to filter (keeps your city / state / month)</span>
        </div>
        <div className="grid mb-0">
          {solutionStats.length === 0 ? (
            <div className="empty">No solution categories found. Run the seed.</div>
          ) : (
            solutionStats.map((s) => {
              const selected = filters.solutionId === s.id;
              return (
                <Link
                  key={s.id}
                  href={hrefFor(filters, { solutionId: selected ? null : s.id })}
                  className={`card filter-card${selected ? ' selected' : ''}`}
                >
                  <h3>{s.icon ? `${s.icon} ` : ''}{s.name}</h3>
                  <div className="value">{s.count}</div>
                  <div className="counts">{selected ? 'selected - click to clear' : 'active tenders'}</div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>City-wise</h2>
          <span className="counts">click a city to filter (keeps your solution / state / month)</span>
        </div>
        <div className="grid mb-0">
          {cityStats.length === 0 ? (
            <div className="empty">No active tenders with a city yet.</div>
          ) : (
            cityStats.map((c) => {
              const selected = filters.city === c.city;
              return (
                <Link
                  key={c.city}
                  href={hrefFor(filters, { city: selected ? null : c.city })}
                  className={`card filter-card${selected ? ' selected' : ''}`}
                >
                  <h3>{c.city}</h3>
                  <div className="value">{c.count}</div>
                  <div className="counts">{selected ? 'selected - click to clear' : 'active tenders'}</div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
