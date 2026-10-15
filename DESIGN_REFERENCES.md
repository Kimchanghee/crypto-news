# Design references — dailycryptonews.online v2

## Metaphor
**Ship's log / network weather report.** Each day is a dated log entry; each section is a numbered
"reading" written into a ruled logbook page, with the time/label in a red-ruled margin column and the
observation in the body column. Mempool backlog is reported as a "sea state" band (Calm → Storm).
The job of the site is to *record and explain* conditions, not to sell, so the visual language is a
working document rather than a marketing page.

## Tokens
| Token | Value | Use |
|---|---|---|
| `--paper` | `#f4efe3` | page ground (logbook paper) |
| `--paper-deep` | `#e9e1cf` | colophon, inline code |
| `--ink` | `#1c2530` | text (contrast 14.3:1 on paper) |
| `--ink-soft` | `#46505c` | secondary text (7.4:1) |
| `--rule` / `--rule-strong` | `#c3cfd9` / `#8fa3b5` | ledger rules (decorative) |
| `--margin` | `#a8322a` | margin rule, entry marks, warnings (6.2:1) |
| `--sea` | `#1d4c69` | links, data fills (8.9:1) |
| `--focus` | `#0b5cad` | 3 px focus outline |
| Serif | Charter → Iowan → Palatino → Georgia | headings, prose |
| Mono | ui-monospace → Cascadia Mono → Consolas | readings, labels, stamps |
| Scale | 0.875 / 1.0625 / 1.25 / 1.6 / clamp(1.9–2.75) rem | |

No web fonts are downloaded (system stacks only) → no font CLS, no third-party font requests.

## Components
- **Entry** (`.entry`): 2-column grid ≥60rem (9.5rem margin column + body), stacked on mobile.
- **Stamp** (`.stamp`): rubber-stamp style as-of line; turns red with "Stale reading" when data is >6 h old or a source failed.
- **Readings table**: ledger rules, tabular numerals, right-aligned figures, no boxes.
- **Sea-state band**: build-time inline SVG on a log scale with the current reading marked.
- **Countdown bars**: build-time inline SVG progress rules (halving era, difficulty epoch).
- **Ad slot**: fixed 280 px min-height between readings (no CLS), labelled.

## States
Stale/unavailable source (stamp variant + "Ethereum fee data is unavailable" branch), invalid tool
input (aria-invalid + red border + alert text, outputs reset to "—"), empty archive, live-check
failure message on the countdown, genuine 404 page with recovery links. `prefers-reduced-motion`
disables all transitions (there are no animations).

## Rejected defaults
No hero, gradients, glass, glow, rounded cards, pills, hover-lift or decorative metric tiles. The two
"figure" cells are real readings (epoch progress, hashrate) in a ruled row, not dashboard cards.

## OSS principles consulted
- GOV.UK Design System — https://github.com/alphagov/govuk-frontend (MIT): visible 3 px focus,
  native form controls, error message placement next to the field, 44 px targets.
- USWDS — https://github.com/uswds/uswds (public domain / CC0 for original work): data table
  conventions (right-aligned numerals, captions, scoped headers).
No code or assets copied; principles only.

## Distinctness check vs kimchipremium.online
Kimchipremium uses a dark exchange-booth rate board with Korean sans type and a two-market
"bridge" layout; this site is a light paper logbook with serif type and margin-column entries.
