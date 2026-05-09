import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { sendLineMessage } from '@/lib/providers/line';
import { buildQuoteShareToken, isQuoteShareConfigured } from '@/lib/quote-share';
import { writeAudit } from '@/lib/audit';

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const authCtx = await requireStaff();
  const quoteId = ctx.params.id;

  if (!isQuoteShareConfigured()) {
    return NextResponse.json(
      { error: 'QUOTE_SHARE_SECRET が未設定のため公開リンクを作成できません' },
      { status: 500 },
    );
  }

  const supabase = getServerSupabase();
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, quote_no, vehicle_id')
    .eq('id', quoteId)
    .maybeSingle<{ id: string; quote_no: string | null; vehicle_id: string }>();

  if (error || !quote) {
    return NextResponse.json({ error: 'quote not found' }, { status: 404 });
  }

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('customer_id')
    .eq('id', quote.vehicle_id)
    .maybeSingle<{ customer_id: string }>();
  if (!vehicle?.customer_id) {
    return NextResponse.json({ error: 'vehicle not found' }, { status: 404 });
  }

  const [{ data: customer }, { data: consent }] = await Promise.all([
    supabase
      .from('customers')
      .select('name, line_user_id')
      .eq('id', vehicle.customer_id)
      .maybeSingle<{ name: string; line_user_id: string | null }>(),
    supabase
      .from('consents')
      .select('opt_in')
      .eq('customer_id', vehicle.customer_id)
      .eq('channel', 'LINE')
      .maybeSingle<{ opt_in: boolean | null }>(),
  ]);

  if (!customer?.line_user_id) {
    return NextResponse.json({ error: 'LINE user_id が登録されていません' }, { status: 400 });
  }
  if (consent && consent.opt_in === false) {
    return NextResponse.json({ error: 'LINE 通知はオプトアウト済みです' }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const token = buildQuoteShareToken(quote.id);
  const url = `${siteUrl}/q/${token}`;
  const no = quote.quote_no ?? '';
  const text = `${customer.name} 様\n\n車検のお見積をご案内します。\n（${no}）\n\n詳細・印刷はこちら:\n${url}`;

  const result = await sendLineMessage(customer.line_user_id, text);
  if (!result.success) {
    return NextResponse.json(
      { error: result.errorMessage ?? 'LINE送信失敗', code: result.errorCode },
      { status: 502 },
    );
  }

  await writeAudit({
    userId: authCtx.userId,
    action: 'quote.line_notify',
    resource: 'quotes',
    resourceId: quote.id,
    payload: { preview: text.slice(0, 160) },
  });

  return NextResponse.json({ ok: true });
}
