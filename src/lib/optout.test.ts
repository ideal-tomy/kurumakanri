import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildOptOutToken, verifyOptOutToken } from './optout';

const ORIG = process.env.OPT_OUT_SECRET;

beforeAll(() => {
  process.env.OPT_OUT_SECRET = 'test-secret-1234567890';
});
afterAll(() => {
  if (ORIG) process.env.OPT_OUT_SECRET = ORIG;
  else delete process.env.OPT_OUT_SECRET;
});

describe('opt-out token', () => {
  it('round-trips', () => {
    const token = buildOptOutToken('cust-1', 'MAIL');
    const decoded = verifyOptOutToken(token);
    expect(decoded?.customerId).toBe('cust-1');
    expect(decoded?.channel).toBe('MAIL');
  });

  it('returns null for tampered token', () => {
    const token = buildOptOutToken('cust-1', 'MAIL');
    const tampered = token.slice(0, token.length - 2) + 'aa';
    const decoded = verifyOptOutToken(tampered);
    expect(decoded).toBeNull();
  });

  it('rejects expired tokens', () => {
    const token = buildOptOutToken('cust-1', 'MAIL', Math.floor(Date.now() / 1000) - 100);
    expect(verifyOptOutToken(token)).toBeNull();
  });
});
