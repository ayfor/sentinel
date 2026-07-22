# S0 — Scaffold

**PURPOSE** — Stand up the monorepo so every later story lands in a running system: server boots, client renders the dark map, the shared types package is importable from both ends.

**DESIGN**
- npm workspaces monorepo: `server/` (Fastify + ws, run via `tsx watch`), `client/` (Vite + React + TS), `shared/` (types only, no build step — imported by path).
- TypeScript strict everywhere; one `tsconfig.base.json`, extended per workspace.
- Client boots to a full-viewport Leaflet map (canvas renderer, CARTO dark basemap) with the design tokens as CSS variables and the SENTINEL top bar.
- Server boots with `/health` and an empty WS endpoint; ports: server **3001**, Vite dev **5173** with `/api` + `/ws` proxied to 3001.
- No test runner yet (arrives in S5 with the first pure functions — vitest).

**INTERFACES**

| name | method | params | description |
|---|---|---|---|
| `/health` | GET | — | Liveness check; returns `{ ok: true }`. |
| `/ws` | WS | — | Upgrade endpoint; S1 gives it a protocol. |

**DECISIONS**
- npm workspaces over pnpm/turbo: zero new tooling, three packages don't earn a build system.
- `shared/` consumed by TS path alias, not a published package: one less moving part; the wire contract stays a single file both sides import.
- CARTO dark tiles over OSM default: the ruled design system's ground; no API key.

**ACCEPTANCE**
- `npm run dev` starts server + client concurrently; map renders dark and pans; `/health` responds; a type in `shared/types.ts` imports cleanly on both sides.

**REVIEW** — _pending Josh's gate stamp_
