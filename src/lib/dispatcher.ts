import { getServerSupabase, getServiceSupabase } from './supabase/server';
import { renderTemplate } from './template';
import { sendLineMessage } from './providers/line';
import { sendMail } from './providers/mail';
import { buildOptOutToken } from './optout';
import { computeEstimatedMileage, daysUntil, nextOilTargetKm } from './mileage';
import { buildIdempotencyKey } from './idempotency';
import { buildQuoteShareToken, isQuoteShareConfigured } from './quote-share';
import {
  buildLegalFeesTextFallback,
  buildLegalFeesTextFromQuote,
} from './quotes/legal-fees-text';
import { formatDate, formatYen } from './format';
import type {
  CustomerOverviewRow,
  NotificationChannel,
  NotificationJobStatus,
  TemplateVersionRow,
} from './supabase/types';

export interface DispatchResult {
  customerId: string;
  channel: NotificationChannel;
  jobId: string | null;
  status: NotificationJobStatus;
  message: string;
  errorCode?: string;
}

export async function loadActiveTemplate(
  templateKey: string,
  channel: NotificationChannel,
): Promise<TemplateVersionRow | null> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('template_versions')
    .select('*')
    .eq('template_key', templateKey)
    .eq('channel', channel)
    .eq('active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle<TemplateVersionRow>();
  return data;
}

export async function buildMessageVariables(
  overview: CustomerOverviewRow,
  options?: { ruleKey?: string; channel?: NotificationChannel },
): Promise<Record<string, string>> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const channel = options?.channel ?? 'MAIL';
  const optoutToken = buildOptOutToken(overview.customer_id, channel);
  const estimated =
    overview.estimated_mileage ??
    computeEstimatedMileage(
      overview.initial_mileage,
      overview.initial_mileage_recorded_at,
      overview.monthly_avg_km,
    ) ??
    0;
  const oilInterval = overview.oil_interval_km ?? 4000;
  const oilTarget = nextOilTargetKm(
    overview.last_oil_change_mileage,
    overview.initial_mileage,
    oilInterval,
  );
  const days = overview.days_until_inspection ?? daysUntil(overview.inspection_expire_date) ?? 0;

  let quoteUrl = `${siteUrl}/me?cid=${overview.customer_id}`;
  let latestLegalItemsJson: unknown = null;
  let latestQuoteGrandTotal: number | null = null;
  let latestQuoteValidUntil: string | null = null;
  if (overview.customer_id) {
    try {
      const srv = getServiceSupabase();
      const { data: vrows } = await srv.from('vehicles').select('id').eq('customer_id', overview.customer_id);
      const vid = (vrows ?? []).map((r: { id: string }) => r.id);
      if (vid.length) {
        const { data: qr } = await srv
          .from('quotes')
          .select('id, legal_items, grand_total, total_amount, valid_until')
          .in('vehicle_id', vid)
          .order('issued_at', { ascending: false })
          .limit(1)
          .maybeSingle<{
            id: string;
            legal_items: unknown;
            grand_total: number | null;
            total_amount: number;
            valid_until: string | null;
          }>();
        if (qr?.id) {
          latestLegalItemsJson = qr.legal_items;
          latestQuoteGrandTotal = qr.grand_total ?? qr.total_amount ?? null;
          latestQuoteValidUntil = qr.valid_until;
          if (isQuoteShareConfigured()) {
            quoteUrl = `${siteUrl}/q/${buildQuoteShareToken(qr.id)}`;
          }
        }
      }
    } catch (e) {
      console.warn('[dispatcher] latest quote lookup failed', e);
    }
  }

  const legalFees = latestLegalItemsJson
    ? buildLegalFeesTextFromQuote(latestLegalItemsJson)
    : buildLegalFeesTextFallback();

  const vehicleName = `${overview.maker ?? ''} ${overview.model ?? ''}`.trim() || 'お車';

  // grandTotal: 見積の税込一式（legal+service）。車検リマインド本文の「主たる金額」には使わず、
  // legalFeesTotal / legalFeesBreakdown を使う（テンプレは 0014_notify_legal_primary 以降で統一）。

  return {
    name: overview.name,
    carName: vehicleName,
    vehicleName,
    plate: overview.plate ?? '',
    expireDate: overview.inspection_expire_date ?? '',
    daysLeft: String(days),
    mileage: estimated.toLocaleString('ja-JP'),
    nextOilTargetKm: oilTarget.toLocaleString('ja-JP'),
    oilIntervalKm: oilInterval.toLocaleString('ja-JP'),
    quoteUrl,
    bookingUrl: `${siteUrl}/me?cid=${overview.customer_id}#booking`,
    unsubscribeUrl: `${siteUrl}/u/${optoutToken}`,
    maintenanceInfoUrl: `${siteUrl}/info/maintenance`,
    oilInfoUrl: `${siteUrl}/info/oil`,
    legalFeesTotal: legalFees.totalFormatted,
    legalFeesBreakdown: legalFees.breakdown,
    grandTotal: formatYen(latestQuoteGrandTotal),
    validUntil: formatDate(latestQuoteValidUntil),
  };
}

export async function dispatchNotification(args: {
  customerId: string;
  channel: NotificationChannel;
  ruleKey: string;
  templateKey: string;
  requestedBy: string | null;
  fallback?: boolean;
}): Promise<DispatchResult> {
  const supabase = getServerSupabase();
  const service = getServiceSupabase();

  const { data: overview } = await supabase
    .from('v_customer_overview')
    .select('*')
    .eq('customer_id', args.customerId)
    .maybeSingle<CustomerOverviewRow>();
  if (!overview) {
    return {
      customerId: args.customerId,
      channel: args.channel,
      jobId: null,
      status: 'FAILED',
      message: '顧客が見つかりません',
      errorCode: 'NOT_FOUND',
    };
  }

  const { data: consent } = await supabase
    .from('consents')
    .select('*')
    .eq('customer_id', args.customerId)
    .eq('channel', args.channel)
    .maybeSingle<{ opt_in: boolean }>();
  if (consent && !consent.opt_in) {
    return {
      customerId: args.customerId,
      channel: args.channel,
      jobId: null,
      status: 'CANCELLED',
      message: '配信停止 (opt-out)',
      errorCode: 'OPT_OUT',
    };
  }

  const template = await loadActiveTemplate(args.templateKey, args.channel);
  if (!template) {
    return {
      customerId: args.customerId,
      channel: args.channel,
      jobId: null,
      status: 'FAILED',
      message: 'テンプレートが見つかりません',
      errorCode: 'NO_TEMPLATE',
    };
  }

  const vars = await buildMessageVariables(overview, {
    ruleKey: args.ruleKey,
    channel: args.channel,
  });
  const content = renderTemplate(template.content, vars);
  const subject = template.subject ? renderTemplate(template.subject, vars) : null;

  const idempotencyKey = buildIdempotencyKey({
    customerId: args.customerId,
    ruleKey: args.ruleKey,
    channel: args.channel,
  });

  const { data: existing } = await supabase
    .from('notification_jobs')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle<{ id: string; status: NotificationJobStatus }>();
  if (existing && existing.status === 'SENT') {
    return {
      customerId: args.customerId,
      channel: args.channel,
      jobId: existing.id,
      status: 'SENT',
      message: '本日同じルールで送信済み（冪等キーヒット）',
    };
  }

  const jobInsert = await supabase
    .from('notification_jobs')
    .upsert(
      {
        customer_id: args.customerId,
        vehicle_id: overview.vehicle_id,
        channel: args.channel,
        template_key: args.templateKey,
        scheduled_at: new Date().toISOString(),
        status: 'PENDING',
        idempotency_key: idempotencyKey,
        payload: { content, subject, ruleKey: args.ruleKey },
        requested_by: args.requestedBy,
      },
      { onConflict: 'idempotency_key' },
    )
    .select('id')
    .single();

  if (jobInsert.error || !jobInsert.data) {
    return {
      customerId: args.customerId,
      channel: args.channel,
      jobId: null,
      status: 'FAILED',
      message: jobInsert.error?.message ?? 'ジョブ登録に失敗',
      errorCode: 'JOB_INSERT',
    };
  }

  const jobId = jobInsert.data.id;

  let providerResult: { success: boolean; providerMessageId?: string; errorCode?: string; errorMessage?: string };
  if (args.channel === 'LINE') {
    providerResult = await sendLineMessage(overview.line_user_id ?? '', content);
  } else {
    providerResult = await sendMail({
      to: overview.email ?? '',
      subject: subject ?? 'お知らせ',
      text: content,
    });
  }

  const finalStatus: NotificationJobStatus = providerResult.success ? 'SENT' : 'FAILED';

  await service.from('notification_jobs').update({
    status: finalStatus,
    attempts: 1,
    last_error: providerResult.success ? null : providerResult.errorMessage ?? null,
  }).eq('id', jobId);

  await service.from('notification_logs').insert({
    job_id: jobId,
    provider: args.channel === 'LINE' ? 'line' : 'mail',
    provider_message_id: providerResult.providerMessageId ?? null,
    result: providerResult.success ? 'SUCCESS' : 'FAILED',
    error_code: providerResult.errorCode ?? null,
    error_message: providerResult.errorMessage ?? null,
    payload: { subject, preview: content.slice(0, 200) },
  });

  if (!providerResult.success && args.fallback) {
    const altChannel: NotificationChannel = args.channel === 'LINE' ? 'MAIL' : 'LINE';
    const fallbackResult = await dispatchNotification({
      customerId: args.customerId,
      channel: altChannel,
      ruleKey: args.ruleKey,
      templateKey: args.templateKey,
      requestedBy: args.requestedBy,
      fallback: false,
    });
    return {
      customerId: args.customerId,
      channel: args.channel,
      jobId,
      status: 'FAILED',
      message: `${args.channel} 失敗 → ${altChannel} で${fallbackResult.status === 'SENT' ? '成功' : '失敗'}`,
      errorCode: providerResult.errorCode,
    };
  }

  return {
    customerId: args.customerId,
    channel: args.channel,
    jobId,
    status: finalStatus,
    message: providerResult.success ? '送信しました' : providerResult.errorMessage ?? '送信失敗',
    errorCode: providerResult.errorCode,
  };
}
