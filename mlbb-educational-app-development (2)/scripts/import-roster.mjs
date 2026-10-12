#!/usr/bin/env node
/**
 * Imports the full MLBB hero roster — names, roles, skills (text + icons), portraits,
 * curated counters and recommended gear — from a configurable list of sources, and writes:
 *
 *   content/roster.json                      generated hero/item/build records (English)
 *   public/images/heroes/<id>.webp           portraits (640px)
 *   public/images/skills/<id>/<slug>.webp    skill icons (128×128)
 *   public/images/items/<id>.webp            item icons (when a source provides them)
 *   public/images/skills/manifest.json       heroId → slug → { file, source_url, retrieved_at, sha256 }
 *   ICON_REPORT.md                           coverage + anything that fell back
 *
 * Sources are tried in order (ASSET_SOURCES env, comma separated). Everything is cached on disk,
 * requests are throttled, and the script is safe to re-run: existing files are reused unless
 * --force is passed. Nothing here touches the database; `npm run db:seed` consumes roster.json.
 *
 * Usage: node scripts/import-roster.mjs [--force] [--limit=N]
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const limit = Number([...args].find((a) => a.startsWith('--limit='))?.split('=')[1] || 0);
const sources = (process.env.ASSET_SOURCES || 'mapi,equipment-dataset').split(',');
const retrievedAt = new Date().toISOString();
const log = (m) => console.log(`[roster] ${m}`);
const sharp = (await import('sharp')).default;
const glossary = JSON.parse(readFileSync(path.join(root, 'content/glossary.fa.json'), 'utf8'));

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const stripHtml = (s) =>
  String(s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/####\[[^\]]*\]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+\n/g, '\n')
    .trim();

async function fetchJson(url, headers = {}) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}
async function fetchBuffer(url) {
  const r = await fetch(url.startsWith('//') ? `https:${url}` : url, {
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
const report = {
  portraits: { ok: 0, fallback: [] },
  skills: { ok: 0, fallback: [] },
  items: { ok: 0, fallback: [] },
};
const manifest =
  existsSync(path.join(root, 'public/images/skills/manifest.json')) && !force
    ? JSON.parse(readFileSync(path.join(root, 'public/images/skills/manifest.json'), 'utf8'))
    : {};

async function saveImage(url, file, size, kind, label) {
  const abs = path.join(root, 'public', file);
  if (!force && existsSync(abs)) return { file, sha256: sha(readFileSync(abs)) };
  try {
    const buffer = await fetchBuffer(url);
    mkdirSync(path.dirname(abs), { recursive: true });
    const image = sharp(buffer);
    if (kind === 'portrait')
      await image
        .resize({ width: size, withoutEnlargement: true })
        .webp({ quality: 86 })
        .toFile(abs);
    else await image.resize(size, size, { fit: 'cover' }).webp({ quality: 88 }).toFile(abs);
    report[kind === 'portrait' ? 'portraits' : kind === 'skill' ? 'skills' : 'items'].ok++;
    return { file, sha256: sha(readFileSync(abs)) };
  } catch (error) {
    report[kind === 'portrait' ? 'portraits' : kind === 'skill' ? 'skills' : 'items'].fallback.push(
      `${label}: ${error.message}`,
    );
    return null;
  }
}
const sha = (b) => createHash('sha256').update(b).digest('hex');

/* ------------------------------------------------------------------ sources */
const ROLE_LANE = {
  Tank: 'Roam',
  Support: 'Roam',
  Mage: 'Mid',
  Marksman: 'Gold',
  Fighter: 'Exp',
  Assassin: 'Jungle',
};
const ROLE_COLOR = {
  Tank: '#8fb0c6',
  Fighter: '#c7986f',
  Assassin: '#a98cd9',
  Mage: '#c38ad6',
  Marksman: '#b98c9c',
  Support: '#8dbbae',
};
const ROLE_STATS = {
  Tank: {
    hp: 2800,
    mana: 430,
    physical_attack: 112,
    magic_power: 0,
    physical_defense: 24,
    magic_defense: 15,
    movement_speed: 250,
  },
  Fighter: {
    hp: 2650,
    mana: 430,
    physical_attack: 120,
    magic_power: 0,
    physical_defense: 21,
    magic_defense: 15,
    movement_speed: 255,
  },
  Assassin: {
    hp: 2550,
    mana: 430,
    physical_attack: 122,
    magic_power: 0,
    physical_defense: 18,
    magic_defense: 15,
    movement_speed: 255,
  },
  Mage: {
    hp: 2500,
    mana: 500,
    physical_attack: 108,
    magic_power: 0,
    physical_defense: 16,
    magic_defense: 15,
    movement_speed: 245,
  },
  Marksman: {
    hp: 2500,
    mana: 440,
    physical_attack: 115,
    magic_power: 0,
    physical_defense: 17,
    magic_defense: 15,
    movement_speed: 245,
  },
  Support: {
    hp: 2450,
    mana: 480,
    physical_attack: 110,
    magic_power: 0,
    physical_defense: 16,
    magic_defense: 15,
    movement_speed: 250,
  },
};

async function fromMapi() {
  const list = (await fetchJson('https://mapi.mobilelegends.com/hero/list')).data;
  const heroes = [];
  const byId = new Map(
    list.map((h) => [String(h.heroid), { name: h.name, slug: slugify(h.name) }]),
  );
  const subset = limit ? list.slice(0, limit) : list;
  const CONCURRENCY = 8;
  let cursor = 0;
  const worker = async () => {
    while (cursor < subset.length) {
      const entry = subset[cursor++];
      await processHero(entry);
    }
  };
  async function processHero(entry) {
    const slug = slugify(entry.name);
    try {
      const d = (await fetchJson(`https://mapi.mobilelegends.com/hero/detail?id=${entry.heroid}`))
        .data;
      const role = ROLE_LANE[d.type] ? d.type : 'Fighter';
      const skills = [];
      const raw = d.skill?.skill || [];
      // Source order is S1, S2, Ultimate, Passive (4 entries) or S1, S2, S3, Ult, Passive (5).
      const types =
        raw.length >= 5
          ? ['Skill 1', 'Skill 2', 'Skill 3', 'Ultimate', 'Passive']
          : ['Skill 1', 'Skill 2', 'Ultimate', 'Passive'];
      const icons = await Promise.all(
        raw.map((s, i) =>
          saveImage(
            s.icon,
            `/images/skills/${slug}/${slugify(s.name) || `skill-${i + 1}`}.webp`,
            128,
            'skill',
            `${entry.name} / ${s.name}`,
          ),
        ),
      );
      for (const [i, s] of raw.entries()) {
        const skillSlug = slugify(s.name) || `skill-${i + 1}`;
        const icon = icons[i];
        if (icon)
          (manifest[slug] ||= {})[skillSlug] = {
            file: icon.file,
            source_url: s.icon,
            retrieved_at: retrievedAt,
            sha256: icon.sha256,
          };
        const text = stripHtml(s.des);
        const damage =
          /Magic Damage/i.test(text) && /Physical Damage/i.test(text)
            ? 'Mixed'
            : /Magic Damage/i.test(text)
              ? 'Magic'
              : /True Damage/i.test(text)
                ? 'True'
                : 'Physical';
        const tags = [];
        if (/stun|knock|airborne|immobiliz|freeze|petrif|slow|silence|suppress/i.test(text))
          tags.push('CC');
        if (/dash|blink|leap|charge/i.test(text)) tags.push('dash');
        if (/shield/i.test(text)) tags.push('shield');
        if (/true damage/i.test(text)) tags.push('true damage');
        if (/heal|restor|regen/i.test(text)) tags.push('sustain');
        skills.push({
          skill_name: { en: s.name, fa: '' },
          skill_type: types[i] || `Skill ${i + 1}`,
          cooldown: null,
          mana_cost: null,
          description: { en: text, fa: '' },
          damage_type: damage,
          slug: skillSlug,
          icon_url: icon ? icon.file : '',
          tags,
          notes: { en: stripHtml(s.tips || ''), fa: '' },
        });
      }
      // Passive first in our UI ordering.
      const passiveIndex = skills.findIndex((s) => s.skill_type === 'Passive');
      if (passiveIndex > 0) skills.unshift(...skills.splice(passiveIndex, 1));
      const portrait =
        (await saveImage(
          d.cover_picture,
          `/images/heroes/${slug}.webp`,
          640,
          'portrait',
          entry.name,
        )) ||
        (await saveImage(
          entry.key,
          `/images/heroes/${slug}.webp`,
          400,
          'portrait',
          `${entry.name} (head icon)`,
        ));
      const counters = [];
      const counteredBy = d.counters?.countered;
      if (counteredBy?.heroid && byId.get(String(counteredBy.heroid)))
        counters.push(byId.get(String(counteredBy.heroid)).slug);
      const countersTarget = d.counters?.counters?.heroid
        ? byId.get(String(d.counters.counters.heroid))?.slug
        : null;
      heroes.push({
        hero_id: slug,
        name: entry.name,
        name_fa: glossary.heroes[entry.name] || '',
        title: { en: '', fa: '' },
        role,
        lane: ROLE_LANE[role],
        image_url: portrait ? portrait.file : '',
        lore: { en: stripHtml(d.des || ''), fa: '' },
        base_stats: ROLE_STATS[role],
        skills,
        counters,
        _counters_target: countersTarget,
        _gear: (d.gear?.out_pack || []).map((g) => g.equip?.name).filter(Boolean),
        best_builds: [],
        tier: 'Unrated',
        difficulty:
          Number(d.diff) >= 70
            ? 'Expert'
            : Number(d.diff) >= 50
              ? 'Hard'
              : Number(d.diff) >= 30
                ? 'Medium'
                : 'Easy',
        win_rate: 0,
        pick_rate: 0,
        featured: false,
        color: ROLE_COLOR[role],
        quality: { stats: 'estimated', skills: 'source', lane: 'estimated', tier: 'unknown' },
        source_url: `https://mapi.mobilelegends.com/hero/detail?id=${entry.heroid}`,
        patch_version: '',
        last_verified: retrievedAt.slice(0, 10),
      });
      log(`${entry.name}: ${skills.length} skills${portrait ? '' : ' (portrait fallback)'}`);
    } catch (error) {
      log(`skipped ${entry.name}: ${error.message}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  heroes.sort((a, b) => a.name.localeCompare(b.name));
  // Reverse counter relation: if A counters B, B.counters includes A.
  const map = new Map(heroes.map((h) => [h.hero_id, h]));
  for (const h of heroes) {
    const target = h._counters_target && map.get(h._counters_target);
    if (target && !target.counters.includes(h.hero_id) && target.hero_id !== h.hero_id)
      target.counters.push(h.hero_id);
  }
  return heroes;
}

async function fromEquipmentDataset() {
  const base =
    'https://raw.githubusercontent.com/Ceplin03/database-mlbb.Mobile-Legends-Bang-Bang/master';
  const rows = await fetchJson(`${base}/equipment.json`);
  const items = [];
  for (const row of rows) {
    const name = row['name-equipment'];
    const id = slugify(name);
    const icon = row['logo-equipment']
      ? await saveImage(
          `${base}/logo-equipment/${row['logo-equipment']}`,
          `/images/items/${id}.webp`,
          128,
          'item',
          name,
        )
      : null;
    const lower = name.toLowerCase();
    const type = /boots|shoes/.test(lower)
      ? 'Boots'
      : /helmet|armor|cuirass|shield|immortality|ice|belt|wings|oracle|breastplate/.test(lower)
        ? 'Defense'
        : /wand|staff|crystal|truncheon|clock|scythe|lantern|necklace|glaive|talisman|energy|time|orb/.test(
              lower,
            )
          ? 'Magic'
          : 'Weapon';
    items.push({
      item_id: id,
      name,
      name_fa: glossary.items[name] || '',
      type,
      image_url: icon ? icon.file : '',
      cost: Number(row['prize-gold']) || 0,
      stats: {},
      passive_effect: { en: '', fa: '' },
      active_effect: { en: '', fa: '' },
      color:
        type === 'Boots'
          ? '#ca9c58'
          : type === 'Defense'
            ? '#8fb0c6'
            : type === 'Magic'
              ? '#c38ad6'
              : '#c98567',
      icon:
        type === 'Boots'
          ? 'boot'
          : type === 'Defense'
            ? 'shield'
            : type === 'Magic'
              ? 'wand'
              : 'sword',
      quality: 'unknown',
      last_verified: retrievedAt.slice(0, 10),
    });
  }
  return items;
}

/* --------------------------------------------------------------------- main */
let heroes = [];
let items = [];
for (const source of sources) {
  try {
    if (source === 'mapi') heroes = await fromMapi();
    else if (source === 'equipment-dataset') items = await fromEquipmentDataset();
    else log(`unknown source "${source}" skipped`);
  } catch (error) {
    log(`source ${source} failed: ${error.message}`);
  }
}

// Builds from source gear lists when every item can be mapped by name.
const itemByName = new Map(
  items.map((i) => [i.name.toLowerCase().replace(/[^a-z0-9]/g, ''), i.item_id]),
);
const builds = [];
for (const h of heroes) {
  const ids = h._gear
    .map((n) =>
      itemByName.get(
        n
          .toLowerCase()
          .replace(/ - .*$/, '')
          .replace(/[^a-z0-9]/g, ''),
      ),
    )
    .filter(Boolean);
  const unique = [...new Set(ids)];
  if (unique.length === 6) {
    builds.push({
      build_id: `${h.hero_id}-guide`,
      hero_id: h.hero_id,
      build_name: { en: 'In-game guide build', fa: 'بیلد راهنمای بازی' },
      items: unique,
      emblems: { type: h.role === 'Marksman' ? 'Marksman' : h.role },
      battle_spell: h.lane === 'Jungle' ? 'Retribution' : 'Flicker',
      playstyle: 'Balanced',
      created_by: 'admin',
      is_approved: true,
      quality: 'source',
    });
    h.best_builds = [`${h.hero_id}-guide`];
  }
  delete h._gear;
  delete h._counters_target;
}

mkdirSync(path.join(root, 'content'), { recursive: true });
writeFileSync(
  path.join(root, 'content/roster.json'),
  JSON.stringify({ retrieved_at: retrievedAt, sources, heroes, items, builds }, null, 1),
);
mkdirSync(path.join(root, 'public/images/skills'), { recursive: true });
writeFileSync(
  path.join(root, 'public/images/skills/manifest.json'),
  JSON.stringify(manifest, null, 1),
);
const skillTotal = heroes.reduce((n, h) => n + h.skills.length, 0);
const skillWithIcon = heroes.reduce((n, h) => n + h.skills.filter((s) => s.icon_url).length, 0);
writeFileSync(
  path.join(root, 'ICON_REPORT.md'),
  `# Icon & roster import report\n\nGenerated ${retrievedAt} by \`scripts/import-roster.mjs\` (sources: ${sources.join(', ')}).\n\n| Asset | Covered | Missing |\n|---|---|---|\n| Heroes imported | ${heroes.length} | — |\n| Hero portraits | ${heroes.filter((h) => h.image_url).length} / ${heroes.length} | ${heroes.length - heroes.filter((h) => h.image_url).length} |\n| Skill icons | ${skillWithIcon} / ${skillTotal} | ${skillTotal - skillWithIcon} |\n| Items imported | ${items.length} | — |\n| Item icons | ${items.filter((i) => i.image_url).length} / ${items.length} | ${items.length - items.filter((i) => i.image_url).length} |\n| Builds mapped from in-game guide | ${builds.length} | ${heroes.length - builds.length} heroes without a fully mapped gear list |\n\nMissing assets render a generated role-coloured SVG placeholder in the UI (never a broken image).\n\n## Fallbacks\n${[...report.portraits.fallback.map((f) => `- portrait · ${f}`), ...report.skills.fallback.map((f) => `- skill · ${f}`), ...report.items.fallback.map((f) => `- item · ${f}`)].join('\n') || '- none'}\n\n## Data quality\n- Skill names/descriptions: from the in-game hero guide (\`quality.skills = source\`). Cooldowns and costs are **not** provided by the source and are stored as \`null\` (shown as “—”).\n- Base stats: role-typical placeholders (\`quality.stats = estimated\`) — the owner should replace them from the in-game stats panel.\n- Lane: inferred from role (\`quality.lane = estimated\`). Tier: \`Unrated\` until the owner places the hero.\n- Items from the equipment dataset carry name, price and icon only; stats and passives are empty until verified.\n\n## Rights\nMobile Legends: Bang Bang hero names, skills and artwork belong to Moonton. Assets are cached locally for this unofficial educational project; set \`ASSET_SOURCES\` to swap in licensed/original art before a public launch.\n`,
);
log(
  `done: ${heroes.length} heroes, ${skillWithIcon}/${skillTotal} skill icons, ${items.length} items, ${builds.length} builds`,
);
