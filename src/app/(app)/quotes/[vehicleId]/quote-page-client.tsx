'use client';

import { useState } from 'react';
import type { QuoteRow, VehicleRow } from '@/lib/supabase/types';
import { formatDate } from '@/lib/format';
import { GenerateButton } from './generate-button';
import { QuoteQuotesList } from './quote-quotes-list';

export function QuotePageClient({
  vehicle,
  quotes,
  shareUrlsByQuoteId,
  lineNotifyEligible,
  fromNotify,
}: {
  vehicle: VehicleRow;
  quotes: QuoteRow[];
  shareUrlsByQuoteId: Record<string, string | null>;
  lineNotifyEligible: boolean;
  fromNotify: boolean;
}) {
  const [hasUnsaved, setHasUnsaved] = useState(false);

  return (
    <>
      {fromNotify ? (
        <div className="quote-notify-banner mobile-only">
          <p className="quote-notify-banner-short">
            送付確認から開いています。<strong>保存後</strong>に送付確認へ戻り再取得してください。
          </p>
          <details className="quote-notify-banner-details">
            <summary>送付の手順</summary>
            <p>
              明細を保存したら、送付確認のタブに戻り「金額・本文を再取得」を押してから LINE で送付してください。
            </p>
          </details>
        </div>
      ) : null}
      {fromNotify ? (
        <div className="badge badge-warn desktop-only" style={{ marginBottom: 12, padding: 12, display: 'block', fontSize: 14 }}>
          送付確認から開いています。明細を保存したら、<strong>送付確認のタブ</strong>に戻り「金額・本文を再取得」を押してから LINE で送付してください。
        </div>
      ) : null}

      <div className="page-header quote-page-header">
        <div>
          <h1 className="page-title">
            見積 - {vehicle.maker} {vehicle.model}
          </h1>
          <div className="page-sub quote-page-sub">
            ナンバー {vehicle.plate} ・ 満了日 {formatDate(vehicle.inspection_expire_date)}
          </div>
        </div>
        <div className="page-actions">
          <GenerateButton vehicleId={vehicle.id} confirmIfDirty={hasUnsaved} />
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="empty">まだ見積がありません。「自動見積を生成」を押してください。</div>
      ) : (
        <QuoteQuotesList
          quotes={quotes}
          vehicleId={vehicle.id}
          customerId={vehicle.customer_id}
          shareUrlsByQuoteId={shareUrlsByQuoteId}
          lineNotifyEligible={lineNotifyEligible}
          onDirtyChange={setHasUnsaved}
        />
      )}
    </>
  );
}
