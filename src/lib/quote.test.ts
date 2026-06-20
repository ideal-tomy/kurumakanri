import { describe, expect, it } from 'vitest';
import { buildAutoQuote, computeTotalsFromParts, normalizeQuoteSections, quoteTotalsForDisplay, quoteTotalsFromLinePayloads } from './quote';

describe('buildAutoQuote', () => {
  it('sums legal and taxable service parts into grand_total', () => {
    const r = buildAutoQuote({});
    expect(r.total_amount).toBe(r.grand_total);
    expect(r.grand_total).toBe(r.non_taxable_subtotal + r.taxable_tax_included);
    expect(r.tax_amount_10).toBe(r.taxable_tax_included - r.taxable_subtotal_ex_tax);
    expect(r.notes).toContain('実車確認後');
  });

  it('excludes oil change by default (車検見積からオイルは分離)', () => {
    const r = buildAutoQuote({});
    const hasOil = r.service_items.some((i) => i.label.includes('オイル'));
    expect(hasOil).toBe(false);
  });

  it('puts 24-month inspection in basic fees (legal_items)', () => {
    const r = buildAutoQuote({});
    const inBasic = r.legal_items.some((i) => i.label.includes('24ヶ月点検'));
    const inAdditional = r.service_items.some((i) => i.label.includes('24ヶ月点検'));
    expect(inBasic).toBe(true);
    expect(inAdditional).toBe(false);
    expect(r.legal_items.find((i) => i.label.includes('24ヶ月点検'))?.tax_treatment).toBe('TAXABLE_10');
  });

  it('includes oil change only when includeOilChange is explicitly true', () => {
    const r = buildAutoQuote({ includeOilChange: true });
    const hasOil = r.service_items.some((i) => i.label.includes('オイル'));
    expect(hasOil).toBe(true);
  });

  it('drops oil change when includeOilChange is false', () => {
    const r = buildAutoQuote({ includeOilChange: false });
    const hasOil = r.service_items.some((i) => i.label.includes('オイル'));
    expect(hasOil).toBe(false);
  });

  it('appends extra notes', () => {
    const r = buildAutoQuote({ notesAppend: '追加メモ' });
    expect(r.notes).toContain('追加メモ');
  });
});

describe('quoteTotalsForDisplay', () => {
  it('uses computed grand_total when DB total_amount is 0', () => {
    const legal = [{ label: '重量税', amount: 10000, quantity: 1, unit_price: 10000, tax_treatment: 'NON_TAXABLE' as const, category: 'legal' as const }];
    const service = [{ label: '点検', amount: 11000, quantity: 1, unit_price: 11000, tax_treatment: 'TAXABLE_10' as const, category: 'service' as const }];
    const d = quoteTotalsForDisplay({
      legal_items: legal,
      service_items: service,
      total_amount: 0,
      grand_total: null,
    });
    expect(d.grand_total).toBe(21000);
    expect(d.non_taxable_subtotal).toBe(10000);
  });
});

describe('normalizeQuoteSections', () => {
  it('moves 24-month inspection from service to legal for legacy quotes', () => {
    const legal = [{ label: '自賠責', amount: 17650, quantity: 1, unit_price: 17650, tax_treatment: 'NON_TAXABLE' as const, category: 'legal' as const }];
    const service = [{ label: '24ヶ月点検基本料', amount: 28000, quantity: 1, unit_price: 28000, tax_treatment: 'TAXABLE_10' as const, category: 'service' as const }];
    const n = normalizeQuoteSections(legal, service);
    expect(n.legal_items).toHaveLength(2);
    expect(n.service_items).toHaveLength(0);
    expect(n.legal_items[1]?.category).toBe('legal');
  });
});

describe('quoteTotalsFromLinePayloads', () => {
  it('matches computeTotalsFromParts for editor live totals', () => {
    const legal = [{ label: '自賠責', amount: 17650, quantity: 1, unit_price: 17650, tax_treatment: 'NON_TAXABLE' as const, category: 'legal' as const }];
    const service = [{ label: '点検', amount: 28000, quantity: 1, unit_price: 28000, tax_treatment: 'TAXABLE_10' as const, category: 'service' as const }];
    const live = quoteTotalsFromLinePayloads(legal, service);
    const raw = computeTotalsFromParts(legal, service);
    expect(live.grand_total).toBe(raw.grand_total);
    expect(live.non_taxable_subtotal).toBe(17650);
    expect(live.taxable_tax_included).toBe(28000);
  });
});
