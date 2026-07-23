import type { LatLng, ZonePolygon } from '../../shared/types.js';

/** Payload sanity cap (S4 validation clause 6). */
const MAX_VERTICES = 100;

export type RingValidation = { ok: true; ring: LatLng[] } | { ok: false; reason: string };

const isFiniteCoord = (p: LatLng) =>
  Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

const samePoint = (a: LatLng, b: LatLng) => a.lat === b.lat && a.lng === b.lng;

/** Twice the signed area via the shoelace formula; zero means degenerate. */
const twiceSignedArea = (ring: LatLng[]) => {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    sum += a.lng * b.lat - b.lng * a.lat;
  }
  return sum;
};

/**
 * General segment intersection for NON-ADJACENT edges: proper crossings,
 * endpoint-on-segment touches (T-junctions, pinched rings via a repeated
 * non-adjacent vertex), and collinear overlaps all count — any contact
 * between non-adjacent edges breaks ring simplicity (Codex P2 on PR #20;
 * the earlier strict test returned false whenever an orientation was 0).
 */
const orient = (a: LatLng, b: LatLng, c: LatLng) =>
  Math.sign((b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng));

const onSegment = (a: LatLng, b: LatLng, p: LatLng) =>
  Math.min(a.lng, b.lng) <= p.lng && p.lng <= Math.max(a.lng, b.lng) &&
  Math.min(a.lat, b.lat) <= p.lat && p.lat <= Math.max(a.lat, b.lat);

const segmentsCross = (p1: LatLng, p2: LatLng, q1: LatLng, q2: LatLng) => {
  const o1 = orient(p1, p2, q1);
  const o2 = orient(p1, p2, q2);
  const o3 = orient(q1, q2, p1);
  const o4 = orient(q1, q2, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, p2, q2)) return true;
  if (o3 === 0 && onSegment(q1, q2, p1)) return true;
  return o4 === 0 && onSegment(q1, q2, p2);
};

/**
 * The six-clause ring validation (S4 design, rounds 2-5). Bounds are the
 * WGS84 coordinate domain, deliberately not the sector box. Closure is
 * implicit; an explicitly closed ring from the client is normalized (clause 1).
 */
export function validateRing(input: unknown): RingValidation {
  if (!Array.isArray(input)) return { ok: false, reason: 'ring must be an array of points' };

  let ring = input as LatLng[];
  if (
    !ring.every(
      (p) => typeof p === 'object' && p !== null && typeof p.lat === 'number' && typeof p.lng === 'number',
    )
  ) {
    return { ok: false, reason: 'every point needs numeric lat and lng' };
  }

  // Clause 1: tolerate and strip explicit closure, then check arity.
  if (ring.length >= 2 && samePoint(ring[0]!, ring[ring.length - 1]!)) ring = ring.slice(0, -1);
  if (ring.length < 3) return { ok: false, reason: 'a ring needs at least 3 distinct vertices' };

  // Clause 6: payload sanity.
  if (ring.length > MAX_VERTICES) return { ok: false, reason: `at most ${MAX_VERTICES} vertices` };

  // Clause 2: finite coordinates in the WGS84 domain.
  if (!ring.every(isFiniteCoord)) {
    return { ok: false, reason: 'coordinates must be finite, lat in [-90,90], lng in [-180,180]' };
  }

  // Clause 3: no zero-length edges.
  for (let i = 0; i < ring.length; i++) {
    if (samePoint(ring[i]!, ring[(i + 1) % ring.length]!)) {
      return { ok: false, reason: 'consecutive duplicate vertices (zero-length edge)' };
    }
  }

  // Clause 5 runs before clause 4 (S4#d5): a symmetric figure-eight has zero SIGNED
  // area (equal-and-opposite lobes cancel in the shoelace sum), so testing
  // degeneracy first would misreport self-intersection as collinearity.
  // Simplicity — no self-intersection (adjacent edges share an endpoint and
  // are skipped; the O(n^2) sweep is trivial at zone scale).
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segmentsCross(ring[i]!, ring[(i + 1) % n]!, ring[j]!, ring[(j + 1) % n]!)) {
        return { ok: false, reason: 'ring is self-intersecting' };
      }
    }
  }

  // Clause 4: non-degenerate area (safe now — simple rings with zero signed
  // area are genuinely collinear).
  if (twiceSignedArea(ring) === 0) {
    return { ok: false, reason: 'ring has no interior (collinear vertices)' };
  }

  return { ok: true, ring };
}

/** Designators are server-assigned in creation order and never reused (S4#d3). */
export function createZone(ring: LatLng[], creationNumber: number): ZonePolygon {
  return {
    id: `zone-${creationNumber}`,
    name: `RZ-${String(creationNumber).padStart(2, '0')}`,
    ring,
  };
}

/**
 * Patrol path validation (S6): an open polyline needs only arity, the vertex
 * cap, and the WGS84 domain — no closure, area, or simplicity clauses.
 */
export function validatePath(input: unknown): { ok: true; points: LatLng[] } | { ok: false; reason: string } {
  if (!Array.isArray(input)) return { ok: false, reason: 'points must be an array' };
  const points = input as LatLng[];
  if (
    !points.every(
      (p) => typeof p === 'object' && p !== null && typeof p.lat === 'number' && typeof p.lng === 'number',
    )
  ) {
    return { ok: false, reason: 'every point needs numeric lat and lng' };
  }
  if (points.length < 2) return { ok: false, reason: 'a patrol path needs at least 2 points' };
  if (points.length > MAX_VERTICES) return { ok: false, reason: `at most ${MAX_VERTICES} vertices` };
  if (!points.every(isFiniteCoord)) {
    return { ok: false, reason: 'coordinates must be finite, lat in [-90,90], lng in [-180,180]' };
  }
  return { ok: true, points };
}
