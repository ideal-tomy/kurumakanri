import { describe, expect, it } from 'vitest';
import {
  countUnresolvedFailures,
  resolvedFailureJobIds,
} from './notification-failure-resolution';

describe('notification-failure-resolution', () => {
  it('marks older FAILED as resolved when a later SENT exists for same key', () => {
    const jobs = [
      {
        id: 'fail-old',
        customer_id: 'c1',
        channel: 'LINE',
        template_key: 'shaken_180days',
        status: 'FAILED',
        created_at: '2026-06-11T11:34:00.000Z',
      },
      {
        id: 'sent-new',
        customer_id: 'c1',
        channel: 'LINE',
        template_key: 'shaken_180days',
        status: 'SENT',
        created_at: '2026-06-23T13:20:00.000Z',
      },
    ];
    expect(resolvedFailureJobIds(jobs).has('fail-old')).toBe(true);
    expect(countUnresolvedFailures(jobs)).toBe(0);
  });

  it('keeps FAILED unresolved when SENT is for a different template', () => {
    const jobs = [
      {
        id: 'fail-1',
        customer_id: 'c1',
        channel: 'LINE',
        template_key: 'shaken_30days',
        status: 'FAILED',
        created_at: '2026-06-23T13:20:00.000Z',
      },
      {
        id: 'sent-1',
        customer_id: 'c1',
        channel: 'LINE',
        template_key: 'shaken_180days',
        status: 'SENT',
        created_at: '2026-06-24T13:20:00.000Z',
      },
    ];
    expect(resolvedFailureJobIds(jobs).size).toBe(0);
    expect(countUnresolvedFailures(jobs)).toBe(1);
  });

  it('keeps newer FAILED unresolved even if an older SENT exists', () => {
    const jobs = [
      {
        id: 'sent-old',
        customer_id: 'c1',
        channel: 'LINE',
        template_key: 'shaken_180days',
        status: 'SENT',
        created_at: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 'fail-new',
        customer_id: 'c1',
        channel: 'LINE',
        template_key: 'shaken_180days',
        status: 'FAILED',
        created_at: '2026-06-20T00:00:00.000Z',
      },
    ];
    expect(resolvedFailureJobIds(jobs).has('fail-new')).toBe(false);
    expect(countUnresolvedFailures(jobs)).toBe(1);
  });
});
