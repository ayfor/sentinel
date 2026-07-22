# LLM Worklog

Append-only, written at each review gate: directives, what was generated, what the
human changed. Verbatim quotes are the operator's own words at the gate. Human
review comments left on story PRs are transcribed here and into the story doc's
REVIEW field at gate close; the operator writes review notes once, on the PR.
Times ET.

## Pre-code · Jul 20 (night) — Design system via taste extraction
SPEC — operator's curated 24-pin reference board ("sentinel", Pinterest)
PIPELINE — browser harvest → vision agents (per-pin palette/format/mood records) →
cluster + design-language synthesis → human shortlist review
HUMAN RULINGS — palette corrected: *"Less blue-grey… I want the darks to be deeper…
More punchy contrast"* → ground #0C0C0D, ink #F2F0EC, neutral-warm greys. Layout:
*"option B initially with maybe some slide-out data panels."* Six taste tensions
(glow budget, red = threat only, mono-only, zero decorative fiction, panel
mechanics, ground split) each explicitly ruled.

## Pre-code · Jul 21 (evening) — Execution judgment + operating contract
DIRECTIVE — *"We need to make a judgement call as to whether the emphasis should be
on showcasing process over code craft."* Ruling: directed-agentic build; human =
architect + reviewer; bar = every decision whiteboard-defensible.
CONTRACT — *"We are going to be more atomic about our workflow. I need input at
every stroke… this project doesn't read as scale, it reads as craft."* → phase-gate
review, intent-before-code story docs, precise word-economical documentation.

## Pre-code · Jul 21 — Requirements (Gate 1)
DIRECTIVE — *"converting each Required and Extra list item to requirements… then
provide it to me for a review."* LLM drafted FR set + edge-case rulings; human
trimmed scope to functional-only (*"We are maintaining high-level scope"*) and
re-ordered for dependency: *"swap the implementation order of FR2 and FR3… so we
can define a restricted zone before we make assets interact with them."* Locked.

## Pre-code · Jul 21 — Architecture (Gate 2, D1–D6)
LLM proposed options w/ tradeoffs; human ruled each on the record, e.g. D4:
*"There are no requirements that specify data retention, just data consistency…
we will need some sort of historical trajectory. Though that is state, not
persistence."* D5 accepted after mechanism walkthrough (entity interpolation).

## Pre-code · Jul 21 — Design amendment from prior art (Figma)
DIRECTIVE — *"I like Sentinel's colour palette, bold distinguishable contrast and
sharp edges. But I want there to be some gradient and smooth texture to the
interactable components."* LLM extracted exact paint values from the operator's own
Mox Market V2 design system (Atoms/Molecules); finding: the smoothness is a glass
grammar (tint fill + same-hue hairline + backdrop blur), not gradients. Amendment
ruled: glass on interactables only, sharp radii kept, one licensed sheen gradient.

## S0 · Jul 21 ~21:00 — Scaffold
SPEC — docs/stories/S0-scaffold.md (gated before code)
GENERATED — monorepo (shared/server/client), Fastify+ws boot, Vite+React+Leaflet
dark map, full token sheet, launch config. ~19 files.
GATE — verification: strict typecheck clean, zero console errors, /api/health green
through proxy. One correction at gate: proxy 404 → server routes given explicit
/api prefix (D7). Honest AC note: client-side @shared import is wired and
typechecked but first exercised in S2.
HUMAN REVIEW — (stamp pending in story doc)
EXTERNAL REVIEW — Codex (automated PR reviewer) flagged P2: test scripts advertised
vitest before S5 declares it; fixed at gate by dropping the scripts until S5.

## S1 · Jul 21 ~22:45-23:55 — World tick
SPEC — docs/stories/S1-world-tick.md, two-round design gate before code
GENERATED — wire contract (WsMessage union), shared/geo.ts pure geometry,
world/generator/tick/broadcast modules, README component-diagram delta.
GATE — verification: strict typechecks, live WS probe (snapshot 120 assets,
three consecutive ticks, one aircraft tracked moving consistently with its
vector). Diff hygiene correction at gate: Vite dep cache stripped and ignored.
HUMAN REVIEW — four rounds, all verbatim in the story doc: design-gate revisions
(TRACK_HISTORY clarity, header conventions, ThreatLevel enum now, verbose prop
names, interface-table schema); gate stamp "Approved, proceed with S1"; PR-window
questions that exposed a magic number (HISTORY_CAPACITY now derived from
TICK_MS), an understated memory estimate (corrected to ~0.9 MB), and two
fabricated ERD pseudo-columns (removed); PR inline comments (FULL_CIRCLE_DEG
const, timestampMs renames, EventKind extraction, verbose tick locals,
step-by-step destinationPoint docs). Merged as PR #15; issue #4 closed.

## S2 · Jul 22 ~00:15-02:30 — Asset render
SPEC — docs/stories/S2-asset-render.md (design gate: sequence-diagram revision
rounds incl. client/server boxes and the failure case, all verbatim in doc)
GENERATED — useWebSocket, Zustand world store, imperative canvas assetLayer,
StatusBar. ~4 files.
GATE — verification: strict typecheck, live preview (120 tracks, FEED LIVE);
invalid-hook-call console noise investigated via page instrumentation and
ruled a dev-only HMR transient (clean on every cold load).
HUMAN REVIEW — verbatim in doc: design-gate rounds (sequence diagram, boxes,
failure case, titleized tables, no-age-out disposal semantics with the S7
selected-asset flag); PR rounds (EVENT_CAPACITY documentation birthing the
S#dN decision-point nomenclature, operator; wss scheme under HTTPS, Codex P1);
functional-testing comment (pan-vs-click, no hover) scoped to S7 and recorded
there, improving its hit-slop design to renderer tolerance. Merged as PR #16;
issue #5 closed.
