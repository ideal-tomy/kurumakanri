import { createHmac } from 'crypto';

/**
 * 見積公開 URL 用の署名トークン。
 * `${quoteId}.${expiresAtUnix}` を HMAC-SHA256。
 */
export function buildQuoteShareToken(quoteId: string, expiresAt?: number): string {
  const secret = process.env.QUOTE_SHARE_SECRET;
  if (!secret) throw new Error('QUOTE_SHARE_SECRET is not set');
  const exp = expiresAt ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90;
  const payload = `${quoteId}.${exp}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyQuoteShareToken(
  token: string,
): { quoteId: string; expiresAt: number } | null {
  const secret = process.env.QUOTE_SHARE_SECRET;
  if (!secret) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [quoteId, exp, sig] = decoded.split('.');
    if (!quoteId || !exp || !sig) return null;
    const expiresAt = Number(exp);
    if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
      return null;
    }
    const expected = createHmac('sha256', secret).update(`${quoteId}.${exp}`).digest('hex');
    if (expected !== sig) return null;
    return { quoteId, expiresAt };
  } catch {
    return null;
  }
}

export function isQuoteShareConfigured(): boolean {
  return Boolean(process.env.QUOTE_SHARE_SECRET && process.env.QUOTE_SHARE_SECRET.length > 0);
}
