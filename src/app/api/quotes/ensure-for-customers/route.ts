import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { ensureQuotesForCustomers } from '@/lib/notifications/ensure-quotes-for-customers';
import { writeAudit } from '@/lib/audit';

const Body = z.object({
  customer_ids: z.array(z.string().uuid()).min(1),
  /** すべての車両に既に見積があっても作り直す（既定 false） */
  force: z.boolean().optional(),
});

/**
 * 主車両に対し、quotes が 1 件も無ければ自動で概算見積を 1 件発行する。
 */
export async function POST(req: Request) {
  const ctx = await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { created, skipped, errors } = await ensureQuotesForCustomers(
    supabase,
    ctx.userId,
    parsed.data.customer_ids,
    { force: parsed.data.force },
  );

  await writeAudit({
    userId: ctx.userId,
    action: 'quote.ensure_batch',
    resource: 'quotes',
    resourceId: null,
    payload: {
      requested: parsed.data.customer_ids.length,
      created,
      skipped,
      force: parsed.data.force ?? false,
    },
  });

  return NextResponse.json({ created, skipped, errors });
}
