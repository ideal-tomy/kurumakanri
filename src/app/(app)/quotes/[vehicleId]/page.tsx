import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { PageBack } from '@/components/page-back';
import { NextActions } from '@/components/next-actions';
import type { QuoteRow, VehicleRow } from '@/lib/supabase/types';
import { QuotePageClient } from './quote-page-client';
import { buildQuoteShareToken, isQuoteShareConfigured } from '@/lib/quote-share';

export const dynamic = 'force-dynamic';

export default async function QuoteListPage({
  params,
  searchParams,
}: {
  params: { vehicleId: string };
  searchParams?: { notify?: string };
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
  const fromNotify = searchParams?.notify === '1';

  const shareUrlsByQuoteId: Record<string, string | null> = {};
  for (const q of quotes) {
    shareUrlsByQuoteId[q.id] =
      canShareQuote && siteUrl ? `${siteUrl}/q/${buildQuoteShareToken(q.id)}` : null;
  }

  return (
    <>
      <PageBack href={`/customers/${vehicle.customer_id}`} label="顧客詳細へ戻る" />

      <QuotePageClient
        vehicle={vehicle}
        quotes={quotes}
        shareUrlsByQuoteId={shareUrlsByQuoteId}
        lineNotifyEligible={lineNotifyEligible}
        fromNotify={fromNotify}
      />

      <div className="desktop-only">
        <NextActions
          items={[
            { href: `/customers/${vehicle.customer_id}`, label: '顧客詳細へ戻る', primary: true },
            { href: '/customers', label: '顧客一覧' },
            { href: '/', label: 'ホーム' },
          ]}
        />
      </div>
    </>
  );
}
