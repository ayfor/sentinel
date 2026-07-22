# S11 — Ship

Issue: #14. Closes via the story PR (the last one). Depends on everything
merged before it; S10 explicitly not a dependency.

## Purpose

Turn the repository into the submission: final docs, the disclosure assembled
from the worklog, the demo video, and the send — inside the 72-hour window.

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

- Clean-checkout verification is the acceptance bar for the quickstart: the
  reviewer's first command must work on a machine that is not this one.
- The video demonstrates failure handling on purpose (stale, TRACK LOST):
  showing degradation is the operator-console story, not a weakness.

## Acceptance

- Fresh clone runs with two commands; README matches reality.
- All deliverables from the brief present: working code, repo, README with
  architecture, LLM disclosure, video under 5 minutes.
- Submission sent inside the 72-hour window.

## Review

Pending design gate.
