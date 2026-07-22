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
