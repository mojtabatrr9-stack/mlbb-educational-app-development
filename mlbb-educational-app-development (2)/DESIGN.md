# Nexus — design handoff

## Direction
A calm, editorial companion for competitive players. Dark plum-black surfaces, lavender accents, muted mint feedback, and original cinematic key art. Focus on readable decisions rather than a noisy game HUD.

## Tokens
The editable source of truth is `src/app/globals.css`.

| Token | Value | Purpose |
|---|---|---|
| Background | `#101014` | Main canvas |
| Surface | `#18171e` | Cards and panels |
| Raised surface | `#1e1c25` | Secondary controls |
| Border | `#2b2833` | Quiet separators |
| Primary | `#ad88ef` | Actions and selection |
| Text | `#f3f1f7` | High emphasis |
| Muted | `#8d899c` | Supporting text |
| Success | `#78c5a7` | Status and improvements |

## Typography
- Inter variable: labels, body, tables.
- Space Grotesk variable: editorial headlines and numbers.
- Vazirmatn variable: Persian navigation and headings.
- Self-hosted under `public/fonts` with `font-display: swap`.

## Layout
Desktop: 214px fixed navigation, 69px top bar, 30px content gutters. Overview uses a cinematic banner, three tool shortcuts, a 4-column hero grid and a 255px editorial rail. At narrower widths, columns collapse and navigation becomes an icon rail. At 520px and below, navigation becomes an accessible drawer; hero cards use two columns.

## Components and source files
- Brand mark: `public/icon.svg`, `src/components/ui.tsx`.
- Hero cards, role chips, content rail: `src/components/nexus-app.tsx`.
- Accessible dialogs, stat radar, skills, community: `src/components/hero-detail.tsx`.
- Build calculator, item cards, timers, guide layouts: `src/components/workspaces.tsx`.
- Owner tables, editor forms, AI draft editor: `src/components/admin-app.tsx`.
- Original hero banner: `public/images/nexus-hero.webp`.

## Interaction principles
Keep public exploration anonymous. Make persistence explicit: saved heroes/builds are local; votes/comments/reports are server-side. Label illustrative data instead of implying live match telemetry. AI output is a draft, never an implicit publish action. Include error, empty, loading, disabled, selected, offline, and read-only states.

## Accessibility
Semantic controls; visible focus rings; dialog focus trap and Escape handling; reduced-motion mode; named icon buttons; responsive zoom; labeled fields; keyboard search shortcut. The EN/FA toggle changes navigation copy, language metadata and direction; seed articles remain in their authored language. A full translation of every tool and article is a separate editorial task.

No proprietary Figma file is included. CSS tokens, SVG assets, and component source form the editable design handoff. Font license files are in `public/fonts`.
