import { db } from '@/db';
import { builds, guides, heroes, interactions, items, ratings, visits } from '@/db/schema';
import { isAdmin, requireMutation } from '@/lib/auth';
import type { Build, Guide, Hero, Item } from '@/lib/types';
import { validateRecord } from '@/lib/validation';
import { count, countDistinct, desc, eq, gte, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
type Context = { params: Promise<{ resource: string }> };
export async function GET(_req: NextRequest, ctx: Context) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
  const { resource } = await ctx.params;
  if (resource === 'dashboard') {
    const [active, popular, pending, reports, comments, votes] = await Promise.all([
      db
        .select({ count: countDistinct(visits.visitorId) })
        .from(visits)
        .where(gte(visits.createdAt, new Date(Date.now() - 86400000))),
      db
        .select({ heroId: visits.heroId, count: count() })
        .from(visits)
        .groupBy(visits.heroId)
        .orderBy(desc(count()))
        .limit(5),
      db.select().from(builds).where(eq(builds.approved, false)),
      db
        .select()
        .from(interactions)
        .where(eq(interactions.kind, 'report'))
        .orderBy(desc(interactions.createdAt))
        .limit(100),
      db
        .select()
        .from(interactions)
        .where(eq(interactions.kind, 'comment'))
        .orderBy(desc(interactions.createdAt))
        .limit(100),
      db.select({ count: count() }).from(ratings),
    ]);
    return NextResponse.json(
      { active: active[0].count, popular, pending, reports, comments, votes: votes[0].count },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });
}
export async function POST(req: NextRequest, ctx: Context) {
  try {
    requireMutation(req);
    if (!(await isAdmin()))
      return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
    const { resource } = await ctx.params;
    const body = await req.json();
    if (resource === 'moderate') {
      if (
        typeof body.id !== 'string' ||
        !['build', 'comment', 'report'].includes(body.kind) ||
        !['approve', 'reject'].includes(body.action)
      )
        throw new Error('Invalid review action');
      if (body.kind === 'build') {
        if (body.action === 'reject') await db.delete(builds).where(eq(builds.id, body.id));
        else {
          const [b] = await db.select().from(builds).where(eq(builds.id, body.id));
          if (!b) throw new Error('Build not found');
          await db
            .update(builds)
            .set({ approved: true, data: { ...b.data, is_approved: true } })
            .where(eq(builds.id, body.id));
        }
      } else if (body.action === 'reject')
        await db.delete(interactions).where(eq(interactions.id, body.id));
      else
        await db.update(interactions).set({ approved: true }).where(eq(interactions.id, body.id));
      return NextResponse.json({ ok: true });
    }
    const data = validateRecord(resource, body);
    if (resource === 'heroes') {
      const hero = data as Hero;
      const available = await db.select({ id: heroes.id }).from(heroes);
      if (hero.counters.some((id) => id === hero.hero_id || !available.some((h) => h.id === id)))
        throw new Error('Select valid counter heroes.');
      await db.transaction(async (tx) => {
        if (hero.featured)
          await tx
            .update(heroes)
            .set({ data: sql`jsonb_set(${heroes.data}, '{featured}', 'false'::jsonb)` });
        await tx
          .insert(heroes)
          .values({ id: hero.hero_id, data: hero })
          .onConflictDoUpdate({ target: heroes.id, set: { data: hero, updatedAt: new Date() } });
      });
    } else if (resource === 'items') {
      const item = data as Item;
      await db
        .insert(items)
        .values({ id: item.item_id, data: item })
        .onConflictDoUpdate({ target: items.id, set: { data: item } });
    } else if (resource === 'builds') {
      const build = { ...(data as Build), created_by: 'admin', is_approved: true };
      const allItems = await db.select().from(items);
      if (
        !build.items.every((id) => allItems.some((i) => i.id === id)) ||
        allItems.filter((i) => build.items.includes(i.id) && i.data.type === 'Boots').length > 1
      )
        throw new Error('Select valid items and no more than one pair of boots.');
      await db
        .insert(builds)
        .values({ id: build.build_id, heroId: build.hero_id, data: build, approved: true })
        .onConflictDoUpdate({
          target: builds.id,
          set: { data: build, heroId: build.hero_id, approved: true },
        });
    } else if (resource === 'guides') {
      const guide = data as Guide;
      await db
        .insert(guides)
        .values({ id: guide.guide_id, data: guide })
        .onConflictDoUpdate({ target: guides.id, set: { data: guide } });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to save content' },
      { status: 400 },
    );
  }
}
export async function DELETE(req: NextRequest, ctx: Context) {
  try {
    requireMutation(req);
    if (!(await isAdmin()))
      return NextResponse.json({ error: 'Owner authentication required' }, { status: 401 });
    const { resource } = await ctx.params;
    const id = req.nextUrl.searchParams.get('id');
    if (!id) throw new Error('Missing ID');
    if (resource === 'heroes')
      await db.transaction(async (tx) => {
        const all = await tx.select().from(heroes);
        for (const row of all)
          if (row.data.counters.includes(id))
            await tx
              .update(heroes)
              .set({ data: { ...row.data, counters: row.data.counters.filter((x) => x !== id) } })
              .where(eq(heroes.id, row.id));
        await tx.delete(heroes).where(eq(heroes.id, id));
      });
    else if (resource === 'items') {
      const all = await db.select().from(builds);
      if (all.some((b) => b.data.items.includes(id)))
        throw new Error('Remove this item from existing builds before deleting it.');
      await db.delete(items).where(eq(items.id, id));
    } else if (resource === 'builds') await db.delete(builds).where(eq(builds.id, id));
    else if (resource === 'guides') await db.delete(guides).where(eq(guides.id, id));
    else throw new Error('Unknown content type');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete content' },
      { status: 400 },
    );
  }
}
