import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import type { QuoteRow, VehicleRow } from '@/lib/supabase/types';
import { computeTotalsFromParts, rowsFromStoredJson } from '@/lib/quote';
import { writeAudit } from '@/lib/audit';

const Body = z.object({
  source_quote_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
});

/** クローンとして新規発行する（編集済み見積のベースにも使える） */
export async function POST(req: Request) {
  const ctx = await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServerSupabase();

  const { data: src, error: srcErr } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', parsed.data.source_quote_id)
    .maybeSingle<QuoteRow>();

  if (srcErr || !src) {
    return NextResponse.json({ error: 'source quote not found' }, { status: 404 });
  }

  const [{ data: vSrc }, { data: vDst }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('id', src.vehicle_id).maybeSingle<VehicleRow>(),
    supabase.from('vehicles').select('*').eq('id', parsed.data.vehicle_id).maybeSingle<VehicleRow>(),
  ]);

  if (!vSrc || !vDst || vSrc.customer_id !== vDst.customer_id) {
    return NextResponse.json(
      { error: 'same customer vehicles only — target vehicle not found or mismatch' },
      { status: 400 },
    );
  }

  const legal = rowsFromStoredJson(src.legal_items);
  const service = rowsFromStoredJson(src.service_items);
  const totals = computeTotalsFromParts(legal, service);

  const quoteNo = `QT-${new Date().getFullYear()}-${parsed.data.vehicle_id.slice(0, 8)}-${Date.now().toString(36)}`;

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      vehicle_id: parsed.data.vehicle_id,
      quote_no: quoteNo,
      status: 'ISSUED',
      total_amount: totals.grand_total,
      grand_total: totals.grand_total,
      taxable_subtotal_ex_tax: totals.taxable_subtotal_ex_tax,
      tax_amount_10: totals.tax_amount_10,
      non_taxable_subtotal: totals.non_taxable_subtotal,
      legal_items: legal,
      service_items: service,
      notes: src.notes,
      valid_until: vDst.inspection_expire_date,
      issued_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'clone failed' }, { status: 500 });
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'quote.clone',
    resource: 'quotes',
    resourceId: data.id,
    payload: { sourceQuoteId: src.id, vehicleId: parsed.data.vehicle_id },
  });

  return NextResponse.json({ id: data.id });
}
