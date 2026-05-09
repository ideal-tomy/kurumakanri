import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { Badge } from '@/components/badge';
import { PageBack } from '@/components/page-back';
import { NextActions } from '@/components/next-actions';
import { formatDate, formatYen } from '@/lib/format';
import type { QuoteRow, VehicleRow } from '@/lib/supabase/types';
import { quoteTotalsForDisplay } from '@/lib/quote';
import { GenerateButton } from './generate-button';
import { QuoteStaffActions } from './quote-staff-actions';
import { buildQuoteShareToken, isQuoteShareConfigured } from '@/lib/quote-share';

export const dynamic = 'force-dynamic';

export default async function QuoteListPage({
  params,
}: {
  params: { vehicleId: string };
}) {
  const supabase = getServerSupabase();

  const [vehicleRes, quotesRes] = await Promise.all([
    supabase
      .from('vehicles')
      .select('*')
      .eq('id', params.vehicleId)
      .maybeSingle<VehicleRow>(),
    supabase
      .from('quotes')
      .select('*')
      .eq('vehicle_id', params.vehicleId)
      .order('created_at', { ascending: false }),
  ]);

  const vehicle = vehicleRes.data;
  const quotes = (quotesRes.data ?? []) as QuoteRow[];

  let lineNotifyEligible = false;
  if (vehicle?.customer_id) {
    const [cu, cn] = await Promise.all([
      supabase
        .from('customers')
        .select('line_user_id')
        .eq('id', vehicle.customer_id)
        .maybeSingle<{ line_user_id: string | null }>(),
      supabase
        .from('consents')
        .select('opt_in')
        .eq('customer_id', vehicle.customer_id)
        .eq('channel', 'LINE')
        .maybeSingle<{ opt_in: boolean | null }>(),
    ]);
    lineNotifyEligible = Boolean(cu.data?.line_user_id) && cn.data?.opt_in !== false;
  }

  if (!vehicle) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  const canShareQuote = Boolean(siteUrl && isQuoteShareConfigured());

  return (
    <>
      <PageBack
        href={`/customers/${vehicle.customer_id}`}
        label="顧客詳細へ戻る"
      />
      <div className="page-header">
        <div>
          <h1 className="page-title">
            見積 - {vehicle.maker} {vehicle.model}
          </h1>
          <div className="page-sub">
            ナンバー {vehicle.plate} ・ 満了日 {formatDate(vehicle.inspection_expire_date)}
          </div>
        </div>
        <div className="page-actions">
          <GenerateButton vehicleId={vehicle.id} />
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="empty">まだ見積がありません。「自動見積を生成」を押してください。</div>
      ) : (
        quotes.map((q) => (
          <QuoteCard
            key={q.id}
            quote={q}
            vehicleId={vehicle.id}
            customerId={vehicle.customer_id}
            shareUrl={
              canShareQuote && siteUrl ? `${siteUrl}/q/${buildQuoteShareToken(q.id)}` : null
            }
            lineNotifyEligible={lineNotifyEligible}
          />
        ))
      )}

      <NextActions
        items={[
          { href: `/customers/${vehicle.customer_id}`, label: '顧客詳細へ戻る', primary: true },
          { href: '/customers', label: '顧客一覧' },
          { href: '/priorities', label: '今日の連絡' },
        ]}
      />
    </>
  );
}

function QuoteCard({
  quote,
  vehicleId,
  customerId,
  shareUrl,
  lineNotifyEligible,
}: {
  quote: QuoteRow;
  vehicleId: string;
  customerId: string;
  shareUrl: string | null;
  lineNotifyEligible: boolean;
}) {
  const disp = quoteTotalsForDisplay(quote);
  return (
    <section className="panel" style={{ marginBottom: 24 }}>
      <header className="panel-header">
        <div>
          <div className="panel-title">{quote.quote_no ?? '-'}</div>
          <div className="cust-meta">発行 {formatDate(quote.issued_at)} / 有効 {formatDate(quote.valid_until)}</div>
        </div>
        <Badge variant="info">{quote.status}</Badge>
      </header>
      <div style={{ padding: 20 }}>
        <h3 className="quote-section-label">車検法定費用・手数料（対象外）</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                品目
              </th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid var(--border)', width: '28%' }}>
                金額
              </th>
            </tr>
          </thead>
          <tbody>
            {disp.legal.map((i, idx) => (
              <tr key={`l-${idx}`}>
                <td style={{ padding: '6px 0' }}>
                  {i.label}
                  {i.quantity !== 1 ? (
                    <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>
                      {' '}
                      ×{i.quantity} @ {formatYen(i.unit_price)}
                    </span>
                  ) : null}
                </td>
                <td style={{ textAlign: 'right' }}>{formatYen(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="quote-section-label" style={{ marginTop: 16 }}>
          作業工賃（税込み表示）
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                品目
              </th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid var(--border)', width: '28%' }}>
                金額
              </th>
            </tr>
          </thead>
          <tbody>
            {disp.service.map((i, idx) => (
              <tr key={`s-${idx}`}>
                <td style={{ padding: '6px 0' }}>
                  {i.label}
                  {i.quantity !== 1 ? (
                    <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>
                      {' '}
                      ×{i.quantity} @ {formatYen(i.unit_price)}
                    </span>
                  ) : null}
                </td>
                <td style={{ textAlign: 'right' }}>{formatYen(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 16, fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <table style={{ width: '100%', maxWidth: 400, marginLeft: 'auto' }}>
            <tbody>
              <tr>
                <td>対象外小計（法定）</td>
                <td style={{ textAlign: 'right' }}>{formatYen(disp.non_taxable_subtotal)}</td>
              </tr>
              <tr>
                <td>10%対象・税込累計（作業等）</td>
                <td style={{ textAlign: 'right' }}>{formatYen(disp.taxable_tax_included)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 12, color: 'var(--ink-2)' }}>内・税抜相当</td>
                <td style={{ textAlign: 'right', color: 'var(--ink-2)' }}>
                  {formatYen(disp.taxable_subtotal_ex_tax)}
                </td>
              </tr>
              <tr>
                <td>消費税（10%）</td>
                <td style={{ textAlign: 'right' }}>{formatYen(disp.tax_amount_10)}</td>
              </tr>
              <tr style={{ fontWeight: 700, fontSize: 15 }}>
                <td>合計（税込）</td>
                <td style={{ textAlign: 'right' }}>{formatYen(disp.grand_total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {quote.notes && (
          <div className="quote-notes" style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
            {quote.notes}
          </div>
        )}

        <QuoteStaffActions
          quoteId={quote.id}
          vehicleId={vehicleId}
          shareUrl={shareUrl}
          lineNotifyEligible={lineNotifyEligible && Boolean(shareUrl)}
        />

        <p className="cust-meta" style={{ marginTop: 12 }}>
          自動車区分・エコ減税の設定は{' '}
          <Link className="panel-link" href={`/customers/${customerId}`}>
            顧客詳細（車両）
          </Link>
          で編集してください。
        </p>
      </div>
    </section>
  );
}
