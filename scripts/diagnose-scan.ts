// Diagnostic: walk each sweep term page-by-page to find the failing request.
import { prisma } from '../src/lib/prisma';
import { GemSource, mapGemDoc, sanitizeSearchTerm } from '../src/services/gemSource';

async function terms(): Promise<string[]> {
  const rows = await prisma.solutionKeyword.findMany({
    where: { solution: { isActive: true }, isNegative: false },
    orderBy: { weight: 'desc' },
    take: 80,
    select: { keyword: true },
  });
  const out: string[] = [];
  for (const row of rows) {
    const t = sanitizeSearchTerm(row.keyword ?? '');
    if (t.length < 4 || t.length > 40) continue;
    if (out.includes(t)) continue;
    out.push(t);
    if (out.length >= 16) break;
  }
  return out;
}

async function main() {
  const list = await terms();
  console.log('[diag] terms:', JSON.stringify(list));
  const source = new GemSource({ requestTimeoutMs: 20000, maxRequests: 400 });
  await source.ensureSession();

  for (const term of list) {
    for (let page = 1; page <= 6; page += 1) {
      try {
        const res = await source.fetchOngoingPage({ page, searchBid: term, sort: 'Bid-Start-Date-Latest' });
        const mapped = res.docs.filter((d) => mapGemDoc(d));
        console.log(`[diag] ok term="${term}" page=${page} docs=${res.docs.length} mapped=${mapped.length} numFound=${res.numFound}`);
        if (res.docs.length < 10) break;
      } catch (err) {
        console.log(`[diag] FAIL term="${term}" page=${page}: ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
        return;
      }
    }
  }

  console.log('[diag] keyword sweep ok, testing head pages 1..60');
  for (let page = 1; page <= 60; page += 1) {
    try {
      const res = await source.fetchOngoingPage({ page, sort: 'Bid-Start-Date-Latest' });
      if (page % 10 === 0 || res.docs.length < 10) {
        console.log(`[diag] ok head page=${page} docs=${res.docs.length} numFound=${res.numFound}`);
      }
      if (res.docs.length < 10) break;
    } catch (err) {
      console.log(`[diag] FAIL head page=${page}: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
      return;
    }
  }
  console.log('[diag] all pages ok, requests=' + source.requestCount);
}

main()
  .catch((err) => {
    console.error('[diag] crashed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
