import { db } from '@/db';
import { builds, guides, heroes, items } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { seedBuilds, seedGuides, seedHeroes, seedItems } from './seed';
import type { Catalog } from './types';
let seeded: Promise<void> | undefined;
export async function ensureSeeded() {
  if (!seeded)
    seeded = db
      .transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(761829)`);
        const found = await tx.select({ id: heroes.id }).from(heroes).limit(1);
        if (found.length) return;
        await tx
          .insert(heroes)
          .values(seedHeroes.map((h) => ({ id: h.hero_id, data: h })))
          .onConflictDoNothing();
        await tx
          .insert(items)
          .values(seedItems.map((i) => ({ id: i.item_id, data: i })))
          .onConflictDoNothing();
        await tx
          .insert(builds)
          .values(
            seedBuilds.map((b) => ({ id: b.build_id, heroId: b.hero_id, data: b, approved: true })),
          )
          .onConflictDoNothing();
        await tx
          .insert(guides)
          .values(seedGuides.map((g) => ({ id: g.guide_id, data: g })))
          .onConflictDoNothing();
      })
      .catch((error) => {
        seeded = undefined;
        throw error;
      });
  await seeded;
}
export async function getCatalog(): Promise<Catalog> {
  await ensureSeeded();
  const [h, i, b, g] = await Promise.all([
    db.select().from(heroes),
    db.select().from(items),
    db.select().from(builds).where(eq(builds.approved, true)),
    db.select().from(guides),
  ]);
  const order = seedHeroes.map((hero) => hero.hero_id);
  return {
    heroes: h
      .map((v) => v.data)
      .sort((a, b) => {
        const ai = order.indexOf(a.hero_id),
          bi = order.indexOf(b.hero_id);
        return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      }),
    items: i.map((v) => v.data),
    builds: b.map((v) => ({ ...v.data, is_approved: v.approved })),
    guides: g.map((v) => v.data),
  };
}
