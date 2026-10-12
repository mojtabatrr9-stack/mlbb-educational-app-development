'use client';

import { useT } from '@/i18n/client';
import { RefreshCw, ShieldAlert } from 'lucide-react';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT('errors');
  return (
    <main className="status-page">
      <section className="simple-modal panel">
        <ShieldAlert size={42} />
        <span className="eyebrow">{t('pauseEyebrow')}</span>
        <h2>{t('pauseTitle')}</h2>
        <p>{t('pauseText')}</p>
        <button className="button primary" onClick={reset}>
          <RefreshCw size={15} />
          {t('tryAgain')}
        </button>
      </section>
    </main>
  );
}
