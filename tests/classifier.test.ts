import { describe, it, expect } from 'vitest';
import {
  classifyTender,
  buildHaystack,
  SolutionKeywordLike,
} from '@/services/classifier';

function kw(partial: Partial<SolutionKeywordLike> & { solutionId: string; keyword: string }): SolutionKeywordLike {
  return {
    weight: 1,
    matchType: 'CONTAINS',
    isNegative: false,
    synonyms: null,
    minConfidence: 0.5,
    ...partial,
  };
}

const keywords: SolutionKeywordLike[] = [
  kw({ solutionId: 'sol-cctv', keyword: 'cctv', weight: 2, matchType: 'PHRASE' }),
  kw({ solutionId: 'sol-cctv', keyword: 'surveillance camera', weight: 1.5, synonyms: 'ip camera, dome camera' }),
  kw({ solutionId: 'sol-fire', keyword: 'fire alarm', weight: 2, matchType: 'PHRASE' }),
  kw({ solutionId: 'sol-av', keyword: 'audio video', weight: 2, matchType: 'PHRASE' }),
  kw({ solutionId: 'sol-av', keyword: 'projector', weight: 1 }),
  kw({ solutionId: 'sol-negative', keyword: 'civil work', weight: 2, isNegative: true }),
];

describe('classifier', () => {
  it('builds a lowercase haystack from all text fields', () => {
    const hay = buildHaystack({
      title: 'Supply of CCTV',
      description: 'Installation',
      category: 'Security',
      organization: 'PWD',
    });
    expect(hay).toContain('cctv');
    expect(hay).toContain('pwd');
    expect(hay).not.toContain('CCTV');
  });

  it('classifies a CCTV tender into the surveillance solution', () => {
    const results = classifyTender(
      {
        title: 'Supply and installation of CCTV cameras for Secretariat',
        description: 'IP based surveillance system with NVR and 3 year AMC.',
      },
      keywords,
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].solutionId).toBe('sol-cctv');
    expect(results[0].confidence).toBeGreaterThan(0);
    expect(results[0].confidence).toBeLessThanOrEqual(1);
    expect(results[0].matchedKeywords).toContain('cctv');
  });

  it('does not match keywords inside longer words (boundary matching)', () => {
    const results = classifyTender({ title: 'Scattering of brochures' }, [
      kw({ solutionId: 'sol', keyword: 'cat', weight: 5, minConfidence: 0.1 }),
    ]);
    expect(results).toHaveLength(0);
  });

  it('matches simple plurals of a keyword', () => {
    const results = classifyTender({ title: 'Supply of twenty cameras' }, [
      kw({ solutionId: 'sol-cam', keyword: 'camera', weight: 2, minConfidence: 0.5 }),
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].solutionId).toBe('sol-cam');
  });

  it('matches plural keyword against plural text (switch/switches)', () => {
    const results = classifyTender({ title: 'Network switches and racks' }, [
      kw({ solutionId: 'sol-net', keyword: 'network switch', weight: 2, minConfidence: 0.5 }),
    ]);
    expect(results).toHaveLength(1);
  });

  it('matches synonyms', () => {
    const results = classifyTender({ title: 'Supply of dome camera units' }, keywords);
    expect(results.some((r) => r.solutionId === 'sol-cctv')).toBe(true);
  });

  it('honours negative keywords', () => {
    const results = classifyTender(
      { title: 'Fire alarm system with civil work' },
      [...keywords, kw({ solutionId: 'sol-civ', keyword: 'fire alarm', weight: 3 })],
    );
    expect(results.some((r) => r.solutionId === 'sol-negative')).toBe(false);
    expect(results.some((r) => r.solutionId === 'sol-civ')).toBe(true);
  });

  it('drops solutions below their minConfidence threshold', () => {
    const results = classifyTender({ title: 'Projector supply' }, [
      kw({ solutionId: 'sol-av', keyword: 'projector', weight: 1, minConfidence: 0.9 }),
    ]);
    expect(results).toHaveLength(0);
  });

  it('sorts by score and caps the number of solutions', () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      kw({ solutionId: `sol-${i}`, keyword: `unique${i}`, weight: 1 + i, minConfidence: 0.1 }),
    );
    const input = { title: 'unique0 unique1 unique2 unique3 unique4 unique5' };
    const results = classifyTender(input, many, { maxSolutions: 3 });
    expect(results).toHaveLength(3);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);
  });

  it('returns nothing when nothing matches', () => {
    expect(classifyTender({ title: 'Bandwidth supply of pens' }, keywords)).toHaveLength(0);
  });
});
