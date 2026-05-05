import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { getServerSupabase } from '@/lib/supabase/server';

const Body = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  task_type: z.enum(['CALL', 'FOLLOWUP', 'QUOTE', 'OTHER']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  due_at: z.string().datetime().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  vehicle_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
});

export async function POST(req: Request) {
  const ctx = await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('staff_tasks')
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      task_type: payload.task_type ?? 'OTHER',
      priority: payload.priority ?? 3,
      due_at: payload.due_at ?? null,
      scheduled_at: payload.scheduled_at ?? null,
      customer_id: payload.customer_id ?? null,
      vehicle_id: payload.vehicle_id ?? null,
      assigned_to: payload.assigned_to ?? ctx.userId,
      created_by: ctx.userId,
    })
    .select('*')
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'create_failed' }, { status: 500 });
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'staff_task.create',
    resource: 'staff_tasks',
    resourceId: data.id,
    payload: {
      title: data.title,
      task_type: data.task_type,
      priority: data.priority,
      assigned_to: data.assigned_to,
    },
  });

  return NextResponse.json({ item: data }, { status: 201 });
}
