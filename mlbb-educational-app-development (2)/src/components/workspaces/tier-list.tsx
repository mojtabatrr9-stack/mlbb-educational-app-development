'use client';

import { useFormat, useT } from '@/i18n/client';
import { useStoredState } from '@/lib/client-stores';
import type { Catalog, Hero } from '@/lib/types';
import { ROLES, localizedHeroName } from '@/lib/types';
import { Layers3, ShieldCheck, Star, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { SmartImage } from '../smart-image';
import { Modal, RoleIcon, useApi } from '../ui';

const TIER_ROWS = ['S+', 'S', 'A', 'B'] as const;

export function TierList({
  catalog,
  openHero,
  notify,
}: {
  catalog: Catalog;
  openHero: (hero: Hero) => void;
  notify: (message: string) => void;
}) {
  const t = useT('tier');
  const tc = useT('common');
  const { locale, n, term } = useFormat();
  const api = useApi();
  const [role, setRole] = useState('All');
  const [voteHero, setVoteHero] = useState<Hero | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [votes, setVotes] = useStoredState<Record<string, number>>('nexus-ratings', {});
  const unrated = catalog.heroes.filter((h) => h.tier === 'Unrated').length;

  const vote = async (value: number) => {
    if (!voteHero) return;
    setBusy(true);
    setError('');
    try {
      await api('/api/interactions', { kind: 'rating', heroId: voteHero.hero_id, rating: value });
      setVotes((current) => ({ ...current, [voteHero.hero_id]: value }));
      notify(t('voteSaved'));
      setVoteHero(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('unknown'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="tool-intro">
        <span className="tool-intro-icon">
          <TrendingUp size={25} />
        </span>
        <div>
          <h2>{t('title')}</h2>
          <p>{t('subtitle')}</p>
        </div>
        <span className="subtle-badge">{t('badge')}</span>
      </div>
      <div className="role-filters tier-filters">
        {['All', ...ROLES].map((r) => (
          <button
            className={`role-chip ${role === r ? 'active' : ''}`}
            key={r}
            onClick={() => setRole(r)}
          >
            {r === 'All' ? <Layers3 size={15} /> : <RoleIcon role={r} size={15} />}{' '}
            {r === 'All' ? t('allRoles') : term('roles', r)}
          </button>
        ))}
      </div>
      <div className="tier-board">
        {TIER_ROWS.map((tier) => {
          const heroes = catalog.heroes.filter(
            (h) => h.tier === tier && (role === 'All' || h.role === role),
          );
          return (
            <div
              className={`tier-row row-${tier === 'S+' ? 'plus' : tier.toLowerCase()}`}
              key={tier}
            >
              <div className="tier-row-label">
                <strong>{tier}</strong>
                <small>{t(`labels.${tier}`)}</small>
              </div>
              <div className="tier-row-heroes">
                {heroes.map((h) => (
                  <div className="tier-hero" key={h.hero_id}>
                    <button onClick={() => openHero(h)}>
                      <SmartImage
                        src={h.image_url}
                        alt=""
                        width={71}
                        height={69}
                        fallbackLabel={h.name}
                        fallbackColor={h.color}
                      />
                      <strong>{localizedHeroName(h, locale)}</strong>
                    </button>
                    <button
                      className="tier-vote"
                      onClick={() => {
                        setVoteHero(h);
                        setError('');
                      }}
                    >
                      <Star size={11} fill={votes[h.hero_id] ? 'currentColor' : 'none'} />
                      {votes[h.hero_id] ? t('voted', { n: n(votes[h.hero_id]) }) : t('rateHero')}
                    </button>
                  </div>
                ))}
                {!heroes.length && <p className="tier-empty">{t('empty')}</p>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="info-callout">
        <ShieldCheck size={22} />
        <p>
          <strong>{t('calloutTitle')}</strong>
          {t('calloutText')}
          {unrated > 0 && ` ${t('unratedNote', { count: n(unrated) })}`}
        </p>
      </div>
      {voteHero && (
        <Modal
          title={t('rateTitle', { name: localizedHeroName(voteHero, locale) })}
          onClose={() => setVoteHero(null)}
        >
          <div className="simple-modal vote-modal">
            <SmartImage
              src={voteHero.image_url}
              alt=""
              width={92}
              height={92}
              fallbackLabel={voteHero.name}
              fallbackColor={voteHero.color}
            />
            <span className="eyebrow">{t('experienceEyebrow')}</span>
            <h2>{t('howStrong', { name: localizedHeroName(voteHero, locale) })}</h2>
            <p>{t('scale')}</p>
            <div className="star-rating large-stars">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  disabled={busy}
                  onClick={() => vote(v)}
                  aria-label={t('voted', { n: n(v) })}
                >
                  <Star size={34} />
                  <span>{n(v)}</span>
                </button>
              ))}
            </div>
            {error && <p className="form-error">{error}</p>}
            <small>{t('separate')}</small>
          </div>
        </Modal>
      )}
    </div>
  );
}
