// ---------------------------------------------------------------------------
// Tender relevance matcher (pure; no I/O).
// ---------------------------------------------------------------------------

import { normalizeText, toSearchTokens, withoutStops, similarity } from '@/lib/strings';

export interface MatcherTender {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  organization?: string | null;
  cityName?: string | null;
  stateName?: string | null;
}

export type MatchGrade = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface MatcherOptions {
  keywords: string[];
  watchCityNames: string[];
  watchStateNames: string[];
  minRelevanceForAlert: number;
}

export interface MatchResult {
  tenderId: string;
  score: number;
  grade: MatchGrade;
  matchedKeywords: string[];
  geoMatched: boolean;
  why: string;
}

export function matchTender(t: MatcherTender, opts: MatcherOptions): MatchResult {
  const titleTokens = withoutStops(toSearchTokens(t.title));
  const bodyTokens = withoutStops(
    toSearchTokens([t.description, t.category, t.organization].filter(Boolean).join(' ')),
  );

  const matchedKeywords: string[] = [];
  for (const kw of opts.keywords) {
    const kwTokens = withoutStops(toSearchTokens(kw));
    if (kwTokens.length === 0) continue;
    const inTitle = kwTokens.every((k) => titleTokens.includes(k));
    const inBody = kwTokens.every((k) => bodyTokens.includes(k));
    const fuzzy = kwTokens.some((k) =>
      titleTokens.some((x) => similarity(x, k) > 0.8),
    );
    if (inTitle || inBody || fuzzy) matchedKeywords.push(kw);
  }

  let geoMatched = false;
  if (t.cityName) {
    for (const c of opts.watchCityNames) {
      if (similarity(normalizeText(c), normalizeText(t.cityName)) > 0.8) {
        geoMatched = true;
        break;
      }
    }
  }
  if (!geoMatched && t.stateName) {
    for (const s of opts.watchStateNames) {
      if (similarity(normalizeText(s), normalizeText(t.stateName)) > 0.8) {
        geoMatched = true;
        break;
      }
    }
  }

  let score = 0;
  score += Math.min(70, matchedKeywords.length * 25);
  if (t.title.trim().length > 10) score += 8;
  if (t.description && t.description.length > 80) score += 6;
  if (geoMatched) score += 10;
  score = Math.max(0, Math.min(100, score));

  return {
    tenderId: t.id,
    score,
    grade: gradeFor(score),
    matchedKeywords,
    geoMatched,
    why: buildWhy(matchedKeywords.length, geoMatched, score),
  };
}

function gradeFor(score: number): MatchGrade {
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  if (score >= 30) return 'LOW';
  return 'NONE';
}

function buildWhy(matched: number, geo: boolean, score: number): string {
  const parts: string[] = [];
  if (matched > 0) parts.push(`${matched} keyword(s)`);
  if (geo) parts.push('location');
  parts.push(`score=${score}`);
  return parts.join(' | ');
}

export function isRelevant(m: MatchResult, threshold: number): boolean {
  return m.score >= threshold;
}
