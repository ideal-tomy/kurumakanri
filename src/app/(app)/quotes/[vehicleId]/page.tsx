import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { Badge } from '@/components/badge';
import { formatDate, formatYen } from '@/lib/format';
import type { QuoteRow, VehicleRow } from '@/lib/supabase/types';
import type { QuoteLineItem } from '@/lib/quote';
import { GenerateButton } from './generate-button';

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
  if (!vehicle) notFound();

  return (
    <>
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
          <Link href={`/customers/${vehicle.customer_id}`} className="btn">
            ← 顧客へ
          </Link>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="empty">まだ見積がありません。「自動見積を生成」を押してください。</div>
      ) : (
        quotes.map((q) => <QuoteCard key={q.id} quote={q} />)
      )}
    </>
  );
}

function QuoteCard({ quote }: { quote: QuoteRow }) {
  const legal = quote.legal_items as unknown as QuoteLineItem[];
  const service = quote.service_items as unknown as QuoteLineItem[];
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
        <h3 className="quote-section-label">法定費用</h3>
        <table>
          <tbody>
            {legal.map((i, idx) => (
              <tr key={idx}>
                <td>{i.label}</td>
                <td style={{ textAlign: 'right' }}>{formatYen(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="quote-section-label" style={{ marginTop: 16 }}>整備項目</h3>
        <table>
          <tbody>
            {service.map((i, idx) => (
              <tr key={idx}>
                <td>{i.label}</td>
                <td style={{ textAlign: 'right' }}>{formatYen(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="quote-total">
          <span className="quote-total-label">合計（税込）</span>
          <span className="quote-total-value">{formatYen(quote.total_amount)}</span>
        </div>
        {quote.notes && (
          <div className="quote-notes" style={{ whiteSpace: 'pre-wrap' }}>
            {quote.notes}
          </div>
        )}
      </div>
    </section>
  );
}
