import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { sendLineMessage } from '@/lib/providers/line';
import { writeAudit } from '@/lib/audit';
import { daysUntil } from '@/lib/mileage';
import { renderLineNotificationForCustomer } from '@/lib/notifications/render-customer-line';
import { resolveShakenTemplateKeyFromDays } from '@/lib/notifications/resolve-shaken-template';
import type { CustomerOverviewRow } from '@/lib/supabase/types';

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const authCtx = await requireStaff();
  const quoteId = ctx.params.id;

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

  const [{ data: customer }, { data: consent }, { data: overview }] = await Promise.all([
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
    supabase
      .from('v_customer_overview')
      .select('*')
      .eq('customer_id', vehicle.customer_id)
      .maybeSingle<CustomerOverviewRow>(),
  ]);

  if (!customer?.line_user_id) {
    return NextResponse.json({ error: 'LINE user_id が登録されていません' }, { status: 400 });
  }
  if (consent && consent.opt_in === false) {
    return NextResponse.json({ error: 'LINE 通知はオプトアウト済みです' }, { status: 400 });
  }
  if (!overview) {
    return NextResponse.json({ error: '顧客情報が見つかりません' }, { status: 404 });
  }

  const days =
    overview.days_until_inspection ?? daysUntil(overview.inspection_expire_date);
  const templateKey = resolveShakenTemplateKeyFromDays(days);
  const text = await renderLineNotificationForCustomer(overview, templateKey);
  if (!text) {
    return NextResponse.json(
      { error: `LINE テンプレ「${templateKey}」が見つかりません` },
      { status: 500 },
    );
  }

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
    payload: { templateKey, preview: text.slice(0, 160) },
  });

  return NextResponse.json({ ok: true, template_key: templateKey });
}
