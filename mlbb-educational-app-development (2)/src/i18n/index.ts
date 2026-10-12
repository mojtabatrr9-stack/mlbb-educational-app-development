import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/lib/types';
import en from '../../messages/en.json';
import fa from '../../messages/fa.json';

export type Messages = typeof en;
const dictionaries: Record<Locale, Messages> = { en, fa: fa as Messages };

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'fa' ? 'rtl' : 'ltr';
}

type Vars = Record<string, string | number>;

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else return undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

/** Interpolates `{name}` placeholders. */
export function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Creates a translator for a locale. Missing keys fall back to English, then to the key
 * itself (never throws), so a missing translation degrades visibly instead of crashing.
 */
export function createTranslator(locale: Locale, namespace?: string) {
  const messages = getMessages(locale);
  const fallback = getMessages(DEFAULT_LOCALE);
  return (key: string, vars?: Vars) => {
    const full = namespace ? `${namespace}.${key}` : key;
    const template = lookup(messages, full) ?? lookup(fallback, full) ?? full;
    return interpolate(template, vars);
  };
}
export type Translator = ReturnType<typeof createTranslator>;

/** Persian digits (۰–۹) and grouping for fa; standard formatting for en. */
export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', options).format(value);
}

export function formatPercent(value: number, locale: Locale, digits = 1) {
  return `${formatNumber(value, locale, { maximumFractionDigits: digits, minimumFractionDigits: digits })}٪`.replace(
    '٪',
    locale === 'fa' ? '٪' : '%',
  );
}

/** Dates: Jalali (Shamsi) calendar for Persian, Gregorian otherwise. */
export function formatDate(
  value: string | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', options).format(
    date,
  );
}

/** mm:ss with locale digits. */
export function formatClock(totalSeconds: number, locale: Locale) {
  const pad = (n: number) =>
    formatNumber(n, locale, { minimumIntegerDigits: 2, useGrouping: false });
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}

/**
 * Normalises Persian/Arabic text for search: Arabic ي/ك → Persian ی/ک, removes ZWNJ and
 * diacritics, converts Persian/Arabic digits to ASCII, lower-cases Latin.
 */
export function normalizeSearch(input: string) {
  return input
    .toLowerCase()
    .replace(/[\u064A]/g, '\u06CC')
    .replace(/[\u0643]/g, '\u06A9')
    .replace(/[\u200C\u200D\u064B-\u065F\u0670]/g, '')
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Translates enum-like values (roles, lanes, tiers…) via `glossary.*` keys. */
export function termFor(t: Translator, group: string, value: string) {
  const key = `glossary.${group}.${value.replace(/[^A-Za-z0-9+]/g, '_')}`;
  const out = t(key);
  return out === key ? value : out;
}
