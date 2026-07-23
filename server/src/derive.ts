import type { Asset, ThreatLevel, ZonePolygon } from '../../shared/types.js';
import { destinationPoint, distanceToSegmentMeters, pointInPolygon } from '../../shared/geo.js';

/** Sampled-projection bounds (S5#d1, S5#d2). */
const PROJECTION_STEP_S = 1;
const PROJECTION_HORIZON_S = 600;

/** FR-7 ruling: WARNING at or under 120 s to entry. */
export const WARNING_TTE_S = 120;

const insideAnyZone = (pos: Asset['pos'], zones: ZonePolygon[]) =>
  zones.some((zone) => pointInPolygon(pos, zone.ring));

/**
 * Seconds until the asset's straight-line projection first samples inside any
 * zone; 0 if already inside; null if no crossing within the horizon (S5#d2 —
 * beyond ten minutes a straight-line prediction is fiction).
 */
export function computeTimeToEntry(asset: Asset, zones: ZonePolygon[]): number | null {
  if (zones.length === 0) return null;
  if (insideAnyZone(asset.pos, zones)) return 0;
  for (let t = PROJECTION_STEP_S; t <= PROJECTION_HORIZON_S; t += PROJECTION_STEP_S) {
    const projected = destinationPoint(asset.pos, asset.headingDeg, asset.speedMps * t);
    if (insideAnyZone(projected, zones)) return t;
  }
  return null;
}

/** Minimum edge distance across all zones; null when no zones exist (S5#d5). */
export function computeNearestZoneMeters(asset: Asset, zones: ZonePolygon[]): number | null {
  let nearest: number | null = null;
  for (const zone of zones) {
    const n = zone.ring.length;
    for (let i = 0; i < n; i++) {
      const d = distanceToSegmentMeters(asset.pos, zone.ring[i]!, zone.ring[(i + 1) % n]!);
      if (nearest === null || d < nearest) nearest = d;
    }
  }
  return nearest;
}

/** FR-7: CRITICAL when breached, WARNING at or under 120 s, else NORMAL. */
export function computeThreat(tteSeconds: number | null, breached: boolean): ThreatLevel {
  if (breached) return 'CRITICAL';
  if (tteSeconds !== null && tteSeconds <= WARNING_TTE_S) return 'WARNING';
  return 'NORMAL';
}

/** Fill an asset's derived fields in place. Pure inputs to pure outputs (S5#d3). */
export function deriveAsset(asset: Asset, zones: ZonePolygon[]): void {
  const tte = computeTimeToEntry(asset, zones);
  asset.timeToEntrySeconds = tte;
  asset.nearestZoneMeters = computeNearestZoneMeters(asset, zones);
  asset.threat = computeThreat(tte, tte === 0);
}
