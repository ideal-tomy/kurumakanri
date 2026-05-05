import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { dispatchNotification } from '@/lib/dispatcher';
import { writeAudit } from '@/lib/audit';

const ruleToTemplate: Record<string, string> = {
  shaken_180days: 'shaken_180days',
  shaken_90days: 'shaken_90days',
  oil_4000km: 'oil_4000km',
  custom: 'custom',
};

const Body = z.object({
  rule: z.enum(['shaken_180days', 'shaken_90days', 'oil_4000km', 'custom']),
  channel: z.enum(['LINE', 'MAIL', 'BOTH']),
  customer_ids: z.array(z.string().uuid()).min(1),
  template_key: z.string().optional(),
  fallback: z.boolean().optional(),
});

export async function POST(req: Request) {
  const ctx = await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const channels = parsed.data.channel === 'BOTH' ? (['LINE', 'MAIL'] as const) : [parsed.data.channel];
  const templateKey = parsed.data.template_key ?? ruleToTemplate[parsed.data.rule] ?? parsed.data.rule;

  let queued = 0;
  let sent = 0;
  let failed = 0;
  const results = [] as unknown[];

  for (const customerId of parsed.data.customer_ids) {
    for (const channel of channels) {
      queued += 1;
      const result = await dispatchNotification({
        customerId,
        channel,
        ruleKey: parsed.data.rule,
        templateKey,
        requestedBy: ctx.userId,
        fallback: parsed.data.fallback ?? true,
      });
      results.push(result);
      if (result.status === 'SENT') sent += 1;
      else if (result.status === 'FAILED') failed += 1;
    }
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'notification.manual_send',
    resource: 'notification_jobs',
    payload: {
      rule: parsed.data.rule,
      channel: parsed.data.channel,
      customers: parsed.data.customer_ids.length,
      sent,
      failed,
    },
  });

  return NextResponse.json({ queued, sent, failed, results });
}
