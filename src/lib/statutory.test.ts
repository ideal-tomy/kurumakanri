import { describe, expect, it } from 'vitest';
import type { StatutoryFeeRateRow } from '@/lib/supabase/types';
import { pickStatutoryFeeRow } from './statutory';

describe('pickStatutoryFeeRow', () => {
  const rates: StatutoryFeeRateRow[] = [
    {
      id: 'a',
      effective_from: '2019-01-01',
      vehicle_class: 'STANDARD',
      jibaiseki_24mo_yen: 1,
      weight_tax_yen_standard: 1,
      weight_tax_yen_eco: 1,
      prepaid_inspection_yen: 1,
      lane_stamp_yen: 1,
      document_fee_yen: 1,
      notes: null,
      created_at: '',
    },
    {
      id: 'b',
      effective_from: '2025-06-01',
      vehicle_class: 'STANDARD',
      jibaiseki_24mo_yen: 99,
      weight_tax_yen_standard: 2,
      weight_tax_yen_eco: 2,
      prepaid_inspection_yen: 2,
      lane_stamp_yen: 2,
      document_fee_yen: 2,
      notes: null,
      created_at: '',
    },
    {
      id: 'c',
      effective_from: '2026-04-01',
      vehicle_class: 'STANDARD',
      jibaiseki_24mo_yen: 200,
      weight_tax_yen_standard: 3,
      weight_tax_yen_eco: 3,
      prepaid_inspection_yen: 3,
      lane_stamp_yen: 3,
      document_fee_yen: 3,
      notes: null,
      created_at: '',
    },
  ];

  it('picks the latest effective row on or before asOfDate', () => {
    expect(pickStatutoryFeeRow(rates, 'STANDARD', '2025-05-09')?.jibaiseki_24mo_yen).toBe(1);
    expect(pickStatutoryFeeRow(rates, 'STANDARD', '2025-12-01')?.jibaiseki_24mo_yen).toBe(99);
    expect(pickStatutoryFeeRow(rates, 'STANDARD', '2027-01-01')?.jibaiseki_24mo_yen).toBe(200);
  });
});
