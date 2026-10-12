import type { Build, Guide, Hero, Item } from '@/lib/types';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const heroes = pgTable('heroes', {
  id: text('hero_id').primaryKey(),
  data: jsonb('data').$type<Hero>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const items = pgTable('items', {
  id: text('item_id').primaryKey(),
  data: jsonb('data').$type<Item>().notNull(),
});
export const builds = pgTable('builds', {
  id: text('build_id').primaryKey(),
  heroId: text('hero_id')
    .notNull()
    .references(() => heroes.id, { onDelete: 'cascade' }),
  data: jsonb('data').$type<Build>().notNull(),
  approved: boolean('is_approved').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const guides = pgTable('guides', {
  id: text('guide_id').primaryKey(),
  data: jsonb('data').$type<Guide>().notNull(),
});
export const interactions = pgTable(
  'user_interactions',
  {
    id: text('id').primaryKey(),
    visitorId: text('visitor_id').notNull(),
    kind: text('kind').notNull(),
    heroId: text('hero_id').references(() => heroes.id, { onDelete: 'cascade' }),
    content: text('content').default('').notNull(),
    rating: integer('rating'),
    approved: boolean('approved').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('interaction_visitor_idx').on(t.visitorId, t.createdAt)],
);
export const ratings = pgTable(
  'hero_ratings',
  {
    id: text('id').primaryKey(),
    visitorId: text('visitor_id').notNull(),
    heroId: text('hero_id')
      .notNull()
      .references(() => heroes.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
  },
  (t) => [uniqueIndex('rating_visitor_hero').on(t.visitorId, t.heroId)],
);
export const visits = pgTable(
  'hero_visits',
  {
    id: text('id').primaryKey(),
    visitorId: text('visitor_id').notNull(),
    heroId: text('hero_id')
      .notNull()
      .references(() => heroes.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('visits_created_idx').on(t.createdAt)],
);
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('login_key_created_idx').on(t.key, t.createdAt)],
);
export const usedTotps = pgTable('used_totps', {
  counter: text('counter').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const media = pgTable('media', {
  id: text('id').primaryKey(),
  type: text('content_type').notNull(),
  data: text('base64_data').notNull(),
});
