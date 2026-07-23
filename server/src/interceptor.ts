import type { Asset, Interceptor, LatLng } from '../../shared/types.js';
import { bearingDeg, destinationPoint, distanceMeters } from '../../shared/geo.js';
import { nearestAirport } from './airports.js';
import type { World } from './world.js';

export const INTERCEPTOR_SPEED_MPS = 450;

/**
 * Closing-speed intercept estimate (S10#d2): distance over the component of
 * relative velocity along the line of sight. Null when not closing — an
 * opening geometry reports no estimate, not a fiction.
 */
export function interceptEstimateSeconds(interceptor: Interceptor, target: Asset): number | null {
  const dist = distanceMeters(interceptor.pos, target.pos);
  if (dist < 1) return 0;
  const losBearing = (bearingDeg(interceptor.pos, target.pos) * Math.PI) / 180;
  const iHeading = (interceptor.headingDeg * Math.PI) / 180;
  const tHeading = (target.headingDeg * Math.PI) / 180;
  const closing =
    interceptor.speedMps * Math.cos(iHeading - losBearing) -
    target.speedMps * Math.cos(tHeading - losBearing);
  if (closing <= 0) return null;
  return Math.round(dist / closing);
}

const flyToward = (interceptor: Interceptor, target: LatLng, dt: number): void => {
  const dist = distanceMeters(interceptor.pos, target);
  interceptor.headingDeg = bearingDeg(interceptor.pos, target);
  interceptor.pos =
    dist <= interceptor.speedMps * dt
      ? { ...target }
      : destinationPoint(interceptor.pos, interceptor.headingDeg, interceptor.speedMps * dt);
};

/**
 * Interceptor lifecycle (S10, FR-6), ticked after derive so breach truth is
 * current: dispatch one interceptor per breacher from the nearest airport
 * (S10#d1, S10#d4), pursue directly (the S6#d1 honesty rule), stand down
 * when the target is no longer breached, despawned, or recycled.
 */
export function stepInterceptors(
  world: World,
  dt: number,
  emitEvent: (kind: 'BREACH', text: string) => void,
): void {
  const breachers = new Map<string, Asset>();
  for (const asset of world.assets.values()) {
    if (asset.timeToEntrySeconds === 0) breachers.set(asset.id, asset);
  }

  // Stand-down pass.
  for (const [id, interceptor] of world.interceptors) {
    if (!breachers.has(interceptor.targetId)) {
      world.interceptors.delete(id);
      emitEvent('BREACH', `${interceptor.callsign} standing down (target clear)`);
    }
  }

  // Dispatch pass (S10#d1: one per breacher, never reassigned).
  const assigned = new Set([...world.interceptors.values()].map((i) => i.targetId));
  for (const breacher of breachers.values()) {
    if (assigned.has(breacher.id)) continue;
    const airport = nearestAirport(breacher.pos);
    const callsign = `VIPER-${String(++world.interceptorCounter).padStart(2, '0')}`;
    const interceptor: Interceptor = {
      id: `interceptor-${world.interceptorCounter}`,
      callsign,
      pos: { ...airport.pos },
      headingDeg: bearingDeg(airport.pos, breacher.pos),
      speedMps: INTERCEPTOR_SPEED_MPS,
      originIcao: airport.icao,
      targetId: breacher.id,
      interceptSeconds: null,
    };
    world.interceptors.set(interceptor.id, interceptor);
    emitEvent('BREACH', `${callsign} dispatched from ${airport.icao} for ${breacher.callsign}`);
  }

  // Pursuit pass.
  for (const interceptor of world.interceptors.values()) {
    const target = breachers.get(interceptor.targetId)!;
    flyToward(interceptor, target.pos, dt);
    interceptor.interceptSeconds = interceptEstimateSeconds(interceptor, target);
  }
}
