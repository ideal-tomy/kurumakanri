import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { getServerSupabase } from '@/lib/supabase/server';

const Body = z.object({
  customer_id: z.string().uuid(),
  source_label: z.string().min(1).max(120),
});

/**
 * 「今週の連絡対応済み」マーク用 API。
 * v_priority_queue の AUTO 行は task_id を持たないため、staff_tasks に DONE レコードを
 * 1つ作って resolvedCustomerIds（/api/priorities 側）でフィルタアウトされるようにする。
 */
export async function POST(req: Request) {
  const ctx = await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('staff_tasks')
    .insert({
      title: `対応済み: ${parsed.data.source_label}`,
      description: 'priorities カードの完了ボタンから登録',
      task_type: 'OTHER',
      priority: 3,
      status: 'DONE',
      completed_at: now,
      customer_id: parsed.data.customer_id,
      created_by: ctx.userId,
      assigned_to: ctx.userId,
    })
    .select('id')
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'create_failed' }, { status: 500 });
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'priorities.mark_resolved',
    resource: 'staff_tasks',
    resourceId: data.id,
    payload: {
      customer_id: parsed.data.customer_id,
      source_label: parsed.data.source_label,
    },
  });

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
