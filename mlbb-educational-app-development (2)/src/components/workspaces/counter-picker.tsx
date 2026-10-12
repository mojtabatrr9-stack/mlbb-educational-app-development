'use client';

import { normalizeSearch } from '@/i18n';
import { useFormat, useT } from '@/i18n/client';
import type { Catalog, Hero } from '@/lib/types';
import { localizedHeroName } from '@/lib/types';
import { ArrowRight, ArrowUpRight, Check, Crosshair, Search, Target } from 'lucide-react';
import { useState } from 'react';
import { SmartImage } from '../smart-image';
import { EmptyState, ItemIcon, RoleIcon, itemName } from '../ui';

export function CounterPicker({
  catalog,
  openHero,
  toBuild,
}: {
  catalog: Catalog;
  openHero: (hero: Hero) => void;
  toBuild: (id: string) => void;
}) {
  const t = useT('counters');
  const { locale, n, term } = useFormat();
  const [enemyId, setEnemyId] = useState('fanny');
  const [query, setQuery] = useState('');
  const enemy = catalog.heroes.find((h) => h.hero_id === enemyId) || catalog.heroes[0];
  const counters =
    enemy?.counters
      .map((id) => catalog.heroes.find((h) => h.hero_id === id))
      .filter((h): h is Hero => !!h) || [];
  const q = normalizeSearch(query);
  const reason = (role: string) =>
    t(
      role === 'Tank'
        ? 'reasonTank'
        : role === 'Assassin'
          ? 'reasonAssassin'
          : role === 'Support'
            ? 'reasonSupport'
            : 'reasonDefault',
    );
  return (
    <div className="counter-workspace">
      <div className="tool-intro">
        <span className="tool-intro-icon coral">
          <Crosshair size={25} />
        </span>
        <div>
          <h2>{t('title')}</h2>
          <p>{t('subtitle')}</p>
        </div>
        <span className="subtle-badge">{t('curated')}</span>
      </div>
      <div className="counter-layout">
        <section className="enemy-panel panel">
          <span className="eyebrow">{t('step1')}</span>
          <h3>{t('whoAgainst')}</h3>
          <label className="hero-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchEnemy')}
              aria-label={t('searchEnemy')}
            />
          </label>
          <div className="enemy-grid">
            {catalog.heroes
              .filter((h) => !q || normalizeSearch(`${h.name} ${h.name_fa || ''}`).includes(q))
              .map((h) => (
                <button
                  className={enemyId === h.hero_id ? 'selected' : ''}
                  key={h.hero_id}
                  onClick={() => setEnemyId(h.hero_id)}
                >
                  <SmartImage
                    src={h.image_url}
                    alt=""
                    width={120}
                    height={65}
                    fallbackLabel={h.name}
                    fallbackColor={h.color}
                  />
                  <span>{localizedHeroName(h, locale)}</span>
                  {enemyId === h.hero_id && (
                    <i>
                      <Check size={12} />
                    </i>
                  )}
                </button>
              ))}
          </div>
        </section>
        <section className="counter-results">
          <div className="subsection-title">
            <div>
              <span className="eyebrow">{t('step2')}</span>
              <h3>
                {t('bestAgainst')} <em>{enemy ? localizedHeroName(enemy, locale) : ''}</em>
              </h3>
            </div>
            <span>{t('count', { count: n(counters.length) })}</span>
          </div>
          {counters.length === 0 && (
            <EmptyState
              icon={Crosshair}
              title={t('noCounters')}
              description={t('noCountersText')}
            />
          )}
          {counters.map((h, i) => {
            const build = catalog.builds.find((b) => b.hero_id === h.hero_id);
            return (
              <article className="counter-result panel" key={h.hero_id}>
                <div className="counter-result-art">
                  <SmartImage
                    src={h.image_url}
                    alt=""
                    width={150}
                    height={186}
                    fallbackLabel={h.name}
                    fallbackColor={h.color}
                  />
                  <span>0{i + 1}</span>
                </div>
                <div className="counter-result-info">
                  <div>
                    <h3>
                      <button onClick={() => openHero(h)}>
                        {localizedHeroName(h, locale)}
                        <ArrowUpRight size={15} className="icon-dir" />
                      </button>
                    </h3>
                    <span className="tier-badge">{term('tiers', h.tier)}</span>
                  </div>
                  <span className="counter-role">
                    <RoleIcon role={h.role} size={14} />
                    {term('roles', h.role)} · {term('lanes', h.lane)}
                  </span>
                  <p>{reason(h.role)}</p>
                  {build && (
                    <div className="counter-build">
                      {build.items.slice(0, 6).map((id) => {
                        const item = catalog.items.find((it) => it.item_id === id);
                        return item ? (
                          <span key={id} title={itemName(item, locale)}>
                            <ItemIcon item={item} size="small" />
                          </span>
                        ) : null;
                      })}
                      <button
                        onClick={() => toBuild(h.hero_id)}
                        aria-label={t('viewBuild', { name: localizedHeroName(h, locale) })}
                      >
                        <ArrowRight size={17} className="icon-dir" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
          <div className="info-callout">
            <Target size={21} />
            <p>
              <strong>{t('calloutTitle')}</strong>
              {t('calloutText')}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
