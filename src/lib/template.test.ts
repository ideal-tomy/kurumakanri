import { describe, expect, it } from 'vitest';
import { renderTemplate } from './template';

describe('renderTemplate', () => {
  it('substitutes variables', () => {
    const result = renderTemplate('Hello {{ name }}, expire {{ expireDate }}', {
      name: '田中',
      expireDate: '2026-06-01',
    });
    expect(result).toBe('Hello 田中, expire 2026-06-01');
  });

  it('returns empty for undefined variables', () => {
    expect(renderTemplate('{{ x }}/{{ y }}', { x: 'A' })).toBe('A/');
  });

  it('handles numeric values', () => {
    expect(renderTemplate('{{ km }} km', { km: 4200 })).toBe('4200 km');
  });

  it('handles repeated and dotted keys', () => {
    expect(renderTemplate('{{a}} {{a}} {{b.c}}', { a: 'x', 'b.c': 'y' })).toBe('x x y');
  });
});
