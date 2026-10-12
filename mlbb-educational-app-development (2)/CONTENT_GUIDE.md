# Content & translation guide

## Where content lives
| Content | Source of truth | Notes |
|---|---|---|
| UI strings | `messages/en.json`, `messages/fa.json` | Same key set in both files (enforced by `tests/messages.test.ts`). Use `{name}` placeholders. |
| Terminology | `content/glossary.fa.json` | Hero transliterations (`heroes`), item names (`items`), and loan-word terms. Edit, then `npm run db:seed` to propagate `name_fa`. |
| Curated heroes / items / builds / guides | `src/lib/seed.ts` | Bilingual `{ en, fa }` fields. Owner edits in the admin panel always win over the seed. |
| Imported roster | `content/roster.json` (generated) | `node scripts/import-roster.mjs`; English only, `fa` left empty for the owner/AI to fill. |

## Writing a hero guide
1. In **Admin → Heroes**, open the hero. Every translatable field shows **English | فارسی** side by side; fields without Persian are flagged.
2. Use **“پیش‌نویس ترجمهٔ فارسی”** to get an AI draft (owner-only; never auto-published), then review it.
3. Fill `cooldown` / `mana_cost` only when verified in-game; leave empty otherwise (shown as “—”).
4. Set **Stats data quality** honestly: `verified` (checked in-game this patch), `source` (in-game guide text), `editorial`, `estimated`.
5. Set **Patch version** and **Last verified** so players can judge freshness.

## Persian style rules
- Loan-words that Iranian players use stay as-is: تانک، فایتر، اساسین، میج، مارکسمن، ساپورت، گانک، رُتیشن، کانتر، بیلد، ایمبلم، کول‌داون، باف.
- Use ZWNJ (نیم‌فاصله) in compounds: می‌کند، هم‌تیمی، تیم‌فایت، سبک‌بالی.
- Persian digits are produced automatically by the formatter; do not type Latin digits inside Persian sentences.
- Hero and item proper names: use the glossary transliteration; keep the Latin name in `name`.
- Markdown headings/lists are preserved in both languages; keep the structure identical so the side-by-side editor stays aligned.

## Data quality badges
`verified` · `source` · `editorial` · `estimated` · `unknown` — rendered as a small badge next to stats/skills/builds. Never present an estimate as official data.
