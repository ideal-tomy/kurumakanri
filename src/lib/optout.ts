import { createHmac } from 'crypto';

/**
 * 送信停止リンクのサインドトークン。
 * `${customerId}.${channel}.${expiresAt}` を HMAC-SHA256 で署名する。
 */
export function buildOptOutToken(customerId: string, channel: string, expiresAt?: number): string {
  const secret = process.env.OPT_OUT_SECRET;
  if (!secret) throw new Error('OPT_OUT_SECRET is not set');
  const exp = expiresAt ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  const payload = `${customerId}.${channel}.${exp}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyOptOutToken(
  token: string,
): { customerId: string; channel: string; expiresAt: number } | null {
  const secret = process.env.OPT_OUT_SECRET;
  if (!secret) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [customerId, channel, exp, sig] = decoded.split('.');
    if (!customerId || !channel || !exp || !sig) return null;
    const expiresAt = Number(exp);
    if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
      return null;
    }
    const expected = createHmac('sha256', secret)
      .update(`${customerId}.${channel}.${exp}`)
      .digest('hex');
    if (expected !== sig) return null;
    return { customerId, channel, expiresAt };
  } catch {
    return null;
  }
}
