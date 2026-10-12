import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import fa from '../messages/fa.json';
import { formatNumber, interpolate, normalizeSearch } from '../src/i18n';

function keys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    keys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe('message catalogs', () => {
  it('have identical key sets in English and Persian', () => {
    const a = keys(en).sort();
    const b = keys(fa).sort();
    expect(
      b.filter((k) => !a.includes(k)),
      'keys only in fa',
    ).toEqual([]);
    expect(
      a.filter((k) => !b.includes(k)),
      'keys only in en',
    ).toEqual([]);
  });
  it('keep the same placeholders in both languages', () => {
    const flat = (obj: unknown, prefix = ''): Record<string, string> =>
      Object.fromEntries(
        Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
          typeof v === 'string' ? [[prefix + k, v]] : Object.entries(flat(v, `${prefix}${k}.`)),
        ),
      );
    const e = flat(en);
    const f = flat(fa);
    for (const [k, v] of Object.entries(e)) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) || []).sort();
      expect(ph(f[k]), k).toEqual(ph(v));
    }
  });
  it('has no empty Persian strings', () => {
    const flat = keys(fa);
    for (const k of flat) {
      const value = k
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], fa);
      expect(String(value).trim().length, k).toBeGreaterThan(0);
    }
  });
});

describe('formatting helpers', () => {
  it('uses Persian digits for fa', () => {
    expect(formatNumber(1234, 'fa')).toBe('۱٬۲۳۴');
    expect(formatNumber(1234, 'en')).toBe('1,234');
  });
  it('interpolates placeholders', () => {
    expect(interpolate('{a} of {b}', { a: 1, b: 'x' })).toBe('1 of x');
  });
  it('normalises Persian search input', () => {
    expect(normalizeSearch('كاگورا')).toBe('کاگورا');
    expect(normalizeSearch('می‌ا')).toBe('میا');
    expect(normalizeSearch('۱۲۳')).toBe('123');
  });
});
