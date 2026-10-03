// One-off geo backfill: fill missing state from the city (city->state map) and
// fill missing city from text already stored on the tender (address/org/title).
import { prisma } from '../src/lib/prisma';
import { findKnownCity, stateForCity, extractStateFromText } from '../src/services/bidDocument';

async function main() {
  const rows = await prisma.tender.findMany({
    where: { isDemo: false },
    select: {
      id: true,
      title: true,
      organization: true,
      department: true,
      ministry: true,
      consigneeCity: true,
      consigneeState: true,
      consigneeAddress: true,
    },
  });

  let stateFromCity = 0;
  let stateFromText = 0;
  let cityFilled = 0;

  for (const row of rows) {
    const patch: Record<string, unknown> = {};
    let city = row.consigneeCity;
    let state = row.consigneeState;

    if (!city) {
      const haystack = [
        row.consigneeAddress,
        row.organization,
        row.department,
        row.ministry,
        row.title,
      ]
        .filter(Boolean)
        .join(' ');
      const found = findKnownCity(haystack);
      if (found) {
        city = found;
        patch.consigneeCity = found;
        patch.cityNormalized = found.toLowerCase();
        cityFilled += 1;
      }
    }

    if (city && !state) {
      const mapped = stateForCity(city);
      if (mapped) {
        state = mapped;
        patch.consigneeState = mapped;
        stateFromCity += 1;
      }
    }

    if (!state && (row.consigneeAddress || row.organization)) {
      const fromText = extractStateFromText(
        [row.consigneeAddress, row.organization, row.department].filter(Boolean).join(' '),
      );
      if (fromText) {
        state = fromText;
        patch.consigneeState = fromText;
        stateFromText += 1;
      }
    }

    if (Object.keys(patch).length > 0) {
      await prisma.tender.update({ where: { id: row.id }, data: patch });
    }
  }

  console.log(
    `[backfill-geo] rows=${rows.length} cityFilled=${cityFilled} stateFromCity=${stateFromCity} stateFromText=${stateFromText}`,
  );
}

main()
  .catch((err) => {
    console.error('[backfill-geo] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
