import { quoteTotalsForDisplay } from '@/lib/quote';
import { buildQuoteShareToken, isQuoteShareConfigured } from '@/lib/quote-share';
import { getServiceSupabase } from '@/lib/supabase/server';
import type { CustomerOverviewRow, QuoteRow, ServiceHistoryRow } from '@/lib/supabase/types';

export interface CustomerPortalQuoteLine {
  label: string;
  amount: number;
}

export interface CustomerPortalQuoteSummary {
  quote_no: string | null;
  grand_total: number;
  non_taxable_subtotal: number;
  valid_until: string | null;
  status: string;
  notes: string | null;
  legal_lines: CustomerPortalQuoteLine[];
  service_lines: CustomerPortalQuoteLine[];
  /** @deprecated use printUrl */
  detailUrl: string | null;
  printUrl: string | null;
}

export interface CustomerPortalData {
  overview: CustomerOverviewRow;
  histories: ServiceHistoryRow[];
  latestQuote: CustomerPortalQuoteSummary | null;
}

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function buildQuoteSummaryFromRow(q: QuoteRow): CustomerPortalQuoteSummary {
  const disp = quoteTotalsForDisplay({
    legal_items: q.legal_items,
    service_items: q.service_items,
    taxable_subtotal_ex_tax: q.taxable_subtotal_ex_tax,
    tax_amount_10: q.tax_amount_10,
    non_taxable_subtotal: q.non_taxable_subtotal,
    grand_total: q.grand_total,
    total_amount: q.total_amount,
  });

  const siteUrl = siteBaseUrl();
  const printUrl =
    isQuoteShareConfigured() && siteUrl ? `${siteUrl}/q/${buildQuoteShareToken(q.id)}` : null;

  return {
    quote_no: q.quote_no,
    grand_total: disp.grand_total,
    non_taxable_subtotal: disp.non_taxable_subtotal,
    valid_until: q.valid_until,
    status: q.status,
    notes: q.notes,
    legal_lines: disp.legal.map((i) => ({ label: i.label, amount: i.amount })),
    service_lines: disp.service.map((i) => ({ label: i.label, amount: i.amount })),
    detailUrl: printUrl,
    printUrl,
  };
}

export async function loadCustomerPortalData(
  customerId: string,
): Promise<CustomerPortalData | null> {
  const supabase = getServiceSupabase();
  const overviewRes = await supabase
    .from('v_customer_overview')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle<CustomerOverviewRow>();

  if (!overviewRes.data) return null;

  const vehiclesRes = await supabase.from('vehicles').select('id').eq('customer_id', customerId);
  const vehicleIds = (vehiclesRes.data ?? []).map((v) => v.id);

  let histories: ServiceHistoryRow[] = [];
  let latestQuote: CustomerPortalQuoteSummary | null = null;

  if (vehicleIds.length > 0) {
    const [historyRes, quoteRes] = await Promise.all([
      supabase
        .from('service_histories')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .order('performed_at', { ascending: false })
        .limit(10),
      supabase
        .from('quotes')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .eq('status', 'ISSUED')
        .order('issued_at', { ascending: false })
        .limit(1)
        .maybeSingle<QuoteRow>(),
    ]);

    histories = (historyRes.data ?? []) as ServiceHistoryRow[];

    const q = quoteRes.data;
    if (q) {
      latestQuote = buildQuoteSummaryFromRow(q);
    }
  }

  return {
    overview: overviewRes.data,
    histories,
    latestQuote,
  };
}
