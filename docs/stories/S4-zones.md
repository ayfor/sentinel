# S4 — Zones (FR-2, first half)

Issue: #7. Closes via the story PR. Depends on S2.

## Purpose

Give operators restricted zones: polygon draw and delete on the map, persisted
server-side, visible in every client within a second. TTE and threat remain
placeholders until S5 computes them.

## Design

- Drawing: leaflet-geoman, polygon tool plus removal mode only (no vertex
  editing, per the FR-2 ruling). Draw toolbar styled to the token sheet.
- On draw complete the client POSTs the ring; the server assigns the id and the
  next designator (RZ-01, RZ-02, ...), stores the zone, emits a `zones`
  broadcast and a `ZONE` event. The local geoman layer is removed immediately;
  the rendered zone always comes back from the store (single source of truth,
  D3 applied to geometry).
- `client/src/map/zoneLayer.ts`: imperative like the asset layer; renders each
  zone as a red dashed polygon (token: --red at 12 percent fill) with a
  designator label at the centroid.
- Validation, server-authoritative (client-side geoman also prevents
  self-intersection at draw time via allowSelfIntersection false). A ring is
  valid iff all of the following hold; anything else is a 400 with a reason
  and no broadcast:
  1. 3+ vertices after normalizing away a duplicated closing point (first ==
     last is tolerated and stripped).
  2. Every coordinate finite: lat in [-90, 90], lng in [-180, 180], no NaN or
     Infinity.
  3. No zero-length edges (consecutive duplicate vertices).
  4. Non-degenerate: nonzero area (an all-collinear ring has no interior, so
     breach against it is meaningless).
  5. Simple: no self-intersecting edges (a figure-eight makes "inside"
     ambiguous, so TTE and breach semantics would depend on fill rule; the
     O(n squared) segment-intersection check is trivial at zone scale).
  6. At most 100 vertices (payload sanity).
- Rejection feedback is client-local and transient: a red-glass notice chip
  (threat-chip tokens) below the status bar shows the reason from the 400
  body and auto-dismisses after about 5 seconds. Rejections are private to
  the submitting tab: they never enter the event stream, which broadcasts to
  every operator. Primary UX is prevention (geoman blocks self-intersection
  and short rings at draw time); the notice is the safety net for the
  server-authoritative path.

## Interfaces

### Data Model

```mermaid
erDiagram
    WORLD ||--o{ ZONE : "holds, server-side only"
    ZONE {
        string id "server-assigned, stable across broadcasts"
        string name "designator RZ-01, RZ-02 ... server-assigned in creation order"
        LatLng_array ring "3+ vertices, closed implicitly, first point not repeated"
    }
    ZONE ||..o{ ASSET : "derives TTE, breach, nearestZoneMeters (S5)"
```

ZONE is the `ZonePolygon` wire type from the S1 contract, populated for the
first time here; no wire change. The ring is stored exactly as drawn (no
simplification, no vertex editing per the FR-2 ruling), and the dotted
relationship is computed by S5, not stored: zones hold no references to
assets.

### Messages and Endpoints

| Name | Type | Action | Payload | Description |
|---|---|---|---|---|
| `/api/zones` | REST | POST | `{ ring: LatLng[] }` | Creates a zone; server assigns id and designator. Returns the zone. |
| `/api/zones/:id` | REST | DELETE | — | Removes the zone; recomputation and drone disengage follow on the next tick. |
| `zones` | WebSocket | push, server to client | `ZonePolygon[]` | Full zone list on any change. |

### Sequence Diagram - Zone Creation

```mermaid
sequenceDiagram
    box Client A
        participant GEO as geoman draw
        participant STOREA as worldStore A
    end
    box Server
        participant REST as POST /api/zones
        participant WORLD as world state
        participant CAST as broadcaster
    end
    box Client B
        participant STOREB as worldStore B
    end
    GEO->>REST: ring
    alt ring valid (3+ finite points in bounds)
        REST->>WORLD: assign RZ-##, store
        WORLD->>CAST: zones changed
        CAST->>STOREA: zones message
        CAST->>STOREB: zones message
    else invalid ring
        REST->>GEO: 400 with reason, no broadcast, local layer discarded
        GEO->>GEO: red-glass notice chip with reason, auto-dismiss ~5 s (client-local)
    end
```

## Decisions

Story-local decisions are numbered for citation from code (S4#dN).
- d1: The drawn geoman layer is discarded and re-rendered from the broadcast: both
  tabs render zones from identical state, and the drawing tab cannot drift
  from the server.
- d2: Full zone list per broadcast (not deltas), matching the D8 wholesale
  philosophy at zone scale (a handful of polygons).
- d3: Designators are server-assigned so two tabs drawing concurrently cannot
  mint RZ-01 twice.
- d4: Rejection feedback is client-local, never an event: the event stream is
  shared operational context for all operators, and a single tab's invalid
  submission is not. The 400 response body is already private to the
  submitter; the notice chip surfaces it.

## Acceptance

- Draw a polygon: it appears with a designator in both tabs within 1 s.
- Delete a zone: gone from both tabs within 1 s.
- Zones survive client refresh (server-persisted, rehydrated via snapshot).
- Invalid rings are rejected with a 400 and no broadcast.

## Review

### Round 1 - Design Gate, Operator Comments (Verbatim)

> Do we have a model of zone for the s4 design doc? like ERD?

### Disposition

It was missing. Data Model section added: the ZONE entity with field
annotations (server-assigned id and designator, ring storage rule), its
containment in WORLD, and the dotted computed-not-stored relationship to
assets via S5. Noted as the S1 contract type populated here, no wire change.

### Round 2 - Design Gate, Operator Comments (Verbatim)

> What defines an invalid ring?

### Disposition (Round 2)

The doc under-specified it (arity, finiteness, bounds only). Validation
expanded to the full six-clause definition: arity after closing-point
normalization, finite coordinates in range, no zero-length edges,
non-degenerate area, simplicity (no self-intersection, with the fill-rule
ambiguity rationale), and a vertex cap. Client-side geoman prevents
self-intersection at draw time; the server verifies regardless.

### Round 3 - Design Gate, Operator Comments (Verbatim)

> How do we inform the user that they submitted an invalid polygon?

### Disposition (Round 3)

The doc had silent discard. Added: client-local transient rejection notice
(red-glass chip below the status bar, reason from the 400 body, auto-dismiss
about 5 s), recorded as S4#d4 with the privacy rationale (rejections never
enter the shared event stream). Sequence diagram carries the notice in the
invalid branch. Prevention remains the primary UX; the notice is the
server-authoritative safety net.

Pending design gate, round 4.
