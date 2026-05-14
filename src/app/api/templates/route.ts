import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { getServiceSupabase } from '@/lib/supabase/server';

const Body = z.object({
  template_key: z.string().min(1),
  channel: z.enum(['LINE', 'MAIL']),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
});

export async function POST(req: Request) {
  const ctx = await requireStaff();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = getServiceSupabase();
  const key = parsed.data.template_key.trim();
  const ch = parsed.data.channel;

  const { data: latest, error: verErr } = await service
    .from('template_versions')
    .select('version')
    .eq('template_key', key)
    .eq('channel', ch)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle<{ version: number }>();

  if (verErr) {
    return NextResponse.json({ error: verErr.message }, { status: 500 });
  }

  const nextVersion = (latest?.version ?? 0) + 1;

  const { error: deactErr } = await service
    .from('template_versions')
    .update({ active: false })
    .eq('template_key', key)
    .eq('channel', ch);
  if (deactErr) {
    return NextResponse.json({ error: deactErr.message }, { status: 500 });
  }

  const { data: inserted, error: insErr } = await service
    .from('template_versions')
    .insert({
      template_key: key,
      channel: ch,
      subject: parsed.data.subject?.trim() ? parsed.data.subject.trim() : null,
      content: parsed.data.body,
      version: nextVersion,
      active: true,
      created_by: ctx.userId,
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    return NextResponse.json({ error: insErr?.message ?? 'テンプレの保存に失敗しました' }, { status: 500 });
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'template.publish',
    resource: 'template_versions',
    resourceId: inserted.id,
    payload: { template_key: key, channel: ch, version: nextVersion },
  });

  return NextResponse.json({ ok: true, id: inserted.id, version: nextVersion });
}
