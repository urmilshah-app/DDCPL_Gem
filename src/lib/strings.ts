const PUNCT_STOPS =
  /[\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00BF\u2000-\u206F\uFE00-\uFE0F\uFEFF]/gu;

export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'for', 'on', 'at', 'by', 'with',
  'from', 'as', 'per', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its',
  'this', 'that', 'these', 'those', 'there', 'their', 'than', 'then', 'i', 'we', 'you',
  'he', 'she', 'they', 'them', 'his', 'her', 'our', 'your', 'not', 'no', 'any', 'all',
  'each', 'both', 'either', 'neither', 'under', 'within', 'between', 'during', 'above',
  'along', 'over', 'through', 'against', 'about', 'after', 'before', 'such', 'etc',
  's', 't', 'd', 'll', 've', 're', 'm', 'o', 'eg', 'ie', 'viz',
]);

/** NFKD-normalize, strip diacritics & compatibility chars, lowercase. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036F\uFE00-\uFE0F]/g, '')
    .toLowerCase()
    .replace(PUNCT_STOPS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  return normalizeText(input).split(' ').filter(Boolean);
}

export function withoutStops(tokens: string[]): string[] {
  return tokens.filter((t) => !STOP_WORDS.has(t));
}

export function toSearchTokens(input: string): string[] {
  return withoutStops(tokenize(input));
}

export function pluralize(word: string): string {
  // very small, predictable pluralizer for matching (not grammar-perfect)
  const w = normalizeText(word);
  if (/(s|x|z|ch|sh)$/i.test(w)) return w + 'es';
  if (/[bcdfghjklmnpqrstvwxz]y$/i.test(w)) return w.slice(0, -1) + 'ies';
  return w + 's';
}

export function singularize(word: string): string {
  const w = normalizeText(word);
  if (/ies$/i.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
  if (/sses$/i.test(w)) return w.slice(0, -2);
  if (/(s|x|z|ch|sh)es$/i.test(w)) return w.slice(0, -2);
  if (/([^s])s$/i.test(w)) return w.slice(0, -1);
  return w;
}

export function stripSupplierLingo(input: string): string {
  // remove addresses/labels suppliers must not act on (kept out of keywords)
  return input
    .replace(/\b(sealed cover|technical bid|financial bid|earnest money deposit|emd|bid security)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const A = a.length;
  const B = b.length;
  if (A === 0) return B;
  if (B === 0) return A;
  let prev = new Array<number>(B + 1);
  let cur = new Array<number>(B + 1);
  for (let j = 0; j <= B; j++) prev[j] = j;
  for (let i = 1; i <= A; i++) {
    cur[0] = i;
    for (let j = 1; j <= B; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[B];
}

export function similarity(a: string, b: string): number {
  const A = normalizeText(a);
  const B = normalizeText(b);
  if (A === B) return 1;
  if (!A || !B) return 0;
  const max = Math.max(A.length, B.length);
  return 1 - levenshtein(A, B) / max;
}

export function slugify(input: string): string {
  return normalizeText(input).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return input.slice(0, max - 1).trimEnd() + '\u2026';
}

export function titleCase(input: string): string {
  return input.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}
