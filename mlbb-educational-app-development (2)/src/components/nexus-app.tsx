'use client';

import { useFormat, useT } from '@/i18n/client';
import { setHash, useHash, useOnline, useStoredState } from '@/lib/client-stores';
import type { Catalog, Guide, Hero, Section } from '@/lib/types';
import { Check, ChevronDown, ShieldCheck, Wifi, WifiOff, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AboutDialog, ProfileDialog } from './app/dialogs';
import { EMPTY_FILTERS, HeroLibrary, useFilteredHeroes, type Filters } from './app/hero-library';
import { Banner, DiscoveryAside } from './app/overview';
import { SECTIONS, Sidebar } from './app/sidebar';
import { Topbar } from './app/topbar';
import HeroDetail from './hero-detail';
import { OFFLINE_READY_EVENT } from './service-worker-manager';
import { Brand, useApi } from './ui';
import {
  BuildCalculator,
  CounterPicker,
  GameTools,
  GuideArticle,
  GuidesLibrary,
  TierList,
} from './workspaces';

export default function NexusApp({ initialCatalog }: { initialCatalog: Catalog }) {
  const t = useT();
  const { locale } = useFormat();
  const api = useApi();
  const hash = useHash();
  const section: Section = SECTIONS.includes(hash as Section) ? (hash as Section) : 'overview';
  const online = useOnline();
  const [catalog, setCatalog] = useState(initialCatalog);
  const [sidebar, setSidebar] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [favorites, setFavorites] = useStoredState<string[]>('nexus-favorites', []);
  const [nickname, setNickname] = useStoredState('nexus-nickname-v2', '');
  const [hero, setHero] = useState<Hero | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState<'library' | 'profile' | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [buildHero, setBuildHero] = useState('ling');
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLElement>(null);
  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    const onOnline = () =>
      fetch('/api/catalog')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data?.heroes && setCatalog(data))
        .catch(() => {});
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    const installer = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    const ready = () => setOfflineReady(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('keydown', shortcut);
    window.addEventListener('beforeinstallprompt', installer);
    window.addEventListener(OFFLINE_READY_EVENT, ready);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('keydown', shortcut);
      window.removeEventListener('beforeinstallprompt', installer);
      window.removeEventListener(OFFLINE_READY_EVENT, ready);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 4200);
    return () => clearTimeout(timeout);
  }, [toast]);

  const navigate = (next: Section) => {
    setSidebar(false);
    setFilters(EMPTY_FILTERS);
    setHash(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openHero = (h: Hero) => {
    setHero(h);
    api('/api/interactions', { kind: 'visit', heroId: h.hero_id }).catch(() => {});
  };
  const toggleFavorite = (id: string) =>
    setFavorites((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  const toBuild = (id: string) => {
    setBuildHero(id);
    setHero(null);
    navigate('builds');
  };
  const filtered = useFilteredHeroes(catalog.heroes, filters, section, favorites);
  const featured = catalog.heroes.find((h) => h.featured) || catalog.heroes[0];
  const top = [...catalog.heroes]
    .filter((h) => h.win_rate > 0)
    .sort((a, b) => b.win_rate - a.win_rate)
    .slice(0, 3);
  const isLibrary = ['overview', 'heroes', 'favorites'].includes(section);
  const displayName = nickname || t('profile.defaultName');

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebar}
        section={section}
        heroCount={catalog.heroes.length}
        favoriteCount={favorites.length}
        onNavigate={navigate}
        onClose={() => setSidebar(false)}
      />
      <div className="workspace">
        <Topbar
          section={section}
          query={filters.query}
          onQuery={(query) => {
            setFilters({ ...filters, query });
            if (!isLibrary) setHash('heroes');
          }}
          searchRef={searchRef}
          heroCount={catalog.heroes.length}
          nickname={displayName}
          onOpenMenu={() => setSidebar(true)}
          onOpenProfile={() => setDialog('profile')}
          onNavigate={navigate}
        />
        {!online && (
          <div className="offline-banner">
            <WifiOff size={16} />
            {t('common.offline')}
          </div>
        )}
        <main className="main-container">
          <div className="page-heading">
            <div>
              <h1>{t(`headings.${section}`)}</h1>
              {section !== 'overview' && <p>{t('headings.subtitle')}</p>}
            </div>
            <button className="library-status" onClick={() => setDialog('library')}>
              <span className="status-dot" />
              {t('nav.communityEdition')}
              <ChevronDown size={13} />
            </button>
          </div>
          {section === 'overview' && (
            <Banner
              onExplore={() =>
                libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              onNavigate={navigate}
            />
          )}
          {isLibrary && (
            <div className="discovery-layout">
              <HeroLibrary
                heroes={filtered}
                total={catalog.heroes.length}
                section={section}
                filters={filters}
                onFilters={setFilters}
                favorites={favorites}
                onOpen={openHero}
                onToggleFavorite={toggleFavorite}
                onNavigate={navigate}
                libraryRef={libraryRef}
              />
              <DiscoveryAside
                featured={featured}
                top={top}
                guide={catalog.guides[0]}
                onOpenHero={openHero}
                onOpenGuide={setGuide}
                onNavigate={navigate}
              />
            </div>
          )}
          {section === 'builds' && (
            <BuildCalculator catalog={catalog} initialHero={buildHero} notify={notify} />
          )}
          {section === 'counters' && (
            <CounterPicker catalog={catalog} openHero={openHero} toBuild={toBuild} />
          )}
          {section === 'tier' && <TierList catalog={catalog} openHero={openHero} notify={notify} />}
          {section === 'guides' && <GuidesLibrary catalog={catalog} openGuide={setGuide} />}
          {section === 'tools' && <GameTools notify={notify} />}
          <footer className="main-footer">
            <span>
              <Brand /> <span>{t('home.footerText')}</span>
            </span>
            <div>
              {offlineReady ? (
                <>
                  <Wifi size={13} />
                  {t('home.offlineCached')}
                </>
              ) : (
                <>
                  <ShieldCheck size={13} />
                  {t('home.independent')}
                </>
              )}
              <button onClick={() => setDialog('library')}>{t('home.about')}</button>
            </div>
          </footer>
        </main>
      </div>
      {hero && (
        <HeroDetail
          key={`${hero.hero_id}-${locale}`}
          hero={hero}
          catalog={catalog}
          onClose={() => setHero(null)}
          openHero={openHero}
          favorite={favorites.includes(hero.hero_id)}
          onFavorite={() => toggleFavorite(hero.hero_id)}
          toBuild={toBuild}
          notify={notify}
        />
      )}
      {guide && <GuideArticle guide={guide} onClose={() => setGuide(null)} />}
      {dialog === 'profile' && (
        <ProfileDialog
          nickname={nickname}
          favoriteCount={favorites.length}
          installEvent={installEvent}
          onInstall={() => setInstallEvent(null)}
          onSave={(name) => {
            setNickname(name);
            setDialog(null);
            notify(t('profile.saved'));
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'library' && <AboutDialog onClose={() => setDialog(null)} />}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={17} />
          </span>
          {toast}
          <button onClick={() => setToast('')} aria-label={t('common.dismiss')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
