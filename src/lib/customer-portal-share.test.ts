import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildCustomerPortalToken,
  buildCustomerPortalUrl,
  isCustomerPortalConfigured,
  verifyCustomerPortalToken,
} from './customer-portal-share';

const ORIG = process.env.CUSTOMER_PORTAL_SECRET;
const ORIG_SITE = process.env.NEXT_PUBLIC_SITE_URL;

beforeAll(() => {
  process.env.CUSTOMER_PORTAL_SECRET = 'test-portal-secret-1234567890';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
});
afterAll(() => {
  if (ORIG) process.env.CUSTOMER_PORTAL_SECRET = ORIG;
  else delete process.env.CUSTOMER_PORTAL_SECRET;
  if (ORIG_SITE) process.env.NEXT_PUBLIC_SITE_URL = ORIG_SITE;
  else delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe('customer portal token', () => {
  it('round-trips', () => {
    const token = buildCustomerPortalToken('cust-1');
    const decoded = verifyCustomerPortalToken(token);
    expect(decoded?.customerId).toBe('cust-1');
    expect(decoded?.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('returns null for tampered token', () => {
    const token = buildCustomerPortalToken('cust-1');
    const tampered = token.slice(0, token.length - 2) + 'aa';
    expect(verifyCustomerPortalToken(tampered)).toBeNull();
  });

  it('rejects expired tokens', () => {
    const token = buildCustomerPortalToken('cust-1', Math.floor(Date.now() / 1000) - 100);
    expect(verifyCustomerPortalToken(token)).toBeNull();
  });

  it('builds portal URL when configured', () => {
    expect(isCustomerPortalConfigured()).toBe(true);
    const url = buildCustomerPortalUrl('cust-1');
    expect(url).toMatch(/^https:\/\/example\.com\/p\//);
  });
});
