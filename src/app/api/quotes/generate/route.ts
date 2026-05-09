import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { buildQuoteFromVehicle, quoteTotalsForDb } from '@/lib/quote';
import type { StatutoryFeeRateRow, VehicleRow } from '@/lib/supabase/types';
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

  const [vehicleRes, ratesRes] = await Promise.all([
    supabase
      .from('vehicles')
      .select('*')
      .eq('id', parsed.data.vehicle_id)
      .maybeSingle<VehicleRow>(),
    supabase.from('statutory_fee_rates').select('*').order('effective_from', { ascending: false }),
  ]);

  const vehicle = vehicleRes.data;
  const rates = (ratesRes.data ?? []) as StatutoryFeeRateRow[];

  if (!vehicle) {
    return NextResponse.json({ error: 'vehicle not found' }, { status: 404 });
  }

  const asOfDate = new Date().toISOString().slice(0, 10);
  const estimate = buildQuoteFromVehicle({
    vehicleSpecs: vehicle.vehicle_specs,
    statutoryRates: rates,
    asOfDate,
    includeOilChange: parsed.data.include_oil ?? true,
    notesAppend: parsed.data.notes_append,
  });

  const quoteNo = `QT-${new Date().getFullYear()}-${vehicle.id.slice(0, 8)}-${Date.now().toString(36)}`;
  const taxCols = quoteTotalsForDb(estimate);

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      vehicle_id: vehicle.id,
      quote_no: quoteNo,
      status: 'ISSUED',
      total_amount: taxCols.total_amount,
      grand_total: taxCols.grand_total,
      taxable_subtotal_ex_tax: taxCols.taxable_subtotal_ex_tax,
      tax_amount_10: taxCols.tax_amount_10,
      non_taxable_subtotal: taxCols.non_taxable_subtotal,
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
    payload: { vehicleId: vehicle.id, total: estimate.grand_total },
  });

  return NextResponse.json({ id: data.id, ...estimate });
}
