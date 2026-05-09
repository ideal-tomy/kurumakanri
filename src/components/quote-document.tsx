import { formatDate, formatYen } from '@/lib/format';
import type { IssuerProfile } from '@/lib/issuer';
import type { QuoteLineItem } from '@/lib/quote';

export interface QuoteDocumentProps {
  issuer: IssuerProfile | null;
  subject?: string;
  customerName: string;
  maker: string;
  model: string;
  plate: string;
  quoteNo: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  notes: string | null;
  legal: QuoteLineItem[];
  service: QuoteLineItem[];
  taxableSubtotalExTax: number;
  taxAmount10: number;
  nonTaxableSubtotal: number;
  grandTotal: number;
  /** 画面上のみ（印刷しない） */
  showPrintHint?: boolean;
}

export function QuoteDocument(props: QuoteDocumentProps) {
  const subject = props.subject ?? '車検代行作業';

  const taxableInclusive = props.taxAmount10 + props.taxableSubtotalExTax;

  return (
    <div className="quote-doc">
      {props.showPrintHint ? (
        <p className="quote-doc-screen-only no-print" style={{ marginBottom: 16 }}>
          ブラウザの「印刷」から PDF 保存できます。
        </p>
      ) : null}

      <header className="quote-doc-head">
        <h1 className="quote-doc-title">見積書</h1>
      </header>

      <div className="quote-doc-meta">
        <div className="quote-doc-meta-left">
          <p className="quote-doc-to">{props.customerName} 御中</p>
          <p className="quote-doc-sub">件名: {subject}</p>
          <p className="quote-doc-car">
            {props.maker} {props.model} ・ {props.plate}
          </p>
          <div className="quote-doc-highlight">
            お見積金額 <span>{formatYen(props.grandTotal)}</span>
          </div>
        </div>
        <div className="quote-doc-meta-right">
          {props.issuer ? (
            <>
              <div className="quote-doc-co">{props.issuer.companyName}</div>
              {props.issuer.representative ? (
                <div>代表 {props.issuer.representative}</div>
              ) : null}
              {props.issuer.postalCode || props.issuer.address ? (
                <div className="quote-doc-addr">
                  {props.issuer.postalCode ? `〒${props.issuer.postalCode}` : null}
                  {props.issuer.postalCode && props.issuer.address ? ' ' : null}
                  {props.issuer.address}
                </div>
              ) : null}
              {props.issuer.phone ? <div>TEL {props.issuer.phone}</div> : null}
              {props.issuer.email ? <div>{props.issuer.email}</div> : null}
              {props.issuer.registrationNumber ? (
                <div>{props.issuer.registrationNumber}</div>
              ) : null}
            </>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              NEXT_PUBLIC_ISSUER_JSON で発行者情報を設定すると印字されます。
            </div>
          )}
        </div>
      </div>

      <table className="quote-doc-table">
        <thead>
          <tr>
            <th scope="col">品番・品名</th>
            <th scope="col" className="num">
              数量
            </th>
            <th scope="col" className="num">
              単価
            </th>
            <th scope="col" className="num">
              金額（円）
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="quote-doc-cat-row">
            <td colSpan={4}>
              <strong>車検法定費用</strong>（対象外）
            </td>
          </tr>
          {props.legal.map((item, idx) => (
            <tr key={`l-${idx}`}>
              <td>{item.label}</td>
              <td className="num">{item.quantity}</td>
              <td className="num">{formatYenLight(item.unit_price)}</td>
              <td className="num">{formatYenLight(item.amount)}</td>
            </tr>
          ))}
          <tr className="quote-doc-cat-row">
            <td colSpan={4}>
              <strong>作業工賃・部品</strong>（10% 込表示）
            </td>
          </tr>
          {props.service.map((item, idx) => (
            <tr key={`s-${idx}`}>
              <td>{item.label}</td>
              <td className="num">{item.quantity}</td>
              <td className="num">{formatYenLight(item.unit_price)}</td>
              <td className="num">{formatYenLight(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="quote-doc-sumgrid">
        <div className="quote-doc-sum">
          <div className="row">
            <span>小計</span>
            <span>{formatYen(props.nonTaxableSubtotal + taxableInclusive)}</span>
          </div>
          <div className="row">
            <span>消費税（10%）</span>
            <span>{formatYen(props.taxAmount10)}</span>
          </div>
          <div className="row strong">
            <span>合計</span>
            <span>{formatYen(props.grandTotal)}</span>
          </div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div className="row small">
              <span>10% 対象（税込累計）</span>
              <span>{formatYen(taxableInclusive)}</span>
            </div>
            <div className="row small">
              <span>　内・税抜相当</span>
              <span>{formatYen(props.taxableSubtotalExTax)}</span>
            </div>
            <div className="row small">
              <span>対象外（法定費用等）</span>
              <span>{formatYen(props.nonTaxableSubtotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="quote-doc-footer">
        <p>
          見積 No. {props.quoteNo ?? '-'} ・ 発行 {formatDate(props.issuedAt)} ・ 有効{' '}
          {formatDate(props.validUntil)}
        </p>
        {props.notes ? (
          <div className="quote-doc-notes" style={{ whiteSpace: 'pre-wrap' }}>
            {props.notes}
          </div>
        ) : null}
      </footer>
    </div>
  );
}

function formatYenLight(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`;
}
