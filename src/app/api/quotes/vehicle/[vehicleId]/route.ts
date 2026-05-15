import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { buildQuoteShareToken, isQuoteShareConfigured } from '@/lib/quote-share';
import { getServerSupabase } from '@/lib/supabase/server';
import type { QuoteRow, VehicleRow } from '@/lib/supabase/types';

export async function GET(_req: Request, { params }: { params: { vehicleId: string } }) {
  await requireStaff();
  const supabase = getServerSupabase();

  const [vehicleRes, quotesRes] = await Promise.all([
    supabase.from('vehicles').select('*').eq('id', params.vehicleId).maybeSingle<VehicleRow>(),
    supabase
      .from('quotes')
      .select('*')
      .eq('vehicle_id', params.vehicleId)
      .order('created_at', { ascending: false }),
  ]);

  const vehicle = vehicleRes.data;
  if (!vehicle) {
    return NextResponse.json({ error: '車両が見つかりません' }, { status: 404 });
  }

  const quotes = (quotesRes.data ?? []) as QuoteRow[];

  let lineNotifyEligible = false;
  if (vehicle.customer_id) {
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  const canShareQuote = Boolean(siteUrl && isQuoteShareConfigured());
  const shareUrlsByQuoteId: Record<string, string | null> = {};
  for (const q of quotes) {
    shareUrlsByQuoteId[q.id] =
      canShareQuote && siteUrl ? `${siteUrl}/q/${buildQuoteShareToken(q.id)}` : null;
  }

  return NextResponse.json({
    vehicle: {
      id: vehicle.id,
      customer_id: vehicle.customer_id,
      maker: vehicle.maker,
      model: vehicle.model,
      plate: vehicle.plate,
      inspection_expire_date: vehicle.inspection_expire_date,
    },
    quotes,
    shareUrlsByQuoteId,
    lineNotifyEligible,
  });
}
