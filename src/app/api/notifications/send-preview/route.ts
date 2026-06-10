import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { ensureQuotesForCustomers } from '@/lib/notifications/ensure-quotes-for-customers';
import { buildReviewPayloadItems } from '@/lib/notifications/review-payload-builder';
import { writeAudit } from '@/lib/audit';

const Body = z.object({
  customer_ids: z.array(z.string().uuid()).min(1),
  rule: z.enum([
    'shaken_180days',
    'shaken_90days',
    'shaken_30days',
    'shaken_overdue',
    'oil_4000km',
    'custom',
  ]),
  channel: z.enum(['LINE', 'MAIL', 'BOTH']),
  template_key: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.rule === 'custom' && !parsed.data.template_key?.trim()) {
    return NextResponse.json({ error: 'custom の場合は template_key が必要です' }, { status: 400 });
  }

  const supabase = getServerSupabase();

  const ensure = await ensureQuotesForCustomers(
    supabase,
    ctx.userId,
    parsed.data.customer_ids,
  );
  if (ensure.errors.length > 0 && ensure.created === 0 && ensure.skipped === 0) {
    return NextResponse.json(
      { error: ensure.errors.join('; ') || '見積の確認に失敗しました' },
      { status: 400 },
    );
  }

  const payload = await buildReviewPayloadItems(supabase, parsed.data);
  const first = payload.items[0];
  if (!first) {
    return NextResponse.json({ error: 'プレビューデータがありません' }, { status: 404 });
  }

  if (ensure.created > 0) {
    await writeAudit({
      userId: ctx.userId,
      action: 'quote.ensure_batch',
      resource: 'quotes',
      resourceId: null,
      payload: {
        requested: parsed.data.customer_ids.length,
        created: ensure.created,
        skipped: ensure.skipped,
        via: 'send-preview',
      },
    });
  }

  return NextResponse.json({
    item: first,
    lineBody: first.line_preview ?? '',
    mailBody: first.mail_body ?? '',
    ensure,
  });
}
