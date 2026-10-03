// ---------------------------------------------------------------------------
// Live GeM source client (bidplus.gem.gov.in).
// Handles session cookies + CSRF token, ongoing bid pages, keyword search and
// bid document (PDF) download. All network calls are throttled and budgeted.
// ---------------------------------------------------------------------------

import { lookup as systemLookup, Resolver } from 'node:dns';
import type { LookupFunction } from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';
import { RateLimiter } from '@/lib/async';
import type { RawTenderRecord } from '@/services/collector';

// The default resolver on some networks returns a stale/wrong A record for
// bidplus.gem.gov.in (connect timeout), so resolve GeM hosts against public
// DNS first and fall back to the system resolver if that fails.
const publicResolver = new Resolver();
publicResolver.setServers(['8.8.8.8', '1.1.1.1']);

const resilientLookup: LookupFunction = (hostname, options, callback) => {
  publicResolver.resolve4(hostname, (err, addresses) => {
    const ips = !err && addresses && addresses.length > 0 ? addresses : null;
    if (ips) {
      if (options.all) callback(null, ips.map((address) => ({ address, family: 4 })));
      else callback(null, ips[0], 4);
      return;
    }
    systemLookup(hostname, options as never, callback);
  });
};

const gemAgent = new Agent({ connect: { lookup: resilientLookup } });

type UndiciRequestInit = NonNullable<Parameters<typeof undiciFetch>[1]>;

const BASE = 'https://bidplus.gem.gov.in';
const PAGE_URL = `${BASE}/all-bids`;
const LIST_URL = `${BASE}/all-bids-data`;
const SEARCH_URL = `${BASE}/search-bids`;
const STATE_LIST_URL = `${BASE}/state-list-adv`;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export type OngoingSort =
  | 'Bid-Start-Date-Latest'
  | 'Bid-Start-Date-Oldest'
  | 'Bid-End-Date-Latest'
  | 'Bid-End-Date-Oldest';

type Maybe<T> = T | T[] | null | undefined;

export interface GemDoc {
  id?: string;
  b_id?: Maybe<number>;
  b_bid_number?: Maybe<string>;
  b_bid_number_parent?: Maybe<string>;
  b_id_parent?: Maybe<number>;
  b_bid_type?: Maybe<number>;
  b_category_name?: Maybe<string>;
  bd_category_name?: Maybe<string>;
  b_total_quantity?: Maybe<number>;
  b_cat_id?: Maybe<string>;
  ba_official_details_minName?: Maybe<string>;
  ba_official_details_deptName?: Maybe<string>;
  final_start_date_sort?: Maybe<string>;
  final_end_date_sort?: Maybe<string>;
}

export interface GemPage {
  docs: GemDoc[];
  numFound: number;
  start: number;
}

export interface GemSourceOptions {
  requestTimeoutMs?: number;
  maxRequests?: number;
}

function first<T>(value: Maybe<T>): T | undefined {
  if (value === null || value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | undefined | null): string | null {
  if (!value) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text || /^(n\/?a|na|none|-)$/i.test(text)) return null;
  return text;
}

// GeM full-text search rejects query operators (e.g. "-" in "wi-fi" returns
// HTTP 404), so strip everything outside [A-Za-z0-9 ] before searching.
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[^A-Za-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function documentUrlFor(doc: GemDoc): string | null {
  const id = first(doc.b_id);
  if (!id) return null;
  const type = first(doc.b_bid_type) ?? 0;
  const parentId = first(doc.b_id_parent);
  if ((type === 2 || type === 5) && parentId) return `${BASE}/showbidDocument/${parentId}`;
  if (type === 5) return `${BASE}/showdirectradocumentPdf/${id}`;
  if (type === 2) return `${BASE}/showradocumentPdf/${id}`;
  return `${BASE}/showbidDocument/${id}`;
}

export function mapGemDoc(doc: GemDoc): RawTenderRecord | null {
  const bidNumber = clean(first(doc.b_bid_number));
  if (!bidNumber) return null;
  const startRaw = first(doc.final_start_date_sort);
  const endRaw = first(doc.final_end_date_sort);
  const startAt = startRaw ? new Date(startRaw) : null;
  const endAt = endRaw ? new Date(endRaw) : null;
  const ministry = clean(first(doc.ba_official_details_minName));
  const department = clean(first(doc.ba_official_details_deptName));
  const organization = [ministry, department].filter((x): x is string => Boolean(x)).join(' / ');
  const title = clean(first(doc.b_category_name)) ?? bidNumber;
  const description = clean(first(doc.bd_category_name));
  const quantity = first(doc.b_total_quantity);
  const type = first(doc.b_bid_type) ?? 0;

  return {
    externalId: bidNumber,
    title,
    description,
    category: null,
    organization: organization || null,
    stateName: null,
    cityName: null,
    addressText: null,
    deadlineAt: endAt && !Number.isNaN(endAt.getTime()) ? endAt : null,
    publishedAt: startAt && !Number.isNaN(startAt.getTime()) ? startAt : null,
    url: documentUrlFor(doc),
    bidType: type === 2 || type === 5 ? 'RA' : 'BID',
    quantity: quantity === undefined || quantity === null ? null : String(quantity),
    ministry,
    department,
  };
}

interface SessionState {
  cookies: Map<string, string>;
  token: string;
}

export class GemSource {
  private readonly limiter: RateLimiter;
  private session: SessionState = { cookies: new Map(), token: '' };
  private requests = 0;
  private readonly requestTimeoutMs: number;
  private readonly maxRequests: number;

  constructor(options: GemSourceOptions = {}) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
    this.maxRequests = options.maxRequests ?? 800;
    this.limiter = new RateLimiter(4, 1000);
  }

  get requestCount(): number {
    return this.requests;
  }

  get budgetLeft(): number {
    return Math.max(0, this.maxRequests - this.requests);
  }

  private cookieHeader(): string {
    return Array.from(this.session.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private absorbCookies(res: Response): void {
    const header = res.headers as Headers & { getSetCookie?: () => string[] };
    const raw: string[] =
      typeof header.getSetCookie === 'function'
        ? header.getSetCookie()
        : res.headers.get('set-cookie')
          ? [res.headers.get('set-cookie') as string]
          : [];
    for (const line of raw) {
      const pair = line.split(';')[0] ?? '';
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (name) this.session.cookies.set(name, value);
    }
  }

  private async call(
    url: string,
    init: UndiciRequestInit,
    timeoutMs = this.requestTimeoutMs,
  ): Promise<Response> {
    await this.limiter.acquire();
    this.requests += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return (await undiciFetch(url, {
        ...init,
        signal: controller.signal,
        redirect: 'follow',
        dispatcher: gemAgent,
      })) as unknown as Response;
    } finally {
      clearTimeout(timer);
    }
  }

  async ensureSession(force = false): Promise<SessionState> {
    if (!force && this.session.token) return this.session;
    if (force) this.session = { cookies: new Map(), token: '' };
    const res = await this.call(PAGE_URL, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`GeM session request failed: HTTP ${res.status} path=${new URL(PAGE_URL).pathname}`);
    this.absorbCookies(res);
    const html = await res.text();
    const match = html.match(/csrf_bd_gem_nk['"]?\s*[:=]\s*['"]([a-f0-9]{16,})/);
    if (!match) throw new Error('GeM CSRF token not found in listing page');
    this.session = { cookies: this.session.cookies, token: match[1] };
    return this.session;
  }

  private async postForm(url: string, payload: Record<string, unknown>): Promise<unknown> {
    let attempt = 0;
    let lastError: Error = new Error('GeM request failed');
    for (;;) {
      try {
        const session = await this.ensureSession(attempt > 0);
        const body = new URLSearchParams();
        body.set('payload', JSON.stringify(payload));
        body.set('csrf_bd_gem_nk', session.token);
        const res = await this.call(url, {
          method: 'POST',
          headers: {
            'user-agent': USER_AGENT,
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-requested-with': 'XMLHttpRequest',
            referer: PAGE_URL,
            origin: BASE,
            cookie: this.cookieHeader(),
          },
          body: body.toString(),
        });
        this.absorbCookies(res);
        const text = await res.text();
        const json = safeJson(text);
        const code = json && typeof json === 'object' ? (json as { code?: number }).code : undefined;
        if (res.ok && code === 200) return json;
        lastError = new Error(
          `GeM request failed: HTTP ${res.status} code=${code ?? 'n/a'} path=${new URL(url, BASE).pathname} attempt=${attempt}`,
        );
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
      if (attempt >= 3) throw lastError;
      attempt += 1;
      await sleep(attempt * 1500);
    }
  }

  private extractResponse(json: unknown): GemPage {
    const root = json as { response?: { response?: { docs?: GemDoc[]; numFound?: number; start?: number } } };
    const inner = root?.response?.response;
    if (!inner || !Array.isArray(inner.docs)) throw new Error('GeM response missing docs');
    return { docs: inner.docs, numFound: inner.numFound ?? inner.docs.length, start: inner.start ?? 0 };
  }

  async fetchOngoingPage(options: {
    page: number;
    searchBid?: string;
    sort?: OngoingSort;
    endDateFrom?: string;
    endDateTo?: string;
  }): Promise<GemPage> {
    const payload = {
      page: options.page,
      param: {
        searchBid: options.searchBid ?? '',
        searchType: 'fullText',
      },
      filter: {
        bidStatusType: 'ongoing_bids',
        byType: 'all',
        highBidValue: '',
        byEndDate: { from: options.endDateFrom ?? '', to: options.endDateTo ?? '' },
        sort: options.sort ?? 'Bid-Start-Date-Latest',
      },
    };
    const json = await this.postForm(LIST_URL, payload);
    return this.extractResponse(json);
  }

  async fetchStateFilteredPage(options: {
    page: number;
    stateName: string;
    cityName?: string;
    endDateFrom?: string;
    endDateTo?: string;
  }): Promise<GemPage> {
    const payload = {
      searchType: 'con',
      state_name_con: options.stateName,
      city_name_con: options.cityName ?? '',
      bidEndFromCon: options.endDateFrom ?? '',
      bidEndToCon: options.endDateTo ?? '',
      page: options.page,
    };
    const json = await this.postForm(SEARCH_URL, payload);
    return this.extractResponse(json);
  }

  async fetchStates(): Promise<Array<{ stateName: string; stateId: string }>> {
    const json = await this.postForm(STATE_LIST_URL, {});
    const rows = (json as { data?: Array<{ state_name?: string; state_id?: string }> })?.data ?? [];
    return rows
      .map((r) => ({ stateName: (r.state_name ?? '').trim(), stateId: (r.state_id ?? '').trim() }))
      .filter((r) => r.stateName.length > 0);
  }

  async fetchDocument(url: string): Promise<Buffer> {
    const res = await this.call(
      url,
      {
        method: 'GET',
        headers: {
          'user-agent': USER_AGENT,
          accept: 'application/pdf,text/html;q=0.9,*/*;q=0.8',
          referer: PAGE_URL,
          cookie: this.cookieHeader(),
        },
      },
      Math.max(this.requestTimeoutMs, 30_000),
    );
    if (!res.ok) throw new Error(`GeM document request failed: HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length < 128) throw new Error('GeM document response too small');
    const head = bytes.subarray(0, 5).toString('latin1');
    if (!head.startsWith('%PDF')) throw new Error('GeM document response is not a PDF');
    return bytes;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
