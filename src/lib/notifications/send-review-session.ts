/** sessionStorage で送信レビュー画面へ渡すキー・型 */
export const SEND_REVIEW_SESSION_KEY = 'kuruma:sendReview';

/** URL・レビュー画面で使うプリセット通知ルール（DB テンプレキーと一致） */
export const PRESET_NOTIFICATION_RULES = [
  'shaken_180days',
  'shaken_90days',
  'shaken_30days',
  'shaken_overdue',
  'oil_4000km',
] as const;

export type PresetNotificationRule = (typeof PRESET_NOTIFICATION_RULES)[number];

export type SendReviewStoredRule = PresetNotificationRule | 'custom';

export function isPresetNotificationRule(r: string): r is PresetNotificationRule {
  return (PRESET_NOTIFICATION_RULES as readonly string[]).includes(r);
}

export function coercePresetNotificationRule(r: string): PresetNotificationRule {
  return isPresetNotificationRule(r) ? r : 'shaken_180days';
}

export interface SendReviewSessionPayload {
  customerIds: string[];
  rule: SendReviewStoredRule;
  channel: 'LINE' | 'MAIL' | 'BOTH';
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** URL クエリ `customers` の解釈結果（キーが無ければ absent） */
export type ParsedCustomersQuery =
  | { kind: 'absent' }
  | { kind: 'invalid' }
  | { kind: 'ok'; ids: string[] };

export function parseCustomersQueryParam(searchParams: URLSearchParams): ParsedCustomersQuery {
  if (!searchParams.has('customers')) return { kind: 'absent' };
  const raw = searchParams.get('customers') ?? '';
  const trimmed = raw.trim();
  if (trimmed === '') return { kind: 'invalid' };
  const parts = trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const ids = parts.filter((p) => UUID_RE.test(p));
  if (ids.length === 0) return { kind: 'invalid' };
  return { kind: 'ok', ids };
}

export function parseRuleQueryParam(raw: string | null): PresetNotificationRule {
  if (raw && isPresetNotificationRule(raw)) {
    return raw;
  }
  return 'shaken_180days';
}

export function parseChannelQueryParam(raw: string | null): 'LINE' | 'MAIL' | 'BOTH' {
  if (raw === 'MAIL' || raw === 'BOTH') return raw;
  return 'LINE';
}

/** 送信レビュー画面の共有・再表示用 URL（スタッフのみ） */
export function buildNotificationsReviewHref(args: {
  customerIds: string[];
  rule: SendReviewStoredRule;
  channel: 'LINE' | 'MAIL' | 'BOTH';
}): string {
  const params = new URLSearchParams();
  params.set('customers', args.customerIds.join(','));
  if (args.rule !== 'custom') {
    params.set('rule', args.rule);
  } else {
    params.set('rule', 'shaken_180days');
  }
  params.set('channel', args.channel);
  return `/notifications/review?${params.toString()}`;
}

/** クエリ文字列を比較可能な既定形へ（ASCII キー名順、customers の並び維持） */
export function canonicalReviewSearchString(customerIds: string[], rule: string, channel: string): string {
  const pairs: [string, string][] = [
    ['channel', channel],
    ['customers', customerIds.join(',')],
    ['rule', rule],
  ];
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  return new URLSearchParams(pairs).toString();
}

export function canonicalReviewSearchFromLocationSearch(search: string): string | null {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const parsed = parseCustomersQueryParam(p);
  if (parsed.kind !== 'ok') return null;
  return canonicalReviewSearchString(
    parsed.ids,
    parseRuleQueryParam(p.get('rule')),
    parseChannelQueryParam(p.get('channel')),
  );
}
