# Design System

The visual direction was not invented for this project. It was extracted from a
reference board I curate, distilled by an AI pipeline into candidate tokens and
tensions, and then ruled by me over two feedback rounds. This document records
the result and the reasoning.

## Thesis

Instrumentation as draughtsmanship: grainy near-black ground, hairline white
linework, and light strictly rationed. Only what is live, interactive, or wrong
is allowed to emit.

## Tokens

The full sheet is [`client/src/styles/tokens.css`](../client/src/styles/tokens.css);
canvas layers mirror it in [`client/src/map/palette.ts`](../client/src/map/palette.ts)
because canvas paint cannot read CSS variables (S9#d5).

| Token | Value | Role |
|---|---|---|
| `--ground` | `#0C0C0D` | working console floor, deep neutral black, no blue cast |
| `--ground-idle` | `#0A0A0A` | true black, idle and empty registers only |
| `--panel` | `#161617` | sub-2 percent white lift |
| `--line` | `#232320` | hairlines |
| `--ink` | `#F2F0EC` | bright warm white; contrast comes from ink against floor, never saturation |
| `--dim` | `#908F89` | micro-labels |
| `--faint` | `#3B3A36` | recessed labels |
| `--red` | `#E0362F` | threat and alert, exclusively (T2) |
| `--amber` | `#EF9F27` | warning tier |
| `--cyan` | `#69E0DB` | the Sentinel, mode flags, active state (T2) |

The palette was deliberately de-blued from the first extraction pass; the darks
were deepened and the contrast made punchier on my direction.

## Rulings (T1 to T6)

- T1: glow budget of exactly three exceptions (the breach pulse ring, the
  CRITICAL bloom, the shadow tether). Nothing else emits.
- T2: red means threat, only ever. The tether is cyan for exactly this reason.
- T3: monospace everywhere in-console; tracked uppercase micro-labels; tabular
  numerals.
- T4: zero decorative fiction. No fake data, no invented military traffic; the
  corridor structure (S12) is civil realism, not theater.
- T5: the slide-out mechanics. Corner-pinned telemetry that never moves;
  panels slide in on selection and retract on deselect; the event log is a
  one-line ticker that slides up to the full log.
- T6: grounds as tokenized. The two blacks never mix in one view.

## Layout

OPT-B, the naked map: full-bleed map, no icon rail, no persistent chrome.
Corner-pinned mono telemetry (status bar top, ticker bottom-left, legend
bottom-right) holds position at all times because stability reads as
credibility. Selection slides the inspector in from the right; the interceptor
panel reuses the same shell (S10).

## Glass grammar

Interactables only. The world is drafted, flat and sharp with grain; the
controls are machined. The grammar is adapted from my Mox Market V2 Figma
component library (Atoms and Molecules), re-hued for SENTINEL:

- neutral: ink at 6 percent fill, ink at 8 percent stroke
- active: cyan at 15 percent fill, cyan at 40 percent stroke
- threat chips (read-only): red at 15 percent fill, red at 40 percent stroke,
  which preserves T2
- backdrop blur 12 px on panels and the drawer
- disabled: 40 percent opacity

Deliberate deviations from the Mox source: radius 2 px instead of 6 or 12 (the
sharp-edges ruling), square chips instead of pills, and emerald unseated by
cyan as the active hue.

## Motifs

Dotted lines are projected or reference paths (e.g., the S7 prediction);
dashed lines are boundaries (zones) and standing routes (the patrol); faded
solid polylines are history (the S7 trail). The drone is the one glyph of
identity: a hollow cyan hexagon.
