// ---------------------------------------------------------------------------
// Scheduled worker: runs the live GeM scan on the configured interval.
// Usage: npm run worker            (loop)
//        npm run worker -- --once  (single run)
// ---------------------------------------------------------------------------

import { getActiveConfig } from '../src/lib/config/active';
import { runLiveScan } from '../src/services/liveScan';
import { prisma } from '../src/lib/prisma';

async function tick(): Promise<void> {
  const started = Date.now();
  const stats = await runLiveScan({ trigger: 'SCHEDULED' });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (stats.error) {
    console.error(`[worker] scan failed in ${seconds}s: ${stats.error}`);
    return;
  }
  console.log(
    `[worker] scan done in ${seconds}s: fetched=${stats.fetched} created=${stats.created} ` +
      `updated=${stats.updated} matched=${stats.matched} enriched=${stats.enriched} ` +
      `pages=${stats.pages} requests=${stats.requests}`,
  );
}

async function main(): Promise<void> {
  const once = process.argv.includes('--once');
  const config = await getActiveConfig();
  const intervalMs = Math.max(1, config.scanIntervalMinutes) * 60_000;

  if (once) {
    await tick();
    await prisma.$disconnect();
    return;
  }

  console.log(`[worker] starting, interval=${config.scanIntervalMinutes}min`);
  for (;;) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

main().catch((err) => {
  console.error('[worker] fatal:', err);
  process.exit(1);
});
