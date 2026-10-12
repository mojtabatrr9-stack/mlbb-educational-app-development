'use client';

import { useLocale, useT } from '@/i18n/client';
import type { Section } from '@/lib/types';
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  ChartNoAxesColumnIncreasing,
  Crosshair,
  Layers3,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Swords,
  Timer,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Brand } from '../ui';

export const NAV: Array<{ id: Section; icon: LucideIcon }> = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'heroes', icon: Swords },
  { id: 'builds', icon: Layers3 },
  { id: 'counters', icon: Crosshair },
  { id: 'tier', icon: ChartNoAxesColumnIncreasing },
  { id: 'guides', icon: BookOpen },
  { id: 'tools', icon: Timer },
];
export const SECTIONS: Section[] = [...NAV.map((n) => n.id), 'favorites'];

export function Sidebar({
  open,
  section,
  heroCount,
  favoriteCount,
  onNavigate,
  onClose,
}: {
  open: boolean;
  section: Section;
  heroCount: number;
  favoriteCount: number;
  onNavigate: (section: Section) => void;
  onClose: () => void;
}) {
  const t = useT('nav');
  const { locale } = useLocale();
  return (
    <>
      {open && <div className="mobile-scrim" onClick={onClose} />}
      <aside aria-label={t('playbook')} className={`sidebar ${open ? 'is-open' : ''}`}>
        <Link href={`/${locale}`} className="brand-link" aria-label="Nexus">
          <Brand />
        </Link>
        <button
          className="mobile-sidebar-close icon-button"
          onClick={onClose}
          aria-label={t('closeNavigation')}
        >
          <X size={20} />
        </button>
        <div className="sidebar-label">{t('playbook')}</div>
        <nav className="nav-list" aria-label={t('playbook')}>
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${section === n.id ? 'active' : ''}`}
              onClick={() => onNavigate(n.id)}
              aria-current={section === n.id ? 'page' : undefined}
            >
              <n.icon size={19} strokeWidth={1.7} />
              <span>{t(n.id)}</span>
              {n.id === 'heroes' && <span className="nav-count">{heroCount}</span>}
              {n.id === 'counters' && (
                <span className="tiny-new">
                  {t('common.new', {}) === 'common.new' ? 'NEW' : ''}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">{t('yourSpace')}</div>
        <button
          className={`nav-item ${section === 'favorites' ? 'active' : ''}`}
          onClick={() => onNavigate('favorites')}
        >
          <Bookmark size={19} strokeWidth={1.7} />
          <span>{t('favorites')}</span>
          {favoriteCount > 0 && <span className="nav-count">{favoriteCount}</span>}
        </button>
        <div className="sidebar-bottom">
          <div className="level-up">
            <span className="level-icon">
              <Sparkles size={22} />
            </span>
            <h3>{t('levelUpTitle')}</h3>
            <p>{t('levelUpText')}</p>
            <button onClick={() => onNavigate('guides')}>
              {t('exploreAcademy')}
              <ArrowUpRight size={15} className="icon-dir" />
            </button>
            <span className="callout-orbit" />
          </div>
          <Link className="admin-link" href={`/${locale}/admin`}>
            <ShieldCheck size={17} />
            <span>{t('admin')}</span>
            <ArrowUpRight size={14} className="icon-dir" />
          </Link>
          <div className="sidebar-footer">
            <span className="status-dot" />
            {t('madeFor')}
            <span>v1.1</span>
          </div>
        </div>
      </aside>
    </>
  );
}
