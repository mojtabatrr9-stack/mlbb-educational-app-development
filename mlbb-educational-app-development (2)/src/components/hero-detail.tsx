'use client';

import { useFormat, useT } from '@/i18n/client';
import { useStoredState } from '@/lib/client-stores';
import type { Catalog, Hero, Stats } from '@/lib/types';
import { hasTranslation, localizedHeroName } from '@/lib/types';
import {
  ArrowRight,
  Bookmark,
  Clock3,
  Droplet,
  Flag,
  Heart,
  Layers3,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { SmartImage } from './smart-image';
import {
  HeroMini,
  ItemIcon,
  Modal,
  QualityBadge,
  RoleIcon,
  SkillIcon,
  TranslationNotice,
  itemName,
  useApi,
} from './ui';

type Props = {
  hero: Hero;
  catalog: Catalog;
  onClose: () => void;
  openHero: (hero: Hero) => void;
  favorite: boolean;
  onFavorite: () => void;
  toBuild: (id: string) => void;
  notify: (text: string) => void;
};
type Comment = { id: string; content: string; createdAt: string };
const STAT_MAX: Record<string, number> = {
  hp: 3500,
  mana: 600,
  physical_attack: 200,
  magic_power: 200,
  physical_defense: 40,
  magic_defense: 40,
  movement_speed: 300,
};

function Radar({ stats }: { stats: Stats }) {
  const t = useT('hero.radar');
  const values = [
    Math.min(stats.hp / 3500, 1),
    Math.min(stats.physical_attack / 170, 1),
    Math.min((stats.magic_power + 40) / 100, 1),
    Math.min(stats.physical_defense / 30, 1),
    Math.min(stats.magic_defense / 30, 1),
    Math.min(stats.movement_speed / 300, 1),
  ];
  const labels = ['health', 'attack', 'magic', 'defense', 'resistance', 'mobility'];
  const point = (angle: number, r: number) =>
    `${130 + Math.sin(angle) * r},${120 - Math.cos(angle) * r}`;
  return (
    <svg className="radar-chart" viewBox="0 0 260 245" role="img" aria-label={t('label')}>
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon
          key={scale}
          points={values.map((_, i) => point((i * Math.PI) / 3, 85 * scale)).join(' ')}
          fill="none"
          stroke="#36313f"
          strokeWidth="1"
        />
      ))}
      {values.map((_, i) => (
        <line
          key={i}
          x1="130"
          y1="120"
          x2={130 + Math.sin((i * Math.PI) / 3) * 85}
          y2={120 - Math.cos((i * Math.PI) / 3) * 85}
          stroke="#36313f"
        />
      ))}
      <polygon
        points={values.map((v, i) => point((i * Math.PI) / 3, v * 85)).join(' ')}
        fill="#a37ae52d"
        stroke="#b290f4"
        strokeWidth="2"
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={130 + Math.sin((i * Math.PI) / 3) * v * 85}
          cy={120 - Math.cos((i * Math.PI) / 3) * v * 85}
          r="3"
          fill="#c4a8fc"
        />
      ))}
      {labels.map((l, i) => (
        <text
          key={l}
          x={130 + Math.sin((i * Math.PI) / 3) * 106}
          y={124 - Math.cos((i * Math.PI) / 3) * 105}
          textAnchor="middle"
          fill="#9d96a8"
          fontSize="9"
        >
          {t(l)}
        </text>
      ))}
    </svg>
  );
}

export default function HeroDetail({
  hero,
  catalog,
  onClose,
  openHero,
  favorite,
  onFavorite,
  toBuild,
  notify,
}: Props) {
  const t = useT('hero');
  const tc = useT('common');
  const { c, n, pct, date, term, locale } = useFormat();
  const api = useApi();
  const name = localizedHeroName(hero, locale);
  const [tab, setTab] = useState('overview');
  const [skillIndex, setSkillIndex] = useState(0);
  const [ratings, setRatings] = useStoredState<Record<string, number>>('nexus-ratings', {});
  const rating = ratings[hero.hero_id] || 0;
  const [average, setAverage] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState('');
  const [report, setReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadCommunity = () =>
    fetch(`/api/interactions?hero=${hero.hero_id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setComments(data.comments || []);
        setAverage(data.ratings?.average ? Number(data.ratings.average) : null);
        setTotal(data.ratings?.total || 0);
      })
      .catch(() => {});
  useEffect(() => {
    let active = true;
    fetch(`/api/interactions?hero=${hero.hero_id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !active) return;
        setComments(data.comments || []);
        setAverage(data.ratings?.average ? Number(data.ratings.average) : null);
        setTotal(data.ratings?.total || 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [hero.hero_id]);

  const vote = async (value: number) => {
    setBusy(true);
    setError('');
    try {
      const result = await api('/api/interactions', {
        kind: 'rating',
        heroId: hero.hero_id,
        rating: value,
      });
      setRatings((current) => ({ ...current, [hero.hero_id]: value }));
      notify(result.message);
      await loadCommunity();
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('unknown'));
    } finally {
      setBusy(false);
    }
  };
  const contribute = async (kind: 'comment' | 'report') => {
    setBusy(true);
    setError('');
    try {
      const result = await api('/api/interactions', {
        kind,
        heroId: hero.hero_id,
        content: kind === 'comment' ? comment : reportText,
      });
      notify(result.message);
      if (kind === 'comment') setComment('');
      else {
        setReport(false);
        setReportText('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('unknown'));
    } finally {
      setBusy(false);
    }
  };

  const skill = hero.skills[skillIndex];
  const recommended = catalog.builds.filter((b) => b.hero_id === hero.hero_id && b.is_approved);
  const counters = hero.counters
    .map((id) => catalog.heroes.find((h) => h.hero_id === id))
    .filter((h): h is Hero => !!h);
  const tabs = ['overview', 'skills', 'builds', 'counters', 'community'] as const;
  const pending =
    locale === 'fa' &&
    (!hasTranslation(hero.lore, 'fa') ||
      hero.skills.some((s) => !hasTranslation(s.description, 'fa')));
  const statsEstimated = hero.quality?.stats === 'estimated';

  return (
    <Modal title={t('guide', { name })} onClose={onClose} wide>
      <div className="detail-hero">
        <SmartImage
          src={hero.image_url}
          alt=""
          width={830}
          height={252}
          fallbackLabel={hero.name}
          fallbackColor={hero.color}
        />
        <div className="detail-hero-shade" />
        <div className="detail-hero-info">
          <div className="detail-meta">
            <span className="tier-badge">{t('tierBadge', { tier: term('tiers', hero.tier) })}</span>
            <span>
              <RoleIcon role={hero.role} />
              {term('roles', hero.role)}
            </span>
            <span>{t('lane', { lane: term('lanes', hero.lane) })}</span>
          </div>
          <h2>{name}</h2>
          <p>{c(hero.title) || (locale === 'fa' ? hero.name : '')}</p>
        </div>
        <button className={`button save-detail ${favorite ? 'saved' : ''}`} onClick={onFavorite}>
          <Bookmark size={16} fill={favorite ? 'currentColor' : 'none'} />
          {favorite ? t('saved') : t('saveHero')}
        </button>
      </div>
      <div className="detail-tabs" role="tablist">
        {tabs.map((id) => (
          <button
            role="tab"
            aria-selected={tab === id}
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>
      <div className="detail-body">
        {tab === 'overview' && (
          <>
            <TranslationNotice show={pending} />
            <div className="detail-intro">
              <div>
                <span className="eyebrow">{t('storyEyebrow')}</span>
                <h3>{c(hero.title) || name}</h3>
                <p>{c(hero.lore) || tc('none')}</p>
                <div className="detail-pills">
                  <span>
                    <Target size={14} />
                    {t('difficultyToMaster', { difficulty: term('difficulty', hero.difficulty) })}
                  </span>
                  {hero.win_rate > 0 && (
                    <span>
                      <TrendingUp size={14} />
                      {t('sampleWinRate', { rate: pct(hero.win_rate) })}
                    </span>
                  )}
                  {hero.last_verified && (
                    <span>
                      <Clock3 size={14} />
                      {tc('lastVerified', { date: date(hero.last_verified) })}
                    </span>
                  )}
                </div>
              </div>
              <Radar stats={hero.base_stats} />
            </div>
            <div className="subsection-title">
              <h3>{t('baseStats')}</h3>
              <span>
                {t('level1')} · <QualityBadge quality={hero.quality?.stats || 'editorial'} />
              </span>
            </div>
            {statsEstimated && <p className="translation-notice">{t('statsEstimated')}</p>}
            <div className="base-stats">
              {Object.entries(hero.base_stats).map(([key, value]) => (
                <div key={key}>
                  <span>{t(`statsLabels.${key}`)}</span>
                  <strong>{n(value)}</strong>
                  <div>
                    <i style={{ width: `${Math.min(100, (value / STAT_MAX[key]) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="detail-tip">
              <Sparkles size={21} />
              <div>
                <strong>{t('nextStep')}</strong>
                <p>{t('nextStepText', { name })}</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setTab('skills')}
                aria-label={t('exploreSkills')}
              >
                <ArrowRight size={20} className="icon-dir" />
              </button>
            </div>
          </>
        )}
        {tab === 'skills' && (
          <>
            <div className="subsection-title">
              <h3>{t('learnToolkit')}</h3>
              <span>
                {t('timing')} · <QualityBadge quality={hero.quality?.skills || 'editorial'} />
              </span>
            </div>
            <TranslationNotice
              show={locale === 'fa' && !!skill && !hasTranslation(skill.description, 'fa')}
            />
            <div className="skill-pickers">
              {hero.skills.map((s, i) => (
                <button
                  className={`skill-picker ${i === skillIndex ? 'active' : ''}`}
                  key={i}
                  onClick={() => setSkillIndex(i)}
                >
                  <span>
                    {s.icon_url ? (
                      <SkillIcon src={s.icon_url} label={c(s.skill_name)} size={58} />
                    ) : i === 0 ? (
                      <Sparkles size={25} />
                    ) : s.skill_type === 'Ultimate' ? (
                      <Zap size={25} />
                    ) : (
                      <Target size={25} />
                    )}
                  </span>
                  <small>{term('skillTypes', s.skill_type)}</small>
                </button>
              ))}
            </div>
            {skill && (
              <div className="skill-detail">
                <span className="eyebrow">
                  {t('skillMeta', {
                    type: term('skillTypes', skill.skill_type),
                    damage: term('damage', skill.damage_type),
                  })}
                </span>
                <h3>{c(skill.skill_name)}</h3>
                <div className="skill-costs">
                  <span>
                    <Clock3 size={15} />
                    {t('cooldown', {
                      value:
                        skill.cooldown === null || skill.cooldown === undefined
                          ? tc('none')
                          : `${n(skill.cooldown)}s`,
                    })}
                  </span>
                  <span>
                    <Droplet size={15} />
                    {t('cost', {
                      value:
                        skill.mana_cost === null || skill.mana_cost === undefined
                          ? tc('none')
                          : n(skill.mana_cost),
                    })}
                  </span>
                  {skill.tags?.map((tag) => (
                    <span key={tag} className="subtle-badge">
                      {tag}
                    </span>
                  ))}
                </div>
                <p style={{ whiteSpace: 'pre-line' }}>{c(skill.description)}</p>
                {c(skill.notes) && (
                  <p className="muted-text" style={{ marginTop: 12 }}>
                    {c(skill.notes)}
                  </p>
                )}
              </div>
            )}
            <p className="fine-print">{t('skillDisclaimer')}</p>
          </>
        )}
        {tab === 'builds' && (
          <>
            <div className="subsection-title">
              <h3>{t('recommendedLoadouts')}</h3>
              <span>
                <ShieldCheck size={14} />
                {t('adminApproved')}
              </span>
            </div>
            {recommended.length ? (
              recommended.map((b) => (
                <div className="recommended-build" key={b.build_id}>
                  <div>
                    <h3>{c(b.build_name)}</h3>
                    <span className="subtle-badge">{term('playstyles', b.playstyle)}</span>
                  </div>
                  <div className="build-item-row">
                    {b.items.map((id, i) => {
                      const item = catalog.items.find((v) => v.item_id === id);
                      return item ? (
                        <div
                          key={i}
                          title={`${itemName(item, locale)} · ${n(item.cost)} ${tc('gold')}`}
                        >
                          <ItemIcon item={item} />
                          <span>{itemName(item, locale)}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="build-extra">
                    <span>
                      <Sparkles size={14} />
                      {t('emblem', { type: term('emblems', b.emblems.type || '') })}
                    </span>
                    <span>
                      <Zap size={14} />
                      {term('spells', b.battle_spell)}
                    </span>
                    <QualityBadge quality={b.quality} />
                  </div>
                </div>
              ))
            ) : (
              <p>{t('noBuild')}</p>
            )}
            <button className="button primary" onClick={() => toBuild(hero.hero_id)}>
              <Layers3 size={16} />
              {t('openCalculator')}
              <ArrowRight size={16} className="icon-dir" />
            </button>
            <p className="fine-print">{t('buildDisclaimer')}</p>
          </>
        )}
        {tab === 'counters' && (
          <>
            <span className="eyebrow">{t('draftEyebrow')}</span>
            <h3>{t('countersTitle', { name })}</h3>
            <p className="muted-text">{t('countersText', { name })}</p>
            <div className="counter-detail-list">
              {counters.length ? (
                counters.map((h, i) => (
                  <div key={h.hero_id}>
                    <span className="counter-number">0{i + 1}</span>
                    <HeroMini hero={h} onClick={() => openHero(h)} />
                    <button className="button secondary compact" onClick={() => toBuild(h.hero_id)}>
                      {t('viewBuild')}
                      <ArrowRight size={14} className="icon-dir" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted-text">{t('noCounters')}</p>
              )}
            </div>
          </>
        )}
        {tab === 'community' && (
          <>
            <div className="community-rating">
              <div>
                <span className="eyebrow">{t('communityEyebrow')}</span>
                <h3>{t('howStrong', { name })}</h3>
                <p>
                  {average
                    ? t('ratingSummary', {
                        average: n(average, { maximumFractionDigits: 1 }),
                        total: n(total),
                      })
                    : t('beFirst')}
                </p>
              </div>
              <div>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      disabled={busy}
                      aria-label={t('rate', { n: n(v) })}
                      key={v}
                      className={rating >= v ? 'filled' : ''}
                      onClick={() => vote(v)}
                    >
                      <Star size={24} fill={rating >= v ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
                <small>{rating ? t('yourVote', { n: n(rating) }) : t('tapToVote')}</small>
              </div>
            </div>
            <div className="comments-section">
              <h3>
                <MessageSquare size={19} />
                {t('discussion')} <span className="count-badge">{n(comments.length)}</span>
              </h3>
              {comments.length ? (
                comments.map((cm) => (
                  <div className="comment" key={cm.id}>
                    <span className="comment-avatar">
                      <Heart size={16} />
                    </span>
                    <div>
                      <strong>
                        {t('communityPlayer')} <time>{date(cm.createdAt)}</time>
                      </strong>
                      <p>{cm.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="comments-empty">{t('startDiscussion')}</div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  contribute('comment');
                }}
              >
                <textarea
                  className="form-input"
                  placeholder={t('commentPlaceholder')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  minLength={5}
                  maxLength={2000}
                  required
                />
                <div className="comment-form-footer">
                  <small>
                    <ShieldCheck size={13} />
                    {t('commentsReviewed')}
                  </small>
                  <button
                    className="button primary compact"
                    disabled={busy || comment.trim().length < 5}
                    type="submit"
                  >
                    {busy ? tc('submitting') : t('postComment')}
                    <Send size={14} className="icon-dir" />
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="detail-footer">
          <span>
            <ShieldCheck size={13} />
            {t('curatedContent')}
          </span>
          <button onClick={() => setReport((v) => !v)}>
            <Flag size={13} />
            {t('report')}
          </button>
        </div>
        {report && (
          <form
            className="report-form"
            onSubmit={(e) => {
              e.preventDefault();
              contribute('report');
            }}
          >
            <h4>{t('reportTitle')}</h4>
            <textarea
              className="form-input"
              placeholder={t('reportPlaceholder')}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              minLength={5}
              maxLength={2000}
              required
            />
            <button className="button secondary compact" disabled={busy} type="submit">
              {busy ? tc('sending') : t('submitReport')}
              <Flag size={14} />
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
