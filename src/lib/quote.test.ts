import { describe, expect, it } from 'vitest';
import { buildAutoQuote, LEGAL_ITEMS_DEFAULT, SERVICE_ITEMS_DEFAULT } from './quote';

describe('buildAutoQuote', () => {
  it('sums legal and service items by default', () => {
    const r = buildAutoQuote({});
    const expected =
      LEGAL_ITEMS_DEFAULT.reduce((s, i) => s + i.amount, 0) +
      SERVICE_ITEMS_DEFAULT.reduce((s, i) => s + i.amount, 0);
    expect(r.total_amount).toBe(expected);
    expect(r.notes).toContain('実車確認後');
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
