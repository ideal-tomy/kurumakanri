import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { buildReviewPayloadItems } from '@/lib/notifications/review-payload-builder';

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
  await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.rule === 'custom' && !parsed.data.template_key?.trim()) {
    return NextResponse.json({ error: 'custom の場合は template_key が必要です' }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const result = await buildReviewPayloadItems(supabase, parsed.data);
  return NextResponse.json(result);
}
