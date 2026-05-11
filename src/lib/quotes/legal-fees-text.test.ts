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

const TAX10 = (label: string, amount: number): QuoteLineItem => ({
  label,
  amount,
  quantity: 1,
  unit_price: amount,
  tax_treatment: 'TAXABLE_10',
  category: 'service',
});

describe('buildLegalFeesTextFromItems', () => {
  it('formats non-taxable legal items with comma-separated yen', () => {
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

  it('drops taxable lines from breakdown and total', () => {
    const r = buildLegalFeesTextFromItems([
      NON_TAX('自動車重量税', 24600),
      TAX10('オイル交換', 6200),
    ]);
    expect(r.total).toBe(24600);
    expect(r.lines).toHaveLength(1);
    expect(r.breakdown).toBe('・自動車重量税：¥24,600');
  });

  it('returns zero/empty when no legal lines', () => {
    const r = buildLegalFeesTextFromItems([TAX10('オイル交換', 6200)]);
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
  });
});
