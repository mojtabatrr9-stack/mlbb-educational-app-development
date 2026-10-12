# Icon & roster import report

Generated 2026-10-11T15:40:29.094Z by `scripts/import-roster.mjs` (sources: mapi, equipment-dataset).

| Asset | Covered | Missing |
|---|---|---|
| Heroes imported | 124 | — |
| Hero portraits | 124 / 124 | 0 |
| Skill icons | 495 / 496 | 1 |
| Items imported | 109 | — |
| Item icons | 109 / 109 | 0 |
| Builds mapped from in-game guide | 77 | 47 heroes without a fully mapped gear list |

Missing assets render a generated role-coloured SVG placeholder in the UI (never a broken image).

## Fallbacks
- portrait · Cici: Input buffer contains unsupported image format
- portrait · Nolan: Input buffer contains unsupported image format
- portrait · Julian: Input buffer contains unsupported image format
- portrait · Chip: Input buffer contains unsupported image format
- portrait · Ixia: Input buffer contains unsupported image format
- portrait · Arlott: Input buffer contains unsupported image format
- portrait · Xavier: Input buffer contains unsupported image format
- portrait · Yin: Input buffer contains unsupported image format
- portrait · Phoveus: Input buffer contains unsupported image format
- portrait · Natan: Input buffer contains unsupported image format
- portrait · Beatrix: Input buffer contains unsupported image format
- portrait · Gloo: Input buffer contains unsupported image format
- skill · Aulus / : Failed to parse URL from 

## Data quality
- Skill names/descriptions: from the in-game hero guide (`quality.skills = source`). Cooldowns and costs are **not** provided by the source and are stored as `null` (shown as “—”).
- Base stats: role-typical placeholders (`quality.stats = estimated`) — the owner should replace them from the in-game stats panel.
- Lane: inferred from role (`quality.lane = estimated`). Tier: `Unrated` until the owner places the hero.
- Items from the equipment dataset carry name, price and icon only; stats and passives are empty until verified.

## Rights
Mobile Legends: Bang Bang hero names, skills and artwork belong to Moonton. Assets are cached locally for this unofficial educational project; set `ASSET_SOURCES` to swap in licensed/original art before a public launch.
