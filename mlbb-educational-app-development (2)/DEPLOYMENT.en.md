# Nexus — Deployment guide (English)

The Persian guide [`DEPLOYMENT.md`](DEPLOYMENT.md) is the detailed reference (security model, Supabase RLS, OpenAI, Flutter). This page is the short English path, written for owners who **cannot run Node 22 or PostgreSQL locally** (e.g. Windows 7, 4 GB RAM).

## 1. Develop without a local install — GitHub Codespaces

1. Push the project to a GitHub repository.
2. **Code → Codespaces → Create codespace on main.**
3. The dev container (`.devcontainer/`) starts PostgreSQL 16, runs `npm ci`, installs Chromium for tests, pushes the schema and seeds.
4. Run `npm run dev` and open the forwarded port 3000.

Everything (seed, asset generation, migrations, tests) runs inside the codespace or in CI. Nothing needs a local database.

## 2. Production: Supabase (database) + Vercel or Render (app)

**Database — Supabase**
1. Create a project. Copy the **session pooler** connection string (Project settings → Database).
2. From a codespace: `DATABASE_URL="<supabase-url>" npm run db:push -- --force && DATABASE_URL="<supabase-url>" npm run db:seed`.
3. Optional hardening: run `database/supabase-access.sql` in the SQL editor.

**App — Vercel**
1. Import the repository. Framework preset: Next.js. Node 22.
2. Environment variables: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` (e.g. `https://nexus.example.com`), and the owner variables below.
3. Deploy. `prebuild` regenerates icons/OG image automatically.

**App — Render** (alternative)
1. New → Web Service → from repo, runtime **Docker** (uses the included `Dockerfile`), or Node with build `npm ci && npm run build` and start `npm run start -- -p $PORT`.
2. Same environment variables. Health check path: `/api/health`.

## 3. Owner access (admin) — no default credentials

Generate values in a codespace: `node scripts/setup-admin.mjs you@example.com`, then set
`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_TOTP_SECRET`, `SESSION_SECRET` in your host's secret manager and add the TOTP secret to an authenticator app. Optional: `OPENAI_API_KEY`, `OPENAI_MODEL`.

## 4. Assets and binary files

Icons, favicons, the maskable icon, Apple touch icon and the OG image are **generated** from `public/icon.svg` on every build. Missing hero portraits are re-downloaded (best effort); anything still missing renders a generated role-coloured placeholder — never a broken image. Fonts come from `@fontsource-variable/*` packages and are bundled by Next.js (self-hosted WOFF2, CSP `font-src 'self'`).
The banner `public/images/nexus-hero.webp` is original generated art; if it is lost, a gradient stand-in is generated. Keep the original in the repository.

## 5. Continuous integration

`.github/workflows/ci.yml` runs on every push/PR: format check, typecheck, lint, unit tests, schema push + seed on a Postgres service, production build, Playwright e2e (axe, 404, mobile/RTL, offline) and the owner integration suite. Screenshots are uploaded as artifacts.

## 6. Legal

MLBB names and artwork belong to Moonton; Nexus is an unofficial educational project. Before a public commercial launch, replace hero artwork with licensed or original art (an `ASSET_SOURCE` switch is planned in Phase 3).
