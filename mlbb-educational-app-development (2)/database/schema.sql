CREATE TABLE "builds" (
	"build_id" text PRIMARY KEY NOT NULL,
	"hero_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "guides" (
	"guide_id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL
);

CREATE TABLE "heroes" (
	"hero_id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "user_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"visitor_id" text NOT NULL,
	"kind" text NOT NULL,
	"hero_id" text,
	"content" text DEFAULT '' NOT NULL,
	"rating" integer,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "items" (
	"item_id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL
);

CREATE TABLE "login_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"base64_data" text NOT NULL
);

CREATE TABLE "hero_ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"visitor_id" text NOT NULL,
	"hero_id" text NOT NULL,
	"rating" integer NOT NULL
);

CREATE TABLE "used_totps" (
	"counter" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "hero_visits" (
	"id" text PRIMARY KEY NOT NULL,
	"visitor_id" text NOT NULL,
	"hero_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "builds" ADD CONSTRAINT "builds_hero_id_heroes_hero_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."heroes"("hero_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_hero_id_heroes_hero_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."heroes"("hero_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "hero_ratings" ADD CONSTRAINT "hero_ratings_hero_id_heroes_hero_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."heroes"("hero_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "hero_visits" ADD CONSTRAINT "hero_visits_hero_id_heroes_hero_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."heroes"("hero_id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "interaction_visitor_idx" ON "user_interactions" USING btree ("visitor_id","created_at");
CREATE INDEX "login_key_created_idx" ON "login_attempts" USING btree ("key","created_at");
CREATE UNIQUE INDEX "rating_visitor_hero" ON "hero_ratings" USING btree ("visitor_id","hero_id");
CREATE INDEX "visits_created_idx" ON "hero_visits" USING btree ("created_at");
