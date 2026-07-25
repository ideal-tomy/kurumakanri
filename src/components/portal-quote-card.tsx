import Link from 'next/link';
import { formatDate, formatYen } from '@/lib/format';
import { QUOTE_SECTION_LABEL } from '@/lib/quote';
import type { CustomerPortalQuoteSummary } from '@/lib/customer-portal-data';

function shortQuoteNo(quoteNo: string): string {
  if (quoteNo.length <= 16) return quoteNo;
  return `${quoteNo.slice(0, 8)}…${quoteNo.slice(-6)}`;
}

export function PortalQuoteCard({
  quote,
  preview = false,
  issuerPhone,
}: {
  quote: CustomerPortalQuoteSummary | null;
  preview?: boolean;
  issuerPhone?: string | null;
}) {
  if (!quote) {
    return (
      <div className="quote-card" id="quote">
        <div className="quote-header">
          <div className="quote-title">車検お見積</div>
        </div>
        <p className="portal-muted">
          現在ご案内中のお見積はありません。お問い合わせの際は店舗までご連絡ください。
        </p>
      </div>
    );
  }

  return (
    <div className="quote-card" id="quote">
      <div className="quote-header">
        <div className="quote-title">車検お見積</div>
        {quote.quote_no ? (
          <div className="quote-id" title={quote.quote_no}>
            {shortQuoteNo(quote.quote_no)}
          </div>
        ) : null}
      </div>

      {quote.legal_lines.length > 0 ? (
        <>
          <div className="quote-section-label">{QUOTE_SECTION_LABEL.basic}</div>
          {quote.legal_lines.map((line, i) => (
            <div className="quote-row" key={`legal-${i}`}>
              <span className="quote-row-label">{line.label}</span>
              <span className="quote-row-value">{formatYen(line.amount)}</span>
            </div>
          ))}
        </>
      ) : null}

      {quote.service_lines.length > 0 ? (
        <>
          <div className="quote-section-label">{QUOTE_SECTION_LABEL.additional}</div>
          {quote.service_lines.map((line, i) => (
            <div className="quote-row" key={`svc-${i}`}>
              <span className="quote-row-label">{line.label}</span>
              <span className="quote-row-value">{formatYen(line.amount)}</span>
            </div>
          ))}
        </>
      ) : null}

      <div className="quote-total">
        <span className="quote-total-label">合計（税込）</span>
        <span className="quote-total-value">{formatYen(quote.grand_total)}</span>
      </div>

      {quote.valid_until ? (
        <div className="quote-row" style={{ marginTop: 8, borderBottom: 'none' }}>
          <span className="quote-row-label">見積有効期限</span>
          <span className="quote-row-value">{formatDate(quote.valid_until)}</span>
        </div>
      ) : null}

      {quote.notes ? <div className="quote-notes">{quote.notes}</div> : null}

      <div className="quote-cta">
        {quote.printUrl ? (
          preview ? (
            <span className="quote-cta-btn quote-cta-btn-disabled">印刷・PDF保存</span>
          ) : (
            <Link href={quote.printUrl} className="quote-cta-btn">
              印刷・PDF保存
            </Link>
          )
        ) : (
          <span className="quote-cta-btn quote-cta-btn-disabled">印刷・PDF保存</span>
        )}
        {preview ? (
          <span className="quote-cta-btn quote-cta-btn-disabled quote-cta-btn-primary">お問い合わせ</span>
        ) : issuerPhone ? (
          <a href={`tel:${issuerPhone.replace(/\s/g, '')}`} className="quote-cta-btn quote-cta-btn-primary">
            お問い合わせ
          </a>
        ) : (
          <a href="#booking" className="quote-cta-btn quote-cta-btn-primary">
            お問い合わせ
          </a>
        )}
      </div>
    </div>
  );
}
