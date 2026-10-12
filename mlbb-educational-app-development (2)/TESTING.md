# Validation report — Phases 1–3 (repair · i18n · roster)

## Commands (all passing)
| Command | Result |
|---|---|
| `npx next typegen` · `npm run typecheck` · `npm run lint` · `npm run format:check` | ✅ |
| `npm test` (Vitest) | ✅ 18/18 — calculators, validators, seed integrity, **EN/FA key parity + placeholder parity**, Persian digit/search normalisation, **124-hero roster validation** |
| `npm run build` | ✅ (routes `/[locale]`, `/[locale]/admin`, sitemap, robots) |
| `npm run test:e2e` | ✅ 14/14 (see below) |
| `npm run test:admin` | ✅ 13/13 (2FA, CRUD on bilingual records, upload, moderation) |
| `npm audit --omit=dev` | ✅ 0 production vulnerabilities |

## E2E coverage
Cold load `/` → 307 to `/en`, no 4xx/5xx, fonts loaded · axe (no critical) · filters · search/favorites/vote/comment · build calculator · counters & guides · timers · read-only admin · unauthorized API rejection · 390 px drawer + switch to `/fa` (`<html lang="fa" dir="rtl">`) · **100+ hero cards, Arabic-kaf Persian search (`كاگورا` → Kagura), imported skill icons** · **every section on `/fa` is RTL, has a Persian heading, no horizontal overflow and no English UI strings; curated lore in Persian; Persian digits in stats; admin in Persian** · offline reload · no runtime errors.

Screenshots: `artifacts/nexus-fa-desktop.png`, `nexus-fa-hero.png`, `nexus-fa-admin.png`, plus the Phase-1 set.

## Roster import (`ICON_REPORT.md`)
124 heroes · 495/496 skill icons · 124/124 portraits (12 via head-icon fallback) · 109 items with icons · 77 in-game-guide builds mapped. Database after `npm run db:seed`: 124 heroes, 104 items, 84 approved builds; 54 legacy rows upgraded to the bilingual shape without touching owner edits.

## Known limits (stated in the UI)
- Imported heroes: skill text is English from the in-game guide with a visible “ترجمهٔ فارسی در انتظار است” notice; cooldowns/costs are `null` (“—”); base stats are role placeholders (`estimated` badge); lane inferred; tier `Unrated`.
- The roster source lists heroes up to **Chip (124)**. Heroes released after that are not in the source and must be added in the admin panel (the glossary already includes several newer names).
- Lighthouse was not re-run in this phase; the SPA bundle grew with the roster (catalog ≈ 600 KB JSON). Route-level splitting is scheduled for Phase 5.
