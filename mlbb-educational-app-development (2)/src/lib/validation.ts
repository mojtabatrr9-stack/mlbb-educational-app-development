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
  type Build,
  type Guide,
  type Hero,
  type Item,
} from './types';

const QUALITIES = ['verified', 'source', 'editorial', 'estimated', 'unknown'];
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 20000) => typeof v === 'string' && v.length <= max;
/** Accepts a plain string (legacy English) or `{ en, fa? }`. */
const text = (v: unknown, max = 20000) =>
  str(v, max) || (object(v) && str(v.en, max) && (v.fa === undefined || str(v.fa, max)));
const nonEmptyText = (v: unknown, max = 20000) =>
  text(v, max) && (typeof v === 'string' ? v.length > 0 : Boolean((v as { en: string }).en));
const url = (v: unknown) =>
  str(v, 1000) &&
  (v === '' ||
    (v as string).startsWith('/images/') ||
    (v as string).startsWith('/api/media/') ||
    /^https:\/\//.test(v as string));
const list = (v: unknown, max = 100) =>
  Array.isArray(v) && v.length <= max && v.every((x) => str(x, 100));
const oneOf = (v: unknown, values: readonly string[]) => values.includes(String(v));
const statKeys = [
  'hp',
  'mana',
  'physical_attack',
  'magic_power',
  'physical_defense',
  'magic_defense',
  'movement_speed',
];
const stats = (v: unknown, required = false) =>
  object(v) &&
  Object.entries(v).every(
    ([k, x]) =>
      statKeys.includes(k) && typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100000,
  ) &&
  (!required || statKeys.every((k) => typeof v[k] === 'number'));
const optionalNumber = (v: unknown, max: number) =>
  v === null ||
  v === undefined ||
  (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max);
const optionalDate = (v: unknown) =>
  v === undefined || v === '' || (str(v, 40) && !Number.isNaN(Date.parse(v as string)));
const quality = (v: unknown) => v === undefined || oneOf(v, QUALITIES);

export function validateRecord(resource: string, v: unknown): Hero | Item | Build | Guide {
  if (!object(v)) throw new Error('Invalid content');
  const idKey = resource === 'heroes' ? 'hero_id' : `${resource.slice(0, -1)}_id`;
  const id = v[idKey];
  if (typeof id !== 'string' || !/^[-a-z0-9]{1,80}$/.test(id))
    throw new Error('Use a lowercase ID with letters, numbers, and hyphens.');

  if (resource === 'heroes') {
    const ok =
      str(v.name, 80) &&
      v.name &&
      (v.name_fa === undefined || str(v.name_fa, 80)) &&
      text(v.title, 120) &&
      oneOf(v.role, ROLES) &&
      (v.role_secondary === undefined || oneOf(v.role_secondary, ROLES)) &&
      oneOf(v.lane, LANES) &&
      url(v.image_url) &&
      text(v.lore) &&
      stats(v.base_stats, true) &&
      list(v.counters) &&
      list(v.best_builds) &&
      oneOf(v.tier, TIERS) &&
      oneOf(v.difficulty, DIFFICULTIES) &&
      typeof v.win_rate === 'number' &&
      v.win_rate >= 0 &&
      v.win_rate <= 100 &&
      typeof v.pick_rate === 'number' &&
      v.pick_rate >= 0 &&
      v.pick_rate <= 100 &&
      typeof v.featured === 'boolean' &&
      /^#[a-f0-9]{6}$/i.test(String(v.color)) &&
      (v.quality === undefined ||
        (object(v.quality) && Object.values(v.quality).every((q) => oneOf(q, QUALITIES)))) &&
      (v.source_url === undefined || url(v.source_url)) &&
      (v.patch_version === undefined || str(v.patch_version, 40)) &&
      optionalDate(v.last_verified);
    if (!ok) throw new Error('Check the hero details, stats, image URL, and role.');
    const skillsOk =
      Array.isArray(v.skills) &&
      v.skills.length <= 8 &&
      v.skills.every(
        (s) =>
          object(s) &&
          text(s.skill_name, 120) &&
          oneOf(s.skill_type, SKILL_TYPES) &&
          optionalNumber(s.cooldown, 600) &&
          optionalNumber(s.mana_cost, 1000) &&
          text(s.description, 8000) &&
          oneOf(s.damage_type, DAMAGE_TYPES) &&
          (s.slug === undefined || /^[-a-z0-9]{0,80}$/.test(String(s.slug))) &&
          (s.icon_url === undefined || url(s.icon_url)) &&
          (s.video_url === undefined || url(s.video_url)) &&
          (s.tags === undefined || list(s.tags, 12)) &&
          (s.notes === undefined || text(s.notes, 4000)),
      );
    if (!skillsOk) throw new Error('Check the skill names, types, cooldowns, and descriptions.');
  } else if (resource === 'items') {
    const ok =
      str(v.name, 80) &&
      v.name &&
      (v.name_fa === undefined || str(v.name_fa, 80)) &&
      oneOf(v.type, ITEM_TYPES) &&
      url(v.image_url) &&
      typeof v.cost === 'number' &&
      v.cost >= 0 &&
      v.cost <= 10000 &&
      stats(v.stats) &&
      text(v.passive_effect, 3000) &&
      text(v.active_effect, 3000) &&
      /^#[a-f0-9]{6}$/i.test(String(v.color)) &&
      oneOf(v.icon, ['sword', 'shield', 'gem', 'wand', 'boot']) &&
      quality(v.quality) &&
      optionalDate(v.last_verified);
    if (!ok) throw new Error('Check the item name, cost, stats, and effects.');
  } else if (resource === 'builds') {
    const ok =
      str(v.hero_id, 80) &&
      nonEmptyText(v.build_name, 120) &&
      list(v.items, 6) &&
      (v.items as unknown[]).length === 6 &&
      new Set(v.items as string[]).size === 6 &&
      object(v.emblems) &&
      Object.values(v.emblems).every((x) => str(x, 100)) &&
      oneOf(v.battle_spell, BATTLE_SPELLS) &&
      oneOf(v.playstyle, PLAYSTYLES) &&
      quality(v.quality);
    if (!ok) throw new Error('A build needs a hero, name, and six different items.');
  } else if (resource === 'guides') {
    const ok =
      nonEmptyText(v.title, 200) &&
      text(v.content, 60000) &&
      oneOf(v.category, GUIDE_CATEGORIES) &&
      url(v.image_url) &&
      url(v.video_url) &&
      str(v.author, 100) &&
      text(v.description, 400) &&
      typeof v.read_time === 'number' &&
      v.read_time >= 1 &&
      v.read_time <= 120 &&
      typeof v.created_at === 'string' &&
      !Number.isNaN(Date.parse(v.created_at)) &&
      (v.patch_version === undefined || str(v.patch_version, 40));
    if (!ok) throw new Error('Check the guide title, content, category, and URLs.');
  } else throw new Error('Unknown content type');
  return v as unknown as Hero | Item | Build | Guide;
}

/** Lists content fields that have English text but no Persian translation. */
export function missingTranslations(
  resource: string,
  record: Hero | Item | Build | Guide,
): string[] {
  const missing: string[] = [];
  const check = (label: string, value: unknown) => {
    if (typeof value === 'string') {
      if (value) missing.push(label);
    } else if (value && typeof value === 'object') {
      const v = value as { en?: string; fa?: string };
      if (v.en && !v.fa) missing.push(label);
    }
  };
  if (resource === 'heroes') {
    const h = record as Hero;
    check('title', h.title);
    check('lore', h.lore);
    if (!h.name_fa) missing.push('name_fa');
    h.skills.forEach((s, i) => {
      check(`skills.${i}.skill_name`, s.skill_name);
      check(`skills.${i}.description`, s.description);
    });
  } else if (resource === 'items') {
    const i = record as Item;
    check('passive_effect', i.passive_effect);
    check('active_effect', i.active_effect);
  } else if (resource === 'builds') check('build_name', (record as Build).build_name);
  else if (resource === 'guides') {
    const g = record as Guide;
    check('title', g.title);
    check('description', g.description);
    check('content', g.content);
  }
  return missing;
}
