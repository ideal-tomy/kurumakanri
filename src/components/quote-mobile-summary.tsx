'use client';

import { Badge } from '@/components/badge';
import { formatYen } from '@/lib/format';
import { QUOTE_SECTION_LABEL } from '@/lib/quote';
import type { QuoteRow } from '@/lib/supabase/types';

export function QuoteMobileSummary({
  quoteNo,
  status,
  basicFeesSubtotal,
  additionalSubtotal,
  grandTotal,
  isDirty,
}: {
  quoteNo: string | null;
  status: QuoteRow['status'];
  basicFeesSubtotal: number;
  additionalSubtotal?: number;
  grandTotal: number;
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
          <span className="quote-mobile-summary-row-label">{QUOTE_SECTION_LABEL.basic}</span>
          <span className="quote-mobile-summary-row-value">{formatYen(basicFeesSubtotal)}</span>
        </div>
        {typeof additionalSubtotal === 'number' && additionalSubtotal !== 0 ? (
          <div className="quote-mobile-summary-row quote-mobile-summary-row-sub">
            <span className="quote-mobile-summary-row-label">{QUOTE_SECTION_LABEL.additional}</span>
            <span className="quote-mobile-summary-row-value">{formatYen(additionalSubtotal)}</span>
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
