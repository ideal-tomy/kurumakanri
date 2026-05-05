import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { dispatchNotification } from '@/lib/dispatcher';
import { writeAudit } from '@/lib/audit';
import type { NotificationJobRow } from '@/lib/supabase/types';

const Body = z.object({
  job_ids: z.array(z.string().uuid()).min(1),
  channel_override: z.enum(['LINE', 'MAIL']).optional(),
});

export async function POST(req: Request) {
  const ctx = await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data: jobs } = await supabase
    .from('notification_jobs')
    .select('*')
    .in('id', parsed.data.job_ids);
  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ error: 'no jobs' }, { status: 404 });
  }

  const results = [] as unknown[];
  for (const job of jobs as NotificationJobRow[]) {
    const channel = parsed.data.channel_override ?? job.channel;
    const ruleKey =
      (job.payload as { ruleKey?: string } | null)?.ruleKey ?? job.template_key;
    const result = await dispatchNotification({
      customerId: job.customer_id,
      channel,
      ruleKey,
      templateKey: job.template_key,
      requestedBy: ctx.userId,
      fallback: false,
    });
    results.push(result);
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'notification.retry',
    resource: 'notification_jobs',
    payload: { count: jobs.length, channelOverride: parsed.data.channel_override ?? null },
  });

  return NextResponse.json({ results });
}
