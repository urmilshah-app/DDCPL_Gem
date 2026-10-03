import { describe, it, expect } from 'vitest';
import { mapGemDoc, documentUrlFor, sanitizeSearchTerm, GemDoc } from '@/services/gemSource';

const DOC: GemDoc = {
  id: '9948506',
  b_id: [9948506],
  b_bid_number: ['GEM/2026/B/7619733'],
  b_bid_type: [1],
  b_category_name: ['CCTV Camera Installation Work'],
  bd_category_name: ['CCTV Camera Installation Work (V3) Conforming to IS 16670'],
  b_total_quantity: [210],
  ba_official_details_minName: ['Ministry of Home Affairs'],
  ba_official_details_deptName: ['Women Safety Division'],
  final_start_date_sort: ['2026-09-26T18:00:00Z'],
  final_end_date_sort: ['2026-09-28T18:36:38Z'],
};

describe('gemSource mapping', () => {
  it('maps a listing document to a raw tender record', () => {
    const record = mapGemDoc(DOC);
    expect(record).not.toBeNull();
    expect(record?.externalId).toBe('GEM/2026/B/7619733');
    expect(record?.title).toBe('CCTV Camera Installation Work');
    expect(record?.organization).toBe('Ministry of Home Affairs / Women Safety Division');
    expect(record?.ministry).toBe('Ministry of Home Affairs');
    expect(record?.bidType).toBe('BID');
    expect(record?.publishedAt?.toISOString()).toBe('2026-09-26T18:00:00.000Z');
    expect(record?.deadlineAt?.toISOString()).toBe('2026-09-28T18:36:38.000Z');
    expect(record?.quantity).toBe('210');
    expect(record?.stateName).toBeNull();
  });

  it('returns null when the bid number is missing', () => {
    expect(mapGemDoc({ b_id: [1] })).toBeNull();
  });

  it('builds document urls per bid type', () => {
    expect(documentUrlFor(DOC)).toBe('https://bidplus.gem.gov.in/showbidDocument/9948506');
    expect(
      documentUrlFor({ b_id: [10], b_bid_type: [2], b_id_parent: [99] }),
    ).toBe('https://bidplus.gem.gov.in/showbidDocument/99');
    expect(documentUrlFor({ b_id: [10], b_bid_type: [2] })).toBe(
      'https://bidplus.gem.gov.in/showradocumentPdf/10',
    );
    expect(documentUrlFor({ b_bid_type: [1] })).toBeNull();
  });

  it('strips search operators that GeM rejects with HTTP 404', () => {
    expect(sanitizeSearchTerm('wi-fi')).toBe('wi fi');
    expect(sanitizeSearchTerm('audio-visual')).toBe('audio visual');
    expect(sanitizeSearchTerm('fire & safety')).toBe('fire safety');
    expect(sanitizeSearchTerm('  CCTV   camera  ')).toBe('CCTV camera');
    expect(sanitizeSearchTerm('cctv')).toBe('cctv');
  });
});
