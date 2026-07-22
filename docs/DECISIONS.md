# Decisions

ADR-lite: one row per ruling — what, why, what was rejected. Story-local decisions
live in `docs/stories/`; these are the ones that shape the system.

| # | Decision | Why | Rejected |
|---|---|---|---|
| D1 | REST carries commands; WebSocket carries state, one-way server→client | Minimal, stateless actions; reliable push delivery; curl-able demo | All-WS (mutation acks + reconnect replay complexity) |
| D2 | Zustand for the client world store | One store fed by the WS hook; boring and known | useReducer+context (more code, same story) |
| D3 | All derived truth (TTE, breach, threat) computed server-side only | Clients can never disagree; panel always matches map; one implementation to test | Client-side compute (N sources of truth) |
| D4 | No database — in-memory world | No requirement specifies retention, only consistency; the 5-min trajectory ring buffer is *state*, not persistence | SQLite/Postgres (unearned infrastructure in a 72h sim) |
| D5 | Entity interpolation: render one tick behind, lerp between known fixes, never extrapolate | 100+ assets glide at 60 fps from a 1 Hz feed; extrapolation snaps backward on correction | Raw 1 Hz jumps (steppy); dead-reckoned extrapolation |
| D6 | Plain Leaflet with owned wrappers, no react-leaflet | D5 mutates markers imperatively inside a requestAnimationFrame loop; a thin wrapper of about 60 lines stays fully under our control | react-leaflet: its declarative model moves markers by re-rendering React components, which conflicts with per-frame imperative position updates at 60 fps |
| D7 | Server routes carry the `/api` prefix (`/api/health`, `/api/zones`) | The dev proxy forwards paths to the server unchanged, so the server must own the prefix; client-visible paths are then identical in development and production | Stripping the prefix with a dev-proxy rewrite rule: development and production disagree about the path, inviting environment-specific bugs |
| D8 | Full asset-state broadcast every tick (~10 KB/s at 150 assets), not diffs | The wire carries the whole truth every second — eliminates drift-bug class; zones/patrol/events broadcast on change only | Diffed deltas (bandwidth win too small to buy the complexity) |
| D9 | Generator is the demo-default data source; live public feed is a toggle | The demo can never be taken down by a third-party API; shipping both is more robust for demo purposes | Live-API-only (external dependency at evaluation time) |
| D10 | No CSS framework; token sheet plus component classes | A lot of overhead for relatively few components; the design language is bespoke recipes (glass, corner ticks, grain) that want named classes. Reconsider if scope grows to more unique pages and workflows beyond map and asset control | Tailwind (the studio default elsewhere) |

Design-system rulings (palette, layout OPT-B + slide-out panels, glass grammar for
interactables, six taste tensions T1–T6) are summarized in `docs/DESIGN.md` at ship;
tokens are law in `client/src/styles/tokens.css`.
