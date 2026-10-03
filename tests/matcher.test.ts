import { describe, it, expect } from 'vitest';
import { matchTender, isRelevant } from '@/services/matcher';

const mockTender = {
  id: 'test-1',
  title: 'Supply and Installation of CCTV Cameras',
  description: 'Supply and installation of IP-based CCTV cameras',
  category: 'Security & Surveillance',
  organization: 'Gujarat Secretariat',
  stateName: 'Gujarat',
  cityName: 'Ahmedabad',
};

const mockOpts = {
  keywords: ['cctv', 'camera', 'installation', 'maintenance'],
  watchStateNames: ['Gujarat'],
  watchCityNames: ['Ahmedabad'],
  minRelevanceForAlert: 40,
};

describe('matcher', () => {
  describe('matchTender', () => {
    it('returns high score for matching tender', () => {
      const result = matchTender(mockTender, mockOpts);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
      expect(result.geoMatched).toBe(true);
    });

    it('returns matched keywords', () => {
      const result = matchTender(mockTender, mockOpts);
      expect(result.matchedKeywords).toContain('cctv');
      expect(result.matchedKeywords).toContain('camera');
      expect(result.matchedKeywords).toContain('installation');
    });

    it('detects geo match', () => {
      const result = matchTender(mockTender, mockOpts);
      expect(result.geoMatched).toBe(true);
    });

    it('returns low score for non-matching tender', () => {
      const nonMatchingTender = {
        id: 'test-2',
        title: 'Office Furniture Supply',
        description: 'Supply of office chairs and desks',
        category: 'Office Supplies',
        organization: 'Random Corp',
        stateName: 'Maharashtra',
        cityName: 'Mumbai',
      };
      const result = matchTender(nonMatchingTender, mockOpts);
      expect(result.score).toBeLessThan(40);
      expect(result.geoMatched).toBe(false);
    });
  });

  describe('isRelevant', () => {
    it('returns true for score above threshold', () => {
      expect(isRelevant({ score: 50, matchedKeywords: [], geoMatched: false, why: '', tenderId: 'test', grade: 'HIGH' }, 40)).toBe(true);
    });
    it('returns false for score below threshold', () => {
      expect(isRelevant({ score: 30, matchedKeywords: [], geoMatched: false, why: '', tenderId: 'test', grade: 'LOW' }, 40)).toBe(false);
    });
    it('returns true for score equal to threshold', () => {
      expect(isRelevant({ score: 40, matchedKeywords: [], geoMatched: false, why: '', tenderId: 'test', grade: 'MEDIUM' }, 40)).toBe(true);
    });
  });
});