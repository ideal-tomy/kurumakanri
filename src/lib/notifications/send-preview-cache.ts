import type { PresetNotificationRule } from '@/lib/notifications/send-review-session';

export type SendPreviewChannel = 'LINE' | 'MAIL' | 'BOTH';

export type SendPreviewQuote = {
  id?: string;
  tax_summary: {
    non_taxable_subtotal: number;
    grand_total: number;
  };
  legal_lines: Array<{ label: string; amount: number }>;
  service_lines: Array<{ label: string; amount: number }>;
};

export type SendPreviewItem = {
  customer_id: string | null;
  vehicle_id: string | null;
  plate: string | null;
  line_preview: string | null;
  mail_subject: string | null;
  mail_body: string | null;
  warnings: string[];
  quote: SendPreviewQuote | null;
  quote_link_preview: string | null;
  name: string | null;
};

export type SendPreviewPayload = {
  item: SendPreviewItem;
  lineBody: string;
  mailBody: string;
};

const cache = new Map<string, SendPreviewPayload>();
const inflight = new Map<string, Promise<SendPreviewPayload>>();

export function sendPreviewCacheKey(
  customerIds: string[],
  rule: PresetNotificationRule,
  channel: SendPreviewChannel,
): string {
  return `${[...customerIds].sort().join(',')}:${rule}:${channel}`;
}

export function getCachedSendPreview(key: string): SendPreviewPayload | undefined {
  return cache.get(key);
}

export async function fetchSendPreview(
  customerIds: string[],
  rule: PresetNotificationRule,
  channel: SendPreviewChannel,
): Promise<SendPreviewPayload> {
  const key = sendPreviewCacheKey(customerIds, rule, channel);
  const hit = cache.get(key);
  if (hit) return hit;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const ensureRes = await fetch('/api/quotes/ensure-for-customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_ids: customerIds }),
    });
    const ensureJson = (await ensureRes.json()) as { error?: unknown };
    if (!ensureRes.ok) {
      throw new Error(
        typeof ensureJson.error === 'string' ? ensureJson.error : '見積の確認に失敗しました',
      );
    }

    const res = await fetch('/api/notifications/review-payload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_ids: customerIds, rule, channel }),
    });
    const json = (await res.json()) as { items?: SendPreviewItem[]; error?: unknown };
    if (!res.ok) {
      const msg =
        typeof json.error === 'string'
          ? json.error
          : json.error != null
            ? JSON.stringify(json.error)
            : 'プレビューの取得に失敗しました';
      throw new Error(msg);
    }
    const first = json.items?.[0];
    if (!first) throw new Error('プレビューデータがありません');

    const payload: SendPreviewPayload = {
      item: first,
      lineBody: first.line_preview ?? '',
      mailBody: first.mail_body ?? '',
    };
    cache.set(key, payload);
    return payload;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

/** 画面表示後にゆっくり先読み（失敗は無視） */
export function prefetchSendPreview(
  customerIds: string[],
  rule: PresetNotificationRule,
  channel: SendPreviewChannel,
): Promise<SendPreviewPayload | null> {
  const key = sendPreviewCacheKey(customerIds, rule, channel);
  if (cache.has(key) || inflight.has(key)) {
    return Promise.resolve(cache.get(key) ?? null);
  }
  return fetchSendPreview(customerIds, rule, channel).catch(() => null);
}

export function invalidateSendPreviewCache(
  customerIds: string[],
  rule: PresetNotificationRule,
  channel: SendPreviewChannel,
): void {
  cache.delete(sendPreviewCacheKey(customerIds, rule, channel));
}
