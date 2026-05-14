import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';
import {
  computeTotalsFromParts,
  normalizeQuoteLineItem,
  type QuoteLineItem,
} from '@/lib/quote';
import type { QuoteRow } from '@/lib/supabase/types';

const LineItemIn = z.object({
  label: z.string().min(1),
  amount: z.number().finite(),
  quantity: z.number().int().positive().default(1),
  unit_price: z.number().finite(),
  tax_treatment: z.enum(['NON_TAXABLE', 'TAXABLE_10']),
  category: z.enum(['legal', 'service', 'discount']).optional(),
});

const PatchBody = z.object({
  legal_items: z.array(LineItemIn),
  service_items: z.array(LineItemIn),
  notes: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'ISSUED']).optional(),
});

function toLineItems(rows: z.infer<typeof LineItemIn>[]): QuoteLineItem[] {
  const out: QuoteLineItem[] = [];
  for (const r of rows) {
    const n = normalizeQuoteLineItem(r);
    if (n) out.push(n);
  }
  return out;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireStaff();
  const quoteId = params.id;
  if (!z.string().uuid().safeParse(quoteId).success) {
    return NextResponse.json({ error: 'invalid quote id' }, { status: 400 });
  }

  const json = await req.json();
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data: existing, error: loadErr } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .maybeSingle<QuoteRow>();

  if (loadErr || !existing) {
    return NextResponse.json({ error: 'quote not found' }, { status: 404 });
  }

  if (!['DRAFT', 'ISSUED'].includes(existing.status)) {
    return NextResponse.json(
      { error: 'この状態の見積は編集できません。複製発行をご利用ください。' },
      { status: 409 },
    );
  }

  const legal = toLineItems(parsed.data.legal_items);
  const service = toLineItems(parsed.data.service_items);
  if (legal.length === 0 && service.length === 0) {
    return NextResponse.json({ error: '明細が空です' }, { status: 400 });
  }

  const totals = computeTotalsFromParts(legal, service);
  const nextStatus = parsed.data.status ?? existing.status;

  const { error: upErr } = await supabase
    .from('quotes')
    .update({
      legal_items: legal as unknown as Record<string, unknown>[],
      service_items: service as unknown as Record<string, unknown>[],
      notes: parsed.data.notes !== undefined ? parsed.data.notes : existing.notes,
      status: nextStatus,
      total_amount: totals.grand_total,
      grand_total: totals.grand_total,
      taxable_subtotal_ex_tax: totals.taxable_subtotal_ex_tax,
      tax_amount_10: totals.tax_amount_10,
      non_taxable_subtotal: totals.non_taxable_subtotal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quoteId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'quote.line_edit',
    resource: 'quotes',
    resourceId: quoteId,
    payload: { legalCount: legal.length, serviceCount: service.length },
  });

  return NextResponse.json({ ok: true, grand_total: totals.grand_total });
}
