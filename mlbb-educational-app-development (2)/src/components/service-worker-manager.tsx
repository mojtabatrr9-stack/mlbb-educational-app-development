'use client';

import { RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Fired on `window` when the offline library has been fully cached. */
export const OFFLINE_READY_EVENT = 'nexus-offline-ready';

const copy = {
  en: { title: 'A new version of Nexus is ready.', reload: 'Update now', later: 'Later' },
  fa: { title: 'نسخهٔ جدید نکسوس آماده است.', reload: 'به‌روزرسانی', later: 'بعداً' },
};

/**
 * Registers `/sw.js`, asks it to cache the hero library, and shows an
 * "update available" toast when a new worker is waiting.
 */
export function ServiceWorkerManager() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [lang, setLang] = useState<'en' | 'fa'>('en');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    let reloading = false;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OFFLINE_READY')
        window.dispatchEvent(new Event(OFFLINE_READY_EVENT));
    };
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    const offerUpdate = (worker: ServiceWorker | null) => {
      if (!worker || !navigator.serviceWorker.controller) return;
      setLang(document.documentElement.lang === 'fa' ? 'fa' : 'en');
      setWaiting(worker);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        offerUpdate(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed') offerUpdate(installing);
          });
        });
        return navigator.serviceWorker.ready;
      })
      .then((registration) => {
        const assets = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(location.origin) && /\/_next\/static\//.test(url))
          .map((url) => new URL(url).pathname);
        registration.active?.postMessage({ type: 'CACHE_LIBRARY', assets });
      })
      .catch(() => {
        // Offline support is progressive; the app works without it.
      });
    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!waiting) return null;
  const t = copy[lang];
  return (
    <div className="toast update-toast" role="status">
      <span>
        <RefreshCw size={16} />
      </span>
      {t.title}
      <button
        className="button primary compact"
        onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}
      >
        {t.reload}
      </button>
      <button onClick={() => setWaiting(null)} aria-label={t.later}>
        <X size={15} />
      </button>
    </div>
  );
}
