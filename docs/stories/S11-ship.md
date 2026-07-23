# S11 — Ship

Issue: #14. Closes via the story PR (the last one). Depends on everything
merged before it; S10 explicitly not a dependency.

## Purpose

Turn the repository into the submission: final docs, the disclosure assembled
from the worklog, the demo video, and the send, inside the 72-hour window.

Amended under the wrap-up ruling (Jul 22, recorded in the S5 doc and
docs/LLM.md): the operator accepted a role elsewhere and withdrew from the
process, so the video and submission are cut. The story completes as the
repository's close-out: final docs, disclosure, and the clean-checkout bar.

## Design

- README final pass: status line updated, quickstart verified on a clean
  checkout (fresh clone, npm install, npm run dev), component diagram
  re-verified against every merged story (the standing rule's last sweep).
- `docs/DESIGN.md`: the design-system story — board extraction, rulings T1-T6,
  the ruled tokens, the glass amendment with its Mox lineage, OPT-B layout.
  Written from the existing artifacts, operator voice.
- `docs/LLM.md` finalized: role table checked against the worklog; every story
  entry present; verbatim directives spot-checked.
- Story docs: every REVIEW section closed (no pending stamps).
- Video (under 5 minutes, operator-recorded): the S11 doc carries the shot
  list — boot, live world, zone draw in two tabs, breach and shadow sequence,
  TRACK LOST, stale-feed recovery, then a 30 s repo tour (README pipeline,
  DECISIONS, a story doc with its review rounds).
- Submission: reply to the assignment email with repo link and video link;
  American spelling; the operator sends.

## Interfaces

None. This story ships the others.

## Decisions

Story-local decisions are numbered for citation from code (S11#dN).
- d1: Clean-checkout verification is the acceptance bar for the quickstart: the
  reviewer's first command must work on a machine that is not this one.
- d2: The video demonstrates failure handling on purpose (stale, TRACK LOST):
  showing degradation is the operator-console story, not a weakness.

## Acceptance

- Fresh clone runs with two commands; README matches reality.
- All deliverables from the brief present: working code, repo, README with
  architecture, LLM disclosure, video under 5 minutes.
- Submission sent inside the 72-hour window.

## Review

### Gate Note

Self-served under the wrap-up ruling; the video and submission steps were
struck by the operator's withdrawal decision, everything else held.

### Build Verification

Clean checkout (S11#d1, the acceptance bar): fresh clone of this branch into
a scratch directory, npm install (222 packages), npm test (32 green across 4
files), npm run dev, then the smoke battery: /api/health ok, client 200, a
live snapshot carrying 120 assets over the WebSocket. The quickstart is two
commands and both work on a machine that is not this one.

Docs: DESIGN.md written from the ruled artifacts; README status flipped to
complete with the S3/S10/S12 component-diagram deltas applied (the standing
rule's last sweep); LLM.md gained the two-phase gate history (operator-ruled
through S4, self-served after under the standing ruling, Codex in the loop
throughout with six confirmed findings). Every story doc's REVIEW section is
closed; no pending stamps remain. One record correction made during this
story: the S10 evidence overstated the suite at 38 tests; the true count is
32, corrected in the README, the S10 doc, and the PR body with the slip
acknowledged.
