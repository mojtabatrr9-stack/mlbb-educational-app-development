'use client';

import type { Locale, Text } from '@/lib/types';
import { tx } from '@/lib/types';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  createTranslator,
  dirFor,
  formatClock,
  formatDate,
  formatNumber,
  formatPercent,
  termFor,
} from './index';

type I18nValue = { locale: Locale; dir: 'rtl' | 'ltr' };
const I18nContext = createContext<I18nValue>({ locale: 'en', dir: 'ltr' });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, dir: dirFor(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale() {
  return useContext(I18nContext);
}

/** `const t = useT('heroes'); t('title')` */
export function useT(namespace?: string) {
  const { locale } = useLocale();
  return useMemo(() => createTranslator(locale, namespace), [locale, namespace]);
}

/** Locale-aware formatting helpers + content resolver. */
export function useFormat() {
  const { locale } = useLocale();
  const t = useT();
  return useMemo(
    () => ({
      locale,
      n: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, locale, options),
      pct: (value: number, digits?: number) => formatPercent(value, locale, digits),
      date: (value: string | Date, options?: Intl.DateTimeFormatOptions) =>
        formatDate(value, locale, options),
      clock: (seconds: number) => formatClock(seconds, locale),
      /** Resolve translatable content (`{en, fa}` or legacy string). */
      c: (value: Text | undefined) => tx(value, locale),
      /** Translate an enum value: `term('roles', hero.role)`. */
      term: (group: string, value: string) => termFor(t, group, value),
    }),
    [locale, t],
  );
}

/** Replaces the locale segment of a pathname, keeping the rest of the URL. */
export function switchLocalePath(pathname: string, next: Locale) {
  const parts = pathname.split('/');
  if (parts[1] === 'en' || parts[1] === 'fa') parts[1] = next;
  else parts.splice(1, 0, next);
  return parts.join('/') || `/${next}`;
}
