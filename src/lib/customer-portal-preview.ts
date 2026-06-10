import { computeEstimatedMileage, daysUntil } from '@/lib/mileage';
import type { CustomerPortalData, CustomerPortalQuoteSummary } from '@/lib/customer-portal-data';
import type { CustomerOverviewRow } from '@/lib/supabase/types';
import type { ReviewPayloadQuoteBlock } from '@/lib/notifications/review-payload-builder';

export type PortalPreviewSendItem = {
  customer_id: string | null;
  vehicle_id: string | null;
  plate: string | null;
  name: string | null;
  line_preview: string | null;
  mail_subject: string | null;
  mail_body: string | null;
  warnings: string[];
  quote_link_preview: string | null;
  portal_link_preview: string | null;
  quote: ReviewPayloadQuoteBlock | null;
};

function quoteSummaryFromReviewBlock(
  quote: ReviewPayloadQuoteBlock,
  printUrl: string | null,
): CustomerPortalQuoteSummary {
  return {
    quote_no: quote.quote_no ?? null,
    grand_total: quote.tax_summary.grand_total,
    non_taxable_subtotal: quote.tax_summary.non_taxable_subtotal,
    valid_until: quote.valid_until ?? null,
    status: 'ISSUED',
    notes: quote.notes ?? null,
    legal_lines: quote.legal_lines.map((l) => ({ label: l.label, amount: l.amount })),
    service_lines: quote.service_lines.map((l) => ({ label: l.label, amount: l.amount })),
    detailUrl: printUrl,
    printUrl,
  };
}

/** 送信プレビュー用データから顧客ポータル表示データを組み立てる */
export function buildPortalPreviewFromSendItem(
  item: PortalPreviewSendItem,
  overview: CustomerOverviewRow,
): CustomerPortalData {
  const estimated =
    overview.estimated_mileage ??
    computeEstimatedMileage(
      overview.initial_mileage,
      overview.initial_mileage_recorded_at,
      overview.monthly_avg_km,
    );

  const overviewWithDays: CustomerOverviewRow = {
    ...overview,
    estimated_mileage: estimated,
    days_until_inspection:
      overview.days_until_inspection ?? daysUntil(overview.inspection_expire_date),
  };

  const latestQuote =
    item.quote != null
      ? quoteSummaryFromReviewBlock(item.quote, item.quote_link_preview)
      : null;

  return {
    overview: overviewWithDays,
    histories: [],
    latestQuote,
  };
}
