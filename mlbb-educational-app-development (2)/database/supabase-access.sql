-- OPTIONAL: run AFTER applying the Drizzle schema to Supabase PostgreSQL.
-- No Supabase keys are used by the browser. The Next.js server uses DATABASE_URL.
-- Keep service credentials on the server. This policy file is not needed locally.

ALTER TABLE public.heroes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_totps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.heroes, public.items, public.guides, public.builds,
  public.user_interactions, public.hero_ratings, public.hero_visits,
  public.login_attempts, public.used_totps, public.media FROM anon, authenticated;

GRANT SELECT ON public.heroes, public.items, public.guides, public.builds TO anon, authenticated;
DROP POLICY IF EXISTS public_read_heroes ON public.heroes;
CREATE POLICY public_read_heroes ON public.heroes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS public_read_items ON public.items;
CREATE POLICY public_read_items ON public.items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS public_read_guides ON public.guides;
CREATE POLICY public_read_guides ON public.guides FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS public_read_approved_builds ON public.builds;
CREATE POLICY public_read_approved_builds ON public.builds FOR SELECT TO anon, authenticated USING (is_approved = true);
-- No INSERT/UPDATE/DELETE policies exist for clients, including authenticated users.
-- There are no client policies on moderation, ratings, visits, auth, or media tables.
-- Community writes are validated by the Next.js server, not direct PostgREST writes.
