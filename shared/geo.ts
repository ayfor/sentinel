// Pure spherical geometry. No dependencies, importable by server and client,
// unit-testable in isolation (S5 builds TTE on these exact functions).

import type { LatLng } from './types.js';

const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Normalize a bearing into [0, 360). */
export function normalizeBearing(deg: number): number {
  return ((deg % 360) + 360) % 360;
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

/** Point reached from origin on a bearing after traveling a distance. */
export function destinationPoint(origin: LatLng, bearing: number, distanceM: number): LatLng {
  const delta = distanceM / EARTH_RADIUS_M;
  const theta = toRad(bearing);
  const phi1 = toRad(origin.lat);
  const lambda1 = toRad(origin.lng);
  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta),
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2),
    );
  return { lat: toDeg(phi2), lng: toDeg(lambda2) };
}
