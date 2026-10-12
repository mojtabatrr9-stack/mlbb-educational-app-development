'use client';

import { useFormat, useT } from '@/i18n/client';
import type { Guide, Hero, Section } from '@/lib/types';
import { localizedHeroName } from '@/lib/types';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Crosshair,
  Flame,
  Layers3,
  TrendingUp,
} from 'lucide-react';
import type { RefObject } from 'react';
import { SmartImage } from '../smart-image';

export function Banner({
  onExplore,
  onNavigate,
}: {
  onExplore: () => void;
  onNavigate: (s: Section) => void;
}) {
  const t = useT('home');
  return (
    <>
      <section className="hero-banner">
        <SmartImage
          className="banner-art"
          src="/images/nexus-hero.webp"
          alt={t('bannerAlt')}
          width={1700}
          height={730}
          sizes="(max-width: 850px) 100vw, 1200px"
          optimize
          preload
          fetchPriority="high"
        />
        <div className="banner-shade" />
        <div className="banner-content">
          <div className="banner-eyebrow">
            <span /> {t('eyebrow')}
          </div>
          <h2>
            {t('bannerTitle1')}
            <br />
            <em>{t('bannerTitle2')}</em>
          </h2>
          <p>
            {t('bannerText1')}
            <br />
            {t('bannerText2')}
          </p>
          <div className="banner-buttons">
            <button className="button primary" onClick={onExplore}>
              {t('exploreHeroes')}
              <ArrowRight size={16} className="icon-dir" />
            </button>
            <button className="button banner-secondary" onClick={() => onNavigate('counters')}>
              <Crosshair size={16} />
              {t('findCounter')}
            </button>
          </div>
        </div>
        <div className="banner-corner">
          <span className="diamond-mark">✦</span> {t('landAwaits')}
        </div>
        <span className="banner-page">
          <i />
          <i />
          <i />
        </span>
      </section>
      <section className="quick-tools" aria-label={t('quickBuild')}>
        {(
          [
            ['builds', Layers3, 'violet', 'quickBuild', 'quickBuildText'],
            ['counters', Crosshair, 'coral', 'quickCounter', 'quickCounterText'],
            ['guides', BookOpen, 'mint', 'quickLearn', 'quickLearnText'],
          ] as const
        ).map(([section, Icon, tone, title, text]) => (
          <button key={section} className="quick-tool" onClick={() => onNavigate(section)}>
            <span className={`quick-icon ${tone}`}>
              <Icon size={23} strokeWidth={1.6} />
            </span>
            <div>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
            </div>
            <ArrowUpRight size={19} className="icon-dir" />
          </button>
        ))}
      </section>
    </>
  );
}

export function DiscoveryAside({
  featured,
  top,
  guide,
  onOpenHero,
  onOpenGuide,
  onNavigate,
}: {
  featured?: Hero;
  top: Hero[];
  guide?: Guide;
  onOpenHero: (hero: Hero) => void;
  onOpenGuide: (guide: Guide) => void;
  onNavigate: (s: Section) => void;
}) {
  const t = useT('home');
  const { locale, pct, term } = useFormat();
  return (
    <aside aria-label={t('heroOfWeek')} className="discovery-aside">
      {featured && (
        <section className="weekly-card">
          <div className="aside-heading">
            <span>
              <Flame size={15} />
              {t('heroOfWeek')}
            </span>
            <span className="week-star">✦</span>
          </div>
          <button className="weekly-visual" onClick={() => onOpenHero(featured)}>
            <SmartImage
              src={featured.image_url}
              alt=""
              width={560}
              height={360}
              fallbackLabel={featured.name}
              fallbackColor={featured.color}
            />
            <span className="weekly-shade" />
            <span className="weekly-tag">{t('editorsPick')}</span>
            <div className="weekly-name">
              <span className="eyebrow">{t('weeklyEyebrow')}</span>
              <h3>{localizedHeroName(featured, locale)}</h3>
              <p>{term('roles', featured.role)}</p>
            </div>
            <span className="weekly-tier">
              {featured.tier}
              <small>{t('tierLabel')}</small>
            </span>
          </button>
          <div className="weekly-body">
            <p>{t('weeklyText')}</p>
            <div className="weekly-stats">
              <span>
                <strong>{pct(featured.win_rate)}</strong>
                <small>{t('sampleWinRate')}</small>
              </span>
              <span>
                <strong>{pct(featured.pick_rate)}</strong>
                <small>{t('samplePickRate')}</small>
              </span>
              <span>
                <strong>{term('difficulty', featured.difficulty)}</strong>
                <small>{t('difficulty')}</small>
              </span>
            </div>
            <button className="button weekly-button" onClick={() => onOpenHero(featured)}>
              {t('exploreHero')}
              <ArrowRight size={14} className="icon-dir" />
            </button>
          </div>
        </section>
      )}
      <section className="meta-watch">
        <div className="aside-heading">
          <span>
            <TrendingUp size={15} />
            {t('metaWatch')}
          </span>
          <span className="subtle-badge">{t('curated')}</span>
        </div>
        <p>{t('metaText')}</p>
        {top.map((h, i) => (
          <button className="meta-row" key={h.hero_id} onClick={() => onOpenHero(h)}>
            <span className="meta-rank">0{i + 1}</span>
            <SmartImage
              src={h.image_url}
              alt=""
              width={31}
              height={34}
              fallbackLabel={h.name}
              fallbackColor={h.color}
            />
            <span>
              <strong>{localizedHeroName(h, locale)}</strong>
              <small>{term('roles', h.role)}</small>
            </span>
            <span className="meta-value">
              {pct(h.win_rate)}
              <TrendingUp size={12} />
            </span>
          </button>
        ))}
        <button className="meta-footer" onClick={() => onNavigate('tier')}>
          {t('exploreTier')}
          <ArrowUpRight size={14} className="icon-dir" />
        </button>
      </section>
      {guide && (
        <button className="academy-card" onClick={() => onOpenGuide(guide)}>
          <span className="academy-eyebrow">
            <BookOpen size={14} />
            {t('academyEyebrow')}
          </span>
          <h3>
            {t('academyTitle1')}
            <br />
            {t('academyTitle2')}
          </h3>
          <span className="academy-link">
            {t('readGuide')}
            <ArrowUpRight size={15} className="icon-dir" />
          </span>
          <span className="academy-decoration">
            <Crosshair size={89} strokeWidth={0.7} />
          </span>
        </button>
      )}
    </aside>
  );
}

export function useScrollTo(ref: RefObject<HTMLElement | null>) {
  return () => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
