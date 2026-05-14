import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { getServiceSupabase } from '@/lib/supabase/server';

const PostBody = z.object({
  effective_from: z.string().min(1),
  vehicle_class: z.enum(['LIGHT', 'STANDARD']),
  jibaiseki_24mo_yen: z.number().int().nonnegative(),
  weight_tax_yen_standard: z.number().int().nonnegative(),
  weight_tax_yen_eco: z.number().int().nonnegative(),
  prepaid_inspection_yen: z.number().int().nonnegative().optional(),
  lane_stamp_yen: z.number().int().nonnegative().optional(),
  document_fee_yen: z.number().int().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

const PatchBody = z.object({
  id: z.string().uuid(),
  effective_from: z.string().optional(),
  vehicle_class: z.enum(['LIGHT', 'STANDARD']).optional(),
  jibaiseki_24mo_yen: z.number().int().nonnegative().optional(),
  weight_tax_yen_standard: z.number().int().nonnegative().optional(),
  weight_tax_yen_eco: z.number().int().nonnegative().optional(),
  prepaid_inspection_yen: z.number().int().nonnegative().optional(),
  lane_stamp_yen: z.number().int().nonnegative().optional(),
  document_fee_yen: z.number().int().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const ctx = await requireRole('ADMIN');
  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = getServiceSupabase();
  const { data, error } = await service
    .from('statutory_fee_rates')
    .insert({
      effective_from: parsed.data.effective_from,
      vehicle_class: parsed.data.vehicle_class,
      jibaiseki_24mo_yen: parsed.data.jibaiseki_24mo_yen,
      weight_tax_yen_standard: parsed.data.weight_tax_yen_standard,
      weight_tax_yen_eco: parsed.data.weight_tax_yen_eco,
      prepaid_inspection_yen: parsed.data.prepaid_inspection_yen ?? 2200,
      lane_stamp_yen: parsed.data.lane_stamp_yen ?? 2300,
      document_fee_yen: parsed.data.document_fee_yen ?? 770,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? '作成に失敗しました' }, { status: 500 });
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'statutory.create',
    resource: 'statutory_fee_rates',
    resourceId: data.id,
    payload: { effective_from: parsed.data.effective_from, vehicle_class: parsed.data.vehicle_class },
  });

  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  const ctx = await requireRole('ADMIN');
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...rest } = parsed.data;
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) patch[k] = v;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '更新フィールドがありません' }, { status: 400 });
  }

  const service = getServiceSupabase();
  const { error } = await service.from('statutory_fee_rates').update(patch).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'statutory.update',
    resource: 'statutory_fee_rates',
    resourceId: id,
    payload: patch,
  });

  return NextResponse.json({ ok: true });
}
