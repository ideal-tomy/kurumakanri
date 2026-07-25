import { computeEstimatedMileage, daysUntil } from '@/lib/mileage';
import { formatDateLong, formatKm, formatYen } from '@/lib/format';
import { parseIssuerFromEnv } from '@/lib/issuer';
import type { CustomerPortalData } from '@/lib/customer-portal-data';
import { PortalQuoteCard } from '@/components/portal-quote-card';

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ width: 12, height: 12, flexShrink: 0 }}
      aria-hidden
    >
      <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  );
}

export function CustomerPortalView({
  data,
  preview = false,
}: {
  data: CustomerPortalData;
  preview?: boolean;
}) {
  const { overview, histories, latestQuote } = data;
  const issuer = parseIssuerFromEnv();

  const estimated =
    overview.estimated_mileage ??
    computeEstimatedMileage(
      overview.initial_mileage,
      overview.initial_mileage_recorded_at,
      overview.monthly_avg_km,
    );
  const days = overview.days_until_inspection ?? daysUntil(overview.inspection_expire_date);

  const showAlert = days != null && days <= 90;

  return (
    <div className="customer-view">
      <div className="portal-content">
        <div className="phone-header">
          <div>
            {issuer?.companyName ? (
              <div className="phone-shop-name">{issuer.companyName}</div>
            ) : null}
            <div className="phone-greeting-label">こんにちは</div>
            <div className="phone-greeting-name">{overview.name} さん</div>
          </div>
          <div className="phone-avatar">{overview.name.slice(0, 1)}</div>
        </div>

        <div className="car-card">
          <div className="car-card-label">MY VEHICLE</div>
          <div className="car-card-name">
            {overview.maker} {overview.model}
          </div>
          <div className="car-card-plate">{overview.plate}</div>
          <div className="car-stats car-stats-portal">
            <div>
              <div className="car-stat-label">走行距離</div>
              <div className="car-stat-value">
                {estimated != null ? (
                  <>
                    {estimated.toLocaleString('ja-JP')}
                    <span className="car-stat-unit">km</span>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
            <div>
              <div className="car-stat-label">次回車検まで</div>
              <div className="car-stat-value">
                {days != null && days >= 0 ? (
                  <>
                    {days}
                    <span className="car-stat-unit">日</span>
                  </>
                ) : days != null ? (
                  '期限切れ'
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>
        </div>

        {showAlert ? (
          <div className="alert-card">
            <div className="alert-label alert-label-with-icon">
              <AlertIcon />
              車検期限が近づいています
            </div>
            <div className="alert-title">
              {formatDateLong(overview.inspection_expire_date)}が期限です
            </div>
            <div className="alert-desc">
              {days != null && days >= 0
                ? `期限まで残り${days}日となりました。お早めにご予約をお願いします。お見積をご確認いただけます。`
                : '車検期限を過ぎています。お早めにご連絡ください。'}
            </div>
          </div>
        ) : null}

        <PortalQuoteCard
          quote={latestQuote}
          preview={preview}
          issuerPhone={issuer?.phone ?? null}
        />

        {histories.length > 0 ? (
          <div className="timeline-section" id="history">
            <div className="section-label">整備履歴</div>
            {histories.map((h) => (
              <div className="history-item" key={h.id}>
                <div className="history-dot" />
                <div className="history-body">
                  <div className="history-title">{h.title}</div>
                  <div className="history-meta">
                    {h.performed_at ? new Date(h.performed_at).toLocaleDateString('ja-JP') : '-'} / 走行{' '}
                    {formatKm(h.mileage)}
                  </div>
                  {h.notes ? <div className="history-notes">{h.notes}</div> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="quote-card booking-card" id="booking">
          <div className="quote-header">
            <div className="quote-title">ご予約・お問い合わせ</div>
          </div>
          <p className="portal-muted">
            車検・点検のご予約、お見積に関するご質問はお気軽にご連絡ください。
          </p>
          {preview ? (
            <span className="portal-cta portal-cta-disabled">電話する</span>
          ) : issuer?.phone ? (
            <a href={`tel:${issuer.phone.replace(/\s/g, '')}`} className="portal-cta">
              {issuer.phone} に電話する
            </a>
          ) : (
            <p className="portal-muted">店舗の電話番号はお送りした通知メッセージをご確認ください。</p>
          )}
        </div>
      </div>
    </div>
  );
}
