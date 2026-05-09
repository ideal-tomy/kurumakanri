import type { SupabaseClient } from '@supabase/supabase-js';
import { writeAudit } from '@/lib/audit';
import type { QuoteEstimate } from '@/lib/quote';
import { buildQuoteFromVehicle, quoteTotalsForDb } from '@/lib/quote';
import type { StatutoryFeeRateRow, VehicleRow } from '@/lib/supabase/types';

/**
 * 概算見積を組み立てて quotes に ISSUED として保存する（自動見積・一括確保から共用）。
 */
export async function insertIssuedQuoteForVehicle(
  supabase: SupabaseClient,
  audit: { userId: string; auditAction: string },
  vehicle: VehicleRow,
  statutoryRates: StatutoryFeeRateRow[],
  opts?: { includeOilChange?: boolean; notesAppend?: string },
): Promise<(QuoteEstimate & { ok: true; id: string }) | { ok: false; error: string }> {
  const asOfDate = new Date().toISOString().slice(0, 10);
  const estimate = buildQuoteFromVehicle({
    vehicleSpecs: vehicle.vehicle_specs,
    statutoryRates,
    asOfDate,
    includeOilChange: opts?.includeOilChange ?? true,
    notesAppend: opts?.notesAppend,
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

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'insert failed' };
  }

  await writeAudit({
    userId: audit.userId,
    action: audit.auditAction,
    resource: 'quotes',
    resourceId: data.id,
    payload: { vehicleId: vehicle.id, total: estimate.grand_total },
  });

  return { ok: true, id: data.id, ...estimate };
}
