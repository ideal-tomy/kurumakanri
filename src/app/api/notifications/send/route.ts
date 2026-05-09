import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { dispatchNotification } from '@/lib/dispatcher';
import { writeAudit } from '@/lib/audit';
import { resolveNotificationTemplateKey } from '@/lib/notifications/rule-template';

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
  const templateKey = resolveNotificationTemplateKey(parsed.data.rule, parsed.data.template_key);

  let queued = 0;
  let sent = 0;
  let failed = 0;
  const results = [] as Awaited<ReturnType<typeof dispatchNotification>>[];

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

  const failedByCode = results
    .filter((result) => result.status === 'FAILED')
    .reduce<Record<string, number>>((acc, result) => {
      const key = result.errorCode ?? 'UNKNOWN';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

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
      failedByCode,
    },
  });

  return NextResponse.json({ queued, sent, failed, failedByCode, results });
}
