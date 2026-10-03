// ---------------------------------------------------------------------------
// Live GeM scan orchestration: page/keyword sweeps, upsert + classify, then
// consignee enrichment from bid documents. Used by /api/scan and the worker.
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import { getActiveConfig } from '@/lib/config/active';
import { collectTenders, FetchResult, RawTenderRecord } from '@/services/collector';
import { GemSource, mapGemDoc, sanitizeSearchTerm } from '@/services/gemSource';
import { matchTender, MatcherOptions, isRelevant } from '@/services/matcher';
import { classifyTender, loadSolutionKeywords } from '@/services/classifier';
import { extractPdfText } from '@/lib/pdf';
import { parseBidDocument, extractStateFromText } from '@/services/bidDocument';

export interface LiveScanOptions {
  maxRecords?: number;
  maxPages?: number;
  keywordTerms?: number;
  keywordPagesPerTerm?: number;
  enrichLimit?: number;
  trigger?: 'MANUAL' | 'SCHEDULED';
}

export interface LiveScanStats {
  source: 'GEM_LIVE';
  fetched: number;
  created: number;
  updated: number;
  matched: number;
  enriched: number;
  classified: number;
  failed: number;
  pages: number;
  requests: number;
  durationMs: number;
  error?: string | null;
}

interface HeadCursor {
  p: 'head' | 'kw';
  n: number;
  k?: number;
}

function parseCursor(cursor?: string): HeadCursor {
  if (!cursor) return { p: 'head', n: 1 };
  try {
    const parsed = JSON.parse(cursor) as HeadCursor;
    if (parsed && (parsed.p === 'head' || parsed.p === 'kw') && typeof parsed.n === 'number') {
      return parsed;
    }
  } catch {
    // fall through to default cursor
  }
  return { p: 'head', n: 1 };
}

async function knownBidNumbers(records: RawTenderRecord[]): Promise<Set<string>> {
  const ids = records.map((r) => r.externalId).filter(Boolean);
  if (ids.length === 0) return new Set();
  const rows = await prisma.tender.findMany({
    where: { bidNumber: { in: ids } },
    select: { bidNumber: true },
  });
  return new Set(rows.map((r) => r.bidNumber));
}

async function sweepTerms(limit: number): Promise<string[]> {
  const rows = await prisma.solutionKeyword.findMany({
    where: { solution: { isActive: true }, isNegative: false },
    orderBy: { weight: 'desc' },
    take: 80,
    select: { keyword: true, weight: true },
  });
  const terms: string[] = [];
  for (const row of rows) {
    const term = sanitizeSearchTerm(row.keyword ?? '');
    if (term.length < 4 || term.length > 40) continue;
    if (terms.includes(term)) continue;
    terms.push(term);
    if (terms.length >= limit) break;
  }
  return terms;
}

export async function runLiveScan(options: LiveScanOptions = {}): Promise<LiveScanStats> {
  const startedAt = Date.now();
  const config = await getActiveConfig();
  const maxRecords = options.maxRecords ?? 400;
  const maxPages = options.maxPages ?? 60;
  const keywordTermLimit = options.keywordTerms ?? 14;
  const keywordPagesPerTerm = options.keywordPagesPerTerm ?? 4;
  const enrichLimit = options.enrichLimit ?? 60;

  const stats: LiveScanStats = {
    source: 'GEM_LIVE',
    fetched: 0,
    created: 0,
    updated: 0,
    matched: 0,
    enriched: 0,
    classified: 0,
    failed: 0,
    pages: 0,
    requests: 0,
    durationMs: 0,
    error: null,
  };

  let source: GemSource | null = null;

  try {
    source = new GemSource({
      requestTimeoutMs: config.requestTimeoutMs,
      maxRequests: config.dailyRequestLimit,
    });
    const gem = source;
    await gem.ensureSession();

    const terms = await sweepTerms(keywordTermLimit);
    const solutionKeywords = await loadSolutionKeywords(prisma);

    const keywordsResult = await prisma.watchlistKeyword.findMany({
      where: { isActive: true, watchlist: { isActive: true } },
      include: { keyword: true },
    });
    const watchKeywords = keywordsResult
      .filter((wk) => wk.keyword.isActive)
      .map((wk) => wk.keyword.keyword)
      .filter((k): k is string => Boolean(k));

    const citiesResult = await prisma.watchlistLocation.findMany({
      where: { watchlist: { isActive: true }, cityId: { not: null } },
      include: { city: true },
    });
    const watchCityNames = citiesResult
      .map((wl) => wl.city?.name)
      .filter((c): c is string => Boolean(c));

    const statesResult = await prisma.watchlistLocation.findMany({
      where: { watchlist: { isActive: true }, stateId: { not: null } },
      include: { state: true },
    });
    const watchStateNames = statesResult
      .map((wl) => wl.state?.name)
      .filter((s): s is string => Boolean(s));

    const matcherOpts: MatcherOptions = {
      keywords: watchKeywords,
      watchCityNames,
      watchStateNames,
      minRelevanceForAlert: config.minRelevanceForAlert,
    };

    const collected: RawTenderRecord[] = [];

    const fetchPage = async (
      cursor?: string,
    ): Promise<{ records: RawTenderRecord[]; nextCursor?: string | null }> => {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const result = await fetchPageInner(cursor);
          collected.push(...result.records);
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        }
      }
      stats.error = lastError ? lastError.message : 'page fetch failed';
      stats.failed += 1;
      const state = cursor ? parseCursor(cursor) : null;
      if (state && state.p === 'kw') {
        const nextK = (state.k ?? 0) + 1;
        const nextCursor =
          nextK >= terms.length
            ? JSON.stringify({ p: 'head', n: 1 })
            : JSON.stringify({ p: 'kw', k: nextK, n: 1 });
        return { records: [], nextCursor };
      }
      return { records: [], nextCursor: null };
    };

    const fetchPageInner = async (
      cursor?: string,
    ): Promise<{ records: RawTenderRecord[]; nextCursor?: string | null }> => {
      if (gem.budgetLeft <= 0) return { records: [], nextCursor: null };
      const state = cursor
        ? parseCursor(cursor)
        : terms.length > 0
          ? { p: 'kw', k: 0, n: 1 }
          : { p: 'head', n: 1 };

      if (state.p === 'kw') {
        const k = state.k ?? 0;
        if (k >= terms.length) {
          return { records: [], nextCursor: JSON.stringify({ p: 'head', n: 1 }) };
        }
        const page = await gem.fetchOngoingPage({
          page: state.n,
          searchBid: terms[k],
          sort: 'Bid-Start-Date-Latest',
        }).catch((err: unknown) => {
          throw new Error(
            `${err instanceof Error ? err.message : String(err)} [kw term=${terms[k]} page=${state.n} req=${gem.requestCount}]`,
          );
        });
        stats.pages += 1;
        const mapped = page.docs
          .map((doc) => mapGemDoc(doc))
          .filter((r): r is RawTenderRecord => Boolean(r));
        const known = await knownBidNumbers(mapped);
        const fresh = mapped.filter((r) => !known.has(r.externalId));
        const stopTerm =
          page.docs.length < 10 ||
          state.n >= keywordPagesPerTerm ||
          (state.n > 1 && mapped.length > 0 && fresh.length === 0);
        if (stopTerm) {
          const nextK = k + 1;
          if (nextK >= terms.length) {
            return { records: mapped, nextCursor: JSON.stringify({ p: 'head', n: 1 }) };
          }
          return { records: mapped, nextCursor: JSON.stringify({ p: 'kw', k: nextK, n: 1 }) };
        }
        return { records: mapped, nextCursor: JSON.stringify({ p: 'kw', k, n: state.n + 1 }) };
      }

      const page = await gem
        .fetchOngoingPage({ page: state.n, sort: 'Bid-Start-Date-Latest' })
        .catch((err: unknown) => {
          throw new Error(
            `${err instanceof Error ? err.message : String(err)} [head page=${state.n} req=${gem.requestCount}]`,
          );
        });
      stats.pages += 1;
      const mapped = page.docs
        .map((doc) => mapGemDoc(doc))
        .filter((r): r is RawTenderRecord => Boolean(r));
      const known = await knownBidNumbers(mapped);
      const fresh = mapped.filter((r) => !known.has(r.externalId));
      const caughtUp = state.n > 1 && mapped.length > 0 && fresh.length === 0;
      const exhausted = page.docs.length < 10;
      if (caughtUp || exhausted) return { records: mapped, nextCursor: null };
      return { records: mapped, nextCursor: JSON.stringify({ p: 'head', n: state.n + 1 }) };
    };

    let fetchResult: FetchResult;
    try {
      fetchResult = await collectTenders({
        fetchPage,
        requestTimeoutMs: 120_000,
        maxConcurrentRequests: config.maxConcurrentRequests,
        dailyRequestLimit: config.dailyRequestLimit,
        demoMode: false,
        maxRecords,
        maxPages,
      });
    } catch (err) {
      stats.error = err instanceof Error ? err.message : String(err);
      fetchResult = { records: collected, source: 'GE M_LIVE', fetchedCount: collected.length };
    }

    stats.fetched = fetchResult.records.length;
    const deduped = new Map<string, RawTenderRecord>();
    for (const record of fetchResult.records) {
      if (!deduped.has(record.externalId)) deduped.set(record.externalId, record);
    }

    const now = new Date();
    for (const raw of deduped.values()) {
      try {
        const match = matchTender(
          {
            id: raw.externalId,
            title: raw.title,
            description: raw.description,
            category: raw.category,
            organization: raw.organization,
            cityName: raw.cityName,
            stateName: raw.stateName,
          },
          matcherOpts,
        );
        const relevant = isRelevant(match, matcherOpts.minRelevanceForAlert);
        if (relevant) stats.matched += 1;

        const stateFromText = extractStateFromText(
          [raw.organization, raw.ministry, raw.department, raw.title].filter(Boolean).join(' '),
        );
        const stateName = raw.stateName ?? stateFromText;

        const existing = await prisma.tender.findUnique({
          where: { bidNumber: raw.externalId },
          select: { id: true, status: true, releaseDateSource: true },
        });
        const keepDocumentDate = existing?.releaseDateSource === 'DOCUMENT';

        const data = {
          title: raw.title,
          description: raw.description,
          category: raw.category,
          organization: raw.organization,
          ministry: raw.ministry ?? undefined,
          department: raw.department ?? undefined,
          bidType: raw.bidType ?? undefined,
          quantity: raw.quantity ?? undefined,
          ...(stateName ? { consigneeState: stateName } : {}),
          ...(raw.cityName ? { consigneeCity: raw.cityName, cityNormalized: raw.cityName.toLowerCase() } : {}),
          ...(raw.addressText ? { consigneeAddress: raw.addressText } : {}),
          bidEndDate: raw.deadlineAt,
          bidStartAt: raw.publishedAt,
          ...(keepDocumentDate
            ? {}
            : {
                publishedAt: raw.publishedAt,
                releaseDateSource: raw.publishedAt ? 'SOURCE' : undefined,
              }),
          sourceUrl: raw.url,
          isDemo: false,
          scannedAt: now,
          lastCheckedAt: now,
          ...(relevant ? { status: 'SHORTLISTED' as const } : {}),
        };

        let tenderId: string;
        if (existing) {
          const updated = await prisma.tender.update({
            where: { id: existing.id },
            data: {
              ...data,
              status: relevant ? 'SHORTLISTED' : existing.status,
            },
            select: { id: true },
          });
          tenderId = updated.id;
          stats.updated += 1;
        } else {
          const created = await prisma.tender.create({
            data: {
              bidNumber: raw.externalId,
              ...data,
              status: relevant ? 'SHORTLISTED' : 'NEW',
            },
            select: { id: true },
          });
          tenderId = created.id;
          stats.created += 1;
        }

        const matches = classifyTender(
          {
            title: raw.title,
            description: raw.description,
            category: raw.category,
            organization: raw.organization,
          },
          solutionKeywords,
        );
        if (matches.length > 0) {
          stats.classified += 1;
          await prisma.$transaction([
            prisma.tenderSolution.deleteMany({ where: { tenderId } }),
            ...matches.map((m) =>
              prisma.tenderSolution.create({
                data: {
                  tenderId,
                  solutionId: m.solutionId,
                  confidence: m.confidence,
                  matchedKeywords: m.matchedKeywords,
                  detectedBy: 'AUTO',
                },
              }),
            ),
          ]);
        }
      } catch (err) {
        stats.failed += 1;
        console.error('[scan] record failed:', raw.externalId, err);
      }
    }

    stats.enriched = await enrichConsignees(gem, enrichLimit);
    stats.requests = gem.requestCount;

    const partial = Boolean(stats.error) && stats.fetched > 0;
    await prisma.sourceRun.create({
      data: {
        sourceKey: 'gem',
        trigger: options.trigger ?? 'MANUAL',
        status: partial ? 'PARTIAL' : stats.error ? 'FAILED' : 'COMPLETED',
        attempted: stats.fetched,
        fetched: stats.fetched,
        newCount: stats.created,
        updatedCount: stats.updated,
        skippedCount: Math.max(0, stats.fetched - stats.created - stats.updated),
        errorCount: stats.failed,
        sourceOk: !stats.error,
        error: stats.error ?? undefined,
        details: { enriched: stats.enriched, requests: stats.requests },
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    stats.error = err instanceof Error ? err.message : String(err);
    stats.requests = source ? source.requestCount : stats.requests;
    console.error('[scan] run failed:', err);
    try {
      await prisma.sourceRun.create({
        data: {
          sourceKey: 'gem',
          trigger: options.trigger ?? 'MANUAL',
          status: 'FAILED',
          attempted: stats.fetched,
          fetched: stats.fetched,
          newCount: stats.created,
          updatedCount: stats.updated,
          skippedCount: 0,
          errorCount: Math.max(1, stats.failed),
          sourceOk: false,
          error: stats.error ?? undefined,
          details: { enriched: stats.enriched, requests: stats.requests },
          finishedAt: new Date(),
        },
      });
    } catch (runErr) {
      console.error('[scan] failed to record source run:', runErr);
    }
  }

  stats.durationMs = Date.now() - startedAt;
  return stats;
}

async function enrichConsignees(source: GemSource, limit: number): Promise<number> {
  if (limit <= 0) return 0;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const candidates = await prisma.tender.findMany({
    where: {
      isDemo: false,
      consigneeCity: null,
      documentCheckedAt: null,
      sourceUrl: { not: null },
      OR: [{ publishedAt: { gte: monthStart } }, { bidEndDate: { gte: now } }],
    },
    orderBy: [{ publishedAt: 'desc' }, { bidEndDate: 'asc' }],
    take: limit,
    select: { id: true, sourceUrl: true, ministry: true, department: true, organization: true },
  });

  let enriched = 0;
  for (const candidate of candidates) {
    if (!candidate.sourceUrl) continue;
    if (source.budgetLeft <= 0) break;
    let patch: Record<string, unknown> | null = null;
    try {
      const buffer = await source.fetchDocument(candidate.sourceUrl);
      const text = await extractPdfText(buffer);
      const facts = parseBidDocument(text);
      const candidatePatch: Record<string, unknown> = {};
      if (facts.cityName) {
        candidatePatch.consigneeCity = facts.cityName;
        candidatePatch.cityNormalized = facts.cityName.toLowerCase();
      }
      if (facts.stateName) candidatePatch.consigneeState = facts.stateName;
      if (facts.addressText) candidatePatch.consigneeAddress = facts.addressText;
      if (facts.publishedAt) {
        candidatePatch.publishedAt = facts.publishedAt;
        candidatePatch.releaseDateSource = 'DOCUMENT';
      }
      if (!candidate.ministry && facts.ministry) candidatePatch.ministry = facts.ministry;
      if (!candidate.department && facts.department) candidatePatch.department = facts.department;
      if (!candidate.organization && facts.organisation) candidatePatch.organization = facts.organisation;
      patch = candidatePatch;
    } catch (err) {
      console.error('[scan] enrichment failed for', candidate.id, err);
    }
    const payload = {
      ...(patch ?? {}),
      documentCheckedAt: new Date(),
    };
    await prisma.tender.update({ where: { id: candidate.id }, data: payload });
    if (patch && (patch.consigneeCity || patch.consigneeState)) enriched += 1;
  }
  return enriched;
}
