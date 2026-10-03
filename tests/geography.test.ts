import { describe, it, expect } from 'vitest';
import { matchLocation, stateOrCityIsWatched } from '@/lib/geography';

describe('geography', () => {
  describe('matchLocation', () => {
    it('matches exact city', () => {
      const result = matchLocation({
        stateName: 'Gujarat',
        cityName: 'Ahmedabad',
        addressText: null,
        watchStateIds: [],
        watchCityIds: [],
        watchStateNames: ['Gujarat'],
        watchCityNames: ['Ahmedabad'],
      });
      expect(result.matchType).toBe('EXACT_CITY');
      expect(result.confidence).toBe(1);
    });

    it('matches state', () => {
      const result = matchLocation({
        stateName: 'Gujarat',
        cityName: null,
        addressText: null,
        watchStateIds: [],
        watchCityIds: [],
        watchStateNames: ['Gujarat'],
        watchCityNames: [],
      });
      expect(result.matchType).toBe('STATE_MATCH');
    });

    it('matches address text when city in address', () => {
      const result = matchLocation({
        stateName: 'Gujarat',
        cityName: 'Ahmedabad',
        addressText: 'Supply to Ahmedabad office',
        watchStateIds: [],
        watchCityIds: [],
        watchStateNames: ['Gujarat'],
        watchCityNames: ['Ahmedabad'],
      });
      // If city matches exactly, it returns EXACT_CITY
      expect(['EXACT_CITY', 'ADDRESS_MATCH']).toContain(result.matchType);
    });

    it('returns NO_MATCH when no match', () => {
      const result = matchLocation({
        stateName: 'Maharashtra',
        cityName: 'Mumbai',
        addressText: 'Delhi office',
        watchStateIds: [],
        watchCityIds: [],
        watchStateNames: ['Gujarat'],
        watchCityNames: ['Ahmedabad'],
      });
      expect(result.matchType).toBe('NO_MATCH');
    });
  });

  describe('stateOrCityIsWatched', () => {
    it('returns true for watched city', () => {
      const result = stateOrCityIsWatched(
        { states: [], cities: ['Ahmedabad'] },
        null,
        'Ahmedabad'
      );
      expect(result).toBe(true);
    });

    it('returns true for watched state', () => {
      const result = stateOrCityIsWatched(
        { states: ['Gujarat'], cities: [] },
        'Gujarat',
        null
      );
      expect(result).toBe(true);
    });

    it('returns false for unwatched', () => {
      const result = stateOrCityIsWatched(
        { states: ['Maharashtra'], cities: ['Mumbai'] },
        'Gujarat',
        'Ahmedabad'
      );
      expect(result).toBe(false);
    });
  });
});