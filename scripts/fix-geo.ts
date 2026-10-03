// One-off geo cleanup: drop stored city values the strict parser would reject
// and queue those rows (plus rows with no city+state at all) for re-parsing
// from the bid document with the improved city list.
import { prisma } from '../src/lib/prisma';
import { findKnownCity } from '../src/services/bidDocument';

async function main() {
  const rows = await prisma.tender.findMany({
    where: { isDemo: false },
    select: {
      id: true,
      consigneeCity: true,
      consigneeState: true,
      bidEndDate: true,
    },
  });

  const now = new Date();
  let cleared = 0;
  let requeuedNoGeo = 0;

  for (const row of rows) {
    // keep a city only when the stored value itself is a known city
    const badCity =
      row.consigneeCity !== null &&
      (findKnownCity(row.consigneeCity) ?? '').toLowerCase() !== row.consigneeCity.toLowerCase();
    const noGeo = row.consigneeCity === null && row.consigneeState === null;
    const active = row.bidEndDate !== null && row.bidEndDate >= now;
    if (badCity) {
      await prisma.tender.update({
        where: { id: row.id },
        data: { consigneeCity: null, cityNormalized: null, documentCheckedAt: null },
      });
      cleared += 1;
    } else if (noGeo && active) {
      await prisma.tender.update({
        where: { id: row.id },
        data: { documentCheckedAt: null },
      });
      requeuedNoGeo += 1;
    }
  }

  console.log(`[fix-geo] scanned=${rows.length} clearedBadCity=${cleared} requeuedNoGeo=${requeuedNoGeo}`);
}

main()
  .catch((err) => {
    console.error('[fix-geo] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
