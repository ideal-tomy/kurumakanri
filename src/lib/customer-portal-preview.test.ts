import { describe, expect, it } from 'vitest';
import { buildPortalPreviewFromSendItem } from './customer-portal-preview';
import type { CustomerOverviewRow } from '@/lib/supabase/types';

const overview: CustomerOverviewRow = {
  customer_id: 'cust-1',
  name: '田中 健一',
  furigana: null,
  phone: null,
  email: null,
  line_user_id: null,
  status: 'ACTIVE',
  vehicle_id: 'veh-1',
  maker: 'トヨタ',
  model: 'プリウス',
  plate: '横浜 300 あ 12-34',
  vin: null,
  inspection_expire_date: '2026-05-30',
  days_until_inspection: 28,
  initial_mileage: 40000,
  initial_mileage_recorded_at: '2025-01-01',
  monthly_avg_km: 700,
  estimated_mileage: 48230,
  last_oil_change_at: null,
  last_oil_change_mileage: null,
  oil_interval_km: 4000,
};

describe('buildPortalPreviewFromSendItem', () => {
  it('maps quote lines into portal preview data', () => {
    const data = buildPortalPreviewFromSendItem(
      {
        customer_id: 'cust-1',
        vehicle_id: 'veh-1',
        plate: overview.plate,
        name: overview.name,
        line_preview: null,
        mail_subject: null,
        mail_body: null,
        warnings: [],
        quote_link_preview: 'https://example.com/q/token',
        portal_link_preview: 'https://example.com/p/token#quote',
        quote: {
          id: 'q-1',
          quote_no: 'QT-2026-001',
          grand_total: 73150,
          issued_at: null,
          legal_count: 2,
          service_count: 1,
          valid_until: '2026-05-30',
          notes: 'テスト備考',
          legal_lines: [
            { label: '自賠責保険料（24ヶ月）', quantity: 1, unit_price: 17650, amount: 17650 },
          ],
          service_lines: [
            { label: '24ヶ月点検基本料', quantity: 1, unit_price: 28000, amount: 28000 },
          ],
          tax_summary: {
            non_taxable_subtotal: 17650,
            taxable_tax_included: 28000,
            taxable_subtotal_ex_tax: 25455,
            tax_amount_10: 2545,
            grand_total: 45650,
          },
        },
      },
      overview,
    );

    expect(data.overview.name).toBe('田中 健一');
    expect(data.latestQuote?.legal_lines).toHaveLength(1);
    expect(data.latestQuote?.service_lines).toHaveLength(1);
    expect(data.latestQuote?.printUrl).toBe('https://example.com/q/token');
    expect(data.latestQuote?.notes).toBe('テスト備考');
    expect(data.histories).toEqual([]);
  });
});
