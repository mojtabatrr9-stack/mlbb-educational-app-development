'use client';

import { normalizeSearch } from '@/i18n';
import { useFormat, useT } from '@/i18n/client';
import type { Catalog, Guide } from '@/lib/types';
import { GUIDE_CATEGORIES, hasTranslation } from '@/lib/types';
import { ArrowUpRight, BookOpen, Clock3, Play, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import Markdown from 'react-markdown';
import { SmartImage } from '../smart-image';
import { EmptyState, Modal, TranslationNotice } from '../ui';

export function GuidesLibrary({
  catalog,
  openGuide,
}: {
  catalog: Catalog;
  openGuide: (guide: Guide) => void;
}) {
  const t = useT('guides');
  const tc = useT('common');
  const { c, n, term } = useFormat();
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const q = normalizeSearch(query);
  const filtered = catalog.guides.filter(
    (g) =>
      (category === 'All' || category === g.category) &&
      (!q || normalizeSearch(`${c(g.title)} ${c(g.description)}`).includes(q)),
  );
  return (
    <div className="guides-workspace">
      <div className="academy-banner">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} />
            {t('academy')}
          </span>
          <h2>
            {t('title1')}
            <br />
            <em>{t('title2')}</em>
          </h2>
          <p>{t('subtitle')}</p>
        </div>
        <div className="academy-banner-symbol">
          <BookOpen size={110} strokeWidth={0.9} />
          <span />
          <i />
        </div>
      </div>
      <div className="guide-toolbar">
        <div className="small-tabs">
          {['All', ...GUIDE_CATEGORIES].map((cat) => (
            <button
              className={category === cat ? 'active' : ''}
              key={cat}
              onClick={() => setCategory(cat)}
            >
              {cat === 'All' ? t('allGuides') : term('categories', cat)}
            </button>
          ))}
        </div>
        <label className="item-search">
          <Search size={16} />
          <input
            aria-label={t('searchGuides')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('findLesson')}
          />
        </label>
      </div>
      <div className="guide-grid">
        {filtered.map((g) => (
          <button className="guide-card" onClick={() => openGuide(g)} key={g.guide_id}>
            <div className="guide-card-art">
              <SmartImage
                src={g.image_url}
                alt=""
                width={420}
                height={169}
                fallbackLabel={c(g.title)}
              />
              <div />
              <span>{term('categories', g.category)}</span>
              <span className="guide-art-icon">
                {g.video_url ? <Play size={25} /> : <BookOpen size={25} />}
              </span>
            </div>
            <div className="guide-card-body">
              <span className="guide-meta">
                <Clock3 size={12} />
                {tc('readMinutes', { minutes: n(g.read_time) })}
                <i /> {g.author}
              </span>
              <h3>{c(g.title)}</h3>
              <p>{c(g.description)}</p>
              <span className="guide-read">
                {t('read')}
                <ArrowUpRight size={16} className="icon-dir" />
              </span>
            </div>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <EmptyState icon={BookOpen} title={t('empty')} description={t('emptyText')} />
      )}
    </div>
  );
}

function Video({ url, title, unsupported }: { url: string; title: string; unsupported: string }) {
  let embed = '';
  try {
    const u = new URL(url);
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      const id = u.searchParams.get('v');
      if (id && /^[\w-]{11}$/.test(id)) embed = `https://www.youtube-nocookie.com/embed/${id}`;
    } else if (u.hostname === 'youtu.be' && /^\/[\w-]{11}$/.test(u.pathname))
      embed = `https://www.youtube-nocookie.com/embed${u.pathname}`;
  } catch {}
  return embed ? (
    <iframe
      className="guide-video"
      src={embed}
      title={title}
      allow="fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  ) : (
    <video className="guide-video" controls preload="metadata" src={url}>
      {unsupported}
    </video>
  );
}

export function GuideArticle({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  const t = useT('guides');
  const tc = useT('common');
  const { c, n, date, locale, term } = useFormat();
  const content = c(guide.content);
  const title = c(guide.title);
  return (
    <Modal title={title} onClose={onClose} wide>
      <article className="article">
        <div className="article-cover">
          <SmartImage src={guide.image_url} alt="" width={830} height={210} fallbackLabel={title} />
          <div />
          <span>{t('categoryGuide', { category: term('categories', guide.category) })}</span>
        </div>
        <div className="article-body">
          <div className="guide-meta">
            <BookOpen size={14} />
            {guide.author}
            <i />
            <Clock3 size={14} />
            {tc('readMinutes', { minutes: n(guide.read_time) })}
            <i />
            {date(guide.created_at)}
            {guide.patch_version && (
              <>
                <i />
                {tc('patch', { version: guide.patch_version })}
              </>
            )}
          </div>
          <TranslationNotice show={locale === 'fa' && !hasTranslation(guide.content, 'fa')} />
          {guide.video_url && (
            <Video
              url={guide.video_url}
              title={t('videoTitle')}
              unsupported={t('videoUnsupported')}
            />
          )}
          <div className="markdown-content">
            <Markdown>{content.startsWith('# ') ? content : `# ${title}\n\n${content}`}</Markdown>
          </div>
          <div className="article-end">
            <Sparkles size={19} />
            <span>{t('end')}</span>
          </div>
        </div>
      </article>
    </Modal>
  );
}
