export const LOCALES = ['en', 'fa'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const ROLES = ['Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'] as const;
export const LANES = ['Gold', 'Exp', 'Mid', 'Jungle', 'Roam'] as const;
export const TIERS = ['S+', 'S', 'A', 'B', 'C', 'Unrated'] as const;
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert'] as const;
export const SKILL_TYPES = ['Passive', 'Skill 1', 'Skill 2', 'Skill 3', 'Ultimate'] as const;
export const DAMAGE_TYPES = ['Physical', 'Magic', 'True', 'Mixed'] as const;
export const ITEM_TYPES = [
  'Weapon',
  'Defense',
  'Magic',
  'Jungle',
  'Boots',
  'Support',
  'Roam',
] as const;
export const PLAYSTYLES = ['Early Game', 'Late Game', 'Balanced'] as const;
export const GUIDE_CATEGORIES = ['Basic', 'Advanced', 'Macro', 'Micro', 'Rotation'] as const;
export const BATTLE_SPELLS = [
  'Retribution',
  'Flicker',
  'Purify',
  'Inspire',
  'Vengeance',
  'Execute',
  'Sprint',
  'Aegis',
  'Petrify',
  'Flameshot',
  'Arrival',
  'Revitalize',
] as const;

/** A translatable string. Plain strings are treated as English (legacy records). */
export type Localized = { en: string; fa?: string };
export type Text = string | Localized;

/** Where a field's value came from — shown as a small badge in the UI. */
export type DataQuality = 'verified' | 'source' | 'editorial' | 'estimated' | 'unknown';

export type Stats = {
  hp: number;
  mana: number;
  physical_attack: number;
  magic_power: number;
  physical_defense: number;
  magic_defense: number;
  movement_speed: number;
};

export type Skill = {
  skill_name: Text;
  skill_type: string;
  /** `null` = not verified for the current patch; the UI shows "—". */
  cooldown: number | null;
  mana_cost: number | null;
  description: Text;
  damage_type: string;
  slug?: string;
  icon_url?: string;
  video_url?: string;
  tags?: string[];
  notes?: Text;
};

export type Hero = {
  hero_id: string;
  name: string;
  /** Persian transliteration of the hero name (from content/glossary.fa.json). */
  name_fa?: string;
  title: Text;
  role: string;
  /** Secondary role, when the source lists two. */
  role_secondary?: string;
  lane: string;
  image_url: string;
  lore: Text;
  base_stats: Stats;
  skills: Skill[];
  counters: string[];
  best_builds: string[];
  tier: string;
  difficulty: string;
  win_rate: number;
  pick_rate: number;
  featured: boolean;
  color: string;
  quality?: { stats: DataQuality; skills: DataQuality; lane: DataQuality; tier: DataQuality };
  source_url?: string;
  patch_version?: string;
  last_verified?: string;
};

export type Item = {
  item_id: string;
  name: string;
  name_fa?: string;
  type: string;
  image_url: string;
  cost: number;
  stats: Partial<Stats>;
  passive_effect: Text;
  active_effect: Text;
  color: string;
  icon: string;
  quality?: DataQuality;
  last_verified?: string;
};

export type Build = {
  build_id: string;
  hero_id: string;
  build_name: Text;
  items: string[];
  emblems: Record<string, string>;
  battle_spell: string;
  playstyle: string;
  created_by: string;
  is_approved: boolean;
  quality?: DataQuality;
};

export type Guide = {
  guide_id: string;
  title: Text;
  category: string;
  content: Text;
  video_url: string;
  author: string;
  created_at: string;
  read_time: number;
  image_url: string;
  description: Text;
  patch_version?: string;
};

export type Catalog = { heroes: Hero[]; items: Item[]; builds: Build[]; guides: Guide[] };
export type Section =
  'overview' | 'heroes' | 'builds' | 'counters' | 'tier' | 'guides' | 'tools' | 'favorites';

/** Resolve a translatable value for a locale, falling back to English. */
export function tx(value: Text | undefined, locale: Locale): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return (locale === 'fa' && value.fa) || value.en || '';
}

/** True when the value has a non-empty translation for `locale`. */
export function hasTranslation(value: Text | undefined, locale: Locale): boolean {
  if (!value) return false;
  if (typeof value === 'string') return locale === 'en';
  return Boolean(locale === 'en' ? value.en : value.fa);
}

/** Normalise a legacy string into the `{ en, fa }` shape. */
export function toLocalized(value: Text | undefined): Localized {
  if (!value) return { en: '', fa: '' };
  return typeof value === 'string'
    ? { en: value, fa: '' }
    : { en: value.en || '', fa: value.fa || '' };
}

export function localizedHeroName(hero: Pick<Hero, 'name' | 'name_fa'>, locale: Locale) {
  return locale === 'fa' && hero.name_fa ? hero.name_fa : hero.name;
}
