const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenders = await prisma.tender.findMany({
    select: { bidNumber: true, title: true, bidEndDate: true, publishedAt: true, status: true, isDemo: true },
    orderBy: { bidEndDate: 'asc' }
  });
  console.log(JSON.stringify(tenders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());