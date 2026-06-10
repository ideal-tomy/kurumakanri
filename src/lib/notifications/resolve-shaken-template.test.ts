import { describe, expect, it } from 'vitest';
import { resolveShakenTemplateKeyFromDays } from './resolve-shaken-template';

describe('resolveShakenTemplateKeyFromDays', () => {
  it('picks template by remaining days', () => {
    expect(resolveShakenTemplateKeyFromDays(-5)).toBe('shaken_overdue');
    expect(resolveShakenTemplateKeyFromDays(20)).toBe('shaken_30days');
    expect(resolveShakenTemplateKeyFromDays(75)).toBe('shaken_90days');
    expect(resolveShakenTemplateKeyFromDays(150)).toBe('shaken_180days');
    expect(resolveShakenTemplateKeyFromDays(300)).toBe('quote_notify');
    expect(resolveShakenTemplateKeyFromDays(null)).toBe('quote_notify');
  });
});
