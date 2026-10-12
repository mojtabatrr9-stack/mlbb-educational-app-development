'use client';

import { normalizeSearch } from '@/i18n';
import { useFormat, useT } from '@/i18n/client';
import { totalStats } from '@/lib/calculations';
import { useStoredState } from '@/lib/client-stores';
import type { Catalog, Item, Stats } from '@/lib/types';
import { BATTLE_SPELLS, PLAYSTYLES, localizedHeroName } from '@/lib/types';
import {
  ArrowRight,
  Bookmark,
  Check,
  Coins,
  Info,
  Layers3,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { SmartImage } from '../smart-image';
import { EmptyState, ItemIcon, Modal, itemName, useApi } from '../ui';

type SavedBuild = { name: string; heroId: string; items: string[]; spell: string };
const STAT_KEYS: (keyof Stats)[] = [
  'hp',
  'mana',
  'physical_attack',
  'magic_power',
  'physical_defense',
  'magic_defense',
  'movement_speed',
];

export function BuildCalculator({
  catalog,
  initialHero,
  notify,
}: {
  catalog: Catalog;
  initialHero: string;
  notify: (message: string) => void;
}) {
  const t = useT('builds');
  const th = useT('hero.statsLabels');
  const tc = useT('common');
  const { c, n, locale, term } = useFormat();
  const api = useApi();
  const [heroId, setHeroId] = useState(
    catalog.heroes.some((h) => h.hero_id === initialHero)
      ? initialHero
      : catalog.heroes[0]?.hero_id || '',
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [type, setType] = useState('All');
  const [query, setQuery] = useState('');
  const [compare, setCompare] = useState(false);
  const [suggest, setSuggest] = useState(false);
  const [name, setName] = useState('');
  const [playstyle, setPlaystyle] = useState('Balanced');
  const [spell, setSpell] = useState('Retribution');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useStoredState<SavedBuild[]>('nexus-builds', []);
  const [showSaved, setShowSaved] = useState(false);

  const hero = catalog.heroes.find((h) => h.hero_id === heroId);
  if (!hero) return <EmptyState title={t('noHeroes')} description={t('noHeroesText')} />;
  const heroName = localizedHeroName(hero, locale);
  const recommended = catalog.builds.find((b) => b.hero_id === heroId);
  const stats = totalStats(hero, selected, catalog.items);
  const comparison = recommended ? totalStats(hero, recommended.items, catalog.items) : null;
  const cost = selected.reduce(
    (sum, id) => sum + (catalog.items.find((i) => i.item_id === id)?.cost || 0),
    0,
  );
  const q = normalizeSearch(query);
  const filtered = catalog.items.filter(
    (i) =>
      (type === 'All' || i.type === type) &&
      (!q || normalizeSearch(`${i.name} ${i.name_fa || ''}`).includes(q)),
  );
  const isBoots = (id: string) => catalog.items.find((i) => i.item_id === id)?.type === 'Boots';

  const toggle = (item: Item) => {
    setError('');
    if (selected.includes(item.item_id))
      return setSelected(selected.filter((id) => id !== item.item_id));
    if (selected.length >= 6) return notify(t('slotsFull'));
    if (item.type === 'Boots' && selected.some(isBoots)) return notify(t('oneBoots'));
    setSelected([...selected, item.item_id]);
  };
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/interactions', {
        kind: 'build',
        heroId,
        name,
        items: selected,
        spell,
        playstyle,
      });
      notify(data.message);
      setSuggest(false);
      setName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('unknown'));
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    if (!selected.length) return notify(t('addOne'));
    setSaved((current) =>
      [
        {
          name: t('loadoutName', { hero: heroName, n: n(current.length + 1) }),
          heroId,
          items: selected,
          spell,
        },
        ...current,
      ].slice(0, 20),
    );
    notify(t('savedLocally'));
  };
  const statLine = (key: keyof Stats) => `+${n(1)} ${th(key)}`.replace(`+${n(1)}`, '');

  return (
    <div className="build-workspace">
      <div className="tool-intro">
        <span className="tool-intro-icon">
          <Layers3 size={25} />
        </span>
        <div>
          <h2>{t('title')}</h2>
          <p>{t('subtitle')}</p>
        </div>
        <button className="button secondary compact" onClick={() => setShowSaved((v) => !v)}>
          <Bookmark size={15} />
          {t('savedBuilds')} <span>{n(saved.length)}</span>
        </button>
      </div>
      {showSaved && (
        <div className="saved-builds panel">
          <h3>{t('yourLoadouts')}</h3>
          {saved.length ? (
            saved.map((s, i) => (
              <div key={i}>
                <span>{s.name}</span>
                <button
                  className="text-link"
                  onClick={() => {
                    setHeroId(s.heroId);
                    setSelected(
                      s.items.filter((id) => catalog.items.some((item) => item.item_id === id)),
                    );
                    setSpell(s.spell);
                    setShowSaved(false);
                  }}
                >
                  {t('load')}
                  <ArrowRight size={14} className="icon-dir" />
                </button>
                <button
                  className="icon-button"
                  aria-label={t('deleteBuild', { name: s.name })}
                  onClick={() => setSaved((current) => current.filter((_, index) => index !== i))}
                >
                  <X size={14} />
                </button>
              </div>
            ))
          ) : (
            <p>{t('noSaved')}</p>
          )}
        </div>
      )}
      <div className="calculator-layout">
        <div className="calculator-main">
          <section className="loadout-panel panel">
            <div className="loadout-header">
              <SmartImage
                src={hero.image_url}
                alt=""
                width={48}
                height={49}
                fallbackLabel={hero.name}
                fallbackColor={hero.color}
              />
              <div>
                <span className="eyebrow">{t('chooseHero')}</span>
                <select
                  aria-label={t('buildHero')}
                  value={heroId}
                  onChange={(e) => {
                    setHeroId(e.target.value);
                    setSelected([]);
                    setCompare(false);
                    setSpell(
                      catalog.heroes.find((h) => h.hero_id === e.target.value)?.lane === 'Jungle'
                        ? 'Retribution'
                        : 'Flicker',
                    );
                  }}
                >
                  {catalog.heroes.map((h) => (
                    <option key={h.hero_id} value={h.hero_id}>
                      {localizedHeroName(h, locale)} · {term('roles', h.role)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setSelected([]);
                  setCompare(false);
                }}
                aria-label={t('reset')}
              >
                <RotateCcw size={17} />
              </button>
            </div>
            <div className="build-slots">
              {Array.from({ length: 6 }, (_, i) => {
                const item = catalog.items.find((v) => v.item_id === selected[i]);
                return (
                  <button
                    key={i}
                    className={`build-slot ${item ? 'filled' : ''}`}
                    title={
                      item ? t('removeItem', { name: itemName(item, locale) }) : t('chooseBelow')
                    }
                    onClick={() => {
                      if (item) setSelected(selected.filter((id) => id !== item.item_id));
                      else
                        document
                          .getElementById('item-library')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    {item ? (
                      <>
                        <ItemIcon item={item} />
                        <span>{itemName(item, locale)}</span>
                        <i>
                          <X size={12} />
                        </i>
                      </>
                    ) : (
                      <>
                        <span className="empty-slot">
                          <Plus size={22} />
                        </span>
                        <small>{t('slot', { n: n(i + 1) })}</small>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="loadout-footer">
              <span>
                <Coins size={16} />
                <strong>{n(cost)}</strong> {t('totalGold')}
              </span>
              <span>{t('slotsFilled', { count: n(selected.length) })}</span>
            </div>
            <div className="loadout-options">
              <label>
                {t('battleSpell')}
                <select value={spell} onChange={(e) => setSpell(e.target.value)}>
                  {BATTLE_SPELLS.map((s) => (
                    <option key={s} value={s}>
                      {term('spells', s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('playstyle')}
                <select value={playstyle} onChange={(e) => setPlaystyle(e.target.value)}>
                  {PLAYSTYLES.map((s) => (
                    <option key={s} value={s}>
                      {term('playstyles', s)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <section className="item-library panel" id="item-library">
            <div className="subsection-title">
              <h3>{t('itemLibrary')}</h3>
              <span>{t('itemCount', { count: n(catalog.items.length) })}</span>
            </div>
            <div className="item-filter-row">
              <div className="small-tabs">
                {['All', 'Weapon', 'Defense', 'Magic', 'Boots'].map((v) => (
                  <button key={v} className={type === v ? 'active' : ''} onClick={() => setType(v)}>
                    {t(`tabs.${v}`)}
                  </button>
                ))}
              </div>
              <label className="item-search">
                <Search size={15} />
                <input
                  aria-label={t('searchItems')}
                  placeholder={t('findItem')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="item-grid">
              {filtered.map((item) => (
                <button
                  className={`item-option ${selected.includes(item.item_id) ? 'selected' : ''}`}
                  key={item.item_id}
                  onClick={() => toggle(item)}
                  title={c(item.passive_effect)}
                >
                  <ItemIcon item={item} />
                  <div>
                    <strong>{itemName(item, locale)}</strong>
                    <span>
                      <Coins size={10} />
                      {n(item.cost)}
                    </span>
                    <small>
                      {Object.entries(item.stats)
                        .filter(([, v]) => v)
                        .map(([key, value]) => `+${n(value || 0)} ${th(key)}`)
                        .join(' · ') ||
                        c(item.passive_effect).slice(0, 60) ||
                        tc('unknown')}
                    </small>
                  </div>
                  <span className="item-add">
                    {selected.includes(item.item_id) ? <Check size={14} /> : <Plus size={14} />}
                  </span>
                </button>
              ))}
            </div>
            {!filtered.length && (
              <EmptyState icon={Search} title={t('noItems')} description={t('noItemsText')} />
            )}
          </section>
        </div>
        <aside className="build-summary panel">
          <span className="eyebrow">{t('numbersEyebrow')}</span>
          <h3>{t('finalStats')}</h3>
          <p>{t('finalStatsText')}</p>
          <div className="stat-summary">
            {STAT_KEYS.map((key) => {
              const value = stats[key];
              const base = hero.base_stats[key];
              const diff = comparison ? value - comparison[key] : 0;
              return (
                <div key={key}>
                  <span>{th(key)}</span>
                  <strong>
                    {n(value)}
                    {value > base && <small>+{n(value - base)}</small>}
                  </strong>
                  {compare && comparison && (
                    <em className={diff >= 0 ? 'positive' : 'negative'}>
                      {diff > 0 ? '+' : ''}
                      {n(diff)} <small>{t('vsRecommended')}</small>
                    </em>
                  )}
                </div>
              );
            })}
          </div>
          <label className="compare-toggle">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              disabled={!recommended}
            />
            <span />
            {t('compare')}
          </label>
          {recommended && (
            <button
              className="recommended-load"
              onClick={() => {
                setSelected(recommended.items);
                setSpell(recommended.battle_spell);
                notify(t('recommendedLoaded'));
              }}
            >
              <ShieldCheck size={17} />
              <span>
                {t('loadRecommended')}
                <small>{c(recommended.build_name)}</small>
              </span>
              <ArrowRight size={15} className="icon-dir" />
            </button>
          )}
          <div className="summary-actions">
            <button className="button primary full-width" onClick={save}>
              <Save size={16} />
              {t('saveBuild')}
            </button>
            <button
              className="button secondary full-width"
              disabled={selected.length !== 6}
              onClick={() => setSuggest(true)}
            >
              <Send size={15} className="icon-dir" />
              {t('suggest')}
            </button>
          </div>
          <p className="fine-print">
            <Info size={13} />
            {t('disclaimer')}
          </p>
        </aside>
      </div>
      {suggest && (
        <Modal title={t('suggestTitle')} onClose={() => setSuggest(false)}>
          <form
            className="simple-modal"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="modal-symbol">
              <Send size={27} className="icon-dir" />
            </div>
            <span className="eyebrow">{t('shareEyebrow')}</span>
            <h2>{t('worthSharing')}</h2>
            <p>{t('reviewNote', { hero: heroName })}</p>
            <label className="field-label">
              {t('buildName')}
              <input
                className="form-input"
                placeholder={t('buildNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={3}
                maxLength={80}
                required
                autoFocus
              />
            </label>
            <div className="suggest-items">
              {selected.map((id) => {
                const item = catalog.items.find((i) => i.item_id === id);
                return item ? <ItemIcon key={id} item={item} /> : null;
              })}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full-width" type="submit" disabled={busy}>
              {busy ? tc('submitting') : t('submitReview')}
              <ArrowRight size={16} className="icon-dir" />
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
