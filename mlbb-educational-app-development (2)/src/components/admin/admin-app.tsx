'use client';

import { useFormat, useT } from '@/i18n/client';
import type { Build, Catalog, Guide, Hero, Item } from '@/lib/types';
import { localizedHeroName, tx } from '@/lib/types';
import { missingTranslations } from '@/lib/validation';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Crown,
  Edit3,
  Eye,
  Flag,
  Gem,
  Languages,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { LanguageButton } from '../app/topbar';
import { SmartImage } from '../smart-image';
import { Brand, EmptyState, ItemIcon, Modal, itemName, useApi } from '../ui';
import { AdminAi } from './admin-ai';
import { AdminEditor, idOf, type RecordData, type Resource } from './admin-editor';

type View = 'dashboard' | Resource | 'review' | 'ai' | 'translations';
type Interaction = {
  id: string;
  heroId: string | null;
  content: string;
  approved: boolean;
  createdAt: string;
  kind: string;
};
type Dashboard = {
  active: number;
  votes: number;
  popular: Array<{ heroId: string; count: number }>;
  pending: Array<{ id: string; data: Build }>;
  reports: Interaction[];
  comments: Interaction[];
};
const VIEWS: Array<{ id: View; icon: LucideIcon }> = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'heroes', icon: Swords },
  { id: 'items', icon: Gem },
  { id: 'builds', icon: Layers3 },
  { id: 'guides', icon: BookOpen },
  { id: 'translations', icon: Languages },
  { id: 'review', icon: MessageSquare },
  { id: 'ai', icon: Sparkles },
];
const RESOURCES: Resource[] = ['heroes', 'items', 'builds', 'guides'];
const zeroStats = {
  hp: 2500,
  mana: 450,
  physical_attack: 120,
  magic_power: 0,
  physical_defense: 18,
  magic_defense: 15,
  movement_speed: 250,
};

function newRecord(resource: Resource, catalog: Catalog): RecordData {
  const id = `new-${Date.now().toString(36)}`;
  const L = { en: '', fa: '' };
  if (resource === 'heroes')
    return {
      hero_id: id,
      name: '',
      name_fa: '',
      title: L,
      role: 'Fighter',
      lane: 'Exp',
      image_url: '',
      lore: L,
      base_stats: { ...zeroStats },
      skills: [],
      counters: [],
      best_builds: [],
      tier: 'Unrated',
      difficulty: 'Medium',
      win_rate: 0,
      pick_rate: 0,
      featured: false,
      color: '#a28acb',
      quality: { stats: 'editorial', skills: 'editorial', lane: 'editorial', tier: 'editorial' },
      last_verified: new Date().toISOString().slice(0, 10),
    };
  if (resource === 'items')
    return {
      item_id: id,
      name: '',
      name_fa: '',
      type: 'Weapon',
      image_url: '',
      cost: 2000,
      stats: {},
      passive_effect: L,
      active_effect: L,
      color: '#ac8acb',
      icon: 'sword',
      quality: 'editorial',
    };
  if (resource === 'builds')
    return {
      build_id: id,
      hero_id: catalog.heroes[0]?.hero_id || '',
      build_name: L,
      items: [],
      emblems: { type: 'Assassin', talent: '' },
      battle_spell: 'Flicker',
      playstyle: 'Balanced',
      created_by: 'admin',
      is_approved: true,
      quality: 'editorial',
    };
  return {
    guide_id: id,
    title: L,
    category: 'Basic',
    content: L,
    video_url: '',
    author: 'Nexus Academy',
    created_at: new Date().toISOString(),
    read_time: 5,
    image_url: '',
    description: L,
    patch_version: '',
  };
}

export default function AdminApp({
  initialCatalog,
  initialAuthorized,
  configured,
}: {
  initialCatalog: Catalog;
  initialAuthorized: boolean;
  configured: boolean;
}) {
  const t = useT('admin');
  const tc = useT('common');
  const { locale, c, n, date, term } = useFormat();
  const api = useApi();
  const [catalog, setCatalog] = useState(initialCatalog);
  const [authorized, setAuthorized] = useState(initialAuthorized);
  const [view, setView] = useState<View>('dashboard');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [login, setLogin] = useState(false);
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<{
    resource: Resource;
    record: RecordData;
    creating: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState<{ resource: Resource; record: RecordData } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [credentials, setCredentials] = useState({ email: '', password: '', code: '' });
  const [reviewTab, setReviewTab] = useState<'Builds' | 'Comments' | 'Reports'>('Builds');
  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    fetch('/api/admin/dashboard', { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (active) setDashboard(data);
      })
      .catch(() => active && notify(t('toasts.analyticsFailed')));
    return () => {
      active = false;
    };
  }, [authorized, notify, t]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const refresh = async () => {
    const r = await fetch('/api/catalog', { cache: 'no-store' });
    if (!r.ok) throw new Error(t('toasts.refreshFailed'));
    setCatalog(await r.json());
    if (authorized) {
      const d = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      if (d.ok) setDashboard(await d.json());
    }
  };
  const nameOf = (resource: Resource, data: RecordData) =>
    resource === 'heroes'
      ? localizedHeroName(data as Hero, locale)
      : resource === 'items'
        ? itemName(data as Item, locale)
        : resource === 'builds'
          ? c((data as Build).build_name)
          : c((data as Guide).title);
  const startEdit = (resource: Resource, record: RecordData | null) => {
    setError('');
    setEditor({
      resource,
      creating: !record,
      record: record ? JSON.parse(JSON.stringify(record)) : newRecord(resource, catalog),
    });
  };
  const save = async () => {
    if (!editor) return;
    if (!authorized) return setLogin(true);
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/${editor.resource}`, editor.record);
      await refresh();
      setEditor(null);
      notify(t('toasts.saved'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('unknown'));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setError('');
    try {
      await api(
        `/api/admin/${deleting.resource}?id=${encodeURIComponent(idOf(deleting.resource, deleting.record))}`,
        undefined,
        'DELETE',
      );
      await refresh();
      setDeleting(null);
      notify(t('toasts.deleted'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('unknown'));
    } finally {
      setBusy(false);
    }
  };
  const signIn = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/api/auth', credentials);
      setAuthorized(true);
      setLogin(false);
      setCredentials({ email: '', password: '', code: '' });
      notify(t('login.welcome'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('unknown'));
    } finally {
      setBusy(false);
    }
  };
  const signOut = async () => {
    try {
      await api('/api/auth', undefined, 'DELETE');
      setAuthorized(false);
      setDashboard(null);
      setEditor(null);
      notify(t('login.signedOut'));
    } catch (e) {
      notify(e instanceof Error ? e.message : tc('unknown'));
    }
  };
  const moderate = async (id: string, kind: string, action: 'approve' | 'reject') => {
    setBusy(true);
    try {
      await api('/api/admin/moderate', { id, kind, action });
      await refresh();
      notify(action === 'approve' ? t('toasts.approved') : t('toasts.removed'));
    } catch (e) {
      notify(e instanceof Error ? e.message : tc('unknown'));
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File | undefined, apply: (url: string) => void) => {
    if (!file) return;
    if (!authorized) return setError(t('editor.signInToSave'));
    setUploading(true);
    setError('');
    try {
      const session = await fetch('/api/session', { cache: 'no-store' }).then((r) => r.json());
      const form = new FormData();
      form.append('file', file);
      const r = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-csrf-token': session.csrf },
        body: form,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      apply(data.url);
      notify(t('toasts.uploaded'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tc('unknown'));
    } finally {
      setUploading(false);
    }
  };
  const feature = async (hero: Hero) => {
    if (!authorized) return setLogin(true);
    try {
      await api('/api/admin/heroes', { ...hero, featured: true });
      await refresh();
      notify(t('toasts.featured', { name: localizedHeroName(hero, locale) }));
    } catch (e) {
      notify(e instanceof Error ? e.message : tc('unknown'));
    }
  };

  const rows: RecordData[] =
    view === 'heroes'
      ? catalog.heroes
      : view === 'items'
        ? catalog.items
        : view === 'builds'
          ? catalog.builds
          : view === 'guides'
            ? catalog.guides
            : [];
  const isResource = RESOURCES.includes(view as Resource);
  const q = query.toLowerCase();
  const visible = isResource
    ? rows.filter((row) =>
        `${nameOf(view as Resource, row)} ${idOf(view as Resource, row)}`.toLowerCase().includes(q),
      )
    : [];
  const missingAll = RESOURCES.flatMap((resource) =>
    (resource === 'heroes'
      ? catalog.heroes
      : resource === 'items'
        ? catalog.items
        : resource === 'builds'
          ? catalog.builds
          : catalog.guides
    )
      .map((record) => ({
        resource,
        record: record as RecordData,
        fields: missingTranslations(resource, record as RecordData),
      }))
      .filter((x) => x.fields.length),
  );
  const missingCount = missingAll.reduce((sum, x) => sum + x.fields.length, 0);
  const openReports = dashboard?.reports.filter((r) => !r.approved) || [];

  return (
    <div className="admin-shell">
      <aside aria-label={t('ownerWorkspace')} className="admin-sidebar">
        <Brand />
        <span className="admin-badge">{t('ownerWorkspace')}</span>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            className={`nav-item ${view === v.id ? 'active' : ''}`}
            onClick={() => {
              setView(v.id);
              setQuery('');
              setError('');
            }}
          >
            <v.icon size={18} />
            <span>{t(`nav.${v.id}`)}</span>
            {v.id === 'review' && dashboard && dashboard.pending.length > 0 && (
              <span className="count-badge">{n(dashboard.pending.length)}</span>
            )}
            {v.id === 'translations' && missingCount > 0 && (
              <span className="count-badge">{n(missingCount)}</span>
            )}
          </button>
        ))}
        <Link className="admin-back" href={`/${locale}`}>
          <ArrowLeft size={16} className="icon-dir" />
          {t('backToPlaybook')}
        </Link>
      </aside>
      <main className="admin-content">
        <header className="admin-header">
          <div>
            <span className="eyebrow">{t('controlRoom')}</span>
            <h1>{t(`nav.${view}`)}</h1>
            <p>{t('subtitle')}</p>
          </div>
          <div className="admin-header-actions">
            <LanguageButton />
            <Link href={`/${locale}`} className="button secondary compact">
              <Eye size={14} />
              {t('publicApp')}
            </Link>
            {authorized ? (
              <button className="button secondary compact" onClick={signOut}>
                <LogOut size={14} />
                {t('signOut')}
              </button>
            ) : (
              <button
                className="button primary compact"
                onClick={() => {
                  setLogin(true);
                  setError('');
                }}
              >
                <LockKeyhole size={14} />
                {t('signIn')}
              </button>
            )}
          </div>
        </header>
        {!authorized && (
          <div className="preview-banner">
            <Eye size={18} />
            <span>
              <strong>{t('previewTitle')}</strong> {t('previewText')}
            </span>
            <button
              onClick={() => {
                setLogin(true);
                setError('');
              }}
            >
              {t('signIn')}
            </button>
          </div>
        )}

        {view === 'dashboard' && (
          <>
            <div className="admin-stats">
              <StatCard
                icon={<Swords size={15} />}
                label={t('stats.heroes')}
                value={n(catalog.heroes.length)}
                foot={t('stats.heroesFoot')}
              />
              <StatCard
                icon={<Users size={15} />}
                label={t('stats.active')}
                value={dashboard ? n(dashboard.active) : tc('none')}
                foot={t('stats.activeFoot')}
              />
              <StatCard
                icon={<Layers3 size={15} />}
                label={t('stats.pending')}
                value={dashboard ? n(dashboard.pending.length) : tc('none')}
                foot={t('stats.pendingFoot')}
              />
              <StatCard
                icon={<Languages size={15} />}
                label={t('stats.missingFa')}
                value={n(missingCount)}
                foot={t('stats.missingFaFoot')}
              />
            </div>
            <div className="admin-dashboard-grid">
              <section className="panel">
                <h2>{t('startTitle')}</h2>
                <div className="admin-quick-actions">
                  <button onClick={() => startEdit('heroes', null)}>
                    <Swords size={21} />
                    {t('addHero')}
                    <small>{t('addHeroText')}</small>
                  </button>
                  <button onClick={() => startEdit('guides', null)}>
                    <BookOpen size={21} />
                    {t('writeGuide')}
                    <small>{t('writeGuideText')}</small>
                  </button>
                  <button onClick={() => setView('review')}>
                    <MessageSquare size={21} />
                    {t('reviewContributions')}
                    <small>{t('reviewText')}</small>
                  </button>
                  <button onClick={() => setView('ai')}>
                    <Sparkles size={21} />
                    {t('meetAssistant')}
                    <small>{t('assistantText')}</small>
                  </button>
                </div>
              </section>
              <section className="panel">
                <h2>{t('mostExplored')}</h2>
                {!authorized ? (
                  <EmptyState
                    icon={LockKeyhole}
                    title={t('privateEyes')}
                    description={t('privateText')}
                  />
                ) : dashboard?.popular.length ? (
                  dashboard.popular.map((p) => {
                    const h = catalog.heroes.find((x) => x.hero_id === p.heroId);
                    return h ? (
                      <div className="admin-popular-row" key={p.heroId}>
                        <SmartImage
                          src={h.image_url}
                          alt=""
                          width={35}
                          height={36}
                          fallbackLabel={h.name}
                          fallbackColor={h.color}
                        />
                        <span>{localizedHeroName(h, locale)}</span>
                        <strong>{t('visits', { count: n(p.count) })}</strong>
                      </div>
                    ) : null;
                  })
                ) : (
                  <EmptyState
                    icon={BarChart3}
                    title={t('noVisits')}
                    description={t('noVisitsText')}
                  />
                )}
              </section>
            </div>
            <div className="info-callout">
              <ShieldCheck size={22} />
              <p>
                <strong>{t('protectedTitle')}</strong>
                {t('protectedText')}
              </p>
            </div>
          </>
        )}

        {isResource && (
          <>
            <div className="admin-toolbar">
              <label className="hero-search">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchIn', { view: t(`nav.${view}`) })}
                  aria-label={t('searchIn', { view: t(`nav.${view}`) })}
                />
              </label>
              <button
                className="button primary compact"
                onClick={() => startEdit(view as Resource, null)}
              >
                <Plus size={15} />
                {t('add', { kind: t(`kinds.${view}`) })}
              </button>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t(view === 'guides' ? 'columns.guide' : 'columns.content')}</th>
                  <th>
                    {t(
                      view === 'heroes'
                        ? 'columns.roleLane'
                        : view === 'items'
                          ? 'columns.type'
                          : view === 'guides'
                            ? 'columns.category'
                            : 'columns.hero',
                    )}
                  </th>
                  <th>{t(view === 'items' ? 'columns.cost' : 'columns.status')}</th>
                  <th>{t('columns.translation')}</th>
                  <th>{t('columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 300).map((row) => {
                  const resource = view as Resource;
                  const name = nameOf(resource, row);
                  const missing = missingTranslations(resource, row).length;
                  return (
                    <tr key={idOf(resource, row)}>
                      <td>
                        <div>
                          {resource === 'heroes' ? (
                            <SmartImage
                              src={(row as Hero).image_url}
                              alt=""
                              width={40}
                              height={42}
                              fallbackLabel={(row as Hero).name}
                              fallbackColor={(row as Hero).color}
                            />
                          ) : resource === 'items' ? (
                            <ItemIcon item={row as Item} size="small" />
                          ) : resource === 'guides' ? (
                            <BookOpen size={20} />
                          ) : (
                            <Layers3 size={20} />
                          )}
                          <span>
                            {name}
                            <small>
                              {resource === 'heroes'
                                ? tx((row as Hero).title, locale) || (row as Hero).name
                                : idOf(resource, row)}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>
                        {resource === 'heroes'
                          ? `${term('roles', (row as Hero).role)} · ${term('lanes', (row as Hero).lane)}`
                          : resource === 'items'
                            ? term('itemTypes', (row as Item).type)
                            : resource === 'guides'
                              ? term('categories', (row as Guide).category)
                              : localizedHeroName(
                                  catalog.heroes.find(
                                    (h) => h.hero_id === (row as Build).hero_id,
                                  ) || { name: (row as Build).hero_id },
                                  locale,
                                )}
                      </td>
                      <td>
                        {resource === 'items' ? (
                          `${n((row as Item).cost)} ${tc('gold')}`
                        ) : resource === 'heroes' && (row as Hero).featured ? (
                          <span className="subtle-badge">{t('heroOfWeek')}</span>
                        ) : (
                          <span className="subtle-badge">{t('published')}</span>
                        )}
                      </td>
                      <td>
                        {missing ? (
                          <span className="subtle-badge missing-badge">
                            {t('faMissing', { count: n(missing) })}
                          </span>
                        ) : (
                          <span className="subtle-badge">{t('faComplete')}</span>
                        )}
                      </td>
                      <td>
                        {resource === 'heroes' && (
                          <button
                            className="icon-button"
                            onClick={() => feature(row as Hero)}
                            aria-label={t('feature', { name })}
                            title={t('setHeroOfWeek')}
                          >
                            <Crown size={16} />
                          </button>
                        )}
                        <button
                          className="icon-button"
                          onClick={() => startEdit(resource, row)}
                          aria-label={t('edit', { name })}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="icon-button danger"
                          disabled={!authorized}
                          onClick={() => {
                            setError('');
                            setDeleting({ resource, record: row });
                          }}
                          aria-label={t('deleteItem', { name })}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!visible.length && (
              <EmptyState
                icon={Search}
                title={t('nothingMatched')}
                description={t('nothingMatchedText')}
              />
            )}
          </>
        )}

        {view === 'translations' && (
          <>
            <div className="tool-intro">
              <span className="tool-intro-icon">
                <Languages size={25} />
              </span>
              <div>
                <h2>{t('translations.title')}</h2>
                <p>{t('translations.subtitle')}</p>
              </div>
              <span className="count-badge">{n(missingCount)}</span>
            </div>
            {missingAll.length ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('columns.content')}</th>
                    <th>{t('translations.field')}</th>
                    <th>{t('columns.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {missingAll.slice(0, 400).map(({ resource, record, fields }) => (
                    <tr key={`${resource}-${idOf(resource, record)}`}>
                      <td>
                        <div>
                          <span>
                            {nameOf(resource, record)}
                            <small>{t(`kinds.${resource}`)}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <code dir="ltr">{fields.slice(0, 4).join(', ')}</code>
                        {fields.length > 4 && ` +${n(fields.length - 4)}`}
                      </td>
                      <td>
                        <button
                          className="button secondary compact"
                          onClick={() => startEdit(resource, record)}
                        >
                          <Edit3 size={14} />
                          {t('translations.open')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState icon={Check} title={t('translations.complete')} description="" />
            )}
          </>
        )}

        {view === 'review' &&
          (!authorized ? (
            <EmptyState
              icon={LockKeyhole}
              title={t('reviewPrivate')}
              description={t('reviewPrivateText')}
              action={
                <button className="button primary" onClick={() => setLogin(true)}>
                  {t('signIn')}
                  <ArrowRight size={15} className="icon-dir" />
                </button>
              }
            />
          ) : (
            <>
              <div className="small-tabs admin-review-tabs">
                {(['Builds', 'Comments', 'Reports'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setReviewTab(tab)}
                    className={reviewTab === tab ? 'active' : ''}
                  >
                    {t(`reviewTabs.${tab}`)}{' '}
                    <span>
                      {n(
                        tab === 'Builds'
                          ? dashboard?.pending.length || 0
                          : tab === 'Comments'
                            ? dashboard?.comments.filter((x) => !x.approved).length || 0
                            : openReports.length,
                      )}
                    </span>
                  </button>
                ))}
              </div>
              {reviewTab === 'Builds' ? (
                dashboard?.pending.length ? (
                  dashboard.pending.map((b) => (
                    <div className="panel review-card" key={b.id}>
                      <div className="review-card-header">
                        <h3>{c(b.data.build_name)}</h3>
                        <span className="subtle-badge">{t('pendingApproval')}</span>
                      </div>
                      <p>
                        {localizedHeroName(
                          catalog.heroes.find((h) => h.hero_id === b.data.hero_id) || {
                            name: b.data.hero_id,
                          },
                          locale,
                        )}{' '}
                        · {term('playstyles', b.data.playstyle)} ·{' '}
                        {term('spells', b.data.battle_spell)}
                      </p>
                      <div className="suggest-items">
                        {b.data.items.map((id) => {
                          const item = catalog.items.find((i) => i.item_id === id);
                          return item ? (
                            <span key={id} title={itemName(item, locale)}>
                              <ItemIcon item={item} />
                            </span>
                          ) : null;
                        })}
                      </div>
                      <div className="review-actions">
                        <button
                          className="button secondary compact"
                          onClick={() => moderate(b.id, 'build', 'reject')}
                          disabled={busy}
                        >
                          <X size={14} />
                          {t('reject')}
                        </button>
                        <button
                          className="button primary compact"
                          onClick={() => moderate(b.id, 'build', 'approve')}
                          disabled={busy}
                        >
                          <Check size={14} />
                          {t('approveBuild')}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState icon={Check} title={t('allCaughtUp')} description={t('noBuilds')} />
                )
              ) : (
                (() => {
                  const list =
                    (reviewTab === 'Comments' ? dashboard?.comments : dashboard?.reports)?.filter(
                      (r) => !r.approved,
                    ) || [];
                  return list.length ? (
                    list.map((r) => (
                      <div className="panel review-card" key={r.id}>
                        <div className="review-card-header">
                          <h3>
                            {r.heroId
                              ? localizedHeroName(
                                  catalog.heroes.find((h) => h.hero_id === r.heroId) || {
                                    name: r.heroId,
                                  },
                                  locale,
                                )
                              : t('libraryFeedback')}
                          </h3>
                          <small>{date(r.createdAt)}</small>
                        </div>
                        <p>{r.content}</p>
                        <div className="review-actions">
                          <button
                            className="button secondary compact"
                            onClick={() => moderate(r.id, r.kind, 'reject')}
                            disabled={busy}
                          >
                            <Trash2 size={14} />
                            {t('dismissItem')}
                          </button>
                          <button
                            className="button primary compact"
                            onClick={() => moderate(r.id, r.kind, 'approve')}
                            disabled={busy}
                          >
                            <Check size={14} />
                            {reviewTab === 'Comments' ? t('publishComment') : t('markResolved')}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={reviewTab === 'Reports' ? Flag : Check}
                      title={t('allCaughtUp')}
                      description={t('noItemsOfKind', { kind: t(`reviewTabs.${reviewTab}`) })}
                    />
                  );
                })()
              )}
            </>
          ))}

        {view === 'ai' && <AdminAi authorized={authorized} notify={notify} />}
      </main>

      {login && (
        <Modal title={t('signIn')} onClose={() => setLogin(false)}>
          <form
            className="simple-modal login-form"
            onSubmit={(e) => {
              e.preventDefault();
              signIn();
            }}
          >
            <Brand />
            <span className="eyebrow">{t('login.eyebrow')}</span>
            <h2>{t('login.title')}</h2>
            <p>{t('login.text')}</p>
            {!configured && (
              <div className="info-callout">
                <LockKeyhole size={19} />
                <p>
                  <strong>{t('login.notConfigured')}</strong>
                  {t('login.notConfiguredText')}
                </p>
              </div>
            )}
            <label className="field-label">
              {t('login.email')}
              <input
                className="form-input"
                dir="ltr"
                type="email"
                autoComplete="username"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                placeholder="owner@example.com"
                required
              />
            </label>
            <label className="field-label">
              {t('login.password')}
              <input
                className="form-input"
                dir="ltr"
                type="password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
                maxLength={256}
                placeholder={t('login.passwordPlaceholder')}
              />
            </label>
            <label className="field-label">
              {t('login.code')}
              <input
                className="form-input otp-input"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={credentials.code}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    code: e.target.value.replace(/\D/g, '').slice(0, 6),
                  })
                }
                pattern="[0-9]{6}"
                placeholder="000000"
                required
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full-width" disabled={busy} type="submit">
              {busy ? tc('verifying') : t('login.unlock')}
              <ArrowRight size={16} className="icon-dir" />
            </button>
            <div className="login-security">
              <ShieldCheck size={14} />
              {t('login.secure')}
            </div>
          </form>
        </Modal>
      )}
      {editor && (
        <AdminEditor
          resource={editor.resource}
          record={editor.record}
          creating={editor.creating}
          catalog={catalog}
          authorized={authorized}
          busy={busy}
          error={error}
          uploading={uploading}
          notify={notify}
          onChange={(record) => setEditor({ ...editor, record })}
          onSave={save}
          onClose={() => setEditor(null)}
          onUpload={upload}
        />
      )}
      {deleting && (
        <Modal title={t('deleteTitle')} onClose={() => setDeleting(null)}>
          <div className="simple-modal delete-modal">
            <div className="modal-symbol">
              <Trash2 size={25} />
            </div>
            <span className="eyebrow">{t('doubleCheck')}</span>
            <h2>{t('deleteQuestion', { name: nameOf(deleting.resource, deleting.record) })}</h2>
            <p>{t('deleteText')}</p>
            {error && <p className="form-error">{error}</p>}
            <button className="button secondary" onClick={() => setDeleting(null)}>
              {t('keep')}
            </button>
            <button className="button danger-button" onClick={remove} disabled={busy}>
              {busy ? tc('deleting') : t('deletePermanently')}
              <Trash2 size={14} />
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={17} />
          </span>
          {toast}
          <button onClick={() => setToast('')} aria-label={tc('dismiss')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  foot,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  foot: string;
}) {
  return (
    <div className="admin-stat">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
      <small>{foot}</small>
    </div>
  );
}
