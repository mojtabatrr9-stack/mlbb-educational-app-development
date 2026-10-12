'use client';

import { useLocale, useT } from '@/i18n/client';
import { ArrowLeft, Compass } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  const t = useT('errors');
  const { locale } = useLocale();
  return (
    <main className="status-page">
      <section className="simple-modal panel">
        <Compass size={45} />
        <span className="eyebrow">{t('notFoundEyebrow')}</span>
        <h2>{t('notFoundTitle')}</h2>
        <p>{t('notFoundText')}</p>
        <Link className="button primary" href={`/${locale}`}>
          <ArrowLeft size={15} className="icon-dir" />
          {t('backHome')}
        </Link>
      </section>
    </main>
  );
}
