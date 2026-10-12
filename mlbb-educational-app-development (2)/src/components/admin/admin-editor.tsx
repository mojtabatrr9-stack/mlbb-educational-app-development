'use client';

import { useFormat, useT } from '@/i18n/client';
import type { Build, Catalog, Guide, Hero, Item, Localized, Skill, Stats, Text } from '@/lib/types';
import {
  BATTLE_SPELLS,
  DAMAGE_TYPES,
  DIFFICULTIES,
  GUIDE_CATEGORIES,
  ITEM_TYPES,
  LANES,
  PLAYSTYLES,
  ROLES,
  SKILL_TYPES,
  TIERS,
  localizedHeroName,
  toLocalized,
} from '@/lib/types';
import {
  BookOpen,
  Check,
  Crown,
  Gem,
  Languages,
  Layers3,
  LockKeyhole,
  Plus,
  Save,
  Sparkles,
  Swords,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import { ItemIcon, Modal, SkillIcon, itemName } from '../ui';
import { AdminAi } from './admin-ai';

export type Resource = 'heroes' | 'items' | 'builds' | 'guides';
export type RecordData = Hero | Item | Build | Guide;
const STAT_KEYS: (keyof Stats)[] = [
  'hp',
  'mana',
  'physical_attack',
  'magic_power',
  'physical_defense',
  'magic_defense',
  'movement_speed',
];
const QUALITIES = ['verified', 'source', 'editorial', 'estimated', 'unknown'] as const;

export function idOf(resource: Resource, data: RecordData) {
  return resource === 'heroes'
    ? (data as Hero).hero_id
    : resource === 'items'
      ? (data as Item).item_id
      : resource === 'builds'
        ? (data as Build).build_id
        : (data as Guide).guide_id;
}

type Props = {
  resource: Resource;
  record: RecordData;
  creating: boolean;
  catalog: Catalog;
  authorized: boolean;
  busy: boolean;
  error: string;
  onChange: (next: RecordData) => void;
  onSave: () => void;
  onClose: () => void;
  onUpload: (file: File | undefined, apply: (url: string) => void) => Promise<void>;
  uploading: boolean;
  notify: (message: string) => void;
};

export function AdminEditor({
  resource,
  record,
  creating,
  catalog,
  authorized,
  busy,
  error,
  onChange,
  onSave,
  onClose,
  onUpload,
  uploading,
  notify,
}: Props) {
  const t = useT('admin.editor');
  const ta = useT('admin');
  const tc = useT('common');
  const th = useT('hero.statsLabels');
  const tq = useT('quality');
  const { locale, term, n } = useFormat();
  const [preview, setPreview] = useState(false);
  const [ai, setAi] = useState<{ text: string; apply: (draft: string) => void } | null>(null);
  const data = record as unknown as Record<string, unknown>;
  const patch = (key: string, value: unknown) =>
    onChange({ ...record, [key]: value } as RecordData);
  const kind = ta(`kinds.${resource}`);

  /** Side-by-side EN / FA inputs for a translatable field. */
  const bilingual = (
    label: string,
    value: Text | undefined,
    apply: (next: Localized) => void,
    options?: { textarea?: boolean; maxLength?: number; markdown?: boolean },
  ) => {
    const v = toLocalized(value);
    const Field = options?.textarea ? 'textarea' : 'input';
    const missing = v.en && !v.fa;
    return (
      <fieldset className="bilingual">
        <legend>
          {label}
          {missing && (
            <span className="subtle-badge missing-badge">
              <Languages size={11} /> {t('missingTranslation')}
            </span>
          )}
        </legend>
        <div className="bilingual-grid">
          <label className="field-label">
            {t('english')}
            <Field
              className={`form-input ${options?.markdown ? 'markdown-editor' : ''}`}
              dir="ltr"
              value={v.en}
              maxLength={options?.maxLength || 20000}
              onChange={(e) => apply({ ...v, en: e.target.value })}
            />
          </label>
          <label className="field-label">
            {t('persian')}
            <Field
              className={`form-input ${options?.markdown ? 'markdown-editor' : ''}`}
              dir="rtl"
              value={v.fa || ''}
              maxLength={options?.maxLength || 20000}
              onChange={(e) => apply({ ...v, fa: e.target.value })}
            />
            {v.en && (
              <button
                type="button"
                className="text-link"
                onClick={() => setAi({ text: v.en, apply: (draft) => apply({ ...v, fa: draft }) })}
              >
                <Sparkles size={13} /> {ta('translateAi')}
              </button>
            )}
          </label>
        </div>
      </fieldset>
    );
  };
  const select = (label: string, key: string, values: readonly string[], group?: string) => (
    <label className="field-label">
      {label}
      <select
        className="form-input"
        value={String(data[key] ?? '')}
        onChange={(e) => patch(key, e.target.value)}
      >
        {values.map((v) => (
          <option key={v} value={v}>
            {group ? term(group, v) : v}
          </option>
        ))}
      </select>
    </label>
  );
  const input = (
    label: string,
    key: string,
    type: 'text' | 'number' | 'color' | 'date' = 'text',
    max = 1000,
  ) => (
    <label className="field-label">
      {label}
      <input
        className="form-input"
        type={type}
        step={type === 'number' ? 'any' : undefined}
        min={type === 'number' ? 0 : undefined}
        maxLength={max}
        value={String(data[key] ?? '')}
        onChange={(e) => patch(key, type === 'number' ? Number(e.target.value) : e.target.value)}
      />
    </label>
  );
  const upload = (label: string, key: string, video = false) => (
    <label className="field-label">
      {label}
      <span className="upload-field">
        <input
          className="form-input"
          dir="ltr"
          value={String(data[key] || '')}
          onChange={(e) => patch(key, e.target.value)}
          placeholder={video ? t('videoPlaceholder') : t('imagePlaceholder')}
        />
        <span className="upload-control">
          <Upload size={14} />
          {uploading ? t('uploading') : video ? t('uploadVideo') : t('uploadImage')}
          <input
            type="file"
            accept={video ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/webp'}
            disabled={uploading || !authorized}
            onChange={(e) => onUpload(e.target.files?.[0], (url) => patch(key, url))}
          />
        </span>
      </span>
      <small className="fine-print">{video ? t('videoHint') : t('imageHint')}</small>
    </label>
  );

  let body: ReactNode = null;
  if (resource === 'heroes') {
    const h = record as Hero;
    body = (
      <>
        <div className="editor-grid">
          {input(t('heroName'), 'name', 'text', 80)}
          {input(t('heroNameFa'), 'name_fa', 'text', 80)}
          {select(t('role'), 'role', ROLES, 'roles')}
          {select(t('lane'), 'lane', LANES, 'lanes')}
          {select(t('tier'), 'tier', TIERS, 'tiers')}
          {select(t('difficulty'), 'difficulty', DIFFICULTIES, 'difficulty')}
          {input(t('winRate'), 'win_rate', 'number')}
          {input(t('pickRate'), 'pick_rate', 'number')}
          {input(t('patchVersion'), 'patch_version', 'text', 40)}
          {input(t('lastVerified'), 'last_verified', 'date')}
        </div>
        {bilingual(t('heroTitle'), h.title, (v) => patch('title', v), { maxLength: 120 })}
        {upload(t('imageUrl'), 'image_url')}
        {bilingual(t('lore'), h.lore, (v) => patch('lore', v), { textarea: true })}
        <fieldset>
          <legend>{t('baseStats')}</legend>
          <div className="editor-stats">
            {STAT_KEYS.map((key) => (
              <label className="field-label" key={key}>
                {th(key)}
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  max={100000}
                  value={h.base_stats[key]}
                  onChange={(e) =>
                    patch('base_stats', { ...h.base_stats, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
          <label className="field-label">
            {t('statsQuality')}
            <select
              className="form-input"
              value={h.quality?.stats || 'editorial'}
              onChange={(e) =>
                patch('quality', {
                  stats: e.target.value,
                  skills: h.quality?.skills || 'editorial',
                  lane: h.quality?.lane || 'editorial',
                  tier: h.quality?.tier || 'editorial',
                })
              }
            >
              {QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {tq(q)}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>{t('skills')}</legend>
          {h.skills.map((s, i) => {
            const update = (next: Partial<Skill>) =>
              patch(
                'skills',
                h.skills.map((skill, index) => (index === i ? { ...skill, ...next } : skill)),
              );
            return (
              <div className="editor-skill" key={i}>
                <div className="editor-skill-title">
                  <span>
                    <SkillIcon src={s.icon_url} label={toLocalized(s.skill_name).en} size={32} />{' '}
                    {t('skill', { n: n(i + 1) })}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t('removeSkill', { n: n(i + 1) })}
                    onClick={() =>
                      patch(
                        'skills',
                        h.skills.filter((_, index) => i !== index),
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {bilingual(t('skillName'), s.skill_name, (v) => update({ skill_name: v }), {
                  maxLength: 120,
                })}
                <div className="editor-grid">
                  <label className="field-label">
                    {t('skillType')}
                    <select
                      className="form-input"
                      value={s.skill_type}
                      onChange={(e) => update({ skill_type: e.target.value })}
                    >
                      {SKILL_TYPES.map((v) => (
                        <option key={v} value={v}>
                          {term('skillTypes', v)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-label">
                    {t('damageType')}
                    <select
                      className="form-input"
                      value={s.damage_type}
                      onChange={(e) => update({ damage_type: e.target.value })}
                    >
                      {DAMAGE_TYPES.map((v) => (
                        <option key={v} value={v}>
                          {term('damage', v)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-label">
                    {t('cooldown')}
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      min={0}
                      value={s.cooldown ?? ''}
                      placeholder={tc('none')}
                      onChange={(e) =>
                        update({ cooldown: e.target.value === '' ? null : Number(e.target.value) })
                      }
                    />
                    <small className="fine-print">{t('notVerifiedHint')}</small>
                  </label>
                  <label className="field-label">
                    {t('manaCost')}
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      min={0}
                      value={s.mana_cost ?? ''}
                      placeholder={tc('none')}
                      onChange={(e) =>
                        update({ mana_cost: e.target.value === '' ? null : Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="field-label">
                    {t('skillIcon')}
                    <input
                      className="form-input"
                      dir="ltr"
                      value={s.icon_url || ''}
                      onChange={(e) => update({ icon_url: e.target.value })}
                    />
                  </label>
                </div>
                {bilingual(t('description'), s.description, (v) => update({ description: v }), {
                  textarea: true,
                  maxLength: 8000,
                })}
              </div>
            );
          })}
          <button
            type="button"
            className="button secondary compact"
            disabled={h.skills.length >= 8}
            onClick={() =>
              patch('skills', [
                ...h.skills,
                {
                  skill_name: { en: '', fa: '' },
                  skill_type: 'Skill 1',
                  cooldown: null,
                  mana_cost: null,
                  description: { en: '', fa: '' },
                  damage_type: 'Physical',
                } satisfies Skill,
              ])
            }
          >
            <Plus size={14} />
            {t('addSkill')}
          </button>
        </fieldset>
        <fieldset>
          <legend>{t('counterPicks')}</legend>
          <div className="counter-checkboxes">
            {catalog.heroes
              .filter((hero) => hero.hero_id !== h.hero_id)
              .map((hero) => (
                <label key={hero.hero_id}>
                  <input
                    type="checkbox"
                    checked={h.counters.includes(hero.hero_id)}
                    onChange={(e) =>
                      patch(
                        'counters',
                        e.target.checked
                          ? [...h.counters, hero.hero_id]
                          : h.counters.filter((id) => id !== hero.hero_id),
                      )
                    }
                  />
                  {localizedHeroName(hero, locale)}
                </label>
              ))}
          </div>
        </fieldset>
        <label className="featured-checkbox">
          <input
            type="checkbox"
            checked={h.featured}
            onChange={(e) => patch('featured', e.target.checked)}
          />
          <Crown size={16} />
          {t('makeFeatured')}
        </label>
      </>
    );
  } else if (resource === 'items') {
    const item = record as Item;
    body = (
      <>
        <div className="editor-grid">
          {input(t('itemName'), 'name', 'text', 80)}
          {input(t('heroNameFa'), 'name_fa', 'text', 80)}
          {select(t('type'), 'type', ITEM_TYPES, 'itemTypes')}
          {input(t('cost'), 'cost', 'number')}
          {select(t('icon'), 'icon', ['sword', 'shield', 'gem', 'wand', 'boot'])}
          {input(t('accentColor'), 'color', 'color')}
          {input(t('lastVerified'), 'last_verified', 'date')}
        </div>
        {upload(t('imageUrl'), 'image_url')}
        <fieldset>
          <legend>{t('flatStats')}</legend>
          <div className="editor-stats">
            {STAT_KEYS.map((key) => (
              <label className="field-label" key={key}>
                {th(key)}
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  max={100000}
                  value={item.stats[key] || 0}
                  onChange={(e) => patch('stats', { ...item.stats, [key]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
        </fieldset>
        {bilingual(t('passive'), item.passive_effect, (v) => patch('passive_effect', v), {
          textarea: true,
          maxLength: 3000,
        })}
        {bilingual(t('active'), item.active_effect, (v) => patch('active_effect', v), {
          textarea: true,
          maxLength: 3000,
        })}
      </>
    );
  } else if (resource === 'builds') {
    const build = record as Build;
    body = (
      <>
        {bilingual(t('buildName'), build.build_name, (v) => patch('build_name', v), {
          maxLength: 120,
        })}
        <div className="editor-grid">
          <label className="field-label">
            {t('hero')}
            <select
              className="form-input"
              value={build.hero_id}
              onChange={(e) => patch('hero_id', e.target.value)}
            >
              {catalog.heroes.map((h) => (
                <option key={h.hero_id} value={h.hero_id}>
                  {localizedHeroName(h, locale)}
                </option>
              ))}
            </select>
          </label>
          {select(t('battleSpell'), 'battle_spell', BATTLE_SPELLS, 'spells')}
          {select(t('playstyle'), 'playstyle', PLAYSTYLES, 'playstyles')}
          <label className="field-label">
            {t('emblemType')}
            <select
              className="form-input"
              value={build.emblems.type || ''}
              onChange={(e) => patch('emblems', { ...build.emblems, type: e.target.value })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {term('emblems', role)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {t('emblemTalent')}
            <input
              className="form-input"
              value={build.emblems.talent || ''}
              onChange={(e) => patch('emblems', { ...build.emblems, talent: e.target.value })}
            />
          </label>
        </div>
        <fieldset>
          <legend>{t('chooseSix', { count: n(build.items.length) })}</legend>
          <div className="item-grid">
            {catalog.items.map((item) => (
              <button
                type="button"
                className={`item-option ${build.items.includes(item.item_id) ? 'selected' : ''}`}
                key={item.item_id}
                onClick={() => {
                  if (build.items.includes(item.item_id))
                    patch(
                      'items',
                      build.items.filter((id) => id !== item.item_id),
                    );
                  else if (build.items.length < 6) patch('items', [...build.items, item.item_id]);
                  else notify(t('removeFirst'));
                }}
              >
                <ItemIcon item={item} size="small" />
                <div>
                  <strong>{itemName(item, locale)}</strong>
                  <small>
                    {n(item.cost)} {tc('gold')}
                  </small>
                </div>
                <span className="item-add">
                  {build.items.includes(item.item_id) ? <Check size={14} /> : <Plus size={14} />}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      </>
    );
  } else {
    const guide = record as Guide;
    const content = toLocalized(guide.content);
    body = (
      <>
        {bilingual(t('guideTitle'), guide.title, (v) => patch('title', v), { maxLength: 200 })}
        <div className="editor-grid">
          {select(t('category'), 'category', GUIDE_CATEGORIES, 'categories')}
          {input(t('author'), 'author', 'text', 100)}
          {input(t('readTime'), 'read_time', 'number')}
          {input(t('patchVersion'), 'patch_version', 'text', 40)}
        </div>
        {bilingual(t('shortDescription'), guide.description, (v) => patch('description', v), {
          maxLength: 400,
        })}
        {upload(t('coverImage'), 'image_url')}
        {upload(t('video'), 'video_url', true)}
        <div className="markdown-toolbar">
          <div className="small-tabs">
            <button
              type="button"
              className={!preview ? 'active' : ''}
              onClick={() => setPreview(false)}
            >
              {t('writeMarkdown')}
            </button>
            <button
              type="button"
              className={preview ? 'active' : ''}
              onClick={() => setPreview(true)}
            >
              {t('preview')}
            </button>
          </div>
          <button
            type="button"
            className="button secondary compact"
            onClick={() =>
              setAi({
                text: content.en,
                apply: (draft) => patch('content', { ...content, en: draft }),
              })
            }
          >
            <Sparkles size={14} />
            {t('aiFormatter')}
          </button>
        </div>
        {preview ? (
          <div className="bilingual-grid">
            <div className="markdown-preview markdown-content" dir="ltr">
              <Markdown>{content.en || t('previewEmpty')}</Markdown>
            </div>
            <div className="markdown-preview markdown-content" dir="rtl">
              <Markdown>{content.fa || t('previewEmpty')}</Markdown>
            </div>
          </div>
        ) : (
          bilingual(t('description'), guide.content, (v) => patch('content', v), {
            textarea: true,
            markdown: true,
            maxLength: 60000,
          })
        )}
      </>
    );
  }

  const Icon =
    resource === 'heroes'
      ? Swords
      : resource === 'items'
        ? Gem
        : resource === 'builds'
          ? Layers3
          : BookOpen;
  return (
    <>
      <Modal
        title={t(creating ? 'create' : 'edit', { kind })}
        onClose={() => !busy && !uploading && onClose()}
        wide
      >
        <form
          className="editor-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="editor-header">
            <span>
              <Icon size={24} />
            </span>
            <div>
              <h2>{t(creating ? 'create' : 'edit', { kind })}</h2>
              <p>{t('care')}</p>
            </div>
          </div>
          <label className="field-label">
            {t('contentId')}
            <input
              className="form-input"
              dir="ltr"
              value={idOf(resource, record)}
              disabled={!creating}
              onChange={(e) =>
                patch(
                  resource === 'heroes' ? 'hero_id' : `${resource.slice(0, -1)}_id`,
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                )
              }
              required
              maxLength={80}
            />
          </label>
          {body}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!authorized && (
            <div className="editor-locked">
              <LockKeyhole size={15} />
              {t('readOnly')}
            </div>
          )}
          <div className="editor-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              disabled={busy || uploading}
            >
              {tc('cancel')}
            </button>
            <button type="submit" className="button primary" disabled={busy || uploading}>
              {busy ? tc('saving') : authorized ? t('savePublish') : t('signInToSave')}
              {authorized ? <Save size={15} /> : <LockKeyhole size={15} />}
            </button>
          </div>
        </form>
      </Modal>
      {ai && (
        <Modal title={ta('nav.ai')} onClose={() => setAi(null)} wide>
          <div className="editor-form">
            <AdminAi
              authorized={authorized}
              initialNotes={ai.text}
              notify={notify}
              onUseDraft={(draft) => {
                ai.apply(draft);
                setAi(null);
                notify(ta('draftAdded'));
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
