# S9 — Threat symbology and design pass (FR-7)

Issue: #12. Closes via the story PR. Depends on S5 (threat source) and S7 (panel
parity). First story past the cut-line.

## Purpose

Color becomes meaning on the map: white, amber, red from the single computed
threat source, the CRITICAL pulse ring (the licensed glow), a legend, and a
token audit across all chrome (i.e., the ruled design system, fully enforced).

## Design

- Marker symbology: fill color from `asset.threat` (ink, amber, red tokens)
  applied in the asset layer diff; threat changes restyle in place.
- CRITICAL pulse: one additional canvas circle per critical asset, radius
  animated in the motion loop (S3 owns the only rAF), opacity fading with
  radius. Glow exception 1 of 3 (T1); no other element emits.
- Legend: bottom-left glass chip listing the three states plus the Sentinel
  hexagon, mono microlabels (the mockup's legend, made real).
- Token audit: sweep all chrome for hardcoded values; everything resolves to
  the token sheet. Disabled and hover states use the ruled glass grammar.

## Interfaces

No wire, REST, or store changes: S9 renders existing state.

## Decisions

- The pulse animates in the existing rAF loop rather than CSS: canvas markers
  have no DOM to animate, and one loop owning all motion is the S3 contract.
- Symbology lives entirely in the layer's style function: S5 owns what threat
  is, S9 owns only what it looks like.

## Acceptance

- FR-7 acceptance criteria (colors, WARNING at 120 s, CRITICAL ring, panel
  parity from the single source).
- Legend present and readable at both map themes' zoom range.
- No hardcoded colors outside tokens.css (grep-verifiable).

## Review

Pending design gate.
