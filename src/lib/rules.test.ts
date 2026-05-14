import { describe, expect, it } from 'vitest';
import { classifyTargets } from './rules';
import type { CustomerOverviewRow } from './supabase/types';

function row(overrides: Partial<CustomerOverviewRow>): CustomerOverviewRow {
  return {
    customer_id: 'c1',
    name: 'demo',
    furigana: null,
    phone: null,
    email: null,
    line_user_id: null,
    status: 'ACTIVE',
    vehicle_id: 'v1',
    maker: 'X',
    model: 'Y',
    plate: 'P',
    vin: null,
    inspection_expire_date: null,
    initial_mileage: 30000,
    initial_mileage_recorded_at: '2026-01-01',
    monthly_avg_km: 0,
    last_oil_change_mileage: 30000,
    last_oil_change_at: null,
    oil_interval_km: 4000,
    estimated_mileage: 30000,
    days_until_inspection: null,
    last_line_sent_at: null,
    next_notification_rule: null,
    next_notification_due_at: null,
    latest_quote_id: null,
    latest_quote_grand_total: null,
    ...overrides,
  };
}

describe('classifyTargets', () => {
  it('classifies into shaken_90 within window', () => {
    const r = classifyTargets([row({ days_until_inspection: 80 })]);
    const s90 = r.find((x) => x.rule === 'shaken_90days')!;
    const s180 = r.find((x) => x.rule === 'shaken_180days')!;
    expect(s90.rows.length).toBe(1);
    expect(s180.rows.length).toBe(0);
  });

  it('classifies into shaken_180 within window', () => {
    const r = classifyTargets([row({ days_until_inspection: 175 })]);
    const s180 = r.find((x) => x.rule === 'shaken_180days')!;
    expect(s180.rows.length).toBe(1);
  });

  it('classifies shaken_30 within window', () => {
    const r = classifyTargets([row({ days_until_inspection: 15 })]);
    const s30 = r.find((x) => x.rule === 'shaken_30days')!;
    expect(s30.rows.length).toBe(1);
  });

  it('classifies shaken_overdue within window', () => {
    const r = classifyTargets([row({ days_until_inspection: -10 })]);
    const od = r.find((x) => x.rule === 'shaken_overdue')!;
    expect(od.rows.length).toBe(1);
  });

  it('flags oil when estimated >= last + interval', () => {
    const r = classifyTargets([
      row({
        estimated_mileage: 35000,
        last_oil_change_mileage: 30000,
        oil_interval_km: 4000,
      }),
    ]);
    const oil = r.find((x) => x.rule === 'oil_4000km')!;
    expect(oil.rows.length).toBe(1);
    expect(oil.rows[0].oil_overage_km).toBe(1000);
  });

  it('does not flag oil when far from target', () => {
    const r = classifyTargets([
      row({
        estimated_mileage: 30500,
        last_oil_change_mileage: 30000,
        oil_interval_km: 4000,
      }),
    ]);
    const oil = r.find((x) => x.rule === 'oil_4000km')!;
    expect(oil.rows.length).toBe(0);
  });
});
