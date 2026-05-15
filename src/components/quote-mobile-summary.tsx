'use client';

import { Badge } from '@/components/badge';
import { formatYen } from '@/lib/format';
import type { QuoteRow } from '@/lib/supabase/types';

export function QuoteMobileSummary({
  quoteNo,
  status,
  legalSubtotal,
  grandTotal,
  serviceTaxIncluded,
  isDirty,
}: {
  quoteNo: string | null;
  status: QuoteRow['status'];
  legalSubtotal: number;
  grandTotal: number;
  serviceTaxIncluded?: number;
  isDirty?: boolean;
}) {
  return (
    <div className="quote-mobile-summary mobile-only">
      <div className="quote-mobile-summary-top">
        <span className="quote-mobile-summary-no">{quoteNo ?? '—'}</span>
        <Badge variant="info">{status}</Badge>
        {isDirty ? <span className="quote-mobile-dirty-badge">未保存</span> : null}
      </div>
      <div className="quote-mobile-summary-rows">
        <div className="quote-mobile-summary-row">
          <span className="quote-mobile-summary-row-label">法定費用（対象外）</span>
          <span className="quote-mobile-summary-row-value">{formatYen(legalSubtotal)}</span>
        </div>
        {typeof serviceTaxIncluded === 'number' && serviceTaxIncluded !== 0 ? (
          <div className="quote-mobile-summary-row quote-mobile-summary-row-sub">
            <span className="quote-mobile-summary-row-label">作業等（税込）</span>
            <span className="quote-mobile-summary-row-value">{formatYen(serviceTaxIncluded)}</span>
          </div>
        ) : null}
        <div className="quote-mobile-summary-row quote-mobile-summary-row-total">
          <span className="quote-mobile-summary-row-label">合計（税込）</span>
          <span className="quote-mobile-summary-total-value">{formatYen(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
