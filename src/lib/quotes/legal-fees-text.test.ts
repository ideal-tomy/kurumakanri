import { describe, expect, it } from 'vitest';
import {
  buildLegalFeesTextFallback,
  buildLegalFeesTextFromItems,
  buildLegalFeesTextFromQuote,
} from './legal-fees-text';
import type { QuoteLineItem } from '@/lib/quote';

const NON_TAX = (label: string, amount: number): QuoteLineItem => ({
  label,
  amount,
  quantity: 1,
  unit_price: amount,
  tax_treatment: 'NON_TAXABLE',
  category: 'legal',
});

const TAX10_LEGAL = (label: string, amount: number): QuoteLineItem => ({
  label,
  amount,
  quantity: 1,
  unit_price: amount,
  tax_treatment: 'TAXABLE_10',
  category: 'legal',
});

describe('buildLegalFeesTextFromItems', () => {
  it('formats basic fee items with comma-separated yen', () => {
    const r = buildLegalFeesTextFromItems([
      NON_TAX('自動車重量税', 24600),
      NON_TAX('自賠責保険24ヶ月', 17650),
      NON_TAX('検査レーン印紙代', 2300),
    ]);
    expect(r.total).toBe(44550);
    expect(r.totalFormatted).toBe('44,550');
    expect(r.breakdown).toBe(
      '・自動車重量税：¥24,600\n・自賠責保険24ヶ月：¥17,650\n・検査レーン印紙代：¥2,300',
    );
  });

  it('includes taxable basic fee lines (e.g. 24-month inspection)', () => {
    const r = buildLegalFeesTextFromItems([
      NON_TAX('自動車重量税', 24600),
      TAX10_LEGAL('24ヶ月点検基本料', 28000),
    ]);
    expect(r.total).toBe(52600);
    expect(r.lines).toHaveLength(2);
    expect(r.breakdown).toContain('24ヶ月点検基本料');
  });

  it('returns zero/empty when no lines', () => {
    const r = buildLegalFeesTextFromItems([]);
    expect(r.total).toBe(0);
    expect(r.totalFormatted).toBe('0');
    expect(r.breakdown).toBe('');
  });
});

describe('buildLegalFeesTextFromQuote', () => {
  it('uses items from JSON when present', () => {
    const json = [
      { label: '自動車重量税', amount: 24600, quantity: 1, unit_price: 24600, tax_treatment: 'NON_TAXABLE', category: 'legal' },
      { label: '自賠責保険24ヶ月', amount: 17650, quantity: 1, unit_price: 17650, tax_treatment: 'NON_TAXABLE', category: 'legal' },
    ];
    const r = buildLegalFeesTextFromQuote(json);
    expect(r.total).toBe(42250);
    expect(r.breakdown.split('\n')).toHaveLength(2);
  });

  it('falls back when JSON is empty or invalid', () => {
    const empty = buildLegalFeesTextFromQuote([]);
    const fallback = buildLegalFeesTextFallback();
    expect(empty.total).toBe(fallback.total);
    expect(empty.breakdown).toBe(fallback.breakdown);
    expect(fallback.breakdown).toContain('24ヶ月点検基本料');
  });

  it('includes 24-month line moved from legacy service_items', () => {
    const legal = [{ label: '自賠責', amount: 17650, quantity: 1, unit_price: 17650, tax_treatment: 'NON_TAXABLE', category: 'legal' }];
    const service = [{ label: '24ヶ月点検基本料', amount: 28000, quantity: 1, unit_price: 28000, tax_treatment: 'TAXABLE_10', category: 'service' }];
    const r = buildLegalFeesTextFromQuote(legal, service);
    expect(r.total).toBe(45650);
    expect(r.breakdown).toContain('24ヶ月点検基本料');
  });
});
