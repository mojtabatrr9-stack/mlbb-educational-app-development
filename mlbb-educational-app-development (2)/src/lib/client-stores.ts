'use client';

/**
 * Hydration-safe access to browser-only state (localStorage, connectivity, URL hash).
 *
 * All hooks use `useSyncExternalStore`, so the server render and the first client render
 * agree (fallback values), and the real browser value is applied without a
 * setState-inside-effect cascade.
 */
import { useCallback, useState, useSyncExternalStore } from 'react';

const LOCAL_EVENT = 'nexus-storage';
const cache = new Map<string, { raw: string | null; value: unknown }>();

function readStored<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    raw = null;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function subscribeStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(LOCAL_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(LOCAL_EVENT, callback);
  };
}

/** JSON value persisted in localStorage, shared live between components and tabs. */
export function useStoredState<T>(key: string, initial: T) {
  const [fallback] = useState(initial);
  const value = useSyncExternalStore(
    subscribeStorage,
    () => readStored(key, fallback),
    () => fallback,
  );
  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      const current = readStored(key, fallback);
      const resolved = typeof next === 'function' ? (next as (current: T) => T)(current) : next;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Private mode / quota: keep working in memory for this session.
        cache.set(key, { raw: JSON.stringify(resolved), value: resolved });
      }
      window.dispatchEvent(new Event(LOCAL_EVENT));
    },
    [key, fallback],
  );
  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {}
    window.dispatchEvent(new Event(LOCAL_EVENT));
  }, [key]);
  return [value, setValue, remove] as const;
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/** `navigator.onLine`, assumed online during server rendering. */
export function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

function subscribeHash(callback: () => void) {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
  };
}

/** Current URL hash without `#`. Empty string on the server. */
export function useHash() {
  return useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => '',
  );
}

/** Pushes a new history entry for `#value` and notifies `useHash` subscribers. */
export function setHash(value: string) {
  if (window.location.hash.slice(1) === value) return;
  window.history.pushState(null, '', `#${value}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
