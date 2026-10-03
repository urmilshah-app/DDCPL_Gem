// Keyword tokenization + matching.
// Uses only names actually exported by ./strings:
//   normalizeText, tokenize, withoutStops, toSearchTokens, similarity.

import {
  normalizeText,
  tokenize,
  withoutStops,
  toSearchTokens,
  similarity,
} from "./strings";

export type MatchingOn = "TITLE" | "DESCRIPTION" | "BOQ" | "CATEGORY" | "ORGANIZATION";

export interface KeywordTokenSet {
  exact: string[];
  phrase: string[];
  contains: string[];
  all: string[];
}

export interface KeywordMatchOut {
  matched: boolean;
  on: MatchingOn | "NEGATIVE";
  score: number;
  hits: string[];
  isNegative: boolean;
}

export interface KeywordMatchOpts {
  minRelevance?: number;
  smileys?: boolean;
}

export function makeKeywordTokens(raw: string): KeywordTokenSet {
  const toks = withoutStops(tokenize(raw));
  const phrase = normalizeText(raw).replace(/\s+/g, " ").trim();
  return {
    exact: toks.filter((t) => t.length >= 2),
    phrase: phrase ? [phrase.slice(0, 240)] : [],
    contains: toks,
    all: toks,
  };
}

/** Match a single raw keyword token against normalized haystack text. */
export function matchKeywordAll({
  raw,
  hay,
  mode,
  excludedPrefix,
  threshold,
  synonyms,
}: {
  raw: string;
  hay: string;
  mode: string;
  excludedPrefix?: string;
  threshold?: number;
  synonyms?: Record<string, string[]>;
}): KeywordMatchOut {
  const isNegative =
    excludedPrefix !== undefined && raw.trim().toUpperCase().startsWith((excludedPrefix ?? "").toUpperCase());
  const clean = isNegative ? raw.trim().slice((excludedPrefix ?? "").length).trim() : raw.trim();

  const tokens = makeKeywordTokens(clean);
  const hayTokens = toSearchTokens(hay);
  const hayNormalized = normalizeText(hay);

  const hits: string[] = [];
  let score = 0;
  let matched = false;

  for (const t of tokens.exact) {
    if (hayTokens.includes(t)) {
      hits.push(t);
      matched = true;
      score = Math.max(score, 14);
    }
  }
  for (const p of tokens.phrase) {
    if (p && p.length >= 8 && hayNormalized.includes(p)) {
      hits.push(p);
      matched = true;
      score = Math.max(score, 16);
    }
  }
  if (matched && (threshold === undefined || score >= threshold)) {
    return {
      matched,
      on: isNegative ? "NEGATIVE" : score >= 15 ? "TITLE" : "DESCRIPTION",
      score,
      hits,
      isNegative,
    };
  }
  return { matched, on: isNegative ? "NEGATIVE" : "DESCRIPTION", score, hits, isNegative };
}

/** Aggregate a list of positive + negative keyword strips against normalized text. */

export interface AggregatedKeywordMatch {
  positives: KeywordMatchOut[];
  negatives: KeywordMatchOut[];
  anyHits: boolean;
  hasNegativeHit: boolean;
}

export function matchAllKeywordStrips({
  positives,
  negatives,
  text,
  excludedPrefix,
}: {
  positives: string[];
  negatives: string[];
  text: string;
  excludedPrefix?: string;
}): AggregatedKeywordMatch {
  const out: KeywordMatchOut[] = [];
  const negOut: KeywordMatchOut[] = [];
  const pref = excludedPrefix ?? "NOT";
  for (const k of positives) {
    const r = matchKeywordAll({ raw: k, hay: text, mode: "TITLE", excludedPrefix: pref });
    if (!r.isNegative && r.matched) out.push(r);
  }
  for (const k of negatives) {
    const r = matchKeywordAll({ raw: k, hay: text, mode: "DESCRIPTION", excludedPrefix: pref });
    if (r.matched && r.isNegative) {
      // ignore near-empty negative hits
      if (r.score >= 2) negOut.push(r);
    }
  }
  const anyHits = out.length > 0;
  const hasNegativeHit = negOut.some((r) => r.score >= 8);
  return { positives: out, negatives: negOut, anyHits, hasNegativeHit };
}

/** Compute total relevance from matched keywords plus boilerplate score. */
export function keywordRelevance(
  matches: KeywordMatchOut[],
  base: { titleSet: boolean; locationSet: boolean },
): number {
  const raw = matches.reduce((s, m) => s + m.score, 0);
  const titleBonus = base.titleSet ? 12 : 0;
  const locBonus = base.locationSet ? 8 : 0;
  return Math.min(100, raw + titleBonus + locBonus);
}
