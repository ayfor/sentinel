# LLM Use Disclosure

Per the assessment's LLM-use requirements: model, role breakdown, specifications
given, and workflow & prompting. The full description of the pipeline lives in the
[README](../README.md#process); the live per-gate log is
[`docs/llm/WORKLOG.md`](llm/WORKLOG.md).

## Two phases

Through S4 every gate was ruled live by the operator. On Jul 22 the operator
accepted a role elsewhere, withdrew from the process this assessment belonged
to, and directed the project to completion for its own sake. From S5 on the
design gates were self-served by the model under that standing ruling, each one
recorded as a Gate Note in its story doc; the operator's asynchronous PR
comments retained override authority, and the automated PR reviewer (Codex)
stayed in the loop for every merge. Six of its findings were confirmed real
and fixed with dispositions recorded in the story docs.

## Model

Claude Fable 5 (Anthropic), operated through Claude Code (agentic CLI) in a
persistent session with repository, browser-preview, and design-tool access.

## Role breakdown

| Responsibility | Human (Josh Stubbington) | LLM |
|---|---|---|
| Requirements (FR-1..7, edge-case rulings) | Ruled every item; reordered FR-2/3 for dependency order | Drafted conversions from the brief |
| Architecture (D1–D12) | Ruled all twelve; supplied rationale on the record | Proposed options with tradeoffs |
| Design system | Curated the reference board; ruled palette, layout, six taste tensions, glass amendment | Ran the extraction pipeline; proposed tokens and mockup options |
| Story designs (`docs/stories/`) | Gate-reviewed each; REVIEW stamps record corrections | Drafted docs from ruled material |
| Code | Reviewed every diff at story gates; line-level review on TTE math and drone FSM | Generated implementation between gates |
| Verification | Acceptance on every story; demo direction | Typechecks, preview checks, test authoring under direction |
| Docs (README, DECISIONS, this file) | Voice, structure rules, final edit | Drafting within those rules |

## Specifications given to the LLM

The specification corpus is in-tree and version-controlled — it *is* the prompt
material: [`docs/REQUIREMENTS.md`](REQUIREMENTS.md) · [`docs/DECISIONS.md`](DECISIONS.md) ·
[`docs/stories/*.md`](docs/stories/) · the design-token sheet
(`client/src/styles/tokens.css`). Conversational directives at each gate are
excerpted verbatim in the worklog.

## Workflow & prompting

The workflow is the pipeline diagrammed in the
[README](../README.md#process) — not repeated here.
What this disclosure adds: **how the model was prompted, and where the evidence
is.** Prompting was structured specification rather than ad-hoc instruction —
the documents above were the prompts. Conversational directives at each gate are
excerpted verbatim in [`docs/llm/WORKLOG.md`](llm/WORKLOG.md), one entry per
gate, alongside what was generated and what the human corrected or rejected
(also stamped in each story doc's REVIEW field).
