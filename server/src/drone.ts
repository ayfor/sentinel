import type { Asset, DroneState, LatLng, PatrolPath } from '../../shared/types.js';
import { bearingDeg, destinationPoint, distanceMeters } from '../../shared/geo.js';

/** Speed caps (S6#d2): shadowing reads as following, not intercepting. */
export const PATROL_SPEED_MPS = 90;
export const SHADOW_SPEED_MPS = 140;
/** A waypoint is reached inside this radius; the next becomes the target. */
export const WAYPOINT_RADIUS_M = 500;
/** Retarget only when another breacher is more than 20 percent nearer (FR-3). */
const RETARGET_RATIO = 0.8;

export interface DroneStep {
  drone: DroneState;
  /** Waypoint cursor for the caller to persist (server-internal, not wired). */
  waypointIndex: number;
  /** SENTINEL event texts for transitions this step. */
  events: string[];
}

const nearestWaypointIndex = (pos: LatLng, points: LatLng[]): number => {
  let best = 0;
  let bestDist = Infinity;
  points.forEach((p, i) => {
    const d = distanceMeters(pos, p);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
};

const flyToward = (drone: DroneState, target: LatLng, speedMps: number, dt: number): void => {
  const dist = distanceMeters(drone.pos, target);
  drone.headingDeg = bearingDeg(drone.pos, target);
  drone.speedMps = speedMps;
  drone.pos = dist <= speedMps * dt ? { ...target } : destinationPoint(drone.pos, drone.headingDeg, speedMps * dt);
};

/**
 * One FSM step (S6#d3): pure in its inputs — mutates only the copy it returns.
 * Mode priority: shadow while any breacher exists, else patrol while a path
 * exists, else idle.
 */
export function stepDrone(
  prev: DroneState,
  patrol: PatrolPath | null,
  assets: Asset[],
  waypointIndex: number,
  dt: number,
): DroneStep {
  const drone: DroneState = { ...prev, pos: { ...prev.pos } };
  const events: string[] = [];
  let cursor = waypointIndex;

  const breachers = assets.filter((a) => a.timeToEntrySeconds === 0);

  if (breachers.length > 0) {
    let target = breachers.find((a) => a.id === drone.targetId) ?? null;
    const nearest = breachers.reduce((a, b) =>
      distanceMeters(drone.pos, a.pos) <= distanceMeters(drone.pos, b.pos) ? a : b,
    );
    if (!target) {
      target = nearest;
      events.push(
        drone.mode === 'shadow'
          ? `SEN-01 retargeting ${target.callsign} (previous target left the zone)`
          : `SEN-01 shadowing ${target.callsign}`,
      );
    } else if (
      nearest.id !== target.id &&
      distanceMeters(drone.pos, nearest.pos) < RETARGET_RATIO * distanceMeters(drone.pos, target.pos)
    ) {
      events.push(`SEN-01 retargeting ${nearest.callsign} (more than 20 percent nearer)`);
      target = nearest;
    }
    drone.mode = 'shadow';
    drone.targetId = target.id;
    flyToward(drone, target.pos, SHADOW_SPEED_MPS, dt);
    return { drone, waypointIndex: cursor, events };
  }

  if (prev.mode === 'shadow') {
    drone.targetId = null;
    if (patrol) {
      cursor = nearestWaypointIndex(drone.pos, patrol.points);
      events.push('SEN-01 all targets clear, resuming patrol');
    } else {
      events.push('SEN-01 all targets clear, holding (no patrol path)');
    }
  }

  if (patrol && patrol.points.length >= 2) {
    if (prev.mode === 'idle') events.push('SEN-01 patrol commenced');
    drone.mode = 'patrol';
    cursor = cursor % patrol.points.length;
    if (distanceMeters(drone.pos, patrol.points[cursor]!) < WAYPOINT_RADIUS_M) {
      cursor = (cursor + 1) % patrol.points.length;
    }
    flyToward(drone, patrol.points[cursor]!, PATROL_SPEED_MPS, dt);
    return { drone, waypointIndex: cursor, events };
  }

  if (prev.mode !== 'idle') events.push('SEN-01 idle (no patrol path)');
  drone.mode = 'idle';
  drone.targetId = null;
  drone.speedMps = 0;
  return { drone, waypointIndex: cursor, events };
}
