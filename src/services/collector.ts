// ---------------------------------------------------------------------------
// Tender collection orchestration (throttled GeM source polling).
// Uses only verified @/lib/async exports: retry, withTimeout, RateLimiter.
// ---------------------------------------------------------------------------

import { retry, withTimeout, RateLimiter } from '@/lib/async';
import { normalizeText } from '@/lib/strings';

export interface RawTenderRecord {
  externalId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  organization?: string | null;
  stateName?: string | null;
  cityName?: string | null;
  addressText?: string | null;
  deadlineAt?: Date | null;
  publishedAt?: Date | null;
  url?: string | null;
  bidType?: string | null;
  quantity?: string | null;
  ministry?: string | null;
  department?: string | null;
}

export interface FetchResult {
  records: RawTenderRecord[];
  source: 'GE M_LIVE' | 'DEMO';
  fetchedCount: number;
}

export interface CollectorDeps {
  fetchPage: (cursor?: string) => Promise<{ records: RawTenderRecord[]; nextCursor?: string | null }>;
  requestTimeoutMs: number;
  maxConcurrentRequests: number;
  dailyRequestLimit: number;
  demoMode: boolean;
  maxRecords?: number;
  maxPages?: number;
}

const POLL_INTERVAL_MS = 30_000;
const QUIET_MINUTES = [0, 0];

class Throttle {
  private limiter: RateLimiter;
  private sent = 0;

  constructor(private readonly dailyLimit: number) {
    this.limiter = new RateLimiter(5, 1000);
  }

  async acquire(): Promise<void> {
    await this.limiter.acquire();
    this.sent += 1;
  }

  canSend(): boolean {
    return this.sent < this.dailyLimit;
  }
}

export async function collectTenders(deps: CollectorDeps): Promise<FetchResult> {
  const throttle = new Throttle(deps.dailyRequestLimit);
  const maxRecords = deps.maxRecords ?? 100;
  const maxPages = deps.maxPages ?? 25;
  const records: RawTenderRecord[] = [];
  let cursor: string | undefined;
  let page = 0;

  while (throttle.canSend() && page < maxPages) {
    await throttle.acquire();

    const pageResult = await retry(
      () =>
        withTimeout(
          deps.fetchPage(cursor),
          deps.requestTimeoutMs,
          `GeM page fetch (cursor=${cursor ?? 'start'})`,
        ),
      { max: 4, initialDelayMs: 500 },
    );

    records.push(...pageResult.records);
    cursor = pageResult.nextCursor ?? undefined;

    if (records.length >= maxRecords || !cursor) break;
    page += 1;
  }

  const capped = records.slice(0, maxRecords);
  return {
    records: capped,
    source: deps.demoMode ? 'DEMO' : 'GE M_LIVE',
    fetchedCount: capped.length,
  };
}

// Reference clock captured once per process so demo records stay deterministic
const DEMO_NOW = new Date();
const DEMO_MONTH_START = new Date(DEMO_NOW.getFullYear(), DEMO_NOW.getMonth(), 1);
const DEMO_DAY_MS = 24 * 60 * 60 * 1000;

export function demoRecord(seed: number): RawTenderRecord {
  const pad = (n: number): string => String(n).padStart(6, '0');
  const city = seed % 4 === 0 ? 'Ahmedabad' : seed % 3 === 0 ? 'Gandhinagar' : 'Vadodara';
  const offset = seed % 10;
  const candidate = new Date(DEMO_MONTH_START.getTime() + offset * DEMO_DAY_MS);
  const release = candidate.getTime() > DEMO_NOW.getTime() ? DEMO_MONTH_START : candidate;
  const deadline = new Date(DEMO_NOW.getTime() + (14 + (seed % 20)) * DEMO_DAY_MS);
  return {
    externalId: `DEMO-${pad(seed)}`,
    title: `Supply and installation of ${normalizeText('CCTV cameras')} for ${city}`,
    description: `Tender for supply installation and maintenance of surveillance equipment in ${city} Gujarat.`,
    category: 'Security and Surveillance',
    organization: 'Gujarat Urban Development Authority',
    stateName: 'Gujarat',
    cityName: city,
    addressText: `Head office ${city}, Gujarat`,
    deadlineAt: deadline,
    publishedAt: release,
    url: `https://bid.gem.gov.in/tender/${pad(seed)}`,
  };
}
