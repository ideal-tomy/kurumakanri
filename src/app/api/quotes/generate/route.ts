import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { insertIssuedQuoteForVehicle } from '@/lib/quotes/insert-issued-quote';
import type { StatutoryFeeRateRow, VehicleRow } from '@/lib/supabase/types';

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

  const result = await insertIssuedQuoteForVehicle(
    supabase,
    { userId: ctx.userId, auditAction: 'quote.auto_generate' },
    vehicle,
    rates,
    {
      includeOilChange: parsed.data.include_oil ?? true,
      notesAppend: parsed.data.notes_append,
    },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const { ok: _, ...rest } = result;
  return NextResponse.json(rest);
}
