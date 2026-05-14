import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { sendLineMulticast, type LineMulticastMessage } from '@/lib/providers/line';
import { getServiceSupabase } from '@/lib/supabase/server';

const Body = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  body: z.string().min(1, '本文は必須です'),
  image_url: z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s == null || s.trim() === '' ? null : s.trim()))
    .refine((s) => s == null || /^https:\/\//i.test(s), '画像URLは https で始まる URL を指定してください'),
  customer_ids: z.array(z.string().uuid()).min(1, '顧客を1名以上選んでください'),
});

const CHUNK = 500;

export async function POST(req: Request) {
  const ctx = await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = getServiceSupabase();

  const { data: campaignIns, error: campErr } = await service
    .from('campaigns')
    .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      image_url: parsed.data.image_url,
      created_by: ctx.userId,
      customer_count: parsed.data.customer_ids.length,
      success_count: 0,
      failed_count: 0,
    })
    .select('id')
    .single();

  if (campErr || !campaignIns) {
    return NextResponse.json({ error: campErr?.message ?? 'キャンペーンの作成に失敗しました' }, { status: 500 });
  }
  const campaignId = campaignIns.id as string;

  const { data: customersRaw, error: cErr } = await service
    .from('customers')
    .select('id, line_user_id')
    .in('id', parsed.data.customer_ids);

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  const withLine = (customersRaw ?? []).filter(
    (c: { id: string; line_user_id: string | null }) => c.line_user_id && c.line_user_id.length > 0,
  ) as { id: string; line_user_id: string }[];

  const custIds = withLine.map((c) => c.id);
  const { data: consents } = custIds.length
    ? await service.from('consents').select('customer_id, opt_in, opt_out_at').eq('channel', 'LINE').in('customer_id', custIds)
    : { data: [] as { customer_id: string; opt_in: boolean; opt_out_at: string | null }[] };

  const consentByCustomer = new Map<string, { opt_in: boolean; opt_out_at: string | null }>();
  for (const row of consents ?? []) {
    consentByCustomer.set(row.customer_id, row);
  }

  const eligible: { id: string; line_user_id: string }[] = [];
  for (const c of withLine) {
    const cn = consentByCustomer.get(c.id);
    if (cn?.opt_in === false) continue;
    if (cn?.opt_out_at) continue;
    eligible.push(c);
  }

  const skippedNoLine = parsed.data.customer_ids.filter((id) => {
    const row = (customersRaw ?? []).find((r: { id: string }) => r.id === id);
    return !row || !(row as { line_user_id: string | null }).line_user_id;
  }).length;
  const skippedConsent = withLine.length - eligible.length;

  const messages: LineMulticastMessage[] = [];
  if (parsed.data.image_url) {
    messages.push({
      type: 'image',
      originalContentUrl: parsed.data.image_url,
      previewImageUrl: parsed.data.image_url,
    });
  }
  messages.push({
    type: 'text',
    text: `【${parsed.data.title}】\n${parsed.data.body}`,
  });

  let success = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < eligible.length; i += CHUNK) {
    const slice = eligible.slice(i, i + CHUNK);
    const toIds = slice.map((s) => s.line_user_id);
    const sendRes = await sendLineMulticast(toIds, messages);

    const jobs = slice.map((row) => ({
      customer_id: row.id,
      vehicle_id: null as string | null,
      channel: 'LINE' as const,
      template_key: 'custom',
      scheduled_at: now,
      status: sendRes.success ? ('SENT' as const) : ('FAILED' as const),
      attempts: 1,
      idempotency_key: `campaign:${campaignId}:line:${row.id}`,
      payload: {
        title: parsed.data.title,
        body: parsed.data.body,
        campaign: true,
      },
      requested_by: ctx.userId,
      campaign_id: campaignId,
    }));

    const { data: inserted, error: insErr } = await service.from('notification_jobs').insert(jobs).select('id');

    if (insErr || !inserted) {
      failed += slice.length;
      continue;
    }

    for (const job of inserted) {
      await service.from('notification_logs').insert({
        job_id: job.id,
        provider: 'line',
        provider_message_id: sendRes.providerMessageId ?? null,
        result: sendRes.success ? 'SUCCESS' : 'FAILED',
        error_code: sendRes.success ? null : sendRes.errorCode ?? null,
        error_message: sendRes.success ? null : sendRes.errorMessage ?? null,
        payload: { multicast: true, campaign_id: campaignId },
      });
    }

    if (sendRes.success) success += slice.length;
    else failed += slice.length;
  }

  await service
    .from('campaigns')
    .update({
      sent_at: now,
      customer_count: parsed.data.customer_ids.length,
      success_count: success,
      failed_count: failed,
    })
    .eq('id', campaignId);

  await writeAudit({
    userId: ctx.userId,
    action: 'campaign.send',
    resource: 'campaigns',
    resourceId: campaignId,
    payload: {
      requested: parsed.data.customer_ids.length,
      eligible: eligible.length,
      success,
      failed,
      skippedNoLine,
      skippedConsent,
    },
  });

  return NextResponse.json({
    campaign_id: campaignId,
    success,
    failed,
    skipped_no_line: skippedNoLine,
    skipped_consent: skippedConsent,
    eligible: eligible.length,
  });
}
