import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { buildAutoQuote } from '@/lib/quote';
import { writeAudit } from '@/lib/audit';

const Body = z.object({
  vehicle_id: z.string().uuid(),
  include_oil: z.boolean().optional(),
  notes_append: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id, inspection_expire_date')
    .eq('id', parsed.data.vehicle_id)
    .maybeSingle();
  if (!vehicle) {
    return NextResponse.json({ error: 'vehicle not found' }, { status: 404 });
  }

  const estimate = buildAutoQuote({
    includeOilChange: parsed.data.include_oil ?? true,
    notesAppend: parsed.data.notes_append,
  });

  const quoteNo = `QT-${new Date().getFullYear()}-${vehicle.id.slice(0, 8)}`;

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      vehicle_id: vehicle.id,
      quote_no: quoteNo,
      status: 'ISSUED',
      total_amount: estimate.total_amount,
      legal_items: estimate.legal_items,
      service_items: estimate.service_items,
      notes: estimate.notes,
      valid_until: vehicle.inspection_expire_date,
      issued_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'quote.auto_generate',
    resource: 'quotes',
    resourceId: data.id,
    payload: { vehicleId: vehicle.id, total: estimate.total_amount },
  });

  return NextResponse.json({ id: data.id, ...estimate });
}
