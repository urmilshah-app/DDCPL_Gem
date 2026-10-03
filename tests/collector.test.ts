import { describe, it, expect } from 'vitest';
import { collectTenders, demoRecord } from '@/services/collector';

describe('collector', () => {
  describe('demoRecord', () => {
    it('generates deterministic records', () => {
      const r1 = demoRecord(1);
      const r2 = demoRecord(1);
      expect(r1).toEqual(r2);
    });

    it('generates different records for different seeds', () => {
      const r1 = demoRecord(1);
      const r2 = demoRecord(2);
      expect(r1.externalId).not.toBe(r2.externalId);
    });

    it('includes required fields', () => {
      const record = demoRecord(0);
      expect(record.externalId).toMatch(/^DEMO-/);
      expect(record.title).toBeTruthy();
      expect(record.description).toBeTruthy();
      expect(record.organization).toBeTruthy();
      expect(record.stateName).toBeTruthy();
      expect(record.cityName).toBeTruthy();
      expect(record.deadlineAt).toBeInstanceOf(Date);
      expect(record.publishedAt).toBeInstanceOf(Date);
      expect(record.url).toMatch(/^https:\/\/bid\.gem\.gov\.in/);
    });
  });

  describe('collectTenders', () => {
    it('fetches demo records up to limit', async () => {
      const result = await collectTenders({
        fetchPage: async () => ({ records: [], nextCursor: null }),
        requestTimeoutMs: 5000,
        maxConcurrentRequests: 2,
        dailyRequestLimit: 100,
        demoMode: true,
      });
      // In demo mode it uses demoRecord - may return 0 if limit is 0
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('fetchedCount');
      expect(typeof result.fetchedCount).toBe('number');
    });

    it('respects daily limit', async () => {
      const result = await collectTenders({
        fetchPage: async () => ({ records: [], nextCursor: null }),
        requestTimeoutMs: 5000,
        maxConcurrentRequests: 2,
        dailyRequestLimit: 1,
        demoMode: true,
      });
      expect(result.fetchedCount).toBeLessThanOrEqual(25);
    });
  });
});