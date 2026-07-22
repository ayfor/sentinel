# S12 — Traffic structure (extra)

Issue: created with this doc. Closes via the story PR. Depends on S1 only;
scheduled with S9, cuttable without trace.

## Purpose

Organize the generator's traffic so the sector reads as real airspace and
scenarios become reliable: corridor streams a drawn zone can intercept on cue,
instead of waiting for a lucky wanderer.

## Design

- About 60 percent of assets spawn on 4 corridors (great-circle lines with
  lateral jitter of about 3 km and staggered along-track spacing of 8 to 15
  km): the YYZ-YUL trunk (SW to NE), YOW arrivals from the east, YOW arrivals
  from the west, and a high transatlantic band across the north. The remainder
  keep the existing scatter behavior.
- Corridor assets hold the corridor bearing with a bounded 2 degree drift (no
  center-bias steering) and recycle on sector exit: despawn and respawn at the
  corridor entry, preserving the stream. Recycling emits no events; ids rotate
  so the client disposal path (S2 decision 3) is exercised continuously.
- Corridor speeds cluster per corridor (plus or minus 10 percent) so streams
  read as flows.
- No formations or military flights: T4 rules out decorative fiction; civil
  corridor structure is the honest realism.

## Interfaces

No wire, REST, or client changes: the world simply moves differently.

## Decisions

- Corridors over scripted scenarios: organic, repeatable demo pressure without
  a canned intruder. The breach-shadow sequence becomes reproducible by
  drawing a zone across a stream.
- Asset count unchanged (120): structure, not density, is what was missing.

## Acceptance

- Streams visibly flow along 4 corridors; scatter traffic persists elsewhere.
- Drawing a zone across a corridor yields breaches within about a minute.
- Client handles continuous id turnover without leaks (marker count stable).

## Review

### Genesis - Operator Direction (Verbatim)

> This seems like a pretty good point to talk about asset clustering and how dense we want to make these assets with respect to one now and whether we want them to be in formations that are more geared towards showcasing known flat patterns or particular scenarios.

Disposition: corridors-plus-scatter recommended and drafted; formations ruled
out under T4; density unchanged, structure added. Scheduled with S9, extra,
cuttable.

Pending batch design gate.
