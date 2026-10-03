// One-off: derive consigneeState from existing tender text where missing.
import { prisma } from '../src/lib/prisma';
import { extractStateFromText } from '../src/services/bidDocument';

async function main() {
  const rows = await prisma.tender.findMany({
    where: { consigneeState: null },
    select: { id: true, title: true, description: true, organization: true, ministry: true, department: true },
  });
  let updated = 0;
  for (const row of rows) {
    const text = [row.organization, row.ministry, row.department, row.title, row.description]
      .filter(Boolean)
      .join(' ');
    const state = extractStateFromText(text);
    if (!state) continue;
    await prisma.tender.update({ where: { id: row.id }, data: { consigneeState: state } });
    updated += 1;
  }
  console.log(`[backfill-state] scanned=${rows.length} updated=${updated}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
