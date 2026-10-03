// ---------------------------------------------------------------------------
// One-shot live GeM backfill/scan. Usage:
//   npx tsx scripts/scan-once.ts            (normal scan)
//   npx tsx scripts/scan-once.ts --deep     (deeper backfill + enrichment)
// ---------------------------------------------------------------------------

import { runLiveScan } from '../src/services/liveScan';

async function main() {
  const deep = process.argv.includes('--deep');
  console.log(`[scan-once] starting ${deep ? 'deep backfill' : 'normal'} scan...`);

  const stats = await runLiveScan({
    trigger: 'MANUAL',
    maxRecords: deep ? 600 : 400,
    maxPages: deep ? 120 : 60,
    keywordTerms: deep ? 20 : 14,
    keywordPagesPerTerm: deep ? 8 : 4,
    enrichLimit: deep ? Number(process.env.ENRICH_LIMIT ?? 250) : 60,
  });

  console.log('[scan-once] result:', JSON.stringify(stats, null, 2));
  if (stats.error) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('[scan-once] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  });
