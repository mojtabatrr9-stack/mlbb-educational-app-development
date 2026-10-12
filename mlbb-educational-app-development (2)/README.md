# Nexus — MLBB Educational Companion

An independent, bilingual (EN/FA) learning companion for Mobile Legends: Bang Bang.
Next.js 16 (App Router) · React 19 · TypeScript · Drizzle ORM + PostgreSQL · PWA with offline hero library · Flutter companion shell.

> Unofficial fan/educational project. MLBB, hero names, skills and artwork belong to Moonton.

## Zero-local-setup options

| Option | What you need | Steps |
|---|---|---|
| **GitHub Codespaces** (recommended for old PCs) | A browser | Repo → **Code → Codespaces → Create**. The dev container starts PostgreSQL, installs deps, pushes the schema and seeds. Run `npm run dev`. |
| **Docker** | Docker Desktop | `docker compose up -d` → `docker compose exec app bash` → `npm ci && npm run db:push -- --force && npm run db:seed && npm run dev` |
| **Cloud deploy** | Vercel or Render + Supabase | See [`DEPLOYMENT.en.md`](DEPLOYMENT.en.md) / [`DEPLOYMENT.md`](DEPLOYMENT.md) (فارسی). |

## Languages & data
- Routes are locale-prefixed: `/en`, `/fa` (RTL, Vazirmatn, Persian digits, Jalali dates). `/` redirects by cookie / Accept-Language (`src/proxy.ts`).
- All UI strings live in `messages/*.json`; content fields are `{ en, fa }`. See [CONTENT_GUIDE.md](CONTENT_GUIDE.md).
- `node scripts/import-roster.mjs` imports the full hero roster, skill icons, portraits and items into `content/roster.json` + `public/images` (report in `ICON_REPORT.md`). `npm run db:seed` loads it and upgrades legacy rows.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js lifecycle. `prebuild` runs `assets` automatically. |
| `npm run assets` | Regenerates icons, favicon, maskable/Apple icons, OG image; re-downloads missing hero portraits. Safe offline (fallbacks render). `-- --force` regenerates everything. |
| `npm run typecheck` · `lint` · `format` · `format:check` | Code quality. |
| `npm test` | Vitest unit tests (`tests/`). |
| `npm run test:e2e` | Playwright smoke suite incl. axe, 404 check, mobile/RTL, offline. Needs a running server (`BASE_URL`). |
| `npm run test:admin` | Owner 2FA/CRUD integration suite on a temporary loopback server. **Test database only.** |
| `npm run db:push` · `db:generate` · `db:migrate` | Drizzle schema management. |
| `npm run db:seed` | Idempotent seed + bilingual upgrade; never overwrites owner edits. |
| `node scripts/import-roster.mjs [--force]` | Re-import roster, icons and items from the configured sources (`ASSET_SOURCES`). |

## Project layout

```
src/app/                 routes, API handlers, layout (fonts, SW manager)
src/components/          UI — workspaces/ split per feature, smart-image, service-worker-manager
src/lib/                 types, seed, validation, auth, calculations, client-stores
public/                  icon.svg (source of all icons), sw.js, generated assets
scripts/                 ensure-assets, seed, setup-admin, smoke/admin/axe tests
tests/                   Vitest unit tests
mobile/                  Flutter companion shell (see DEPLOYMENT §9)
.github/workflows/ci.yml format → typecheck → lint → unit → build → e2e → admin
```

Documentation: [DESIGN.md](DESIGN.md) · [TESTING.md](TESTING.md) · [DEPLOYMENT.md](DEPLOYMENT.md) · [DEPLOYMENT.en.md](DEPLOYMENT.en.md)
