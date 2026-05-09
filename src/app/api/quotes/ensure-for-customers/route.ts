import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { insertIssuedQuoteForVehicle } from '@/lib/quotes/insert-issued-quote';
import type {
  CustomerOverviewRow,
  StatutoryFeeRateRow,
  VehicleRow,
} from '@/lib/supabase/types';
import { writeAudit } from '@/lib/audit';

const Body = z.object({
  customer_ids: z.array(z.string().uuid()).min(1),
  /** すべての車両に既に見積があっても作り直す（既定 false） */
  force: z.boolean().optional(),
});

/**
 * 主車両に対し、quotes が 1 件も無ければ自動で概算見積を 1 件発行する。
 */
export async function POST(req: Request) {
  const ctx = await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data: ratesData } = await supabase
    .from('statutory_fee_rates')
    .select('*')
    .order('effective_from', { ascending: false });
  const rates = (ratesData ?? []) as StatutoryFeeRateRow[];

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const customerId of parsed.data.customer_ids) {
    const { data: overview } = await supabase
      .from('v_customer_overview')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle<CustomerOverviewRow>();

    if (!overview?.vehicle_id) {
      errors.push(`${customerId}: 車両なし`);
      continue;
    }

    const { data: quoteExists } = await supabase
      .from('quotes')
      .select('id')
      .eq('vehicle_id', overview.vehicle_id)
      .limit(1)
      .maybeSingle();

    if (!parsed.data.force && quoteExists?.id) {
      skipped += 1;
      continue;
    }

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', overview.vehicle_id)
      .maybeSingle<VehicleRow>();

    if (!vehicle) {
      errors.push(`${customerId}: 車両行が取得できません`);
      continue;
    }

    const result = await insertIssuedQuoteForVehicle(
      supabase,
      { userId: ctx.userId, auditAction: 'quote.ensure_customer' },
      vehicle,
      rates,
    );

    if (result.ok) created += 1;
    else errors.push(`${customerId}: ${result.error}`);
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'quote.ensure_batch',
    resource: 'quotes',
    resourceId: null,
    payload: {
      requested: parsed.data.customer_ids.length,
      created,
      skipped,
      force: parsed.data.force ?? false,
    },
  });

  return NextResponse.json({ created, skipped, errors });
}
