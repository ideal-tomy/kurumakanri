'use client';

import { CustomerPortalView } from '@/components/customer-portal-view';
import type { CustomerPortalData } from '@/lib/customer-portal-data';

export function CustomerPortalPreviewFrame({
  data,
  portalUrl,
}: {
  data: CustomerPortalData | null;
  portalUrl?: string | null;
}) {
  if (!data) {
    return (
      <div className="portal-preview-wrap">
        <p className="portal-muted">顧客画面のプレビューを表示できません（データ不足）。</p>
      </div>
    );
  }

  return (
    <div className="portal-preview-wrap">
      <p className="portal-preview-note">
        顧客が LINE のリンクから開く画面のプレビューです（CTA は無効）。
      </p>
      {portalUrl ? (
        <p className="portal-preview-url">
          送信URL:{' '}
          <a href={portalUrl} target="_blank" rel="noreferrer" className="panel-link">
            {portalUrl}
          </a>
        </p>
      ) : null}
      <div className="phone-frame">
        <div className="phone-screen" style={{ height: 'auto', maxHeight: 640, overflowY: 'auto' }}>
          <div className="phone-content" style={{ paddingBottom: 24 }}>
            <CustomerPortalView data={data} preview />
          </div>
        </div>
      </div>
    </div>
  );
}
