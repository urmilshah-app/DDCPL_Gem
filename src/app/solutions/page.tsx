// ---------------------------------------------------------------------------
// Solutions admin page (server component) — custom classification rules
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { SolutionsAdmin, SolutionView } from './SolutionsAdmin';

export const dynamic = 'force-dynamic';

async function getSolutions(): Promise<SolutionView[]> {
  const solutions = await prisma.solutionCategory.findMany({
    include: {
      keywords: { orderBy: [{ weight: 'desc' }, { createdAt: 'asc' }] },
      _count: { select: { tenders: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return solutions.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    isActive: s.isActive,
    sortOrder: s.sortOrder,
    color: s.color,
    tenderCount: s._count.tenders,
    keywords: s.keywords.map((k) => ({
      id: k.id,
      keyword: k.keyword,
      weight: k.weight,
      matchType: k.matchType,
      isNegative: k.isNegative,
      minConfidence: k.minConfidence,
    })),
  }));
}

export default async function SolutionsPage() {
  const solutions = await getSolutions();

  return (
    <div className="container">
      <header>
        <h1>Solutions</h1>
        <div className="actions">
          <Link href="/" className="button secondary">Back to dashboard</Link>
        </div>
      </header>

      <p className="page-subtitle">
        Custom classification rules: tenders are matched against these keywords on every scan and
        grouped into the solutions they fit.
      </p>

      <SolutionsAdmin initial={solutions} />
    </div>
  );
}
