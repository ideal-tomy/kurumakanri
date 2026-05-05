import { createHash } from 'crypto';

/**
 * 冪等キーは「日付 + 顧客 + ルール + チャネル」で一意。
 * 同日中の同種通知の二重送信を防止する。
 */
export function buildIdempotencyKey(args: {
  customerId: string;
  ruleKey: string;
  channel: string;
  date?: Date;
}) {
  const d = (args.date ?? new Date()).toISOString().slice(0, 10);
  const raw = `${d}:${args.customerId}:${args.ruleKey}:${args.channel}`;
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 16);
  return `${d}-${args.ruleKey}-${args.channel}-${hash}`;
}
