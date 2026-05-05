import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { renderTemplate } from '@/lib/template';
import { buildMessageVariables, loadActiveTemplate } from '@/lib/dispatcher';
import type { CustomerOverviewRow } from '@/lib/supabase/types';

const Body = z.object({
  customer_id: z.string().uuid(),
  channel: z.enum(['LINE', 'MAIL']),
  template_key: z.string(),
});

export async function POST(req: Request) {
  await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data: overview } = await supabase
    .from('v_customer_overview')
    .select('*')
    .eq('customer_id', parsed.data.customer_id)
    .maybeSingle<CustomerOverviewRow>();
  if (!overview) {
    return NextResponse.json({ error: 'customer not found' }, { status: 404 });
  }
  const template = await loadActiveTemplate(parsed.data.template_key, parsed.data.channel);
  if (!template) {
    return NextResponse.json({ error: 'template not found' }, { status: 404 });
  }
  const vars = await buildMessageVariables(overview, { channel: parsed.data.channel });
  return NextResponse.json({
    subject: template.subject ? renderTemplate(template.subject, vars) : null,
    content: renderTemplate(template.content, vars),
  });
}
