import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { PageBack } from '@/components/page-back';
import { NextActions } from '@/components/next-actions';
import { formatDate } from '@/lib/format';
import type { QuoteRow, VehicleRow } from '@/lib/supabase/types';
import { GenerateButton } from './generate-button';
import { QuoteEditorCard } from '@/components/quote-line-editor';
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
          <QuoteEditorCard
            key={`${q.id}-${q.updated_at ?? ''}`}
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
