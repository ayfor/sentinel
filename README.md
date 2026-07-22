# SENTINEL ⬡

Map-based real-time data visualization. Dominion Dynamics technical assessment, Problem 1.

A live airspace console over the Ottawa sector which includes the following:
- 100+ simulated assets
- User-drawn restricted zones with per-asset time-to-entry
- An autonomous patrol drone that shadows zone breachers
- Multi-client sync over a server-authoritative WebSocket

Status: build in progress. Story tracker: [#1](https://github.com/ayfor/sentinel/issues/1).

## Quickstart

```bash
npm install
npm run dev        # server :3001, client :5173
```

Open http://localhost:5173. Open a second tab to see sync.

## Process

This project was built with a human-directed AI workflow. The process artifacts
are part of the repository and were written as the work was completed.

```mermaid
flowchart TB
    subgraph SPEC["SPECIFICATION (human-ruled at each gate)"]
        direction LR
        A["Assessment brief"] --> B["REQUIREMENTS.md<br/>FR-1..7 including rulings"]
        B --> C["Architecture<br/>DECISIONS.md, D1-D9"]
        C --> D["Stories S0-S11<br/>tracker issue #1"]
    end

    subgraph LOOP["PER-STORY LOOP"]
        direction TB
        E["docs/stories/S#.md<br/>design doc, written before code<br/>(diagrams, interfaces, acceptance)"]
        E --> G0{"Design gate<br/>HUMAN"}
        G0 -->|"revisions"| E
        G0 -->|"approved"| F["Generate<br/>(Claude, directed by the doc)"]
        F --> G{"Review gate<br/>HUMAN"}
        G -->|"corrections"| F
        G -->|"pass"| H["REVIEW stamp in story doc<br/>+ WORKLOG.md entry"]
        H --> I["Commit keyed S#/FR-#<br/>then story PR"]
        I --> J{"PR review<br/>human + Codex (automated)"}
        J -->|"findings"| F
        J -->|"approve"| K["Merge to main<br/>story issue closed"]
    end

    D --> E
    K -.->|"next story"| E

    classDef human fill:#1a1a1a,stroke:#e0362f,stroke-width:2px,color:#f2f0ec
    classDef ai fill:#1a1a1a,stroke:#69e0db,stroke-width:1px,color:#f2f0ec
    classDef artifact fill:#111,stroke:#3b3a36,stroke-width:1px,color:#908f89
    class G0,G,J human
    class F ai
    class A,B,C,D,E,H,I,K artifact
```

Red border marks a human decision point. Cyan marks directed generation. Grey
marks a committed artifact. Corrections flow backward, including findings from
the automated PR reviewer, and each cycle is recorded in the worklog.

Three rules govern the loop. The specifications are the prompts: generation
works from [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md), the per-story design
docs, and the rulings in [`docs/DECISIONS.md`](docs/DECISIONS.md), not from
ad-hoc instructions. Nothing merges unreviewed: every story doc carries a REVIEW
stamp recording what was checked, corrected, or rejected, transcribed from
review comments on the story PR. The trail is auditable:
[`docs/LLM.md`](docs/LLM.md), [`docs/llm/WORKLOG.md`](docs/llm/WORKLOG.md), and
the story-keyed commit history.

## Design

The visual direction was extracted from a reference board I curate, using an AI
process to extract design patterns, taste and common elements of components.
From this extraction, there is a feedback loop with sample mockups to determine
and finalize design direction. As a starting point, interactive components use a
glass treatment adapted from my own prior design system. Non-interactive
surfaces stay flat to create a clear visual hierarchy for the user. Additional
details can be found in `docs/DESIGN.md`.

## Architecture

The architecture for this application is a straightforward mono repo that runs a
server broadcasting at a rate of 1Hz using Fastify. The backend computes the
state of data display (e.g., TTE, perimeter breach, threat status) and
broadcasts using Websockets to the client(s) so that clients remain lightweight
and in-sync across instances.

The client of the application consists of Vite, React, TypeScript and Leaflet.
The role of the client in this application is to render the backend-computed
state and accept gestures from the user.

Client commands (zone and patrol drawing) are sent via REST API. All state
flows back to clients over the WebSocket, one way.

```mermaid
flowchart LR
    subgraph CLIENT["client/ (Vite + React + TS)"]
        direction TB
        GEO["Draw controls<br/>(geoman)"]
        WS_HOOK["useWebSocket"]
        STORE["World store<br/>(Zustand)"]
        MOTION["Motion interpolator<br/>(rAF, one tick behind)"]
        LAYERS["Map layers<br/>assets, zones, drone, trails"]
        PANELS["Slide-out panels<br/>inspector, event log"]
        WS_HOOK --> STORE
        STORE --> LAYERS
        STORE --> PANELS
        MOTION --> LAYERS
    end

    subgraph SERVER["server/ (Fastify + ws)"]
        direction TB
        REST["REST routes<br/>/api/zones, /api/patrol"]
        SIM["Sim core, 1Hz tick<br/>generator, drone FSM,<br/>derived truth (TTE, threat)"]
        WORLD["World state<br/>assets + ring buffers,<br/>zones, patrol, events"]
        CAST["WS broadcaster<br/>snapshot + per-tick state"]
        REST --> WORLD
        SIM --> WORLD
        WORLD --> CAST
    end

    TYPES["shared/types.ts<br/>wire contract"]

    GEO -->|"commands (REST)"| REST
    CAST -->|"state (WS, one way)"| WS_HOOK
    CLIENT -.-> TYPES
    SERVER -.-> TYPES

    classDef comp fill:#111,stroke:#3b3a36,stroke-width:1px,color:#f2f0ec
    class GEO,WS_HOOK,STORE,MOTION,LAYERS,PANELS,REST,SIM,WORLD,CAST,TYPES comp
```

This diagram is re-verified against each story design doc at its gate and
updated when a story changes the component picture.

Tradeoff assessments for these components and design decisions can be found in
[`docs/DECISIONS.md`](docs/DECISIONS.md)
