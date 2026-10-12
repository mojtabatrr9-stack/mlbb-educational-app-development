/**
 * Idempotent seed + content upgrade.
 *  1. Inserts any missing seed heroes, items, builds and guides (curated 16 + imported roster).
 *  2. Upgrades legacy single-language rows to the bilingual `{ en, fa }` shape. Owner edits are
 *     preserved: a Persian translation from the seed is only attached when the stored English
 *     text still matches the seed English text. Missing skill icons are filled from the roster.
 * Usage: npm run db:seed   (requires DATABASE_URL)
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db';
import { builds, guides, heroes, items } from '../src/db/schema';
import { seedBuilds, seedGuides, seedHeroes, seedItems } from '../src/lib/seed';
import type { Guide, Hero, Item, Localized, Text } from '../src/lib/types';

const upgradeText = (stored: Text | undefined, seed: Text | undefined): Localized => {
  const current =
    typeof stored === 'string'
      ? { en: stored, fa: '' }
      : { en: stored?.en || '', fa: stored?.fa || '' };
  const reference =
    typeof seed === 'string' ? { en: seed, fa: '' } : { en: seed?.en || '', fa: seed?.fa || '' };
  if (!current.fa && reference.fa && (current.en === reference.en || !current.en))
    return { en: current.en || reference.en, fa: reference.fa };
  return current;
};

async function main() {
  const inserted = await db.transaction(async (tx) => {
    const h = await tx
      .insert(heroes)
      .values(seedHeroes.map((d) => ({ id: d.hero_id, data: d })))
      .onConflictDoNothing()
      .returning({ id: heroes.id });
    const i = await tx
      .insert(items)
      .values(seedItems.map((d) => ({ id: d.item_id, data: d })))
      .onConflictDoNothing()
      .returning({ id: items.id });
    const b = await tx
      .insert(builds)
      .values(
        seedBuilds.map((d) => ({ id: d.build_id, heroId: d.hero_id, data: d, approved: true })),
      )
      .onConflictDoNothing()
      .returning({ id: builds.id });
    const g = await tx
      .insert(guides)
      .values(seedGuides.map((d) => ({ id: d.guide_id, data: d })))
      .onConflictDoNothing()
      .returning({ id: guides.id });
    return { heroes: h.length, items: i.length, builds: b.length, guides: g.length };
  });

  let upgraded = 0;
  for (const row of await db.select().from(heroes)) {
    const seed = seedHeroes.find((s) => s.hero_id === row.id);
    const d = row.data as Hero;
    const next: Hero = {
      ...d,
      name_fa: d.name_fa || seed?.name_fa || '',
      title: upgradeText(d.title, seed?.title),
      lore: upgradeText(d.lore, seed?.lore),
      skills: d.skills.map((s, idx) => {
        const ref = seed?.skills.find((x) => x.slug && x.slug === s.slug) || seed?.skills[idx];
        return {
          ...s,
          skill_name: upgradeText(s.skill_name, ref?.skill_name),
          description: upgradeText(s.description, ref?.description),
          icon_url: s.icon_url || ref?.icon_url || '',
          slug: s.slug || ref?.slug,
          cooldown: s.cooldown ?? null,
          mana_cost: s.mana_cost ?? null,
        };
      }),
      quality: d.quality || seed?.quality,
      source_url: d.source_url || seed?.source_url,
      last_verified: d.last_verified || seed?.last_verified,
    };
    if (JSON.stringify(next) !== JSON.stringify(d)) {
      await db.update(heroes).set({ data: next }).where(eq(heroes.id, row.id));
      upgraded++;
    }
  }
  for (const row of await db.select().from(items)) {
    const seed = seedItems.find((s) => s.item_id === row.id);
    const d = row.data as Item;
    const next: Item = {
      ...d,
      name_fa: d.name_fa || seed?.name_fa || '',
      image_url: d.image_url || seed?.image_url || '',
      passive_effect: upgradeText(d.passive_effect, seed?.passive_effect),
      active_effect: upgradeText(d.active_effect, seed?.active_effect),
    };
    if (JSON.stringify(next) !== JSON.stringify(d)) {
      await db.update(items).set({ data: next }).where(eq(items.id, row.id));
      upgraded++;
    }
  }
  for (const row of await db.select().from(builds)) {
    const seed = seedBuilds.find((s) => s.build_id === row.id);
    const next = { ...row.data, build_name: upgradeText(row.data.build_name, seed?.build_name) };
    if (JSON.stringify(next) !== JSON.stringify(row.data)) {
      await db.update(builds).set({ data: next }).where(eq(builds.id, row.id));
      upgraded++;
    }
  }
  for (const row of await db.select().from(guides)) {
    const seed = seedGuides.find((s) => s.guide_id === row.id);
    const d = row.data as Guide;
    const next: Guide = {
      ...d,
      title: upgradeText(d.title, seed?.title),
      description: upgradeText(d.description, seed?.description),
      content: upgradeText(d.content, seed?.content),
    };
    if (JSON.stringify(next) !== JSON.stringify(d)) {
      await db.update(guides).set({ data: next }).where(eq(guides.id, row.id));
      upgraded++;
    }
  }
  console.log('Seed complete. Inserted:', inserted, '· upgraded to bilingual shape:', upgraded);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
