import type { SupabaseClient } from '@supabase/supabase-js';
import { insertIssuedQuoteForVehicle } from '@/lib/quotes/insert-issued-quote';
import type { CustomerOverviewRow, StatutoryFeeRateRow, VehicleRow } from '@/lib/supabase/types';

export async function ensureQuotesForCustomers(
  supabase: SupabaseClient,
  userId: string,
  customerIds: string[],
  opts?: { force?: boolean },
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const { data: ratesData } = await supabase
    .from('statutory_fee_rates')
    .select('*')
    .order('effective_from', { ascending: false });
  const rates = (ratesData ?? []) as StatutoryFeeRateRow[];

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const customerId of customerIds) {
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

    if (!opts?.force && quoteExists?.id) {
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
      { userId, auditAction: 'quote.ensure_customer' },
      vehicle,
      rates,
    );

    if (result.ok) created += 1;
    else errors.push(`${customerId}: ${result.error}`);
  }

  return { created, skipped, errors };
}
