import { createHash } from 'crypto';

/**
 * 開発・テスト時に同日の再送を許可する。
 * 本番では未設定（false）のままにすること。
 */
export function isNotificationIdempotencyDisabled(): boolean {
  return process.env.NOTIFICATION_IDEMPOTENCY_DISABLED === 'true';
}

/**
 * 冪等キーは「日付 + 顧客 + ルール + チャネル」で一意。
 * 同日中の同種通知の二重送信を防止する。
 * nonce 指定時は毎回別キー（開発用再送）。
 */
export function buildIdempotencyKey(args: {
  customerId: string;
  ruleKey: string;
  channel: string;
  date?: Date;
  nonce?: string;
}) {
  const d = (args.date ?? new Date()).toISOString().slice(0, 10);
  const raw = `${d}:${args.customerId}:${args.ruleKey}:${args.channel}${args.nonce ? `:${args.nonce}` : ''}`;
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 16);
  const suffix = args.nonce ? `${hash}-${args.nonce}` : hash;
  return `${d}-${args.ruleKey}-${args.channel}-${suffix}`;
}
