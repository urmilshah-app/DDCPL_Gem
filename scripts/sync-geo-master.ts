// ---------------------------------------------------------------------------
// Sync State + City tables with the master geography list.
// Also ingests every city observed in tender data so watchlist location
// dropdowns can offer it.
// Run: npx tsx scripts/sync-geo-master.ts
// ---------------------------------------------------------------------------

import { prisma } from '../src/lib/prisma';
import { GEO_CITIES, GEO_STATES, stateCodeForName } from '../src/lib/geoMaster';
import { stateForCity } from '../src/services/bidDocument';

async function main() {
  const stateIdByCode = new Map<string, string>();

  for (const s of GEO_STATES) {
    const state = await prisma.state.upsert({
      where: { code: s.code },
      update: { name: s.name, shortName: s.code },
      create: { name: s.name, code: s.code, shortName: s.code },
    });
    stateIdByCode.set(s.code, state.id);
  }
  console.log(`states synced: ${stateIdByCode.size}`);

  let created = 0;
  for (const c of GEO_CITIES) {
    const stateId = stateIdByCode.get(c.stateCode);
    if (!stateId) continue;
    const existing = await prisma.city.findFirst({ where: { stateId, name: c.name } });
    if (existing) continue;
    await prisma.city.create({
      data: { id: `${stateId}-${c.name}`, name: c.name, stateId, normalized: c.name.toLowerCase() },
    });
    created += 1;
  }
  console.log(`master cities added: ${created}`);

  const tenderCities = await prisma.tender.groupBy({
    by: ['consigneeCity', 'consigneeState'],
    where: { consigneeCity: { not: null } },
  });

  let fromTenders = 0;
  const unresolved: string[] = [];
  for (const row of tenderCities) {
    const cityName = row.consigneeCity as string;
    if (!cityName) continue;
    // curated city -> state map wins; the tender's own state text is fallback
    const code = stateCodeForName(stateForCity(cityName)) ?? stateCodeForName(row.consigneeState);
    const stateId = code ? stateIdByCode.get(code) : undefined;
    if (!stateId) {
      unresolved.push(`${cityName} (${row.consigneeState ?? 'no state'})`);
      continue;
    }
    const existing = await prisma.city.findFirst({ where: { stateId, name: cityName } });
    if (existing) continue;
    await prisma.city.create({
      data: { id: `${stateId}-${cityName}`, name: cityName, stateId, normalized: cityName.toLowerCase() },
    });
    fromTenders += 1;
  }
  console.log(`tender cities added: ${fromTenders}`);

  // Repair duplicates / wrong states: the curated city -> state map wins.
  const allCities = await prisma.city.findMany({ select: { id: true, name: true, stateId: true } });
  const byName = new Map<string, { id: string; stateId: string }[]>();
  for (const c of allCities) {
    const list = byName.get(c.name) ?? [];
    list.push(c);
    byName.set(c.name, list);
  }

  let repaired = 0;
  for (const [name, rows] of byName) {
    const curated = stateCodeForName(stateForCity(name));
    const targetStateId = curated ? stateIdByCode.get(curated) : undefined;
    if (!targetStateId) continue;

    let keeperId = rows.find((r) => r.stateId === targetStateId)?.id;
    if (!keeperId) {
      const donor = rows[0];
      const refs = await prisma.watchlistLocation.count({ where: { cityId: donor.id } });
      if (refs > 0) {
        await prisma.city.update({ where: { id: donor.id }, data: { stateId: targetStateId } });
        keeperId = donor.id;
      } else {
        await prisma.city.delete({ where: { id: donor.id } }).catch(() => undefined);
        const createdRow = await prisma.city
          .create({
            data: {
              id: `${targetStateId}-${name}`,
              name,
              stateId: targetStateId,
              normalized: name.toLowerCase(),
            },
          })
          .catch(() => null);
        keeperId = createdRow?.id;
      }
      repaired += 1;
    }

    for (const row of rows) {
      if (!keeperId || row.id === keeperId) continue;
      await prisma.watchlistLocation
        .updateMany({ where: { cityId: row.id }, data: { cityId: keeperId } })
        .catch(() => undefined);
      await prisma.city.delete({ where: { id: row.id } }).catch(() => undefined);
      repaired += 1;
    }
  }
  console.log(`mis-stated / duplicate cities repaired: ${repaired}`);
  if (unresolved.length > 0) {
    console.log(`unresolved (${unresolved.length}): ${unresolved.slice(0, 20).join(', ')}`);
  }

  const [stateCount, cityCount] = await Promise.all([
    prisma.state.count(),
    prisma.city.count(),
  ]);
  console.log(`totals -> states: ${stateCount}, cities: ${cityCount}`);
}

main()
  .catch((err) => {
    console.error('sync-geo-master failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
