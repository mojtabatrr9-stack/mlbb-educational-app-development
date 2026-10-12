import { db } from '@/db';
import { builds, heroes, interactions, items, ratings, visits } from '@/db/schema';
import { requireMutation } from '@/lib/auth';
import { and, avg, count, desc, eq, gte } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
export async function GET(req: NextRequest) {
  const heroId = req.nextUrl.searchParams.get('hero');
  if (!heroId) return NextResponse.json({ error: 'Choose a hero' }, { status: 400 });
  const [comments, result] = await Promise.all([
    db
      .select({
        id: interactions.id,
        content: interactions.content,
        createdAt: interactions.createdAt,
      })
      .from(interactions)
      .where(
        and(
          eq(interactions.heroId, heroId),
          eq(interactions.kind, 'comment'),
          eq(interactions.approved, true),
        ),
      )
      .orderBy(desc(interactions.createdAt))
      .limit(30),
    db
      .select({ average: avg(ratings.rating), total: count() })
      .from(ratings)
      .where(eq(ratings.heroId, heroId)),
  ]);
  return NextResponse.json(
    { comments, ratings: result[0] },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function POST(req: NextRequest) {
  try {
    const visitorId = requireMutation(req);
    const body = await req.json();
    if (
      !['rating', 'comment', 'report', 'build', 'visit'].includes(body.kind) ||
      typeof body.heroId !== 'string'
    )
      return NextResponse.json(
        { error: 'Invalid interaction', code: 'invalid_interaction' },
        { status: 400 },
      );
    const [hero] = await db.select().from(heroes).where(eq(heroes.id, body.heroId));
    if (!hero)
      return NextResponse.json(
        { error: 'Hero not found', code: 'hero_not_found' },
        { status: 404 },
      );
    const [recent] = await db
      .select({ n: count() })
      .from(interactions)
      .where(
        and(
          eq(interactions.visitorId, visitorId),
          gte(interactions.createdAt, new Date(Date.now() - 3600 * 1000)),
        ),
      );
    if (recent.n >= 40)
      return NextResponse.json(
        {
          error: 'You have reached the hourly limit. Please try again later.',
          code: 'rate_limited',
        },
        { status: 429 },
      );
    if (body.kind === 'visit') {
      const existing = await db
        .select({ id: visits.id })
        .from(visits)
        .where(
          and(
            eq(visits.visitorId, visitorId),
            eq(visits.heroId, body.heroId),
            gte(visits.createdAt, new Date(Date.now() - 30 * 60 * 1000)),
          ),
        )
        .limit(1);
      if (!existing.length)
        await db.insert(visits).values({ id: randomUUID(), visitorId, heroId: body.heroId });
      return NextResponse.json({ ok: true });
    }
    if (body.kind === 'rating') {
      if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)
        return NextResponse.json(
          { error: 'Choose a rating from 1 to 5', code: 'invalid_rating' },
          { status: 400 },
        );
      await db
        .insert(ratings)
        .values({ id: randomUUID(), visitorId, heroId: body.heroId, rating: body.rating })
        .onConflictDoUpdate({
          target: [ratings.visitorId, ratings.heroId],
          set: { rating: body.rating },
        });
    } else if (body.kind === 'build') {
      if (
        typeof body.name !== 'string' ||
        body.name.trim().length < 3 ||
        body.name.length > 80 ||
        !Array.isArray(body.items) ||
        body.items.length !== 6 ||
        new Set(body.items).size !== 6
      )
        return NextResponse.json(
          { error: 'Name your build and select six different items.', code: 'invalid_build' },
          { status: 400 },
        );
      const allItems = await db.select().from(items);
      if (
        !body.items.every(
          (id: unknown) => typeof id === 'string' && allItems.some((i) => i.id === id),
        )
      )
        return NextResponse.json(
          { error: 'One or more items are unavailable', code: 'item_unavailable' },
          { status: 400 },
        );
      if (allItems.filter((i) => body.items.includes(i.id) && i.data.type === 'Boots').length > 1)
        return NextResponse.json(
          { error: 'A build can contain only one pair of boots.', code: 'one_boots' },
          { status: 400 },
        );
      const id = randomUUID();
      await db.insert(builds).values({
        id,
        heroId: body.heroId,
        approved: false,
        data: {
          build_id: id,
          hero_id: body.heroId,
          build_name: body.name.trim(),
          items: body.items,
          emblems: { type: hero.data.role },
          battle_spell: ['Retribution', 'Flicker', 'Purify', 'Inspire', 'Vengeance'].includes(
            body.spell,
          )
            ? body.spell
            : 'Flicker',
          playstyle: ['Early Game', 'Late Game', 'Balanced'].includes(body.playstyle)
            ? body.playstyle
            : 'Balanced',
          created_by: visitorId,
          is_approved: false,
        },
      });
    } else {
      if (
        typeof body.content !== 'string' ||
        body.content.trim().length < 5 ||
        body.content.length > 2000
      )
        return NextResponse.json(
          { error: 'Write between 5 and 2,000 characters.', code: 'content_length' },
          { status: 400 },
        );
    }
    await db.insert(interactions).values({
      id: randomUUID(),
      visitorId,
      heroId: body.heroId,
      kind: body.kind,
      content: typeof body.content === 'string' ? body.content.trim() : '',
      rating: body.kind === 'rating' ? body.rating : null,
    });
    return NextResponse.json({
      ok: true,
      code: body.kind === 'rating' ? 'vote_saved' : 'submitted',
      message:
        body.kind === 'rating'
          ? 'Your vote has been saved.'
          : 'Submitted for admin review. Thank you for contributing!',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Could not save your contribution.',
        code: (error as { code?: string })?.code,
      },
      { status: 400 },
    );
  }
}
