// Pure spherical geometry. No dependencies, importable by server and client,
// unit-testable in isolation (S5 builds TTE on these exact functions).

import type { LatLng } from './types.js';

const EARTH_RADIUS_M = 6371000;
export const FULL_CIRCLE_DEG = 360;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Normalize a bearing into [0, 360). */
export function normalizeBearing(deg: number): number {
  return ((deg % FULL_CIRCLE_DEG) + FULL_CIRCLE_DEG) % FULL_CIRCLE_DEG;
}

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return normalizeBearing(toDeg(Math.atan2(y, x)));
}

/**
 * Point reached from origin on a bearing after traveling a distance: the
 * spherical "direct" problem, solved on a great circle.
 *
 * Steps:
 * 1. Convert the surface distance to an angular distance at the Earth's
 *    center (delta = d / R).
 * 2. Convert bearing and origin to radians (phi = latitude, lambda =
 *    longitude, theta = bearing).
 * 3. New latitude: combine the origin's northness (sin phi1 * cos delta)
 *    with the northward component of the step
 *    (cos phi1 * sin delta * cos theta); asin recovers the angle.
 * 4. New longitude: the eastward step component (sin theta * sin delta *
 *    cos phi1) against what remains of the step after the latitude change
 *    (cos delta - sin phi1 * sin phi2); atan2 gives the longitude offset,
 *    added to lambda1.
 * 5. Convert back to degrees.
 */
export function destinationPoint(origin: LatLng, bearing: number, distanceM: number): LatLng {
  const delta = distanceM / EARTH_RADIUS_M; // step 1
  const theta = toRad(bearing); // step 2
  const phi1 = toRad(origin.lat);
  const lambda1 = toRad(origin.lng);
  const phi2 = Math.asin( // step 3
    Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta),
  );
  const lambda2 = // step 4
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2),
    );
  return { lat: toDeg(phi2), lng: toDeg(lambda2) }; // step 5
}

const METERS_PER_DEG_LAT = 111320;

/**
 * Point-in-ring test, ray cast on raw coordinates (planar approximation is
 * adequate at sector scale). Boundary-inclusive: a point on an edge or vertex
 * counts as inside — conservative for restricted zones (S5#d4).
 */
export function pointInPolygon(p: LatLng, ring: LatLng[]): boolean {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    const cross = (b.lng - a.lng) * (p.lat - a.lat) - (b.lat - a.lat) * (p.lng - a.lng);
    if (
      cross === 0 &&
      Math.min(a.lng, b.lng) <= p.lng && p.lng <= Math.max(a.lng, b.lng) &&
      Math.min(a.lat, b.lat) <= p.lat && p.lat <= Math.max(a.lat, b.lat)
    ) {
      return true;
    }
  }
  let inside = false;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    const straddles = a.lat > p.lat !== b.lat > p.lat;
    if (straddles && p.lng < a.lng + ((p.lat - a.lat) / (b.lat - a.lat)) * (b.lng - a.lng)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Distance from a point to a segment in meters, equirectangular projection
 * centered on the point (planar approximation, adequate at sector scale).
 */
export function distanceToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const scale = Math.cos(toRad(p.lat));
  const ax = (a.lng - p.lng) * scale * METERS_PER_DEG_LAT;
  const ay = (a.lat - p.lat) * METERS_PER_DEG_LAT;
  const bx = (b.lng - p.lng) * scale * METERS_PER_DEG_LAT;
  const by = (b.lat - p.lat) * METERS_PER_DEG_LAT;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt(cx * cx + cy * cy);
}
