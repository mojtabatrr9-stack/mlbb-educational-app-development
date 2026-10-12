import { ServiceWorkerManager } from '@/components/service-worker-manager';
import { createTranslator, dirFor, isLocale } from '@/i18n';
import { I18nProvider } from '@/i18n/client';
import { LOCALES } from '@/lib/types';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/vazirmatn';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import '../globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
type Params = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : 'en';
  const t = createTranslator(lang, 'meta');
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t('title'), template: `%s · Nexus` },
    description: t('description'),
    manifest: '/manifest.webmanifest',
    applicationName: 'Nexus',
    appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Nexus' },
    alternates: {
      canonical: `/${lang}`,
      languages: { en: '/en', fa: '/fa', 'x-default': '/en' },
    },
    icons: {
      icon: [
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
    openGraph: {
      type: 'website',
      siteName: 'Nexus',
      locale: lang === 'fa' ? 'fa_IR' : 'en_US',
      title: t('title'),
      description: t('description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Nexus' }],
    },
    twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
  };
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#101014' };

export default async function LocaleLayout({ children, params }: Params & { children: ReactNode }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} dir={dirFor(locale)} className={locale === 'fa' ? 'lang-fa' : 'lang-en'}>
      <body>
        <I18nProvider locale={locale}>
          {children}
          <ServiceWorkerManager />
        </I18nProvider>
      </body>
    </html>
  );
}
