import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { getServerSupabase } from '@/lib/supabase/server';

const Body = z
  .object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
    priority: z.number().int().min(1).max(5).optional(),
    due_at: z.string().datetime().optional().nullable(),
    scheduled_at: z.string().datetime().optional().nullable(),
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field must be provided',
  });

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireStaff();
  const parsedId = z.string().uuid().safeParse(params.id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status) {
    updateData.completed_at =
      parsed.data.status === 'DONE' ? new Date().toISOString() : null;
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('staff_tasks')
    .update(updateData)
    .eq('id', parsedId.data)
    .select('*')
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'update_failed' }, { status: 500 });
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'staff_task.update',
    resource: 'staff_tasks',
    resourceId: data.id,
    payload: parsed.data,
  });

  return NextResponse.json({ item: data });
}
