import { getServiceSupabase } from '@/lib/supabase/server';
import { computeEstimatedMileage, daysUntil } from '@/lib/mileage';
import { formatDate, formatKm, formatYen, priorityLabel } from '@/lib/format';
import type {
  CustomerOverviewRow,
  QuoteRow,
  ServiceHistoryRow,
} from '@/lib/supabase/types';
import type { QuoteLineItem } from '@/lib/quote';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { cid?: string };
}

async function loadCustomer(customerId: string) {
  const supabase = getServiceSupabase();
  const overviewRes = await supabase
    .from('v_customer_overview')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle<CustomerOverviewRow>();

  const vehiclesRes = await supabase.from('vehicles').select('id').eq('customer_id', customerId);
  const vehicleIds = (vehiclesRes.data ?? []).map((v) => v.id);

  let quote: QuoteRow | null = null;
  let histories: ServiceHistoryRow[] = [];
  if (vehicleIds.length > 0) {
    const quoteRes = await supabase
      .from('quotes')
      .select('*')
      .in('vehicle_id', vehicleIds)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<QuoteRow>();
    quote = quoteRes.data ?? null;

    const historyRes = await supabase
      .from('service_histories')
      .select('*')
      .in('vehicle_id', vehicleIds)
      .order('performed_at', { ascending: false })
      .limit(5);
    histories = (historyRes.data ?? []) as ServiceHistoryRow[];
  }

  return {
    overview: overviewRes.data,
    quote,
    histories,
  };
}

export default async function CustomerSelfView({ searchParams }: PageProps) {
  if (!searchParams.cid) {
    return (
      <div className="customer-view" style={{ padding: 32 }}>
        <h1 className="page-title">お客様用ページ</h1>
        <div className="page-sub" style={{ marginTop: 8 }}>
          通知メッセージのリンクからアクセスしてください。
        </div>
      </div>
    );
  }

  const { overview, quote, histories } = await loadCustomer(searchParams.cid);
  if (!overview) {
    return (
      <div className="customer-view" style={{ padding: 32 }}>
        お客様情報が見つかりません。
      </div>
    );
  }

  const estimated =
    overview.estimated_mileage ??
    computeEstimatedMileage(
      overview.initial_mileage,
      overview.initial_mileage_recorded_at,
      overview.monthly_avg_km,
    );
  const days = overview.days_until_inspection ?? daysUntil(overview.inspection_expire_date);
  const legal = (quote?.legal_items ?? []) as unknown as QuoteLineItem[];
  const service = (quote?.service_items ?? []) as unknown as QuoteLineItem[];

  return (
    <div className="customer-view">
      <div className="phone-frame">
        <div className="phone-screen">
          <div className="phone-statusbar">
            <span>9:41</span>
            <span>● ● ●</span>
          </div>
          <div className="phone-content">
            <div className="phone-header">
              <div>
                <div className="phone-greeting-label">こんにちは</div>
                <div className="phone-greeting-name">{overview.name} 様</div>
              </div>
              <div className="phone-avatar">{overview.name.slice(0, 1)}</div>
            </div>

            <div className="car-card">
              <div className="car-card-label">YOUR CAR</div>
              <div className="car-card-name">
                {overview.maker} {overview.model}
              </div>
              <div className="car-card-plate">{overview.plate}</div>
              <div className="car-stats">
                <div>
                  <div className="car-stat-label">車検満了日</div>
                  <div className="car-stat-value">{formatDate(overview.inspection_expire_date)}</div>
                </div>
                <div>
                  <div className="car-stat-label">残り</div>
                  <div className="car-stat-value">
                    {priorityLabel(days)}
                  </div>
                </div>
                <div>
                  <div className="car-stat-label">推定走行距離</div>
                  <div className="car-stat-value">
                    {formatKm(estimated)}
                  </div>
                </div>
                <div>
                  <div className="car-stat-label">前回オイル交換</div>
                  <div className="car-stat-value">{formatDate(overview.last_oil_change_at)}</div>
                </div>
              </div>
            </div>

            {days != null && days <= 90 && (
              <div className="alert-card">
                <div className="alert-label">車検のご案内</div>
                <div className="alert-title">そろそろ車検のご準備をおすすめします</div>
                <div className="alert-desc">
                  満了日まで {priorityLabel(days)}。お早めの予約をご検討ください。
                </div>
              </div>
            )}

            {quote && (
              <div className="quote-card">
                <div className="quote-header">
                  <div className="quote-title">お見積</div>
                  <div className="quote-id">{quote.quote_no}</div>
                </div>
                <div className="quote-section-label">法定費用</div>
                {legal.map((i, idx) => (
                  <div className="quote-row" key={idx}>
                    <span className="quote-row-label">{i.label}</span>
                    <span className="quote-row-value">{formatYen(i.amount)}</span>
                  </div>
                ))}
                <div className="quote-section-label" style={{ marginTop: 12 }}>整備項目</div>
                {service.map((i, idx) => (
                  <div className="quote-row" key={idx}>
                    <span className="quote-row-label">{i.label}</span>
                    <span className="quote-row-value">{formatYen(i.amount)}</span>
                  </div>
                ))}
                <div className="quote-total">
                  <span className="quote-total-label">TOTAL</span>
                  <span className="quote-total-value">{formatYen(quote.total_amount)}</span>
                </div>
                {quote.notes && <div className="quote-notes" style={{ whiteSpace: 'pre-wrap' }}>{quote.notes}</div>}
              </div>
            )}

            {histories.length > 0 && (
              <div className="timeline-section">
                <div className="section-label">最近の整備履歴</div>
                {histories.map((h) => (
                  <div className="history-item" key={h.id}>
                    <div className="history-dot" />
                    <div className="history-body">
                      <div className="history-title">{h.title}</div>
                      <div className="history-meta">
                        {formatDate(h.performed_at)} ・ {formatKm(h.mileage)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
