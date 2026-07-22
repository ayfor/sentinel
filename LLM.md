# LLM Use Disclosure

Per the assessment's LLM-use requirements: model, role breakdown, specifications
given, and workflow & prompting. The full description of the pipeline lives in the
[README](README.md#the-process--from-requirements-to-prs); the live per-gate log is
[`docs/llm/WORKLOG.md`](docs/llm/WORKLOG.md).

## Model

Claude Fable 5 (Anthropic), operated through Claude Code (agentic CLI) in a
persistent session with repository, browser-preview, and design-tool access.

## Role breakdown

| Responsibility | Human (Josh Stubbington) | LLM |
|---|---|---|
| Requirements (FR-1..7, edge-case rulings) | Ruled every item; reordered FR-2/3 for dependency order | Drafted conversions from the brief |
| Architecture (D1–D6) | Ruled all six; supplied rationale on the record | Proposed options with tradeoffs |
| Design system | Curated the reference board; ruled palette, layout, six taste tensions, glass amendment | Ran the extraction pipeline; proposed tokens and mockup options |
| Story designs (`docs/stories/`) | Gate-reviewed each; REVIEW stamps record corrections | Drafted docs from ruled material |
| Code | Reviewed every diff at story gates; line-level review on TTE math and drone FSM | Generated implementation between gates |
| Verification | Acceptance on every story; demo direction | Typechecks, preview checks, test authoring under direction |
| Docs (README, DECISIONS, this file) | Voice, structure rules, final edit | Drafting within those rules |

## Specifications given to the LLM

The specification corpus is in-tree and version-controlled — it *is* the prompt
material: [`REQUIREMENTS.md`](REQUIREMENTS.md) · [`DECISIONS.md`](DECISIONS.md) ·
[`docs/stories/*.md`](docs/stories/) · the design-token sheet
(`client/src/styles/tokens.css`). Conversational directives at each gate are
excerpted verbatim in the worklog.

## Workflow & prompting

The workflow is the pipeline diagrammed in the
[README](README.md#the-process--from-requirements-to-prs) — not repeated here.
What this disclosure adds: **how the model was prompted, and where the evidence
is.** Prompting was structured specification rather than ad-hoc instruction —
the documents above were the prompts. Conversational directives at each gate are
excerpted verbatim in [`docs/llm/WORKLOG.md`](docs/llm/WORKLOG.md), one entry per
gate, alongside what was generated and what the human corrected or rejected
(also stamped in each story doc's REVIEW field).
