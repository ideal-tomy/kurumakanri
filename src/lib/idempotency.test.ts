import { describe, expect, it } from 'vitest';
import { buildIdempotencyKey } from './idempotency';

describe('buildIdempotencyKey', () => {
  it('is stable for same inputs', () => {
    const date = new Date('2026-05-02');
    const k1 = buildIdempotencyKey({
      customerId: 'cust-1',
      ruleKey: 'shaken_180days',
      channel: 'LINE',
      date,
    });
    const k2 = buildIdempotencyKey({
      customerId: 'cust-1',
      ruleKey: 'shaken_180days',
      channel: 'LINE',
      date,
    });
    expect(k1).toBe(k2);
    expect(k1.startsWith('2026-05-02-shaken_180days-LINE-')).toBe(true);
  });

  it('differs across customers', () => {
    const date = new Date('2026-05-02');
    expect(
      buildIdempotencyKey({ customerId: 'a', ruleKey: 'r', channel: 'LINE', date }),
    ).not.toBe(
      buildIdempotencyKey({ customerId: 'b', ruleKey: 'r', channel: 'LINE', date }),
    );
  });

  it('differs across channels', () => {
    const date = new Date('2026-05-02');
    expect(
      buildIdempotencyKey({ customerId: 'a', ruleKey: 'r', channel: 'LINE', date }),
    ).not.toBe(
      buildIdempotencyKey({ customerId: 'a', ruleKey: 'r', channel: 'MAIL', date }),
    );
  });
});
