# Requirements

Functional requirements converted from the assessment brief (Problem 1), ruled at
Gate 1. Numbering is dependency order: zones exist before the drone that reacts to
them. Non-functional expectations (performance, UX clarity, code structure) are
treated as build discipline rather than scoped requirements.

## FR-1: Live asset ingestion

The system maintains at least 100 concurrently tracked assets with live position,
heading, and speed.

- At any instant after startup, 100+ assets are tracked and rendered.
- Positions update continuously without page refresh.
- Dual source: a built-in telemetry generator (demo default) and a live public
  feed toggle. The demo never depends on third-party uptime (D9).
- Feed failure falls back to the generator and logs an event.

## FR-2: Restricted zones and time-to-entry

Users draw polygon zones. Every asset carries a live TTE against them.

- Polygon draw and delete on the map; multiple zones; zones persist server-side.
- TTE is the time until the asset's straight-line projection at current speed and
  heading first intersects any zone boundary, recomputed each tick.
- A diverging vector displays as no-entry. An asset inside a zone displays as
  BREACHED.
- Vertex editing of existing zones is out of scope (create and delete only).
- Deleting a zone recomputes threat state immediately.

## FR-3: Autonomous drone, patrol and shadow

One drone (SEN-01) flies a user-drawn patrol path. When any asset is inside any
zone, the drone pursues the nearest breaching asset.

- The user draws a polyline patrol path; the drone follows it waypoint to
  waypoint, looping.
- On breach, the drone switches patrol to shadow and steers each tick toward the
  target with a speed cap.
- When the target exits all zones or despawns, the drone returns to patrol at
  its nearest waypoint.
- Nearest means nearest breacher to the drone, re-evaluated each tick, with a
  20 percent hysteresis margin before retargeting.
- Shadow pursues the target's current position. No standoff-distance modeling in
  this scope.
- No patrol path drawn means the drone holds at spawn in an idle state.

## FR-4: Asset intel on selection

- Clicking an asset renders its historical trajectory as an opacity-faded
  polyline from a 5-minute ring buffer.
- A predicted path projects the average heading and speed of the last 5 minutes
  forward 5 minutes, drawn dotted.
- A slide-out info panel shows callsign, altitude, speed, heading, TTE, distance
  to nearest zone, and threat level.
- Deselecting clears the trail, prediction, and panel.
- An asset that despawns while selected shows TRACK LOST and clears.

## FR-5: Multi-client real-time sync

- All shared state (assets, zones, patrol path, drone state, events) is
  server-authoritative and broadcast over the WebSocket.
- A zone or patrol drawn in one tab is visible in another within 1 second.
- Connect and reconnect deliver a full snapshot, then per-tick state.
- Selection is per-client and not synced.
- A dropped socket shows a stale-feed indicator and reconnects with backoff.

## FR-6 (Extra): Interceptor dispatch

- On breach, an interceptor spawns at the nearest airport from a static Canadian
  airport dataset and flies toward the breacher.
- The interceptor detail panel shows the target's identity and speed and a live
  intercept-time estimate from closing speed.
- The interceptor is a separate entity class from SEN-01 and despawns when its
  target exits all zones.
- Built only after FR-1 through FR-5 and FR-7 are complete.

## FR-7 (Extra): Threat symbology

- NORMAL renders ink white, WARNING amber, CRITICAL red with a pulse ring.
- WARNING threshold: TTE at or under 120 seconds.
- The info panel threat level and map symbology derive from a single computed
  source (D3).
