import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import {
  buildMessageVariables,
  loadActiveTemplate,
} from '@/lib/dispatcher';
import { renderTemplate } from '@/lib/template';
import { quoteTotalsForDisplay } from '@/lib/quote';
import type { QuoteRow, CustomerOverviewRow } from '@/lib/supabase/types';
import { resolveNotificationTemplateKey } from '@/lib/notifications/rule-template';
import type { RuleKey } from '@/lib/rules';
import { ruleLabelFor } from '@/lib/rules';

const Body = z.object({
  customer_ids: z.array(z.string().uuid()).min(1),
  rule: z.enum(['shaken_180days', 'shaken_90days', 'oil_4000km', 'custom']),
  channel: z.enum(['LINE', 'MAIL', 'BOTH']),
  template_key: z.string().optional(),
});

async function renderedChannelBlock(
  overview: CustomerOverviewRow,
  templateKey: string,
  channel: 'LINE' | 'MAIL',
): Promise<{ subject: string | null; body: string } | null> {
  const template = await loadActiveTemplate(templateKey, channel);
  if (!template) return null;
  const vars = await buildMessageVariables(overview, { channel });
  const subject = template.subject ? renderTemplate(template.subject, vars) : null;
  const body = renderTemplate(template.content, vars);
  return { subject, body };
}

export async function POST(req: Request) {
  await requireStaff();
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.rule === 'custom' && !parsed.data.template_key?.trim()) {
    return NextResponse.json({ error: 'custom の場合は template_key が必要です' }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const templateKey = resolveNotificationTemplateKey(
    parsed.data.rule,
    parsed.data.template_key,
  );

  const ch = parsed.data.channel;
  const wantLine = ch === 'LINE' || ch === 'BOTH';
  const wantMail = ch === 'MAIL' || ch === 'BOTH';

  const items = [];

  for (const customerId of parsed.data.customer_ids) {
    const { data: overview } = await supabase
      .from('v_customer_overview')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle<CustomerOverviewRow>();

    const warnings: string[] = [];

    if (!overview) {
      items.push({
        customer_id: customerId,
        name: null,
        vehicle_id: null,
        plate: null,
        rule_label: parsed.data.rule === 'custom' ? 'カスタム' : ruleLabelFor(parsed.data.rule as RuleKey),
        line_preview: null,
        mail_subject: null,
        mail_body: null,
        quote_link_preview: null,
        quote: null,
        warnings: ['顧客・車両情報が見つかりません'],
      });
      continue;
    }

    if (!overview.vehicle_id) warnings.push('主車両が未登録です');
    if (wantLine && !overview.line_user_id) warnings.push('LINE userId 未登録');

    const { data: consentLine } = await supabase
      .from('consents')
      .select('opt_in')
      .eq('customer_id', customerId)
      .eq('channel', 'LINE')
      .maybeSingle<{ opt_in: boolean | null }>();
    if (wantLine && consentLine && consentLine.opt_in === false) {
      warnings.push('LINE は配信停止（opt-out）です');
    }

    if (wantMail && !overview.email) warnings.push('メールアドレス未登録');

    let linePreview: string | null = null;
    let mailSubject: string | null = null;
    let mailBody: string | null = null;

    if (wantLine) {
      const block = await renderedChannelBlock(overview, templateKey, 'LINE');
      linePreview = block?.body ?? null;
      if (!block) warnings.push(`LINE テンプレ「${templateKey}」が見つかりません`);
    }
    if (wantMail) {
      const block = await renderedChannelBlock(overview, templateKey, 'MAIL');
      mailSubject = block?.subject ?? null;
      mailBody = block?.body ?? null;
      if (!block) warnings.push(`メールテンプレ「${templateKey}」が見つかりません`);
    }

    const varsForQuoteLink = await buildMessageVariables(overview, { channel: wantLine ? 'LINE' : 'MAIL' });
    const quoteLinkPreview = varsForQuoteLink.quoteUrl ?? null;

    let quoteBlock: {
      id: string;
      quote_no: string | null;
      grand_total: number;
      issued_at: string | null;
      legal_count: number;
      service_count: number;
      valid_until: string | null;
      notes: string | null;
      legal_lines: Array<{ label: string; quantity: number; unit_price: number; amount: number }>;
      service_lines: Array<{ label: string; quantity: number; unit_price: number; amount: number }>;
      tax_summary: {
        non_taxable_subtotal: number;
        taxable_tax_included: number;
        taxable_subtotal_ex_tax: number;
        tax_amount_10: number;
        grand_total: number;
      };
    } | null = null;

    if (overview.vehicle_id) {
      const { data: q } = await supabase
        .from('quotes')
        .select('*')
        .eq('vehicle_id', overview.vehicle_id)
        .order('issued_at', { ascending: false })
        .limit(1)
        .maybeSingle<QuoteRow>();

      if (q) {
        const disp = quoteTotalsForDisplay(q);
        const mapLine = (i: { label: string; quantity: number; unit_price: number; amount: number }) => ({
          label: i.label,
          quantity: i.quantity,
          unit_price: i.unit_price,
          amount: i.amount,
        });
        quoteBlock = {
          id: q.id,
          quote_no: q.quote_no,
          grand_total: disp.grand_total,
          issued_at: q.issued_at,
          legal_count: disp.legal.length,
          service_count: disp.service.length,
          valid_until: q.valid_until,
          notes: q.notes,
          legal_lines: disp.legal.map(mapLine),
          service_lines: disp.service.map(mapLine),
          tax_summary: {
            non_taxable_subtotal: disp.non_taxable_subtotal,
            taxable_tax_included: disp.taxable_tax_included,
            taxable_subtotal_ex_tax: disp.taxable_subtotal_ex_tax,
            tax_amount_10: disp.tax_amount_10,
            grand_total: disp.grand_total,
          },
        };
      } else {
        warnings.push('見積がまだありません（一括生成できます）');
      }
    }

    items.push({
      customer_id: customerId,
      name: overview.name,
      vehicle_id: overview.vehicle_id,
      plate: overview.plate,
      rule_label: parsed.data.rule === 'custom' ? 'カスタム' : ruleLabelFor(parsed.data.rule as RuleKey),
      line_preview: linePreview,
      mail_subject: mailSubject,
      mail_body: mailBody,
      quote_link_preview: quoteLinkPreview,
      quote: quoteBlock,
      warnings,
    });
  }

  return NextResponse.json({
    template_key: templateKey,
    channel: ch,
    items,
  });
}
