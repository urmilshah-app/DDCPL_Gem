import { describe, it, expect } from 'vitest';
import {
  parseDocDate,
  matchState,
  extractStateFromText,
  cityFromAddress,
  cityFromOffice,
  parseBidDocument,
  labeledValue,
} from '@/services/bidDocument';

const SAMPLE_TEXT = [
  'Bid End Date/Time24-03-2026 17:00:00',
  'Bid Number: GEM/2026/B/7326630',
  'Dated: 09-03-2026',
  'Ministry/State NameGujarat',
  'Department NameRural Development Department Gujarat',
  'Organisation NameDistrict Rural Development Agency Dahod',
  'Office NameDahod',
  'Consignee Address',
  '380060,State Health System Resource Center, GMERS Civil Hospital Campus, Sola,',
  'Ahmedabad-380060',
].join('\n');

const CENTRAL_TEXT = [
  'Dated: 15-09-2026',
  'Ministry/State NameMinistry Of Defence',
  'Department NameDepartment of Military Affairs',
  'Organisation NameIndian Army',
  'Office Name***********',
].join('\n');

describe('bidDocument', () => {
  it('parses dd-mm-yyyy document dates', () => {
    const date = parseDocDate(SAMPLE_TEXT);
    expect(date).toBeInstanceOf(Date);
    expect(date?.toISOString().slice(0, 10)).toBe('2026-03-09');
  });

  it('returns null for missing dates', () => {
    expect(parseDocDate('no date here')).toBeNull();
  });

  it('matches Indian states case-insensitively', () => {
    expect(matchState('GUJARAT')).toBe('Gujarat');
    expect(matchState('Ministry of Defence')).toBeNull();
  });

  it('extracts the first state mentioned in free text', () => {
    expect(extractStateFromText('Rural Development Department Gujarat')).toBe('Gujarat');
    expect(extractStateFromText('Uttar Pradesh Jal Nigam')).toBe('Uttar Pradesh');
  });

  it('extracts city from a consignee address near the pin code', () => {
    expect(cityFromAddress('380060, Sola, Ahmedabad-380060')).toBe('Ahmedabad');
  });

  it('rejects non-city candidates near pin codes', () => {
    expect(cityFromAddress('Sector 22 - 382221')).toBeNull();
    expect(cityFromAddress('Collectorate Betul - 460001')).toBe('Betul');
    expect(cityFromAddress('Amar Shaheed Path Lucknow - 226017')).toBe('Lucknow');
    expect(cityFromAddress('Head Quarters - 110001')).toBeNull();
  });

  it('only accepts known cities from office names', () => {
    expect(cityFromOffice('District Magistrate Lucknow')).toBe('Lucknow');
    expect(cityFromOffice('Deputy Director Of Supply')).toBeNull();
    expect(cityFromOffice('South Western Railway')).toBeNull();
    expect(cityFromOffice('Head Quarters')).toBeNull();
    expect(cityFromOffice('Collectorate Betul')).toBe('Betul');
  });

  it('extracts labeled values without separators', () => {
    expect(labeledValue(SAMPLE_TEXT, 'Office Name')).toBe('Dahod');
    expect(labeledValue(SAMPLE_TEXT, 'Organisation Name')).toBe(
      'District Rural Development Agency Dahod',
    );
  });

  it('parses a full state-department bid document', () => {
    const facts = parseBidDocument(SAMPLE_TEXT);
    expect(facts.publishedAt?.toISOString().slice(0, 10)).toBe('2026-03-09');
    expect(facts.stateName).toBe('Gujarat');
    expect(facts.cityName).toBe('Ahmedabad');
    expect(facts.department).toBe('Rural Development Department Gujarat');
    expect(facts.organisation).toBe('District Rural Development Agency Dahod');
    expect(facts.addressText).toContain('Ahmedabad-380060');
  });

  it('parses a central-government document without inventing a state', () => {
    const facts = parseBidDocument(CENTRAL_TEXT);
    expect(facts.ministry).toBe('Ministry Of Defence');
    expect(facts.cityName).toBeNull();
    expect(facts.publishedAt?.toISOString().slice(0, 10)).toBe('2026-09-15');
  });
});
