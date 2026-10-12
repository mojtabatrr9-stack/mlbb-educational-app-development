'use client';

import { normalizeSearch } from '@/i18n';
import { useFormat, useT } from '@/i18n/client';
import type { Hero, Section } from '@/lib/types';
import { DIFFICULTIES, LANES, ROLES, localizedHeroName } from '@/lib/types';
import {
  ArrowUpRight,
  Bookmark,
  ChevronDown,
  Grid2X2,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { useMemo, useState, type CSSProperties, type RefObject } from 'react';
import { SmartImage } from '../smart-image';
import { ArrowLink, EmptyState, RoleIcon } from '../ui';

export type Filters = {
  query: string;
  role: string;
  lane: string;
  difficulty: string;
  sort: string;
};
export const EMPTY_FILTERS: Filters = {
  query: '',
  role: 'All',
  lane: 'All',
  difficulty: 'All',
  sort: 'Recommended',
};

export function useFilteredHeroes(
  heroes: Hero[],
  filters: Filters,
  section: Section,
  favorites: string[],
) {
  return useMemo(() => {
    const q = normalizeSearch(filters.query);
    return heroes
      .filter(
        (h) =>
          (filters.role === 'All' ||
            h.role === filters.role ||
            h.role_secondary === filters.role) &&
          (filters.lane === 'All' || h.lane === filters.lane) &&
          (filters.difficulty === 'All' || h.difficulty === filters.difficulty) &&
          (section !== 'favorites' || favorites.includes(h.hero_id)) &&
          (!q || normalizeSearch(`${h.name} ${h.name_fa || ''} ${h.role}`).includes(q)),
      )
      .sort((a, b) =>
        filters.sort === 'Name A–Z'
          ? a.name.localeCompare(b.name)
          : filters.sort === 'Win rate'
            ? b.win_rate - a.win_rate
            : 0,
      );
  }, [heroes, filters, section, favorites]);
}

export function HeroCard({
  hero,
  index,
  saved,
  onOpen,
  onToggleFavorite,
}: {
  hero: Hero;
  index: number;
  saved: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const t = useT('home');
  const { c, pct, term, locale } = useFormat();
  const name = localizedHeroName(hero, locale);
  const tierClass = hero.tier === 'S+' ? 'plus' : hero.tier.toLowerCase();
  return (
    <article
      className="hero-card"
      style={{ '--hero-color': hero.color, '--card-index': index } as CSSProperties}
    >
      <button className="hero-card-main" onClick={onOpen} aria-label={t('view', { name })}>
        <div className="hero-visual">
          <SmartImage
            src={hero.image_url}
            alt=""
            width={320}
            height={206}
            loading={index > 3 ? 'lazy' : 'eager'}
            fallbackLabel={hero.name}
            fallbackColor={hero.color}
          />
          <div className="hero-card-shade" />
          <span className={`tier-badge tier-${tierClass}`}>
            {hero.tier === 'S+' && <Sparkles size={10} />} {term('tiers', hero.tier)}
          </span>
          <div className="hero-card-name">
            <h3>{name}</h3>
            <span>{c(hero.title) || term('roles', hero.role)}</span>
          </div>
          <span className="hero-hover-arrow">
            <ArrowUpRight size={18} className="icon-dir" />
          </span>
        </div>
        <div className="hero-card-details">
          <div className="hero-role">
            <span>
              <RoleIcon role={hero.role} size={13} />
              {term('roles', hero.role)}
            </span>
            <span className="hero-lane">{term('lanes', hero.lane)}</span>
          </div>
          <div className="hero-card-stats">
            <span>
              <i />
              {hero.win_rate > 0 ? pct(hero.win_rate) : term('tiers', 'Unrated')}{' '}
              <small>{hero.win_rate > 0 ? t('winRate') : ''}</small>
            </span>
            <span className={`difficulty difficulty-${hero.difficulty.toLowerCase()}`}>
              <i />
              <i />
              <i />
              <small>{term('difficulty', hero.difficulty)}</small>
            </span>
          </div>
        </div>
      </button>
      <button
        className={`favorite-button ${saved ? 'saved' : ''}`}
        onClick={onToggleFavorite}
        aria-label={t(saved ? 'unsave' : 'save', { name })}
        aria-pressed={saved}
      >
        <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}

export function HeroLibrary({
  heroes,
  total,
  section,
  filters,
  onFilters,
  favorites,
  onOpen,
  onToggleFavorite,
  onNavigate,
  libraryRef,
}: {
  heroes: Hero[];
  total: number;
  section: Section;
  filters: Filters;
  onFilters: (next: Filters) => void;
  favorites: string[];
  onOpen: (hero: Hero) => void;
  onToggleFavorite: (id: string) => void;
  onNavigate: (section: Section) => void;
  libraryRef: RefObject<HTMLElement | null>;
}) {
  const t = useT('home');
  const tn = useT('nav');
  const tc = useT('common');
  const { n, term } = useFormat();
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });
  const limit = section === 'overview' && !showAll ? 8 : 200;
  const shown = heroes.slice(0, limit);
  return (
    <section className="hero-library" ref={libraryRef}>
      <div className="section-heading">
        <div className="title-with-count">
          <h2>{section === 'favorites' ? tn('favorites') : t('discover')}</h2>
          <span className="count-badge">
            {n(section === 'favorites' ? favorites.length : total)}
          </span>
        </div>
        {section === 'overview' && (
          <ArrowLink onClick={() => onNavigate('heroes')}>{t('allHeroes')}</ArrowLink>
        )}
      </div>
      <div className="role-filters" role="group" aria-label={t('filterRole')}>
        <button
          className={`role-chip ${filters.role === 'All' ? 'active' : ''}`}
          onClick={() => set({ role: 'All' })}
        >
          <Grid2X2 size={15} />
          {t('allHeroes')}
        </button>
        {ROLES.map((r) => (
          <button
            key={r}
            className={`role-chip ${filters.role === r ? 'active' : ''}`}
            onClick={() => set({ role: r })}
          >
            <RoleIcon role={r} size={15} />
            {term('roles', r)}
          </button>
        ))}
      </div>
      <div className="hero-search-row">
        <label className="hero-search">
          <Search size={16} />
          <input
            placeholder={t('searchHero')}
            aria-label={t('searchLibrary')}
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
          />
          {filters.query && (
            <button
              className="icon-button"
              onClick={() => set({ query: '' })}
              aria-label={t('clearSearch')}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <label className="select-shell">
          <SlidersHorizontal size={14} />
          <select
            value={filters.lane}
            onChange={(e) => set({ lane: e.target.value })}
            aria-label={t('filterLane')}
          >
            <option value="All">{t('allLanes')}</option>
            {LANES.map((l) => (
              <option key={l} value={l}>
                {t('laneOption', { lane: term('lanes', l) })}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </label>
        <button
          className={`filter-button ${filterOpen || filters.difficulty !== 'All' ? 'active' : ''}`}
          onClick={() => setFilterOpen((v) => !v)}
          aria-label={t('moreFilters')}
          aria-expanded={filterOpen}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
      {filterOpen && (
        <div className="extended-filters">
          <label>
            {t('difficulty')}
            <select
              value={filters.difficulty}
              onChange={(e) => set({ difficulty: e.target.value })}
            >
              <option value="All">{tc('all')}</option>
              {DIFFICULTIES.map((v) => (
                <option key={v} value={v}>
                  {term('difficulty', v)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('sortBy')}
            <select value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
              <option value="Recommended">{t('sortRecommended')}</option>
              <option value="Name A–Z">{t('sortName')}</option>
              <option value="Win rate">{t('sortWinRate')}</option>
            </select>
          </label>
          <button className="text-link" onClick={() => onFilters(EMPTY_FILTERS)}>
            {t('resetFilters')}
          </button>
        </div>
      )}
      {heroes.length ? (
        <div className="hero-grid">
          {shown.map((h, index) => (
            <HeroCard
              key={h.hero_id}
              hero={h}
              index={index}
              saved={favorites.includes(h.hero_id)}
              onOpen={() => onOpen(h)}
              onToggleFavorite={() => onToggleFavorite(h.hero_id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={section === 'favorites' ? Bookmark : Search}
          title={section === 'favorites' ? t('noFavorites') : t('noHeroes')}
          description={section === 'favorites' ? t('noFavoritesText') : t('noHeroesText')}
          action={
            <button
              className="button secondary"
              onClick={() =>
                section === 'favorites' ? onNavigate('heroes') : onFilters(EMPTY_FILTERS)
              }
            >
              {section === 'favorites' ? t('exploreHeroes') : t('clearFilters')}
            </button>
          }
        />
      )}
      <div className="library-bottom">
        <span>
          {t('showing', { shown: n(Math.min(heroes.length, limit)), total: n(heroes.length) })}
        </span>
        {section === 'overview' && !showAll && heroes.length > 8 && (
          <button className="text-link" onClick={() => setShowAll(true)}>
            {t('showMore')}
            <ChevronDown size={14} />
          </button>
        )}
        <span className="sample-stat-note" title={tc('sampleDataHint')}>
          {tc('sampleData')}
        </span>
      </div>
    </section>
  );
}
