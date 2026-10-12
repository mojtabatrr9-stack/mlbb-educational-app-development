'use client';

import { createTranslator } from '@/i18n';
import { useFormat, useLocale, useT } from '@/i18n/client';
import type { DataQuality, Hero, Item, Locale } from '@/lib/types';
import { localizedHeroName } from '@/lib/types';
import {
  ArrowUpRight,
  ChevronRight,
  Crosshair,
  Flame,
  Footprints,
  Gem,
  HeartHandshake,
  Shield,
  Sparkles,
  Sword,
  Swords,
  WandSparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { SmartImage } from './smart-image';

export const roleIcons: Record<string, LucideIcon> = {
  Tank: Shield,
  Fighter: Swords,
  Assassin: Flame,
  Mage: Sparkles,
  Marksman: Crosshair,
  Support: HeartHandshake,
};

export function RoleIcon({ role, size = 17 }: { role: string; size?: number }) {
  const Icon = roleIcons[role] || Swords;
  return <Icon size={size} strokeWidth={1.6} />;
}

export function Brand() {
  const t = useT('common');
  return (
    <div className="brand">
      <span className="brand-mark">
        <svg viewBox="0 0 36 40" fill="none" aria-hidden="true">
          <path d="M4 4L16 9V23L30 35L18 30V17L4 4Z" fill="currentColor" />
          <path
            d="M6 13V30L15 35V23L6 13ZM21 5L30 10V27L21 19V5Z"
            fill="currentColor"
            opacity=".68"
          />
        </svg>
      </span>
      <div>
        NEXUS<span>{t('tagline')}</span>
      </div>
    </div>
  );
}

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]';

export function Modal({
  children,
  title,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
}) {
  const t = useT('common');
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const handler = (event: KeyboardEvent) => {
      const overlays = Array.from(document.querySelectorAll<HTMLElement>('.modal-backdrop')).sort(
        (a, b) => Number(getComputedStyle(a).zIndex) - Number(getComputedStyle(b).zIndex),
      );
      if (overlays.at(-1)?.querySelector('.modal-panel') !== panel.current) return;
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        closeRef.current();
      }
      if (event.key === 'Tab') {
        const nodes = panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === panel.current)
        ) {
          last.focus();
          event.preventDefault();
        } else if (!event.shiftKey && document.activeElement === last) {
          first.focus();
          event.preventDefault();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handler);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-panel ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panel}
      >
        <button className="modal-close icon-button" onClick={onClose} aria-label={t('close')}>
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

const itemIcons: Record<string, LucideIcon> = {
  sword: Sword,
  shield: Shield,
  gem: Gem,
  wand: WandSparkles,
  boot: Footprints,
};

export function ItemIcon({
  item,
  size = 'normal',
}: {
  item: Item;
  size?: 'normal' | 'small' | 'large';
}) {
  const Icon = itemIcons[item.icon] || Gem;
  const px = size === 'small' ? 31 : size === 'large' ? 61 : 47;
  return (
    <span className={`item-icon ${size}`} style={{ '--item-color': item.color } as CSSProperties}>
      {item.image_url ? (
        <SmartImage
          src={item.image_url}
          alt=""
          width={px}
          height={px}
          fallbackLabel={item.name}
          fallbackColor={item.color}
        />
      ) : (
        <Icon size={size === 'small' ? 19 : size === 'large' ? 32 : 25} strokeWidth={1.4} />
      )}
    </span>
  );
}

export function itemName(item: Item, locale: Locale) {
  return locale === 'fa' && item.name_fa ? item.name_fa : item.name;
}

/** Small icon for a skill: real icon when imported, otherwise a role-coloured placeholder. */
export function SkillIcon({
  src,
  label,
  size = 48,
}: {
  src?: string;
  label: string;
  size?: number;
}) {
  return (
    <span className="skill-icon" style={{ width: size, height: size }}>
      <SmartImage src={src || ''} alt="" width={size} height={size} fallbackLabel={label} />
    </span>
  );
}

export function HeroMini({
  hero,
  onClick,
  subtitle,
}: {
  hero: Hero;
  onClick: () => void;
  subtitle?: string;
}) {
  const { locale, term } = useFormat();
  return (
    <button className="hero-mini" onClick={onClick}>
      <SmartImage
        src={hero.image_url}
        alt=""
        width={45}
        height={45}
        fallbackLabel={hero.name}
        fallbackColor={hero.color}
      />
      <span>
        <strong>{localizedHeroName(hero, locale)}</strong>
        <small>{subtitle || `${term('roles', hero.role)} · ${term('lanes', hero.lane)}`}</small>
      </span>
      <ChevronRight size={16} className="icon-dir" />
    </button>
  );
}

export function EmptyState({
  icon: Icon = Swords,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={30} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ArrowLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={16} className="icon-dir" />
    </button>
  );
}

/** Tiny badge explaining where a value came from. */
export function QualityBadge({ quality }: { quality?: DataQuality }) {
  const t = useT('quality');
  if (!quality) return null;
  return (
    <span className={`quality-badge quality-${quality}`} title={t(quality)}>
      {t(quality)}
    </span>
  );
}

/** Notice shown when content falls back to English for Persian users. */
export function TranslationNotice({ show }: { show: boolean }) {
  const t = useT('common');
  if (!show) return null;
  return <p className="translation-notice">{t('translationPending')}</p>;
}

/**
 * Calls a mutation endpoint with the CSRF token. Server errors carry a `code`; when a
 * translation exists for `api.<code>` the localized message is thrown instead.
 */
export async function api(path: string, body?: unknown, method = 'POST', locale: Locale = 'en') {
  const session = await fetch('/api/session', { cache: 'no-store' }).then((r) => r.json());
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': session.csrf },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  const t = createTranslator(locale);
  if (!response.ok) {
    const key = data.code ? `api.${data.code}` : '';
    const localized = key ? t(key) : '';
    throw new Error(localized && localized !== key ? localized : data.error || t('errors.generic'));
  }
  if (data.code) {
    const localized = t(`api.${data.code}`);
    if (localized !== `api.${data.code}`) data.message = localized;
  }
  return data;
}

/** Hook-friendly wrapper that injects the current locale. */
export function useApi() {
  const { locale } = useLocale();
  return (path: string, body?: unknown, method = 'POST') => api(path, body, method, locale);
}
