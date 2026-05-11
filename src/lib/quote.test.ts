import { describe, expect, it } from 'vitest';
import { buildAutoQuote } from './quote';

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
