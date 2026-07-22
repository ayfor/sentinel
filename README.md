# SENTINEL ⬡

Map-based real-time data visualization. Dominion Dynamics technical assessment, Problem 1.

A live airspace console over the Ottawa sector: 100+ simulated assets, user-drawn
restricted zones with per-asset time-to-entry, an autonomous patrol drone that
shadows zone breachers, and multi-client sync over a server-authoritative WebSocket.

Status: build in progress. Story tracker: [#1](https://github.com/ayfor/sentinel/issues/1).

## Quickstart

```bash
npm install
npm run dev        # server :3001, client :5173
```

Open http://localhost:5173. Open a second tab to see sync.

## Process: from requirements to PRs

This project was built with a human-directed AI workflow. The process artifacts
are part of the repository and were written as the work happened.

```mermaid
flowchart TB
    subgraph SPEC["SPECIFICATION (human-ruled at each gate)"]
        direction LR
        A["Assessment brief"] --> B["REQUIREMENTS.md<br/>FR-1..7 + edge rulings"]
        B --> C["Architecture<br/>DECISIONS.md, D1-D9"]
        C --> D["Stories S0-S11<br/>tracker issue #1"]
    end

    subgraph LOOP["PER-STORY LOOP"]
        direction TB
        E["docs/stories/S#.md<br/>design doc, written before code<br/>(diagrams, interfaces, acceptance)"]
        E -->|"gate: design approved"| F["Generate<br/>(Claude, directed by the doc)"]
        F --> G{"Review gate<br/>HUMAN"}
        G -->|"corrections"| F
        G -->|"pass"| H["REVIEW stamp in story doc<br/>+ WORKLOG.md entry"]
        H --> I["Commit keyed S#/FR-#<br/>then story PR"]
        I --> J{"PR review<br/>human + Codex (automated)"}
        J -->|"findings"| F
        J -->|"approve"| K["Merge to main<br/>tracker box checked"]
    end

    D --> E
    K -.->|"next story"| E

    classDef human fill:#1a1a1a,stroke:#e0362f,stroke-width:2px,color:#f2f0ec
    classDef ai fill:#1a1a1a,stroke:#69e0db,stroke-width:1px,color:#f2f0ec
    classDef artifact fill:#111,stroke:#3b3a36,stroke-width:1px,color:#908f89
    class G,J human
    class F ai
    class A,B,C,D,E,H,I,K artifact
```

Red border marks a human decision point. Cyan marks directed generation. Grey
marks a committed artifact. Corrections flow backward, including findings from
the automated PR reviewer, and each cycle is recorded in the worklog.

Three rules govern the loop. The specifications are the prompts: generation
works from [`REQUIREMENTS.md`](REQUIREMENTS.md), the per-story design docs, and
the rulings in [`DECISIONS.md`](DECISIONS.md), not from ad-hoc instructions.
Nothing merges unreviewed: every story doc carries a REVIEW stamp recording what
was checked, corrected, or rejected, transcribed from review comments on the
story PR. The trail is auditable:
[`LLM.md`](LLM.md), [`docs/llm/WORKLOG.md`](docs/llm/WORKLOG.md), and the
story-keyed commit history.

## Design

The visual direction was extracted from a reference board I curate, using an AI
vision pipeline, then ruled by hand: palette, layout, and six taste tensions
were resolved before the first line of code. Interactive components use a glass
treatment adapted from my own prior design system. Non-interactive surfaces stay
flat. Full rationale lands in `docs/DESIGN.md` at ship.

## Architecture

npm workspaces monorepo. `server/` runs the 1 Hz simulation core on Fastify and
computes all derived state (TTE, breach, threat) so clients never disagree.
`client/` is Vite, React, TypeScript, and plain Leaflet, responsible for
rendering and gestures only. `shared/types.ts` is the wire contract both sides
import. REST carries commands. The WebSocket carries state, one way. Tradeoffs
are recorded in [`DECISIONS.md`](DECISIONS.md).
