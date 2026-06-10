import { createHmac } from 'crypto';

/**
 * 顧客ポータル公開 URL 用の署名トークン。
 * `${customerId}.${expiresAtUnix}` を HMAC-SHA256 で署名する。
 */
export function buildCustomerPortalToken(customerId: string, expiresAt?: number): string {
  const secret = process.env.CUSTOMER_PORTAL_SECRET;
  if (!secret) throw new Error('CUSTOMER_PORTAL_SECRET is not set');
  const exp = expiresAt ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  const payload = `${customerId}.${exp}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyCustomerPortalToken(
  token: string,
): { customerId: string; expiresAt: number } | null {
  const secret = process.env.CUSTOMER_PORTAL_SECRET;
  if (!secret) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [customerId, exp, sig] = decoded.split('.');
    if (!customerId || !exp || !sig) return null;
    const expiresAt = Number(exp);
    if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
      return null;
    }
    const expected = createHmac('sha256', secret).update(`${customerId}.${exp}`).digest('hex');
    if (expected !== sig) return null;
    return { customerId, expiresAt };
  } catch {
    return null;
  }
}

export function isCustomerPortalConfigured(): boolean {
  return Boolean(
    process.env.CUSTOMER_PORTAL_SECRET && process.env.CUSTOMER_PORTAL_SECRET.length > 0,
  );
}

export function buildCustomerPortalUrl(customerId: string): string | null {
  if (!isCustomerPortalConfigured()) return null;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  const token = buildCustomerPortalToken(customerId);
  return `${siteUrl}/p/${token}`;
}
