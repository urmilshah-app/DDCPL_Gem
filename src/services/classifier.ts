// ---------------------------------------------------------------------------
// Solution classification: weighted keyword matching of tender text into
// the 17 solution categories (ELV, Fire, AV, Networking, Building Tech...).
// Pure logic here so it can be unit tested without a database.
// ---------------------------------------------------------------------------

import type { PrismaClient } from '@prisma/client';

export type SolutionKeywordLike = {
  solutionId: string;
  keyword: string;
  weight: number;
  matchType: string;
  isNegative: boolean;
  synonyms: string | null;
  minConfidence: number;
};

export type ClassificationInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  subCategory?: string | null;
  organization?: string | null;
  ministry?: string | null;
};

export type ClassificationResult = {
  solutionId: string;
  confidence: number;
  score: number;
  matchedKeywords: string[];
};

export type ClassifyOptions = {
  maxSolutions?: number;
  confidenceDivisor?: number;
};

export const DEFAULT_MAX_SOLUTIONS = 3;
const DEFAULT_CONFIDENCE_DIVISOR = 2;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termsFor(keyword: SolutionKeywordLike): string[] {
  const terms = [keyword.keyword];
  if (keyword.synonyms) {
    for (const part of keyword.synonyms.split(',')) {
      const term = part.trim();
      if (term) terms.push(term);
    }
  }
  return terms;
}

function termMatches(haystack: string, term: string, matchType: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return false;
  if (matchType === 'FUZZY') return haystack.includes(needle);
  if (matchType === 'EXACT') return haystack.trim() === needle;
  // allow a simple plural suffix so "camera" also matches "cameras"
  const pattern = `(^|[^a-z0-9])${escapeRegExp(needle)}(?:s|es)?([^a-z0-9]|$)`;
  return new RegExp(pattern).test(haystack);
}

export function buildHaystack(input: ClassificationInput): string {
  return [
    input.title,
    input.description,
    input.category,
    input.subCategory,
    input.organization,
    input.ministry,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' \n ')
    .toLowerCase();
}

export function classifyTender(
  input: ClassificationInput,
  keywords: SolutionKeywordLike[],
  options?: ClassifyOptions,
): ClassificationResult[] {
  const maxSolutions = options?.maxSolutions ?? DEFAULT_MAX_SOLUTIONS;
  const divisor = options?.confidenceDivisor ?? DEFAULT_CONFIDENCE_DIVISOR;
  const haystack = buildHaystack(input);

  const scores = new Map<string, { score: number; matched: string[]; threshold: number }>();
  const negative = new Set<string>();

  for (const keyword of keywords) {
    const hit = termsFor(keyword).some((term) => termMatches(haystack, term, keyword.matchType));
    if (!hit) continue;
    if (keyword.isNegative) {
      negative.add(keyword.solutionId);
      continue;
    }
    const entry = scores.get(keyword.solutionId) ?? { score: 0, matched: [], threshold: 0 };
    entry.score += keyword.weight;
    entry.matched.push(keyword.keyword);
    entry.threshold = Math.max(entry.threshold, keyword.minConfidence);
    scores.set(keyword.solutionId, entry);
  }

  const results: ClassificationResult[] = [];
  for (const [solutionId, entry] of scores) {
    if (negative.has(solutionId)) continue;
    const confidence = Math.min(1, Number((entry.score / divisor).toFixed(2)));
    if (confidence < entry.threshold) continue;
    results.push({
      solutionId,
      confidence,
      score: Number(entry.score.toFixed(2)),
      matchedKeywords: entry.matched,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, maxSolutions);
}

export async function loadSolutionKeywords(db: PrismaClient): Promise<SolutionKeywordLike[]> {
  return db.solutionKeyword.findMany({ where: { solution: { isActive: true } } });
}

export async function classifyAndSaveTender(
  db: PrismaClient,
  tenderId: string,
  input: ClassificationInput,
  options?: ClassifyOptions,
): Promise<ClassificationResult[]> {
  const keywords = await loadSolutionKeywords(db);
  const results = classifyTender(input, keywords, options);

  await db.$transaction([
    db.tenderSolution.deleteMany({ where: { tenderId } }),
    ...results.map((result) =>
      db.tenderSolution.create({
        data: {
          tenderId,
          solutionId: result.solutionId,
          confidence: result.confidence,
          matchedKeywords: result.matchedKeywords,
          detectedBy: 'AUTO',
        },
      }),
    ),
  ]);

  return results;
}
