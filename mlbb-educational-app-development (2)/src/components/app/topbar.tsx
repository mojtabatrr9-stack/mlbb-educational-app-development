'use client';

import { switchLocalePath, useLocale, useT } from '@/i18n/client';
import type { Section } from '@/lib/types';
import {
  ArrowRight,
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Globe2,
  Menu,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type RefObject } from 'react';

export function LanguageButton({ compact = false }: { compact?: boolean }) {
  const t = useT('nav');
  const { locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const next = locale === 'fa' ? 'en' : 'fa';
  const switchLocale = () => {
    document.cookie = `nexus-locale=${next}; path=/; max-age=31536000; samesite=lax`;
    router.push(`${switchLocalePath(pathname, next)}${window.location.hash}`);
  };
  return (
    <button
      className={compact ? 'text-link' : 'language-button'}
      onClick={switchLocale}
      aria-label={t('switchLanguage')}
    >
      <Globe2 size={16} />
      {compact ? t('switchLanguage') : next.toUpperCase()}
    </button>
  );
}

export function Topbar({
  section,
  query,
  onQuery,
  searchRef,
  heroCount,
  nickname,
  onOpenMenu,
  onOpenProfile,
  onNavigate,
}: {
  section: Section;
  query: string;
  onQuery: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  heroCount: number;
  nickname: string;
  onOpenMenu: () => void;
  onOpenProfile: () => void;
  onNavigate: (section: Section) => void;
}) {
  const t = useT('nav');
  const th = useT('home');
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          className="icon-button mobile-menu"
          onClick={onOpenMenu}
          aria-label={t('openNavigation')}
        >
          <Menu size={21} />
        </button>
        <span className="breadcrumb-home">{t('breadcrumbHome')}</span>
        <ChevronRight size={13} className="icon-dir" />
        <strong>{t(section)}</strong>
      </div>
      <div className="topbar-actions">
        <label className="global-search">
          <Search size={16} />
          <input
            ref={searchRef}
            aria-label={t('searchAll')}
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
          <kbd>⌘ K</kbd>
        </label>
        <LanguageButton />
        <span className="topbar-divider" />
        <div className="notification-wrap">
          <button
            className={`icon-button bell ${open ? 'selected' : ''}`}
            aria-label={t('notifications')}
            onClick={() => {
              setOpen((v) => !v);
              setSeen(true);
            }}
          >
            <Bell size={19} />
            {!seen && <i />}
          </button>
          {open && (
            <div className="notification-popover">
              <div className="popover-heading">
                <strong>{th('notificationsTitle')}</strong>
                <button
                  className="icon-button"
                  aria-label={th('closeNotifications')}
                  onClick={() => setOpen(false)}
                >
                  <X size={15} />
                </button>
              </div>
              <span className="notification-icon">
                <Sparkles size={19} />
              </span>
              <h4>{th('welcome')}</h4>
              <p>{th('welcomeText', { count: heroCount })}</p>
              <button
                className="text-link"
                onClick={() => {
                  onNavigate('guides');
                  setOpen(false);
                }}
              >
                {th('startBasics')}
                <ArrowRight size={14} className="icon-dir" />
              </button>
              <div className="notification-foot">
                <CheckCheck size={14} />
                {th('caughtUp')}
              </div>
            </div>
          )}
        </div>
        <button className="profile-button" onClick={onOpenProfile} aria-label={t('profile')}>
          <span>{nickname.slice(0, 1).toUpperCase()}</span>
          <ChevronDown size={13} />
        </button>
      </div>
    </header>
  );
}
