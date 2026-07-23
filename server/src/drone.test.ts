import { describe, expect, it } from 'vitest';
import type { Asset, DroneState, PatrolPath } from '../../shared/types.js';
import { distanceMeters } from '../../shared/geo.js';
import { PATROL_SPEED_MPS, SHADOW_SPEED_MPS, stepDrone } from './drone.js';

const drone = (partial: Partial<DroneState> = {}): DroneState => ({
  id: 'drone-sen-01',
  callsign: 'SEN-01',
  pos: { lat: 45.42, lng: -75.7 },
  headingDeg: 0,
  speedMps: 0,
  mode: 'idle',
  targetId: null,
  ...partial,
});

const breacher = (id: string, lat: number, lng: number): Asset => ({
  id,
  callsign: id.toUpperCase(),
  pos: { lat, lng },
  headingDeg: 0,
  speedMps: 200,
  altitudeM: 9000,
  threat: 'CRITICAL',
  timeToEntrySeconds: 0,
  nearestZoneMeters: 0,
});

const PATH: PatrolPath = {
  id: 'patrol-1',
  points: [
    { lat: 45.5, lng: -75.7 },
    { lat: 45.5, lng: -75.5 },
  ],
};

describe('stepDrone', () => {
  it('idle to patrol when a path exists, with a commencement event', () => {
    const step = stepDrone(drone(), PATH, [], 0, 1);
    expect(step.drone.mode).toBe('patrol');
    expect(step.drone.speedMps).toBe(PATROL_SPEED_MPS);
    expect(step.events).toContain('SEN-01 patrol commenced');
  });

  it('advances the waypoint cursor inside the 500 m radius', () => {
    const nearWp0 = drone({ mode: 'patrol', pos: { lat: 45.5, lng: -75.701 } });
    const step = stepDrone(nearWp0, PATH, [], 0, 1);
    expect(step.waypointIndex).toBe(1);
  });

  it('patrol to shadow on breach, naming the target', () => {
    const step = stepDrone(drone({ mode: 'patrol' }), PATH, [breacher('a1', 45.5, -75.6)], 0, 1);
    expect(step.drone.mode).toBe('shadow');
    expect(step.drone.targetId).toBe('a1');
    expect(step.drone.speedMps).toBe(SHADOW_SPEED_MPS);
    expect(step.events.some((e) => e.includes('shadowing A1'))).toBe(true);
  });

  it('holds target inside the 20 percent hysteresis band', () => {
    const shadowing = drone({ mode: 'shadow', targetId: 'a1', pos: { lat: 45.42, lng: -75.7 } });
    // a2 nearer than a1, but not 20 percent nearer.
    const a1 = breacher('a1', 45.52, -75.7);
    const a2 = breacher('a2', 45.515, -75.7);
    const step = stepDrone(shadowing, PATH, [a1, a2], 0, 1);
    expect(step.drone.targetId).toBe('a1');
    expect(step.events).toHaveLength(0);
  });

  it('retargets when another breacher is more than 20 percent nearer', () => {
    const shadowing = drone({ mode: 'shadow', targetId: 'a1', pos: { lat: 45.42, lng: -75.7 } });
    const a1 = breacher('a1', 45.52, -75.7);
    const a2 = breacher('a2', 45.45, -75.7);
    const step = stepDrone(shadowing, PATH, [a1, a2], 0, 1);
    expect(step.drone.targetId).toBe('a2');
    expect(step.events.some((e) => e.includes('retargeting A2'))).toBe(true);
  });

  it('shadow back to patrol at the nearest waypoint when targets clear', () => {
    const nearWp1 = drone({ mode: 'shadow', targetId: 'a1', pos: { lat: 45.49, lng: -75.51 } });
    const step = stepDrone(nearWp1, PATH, [], 0, 1);
    expect(step.drone.mode).toBe('patrol');
    expect(step.drone.targetId).toBeNull();
    expect(step.waypointIndex).toBe(1);
    expect(step.events).toContain('SEN-01 all targets clear, resuming patrol');
  });

  it('shadow to idle when targets clear and no path exists', () => {
    const step = stepDrone(drone({ mode: 'shadow', targetId: 'a1' }), null, [], 0, 1);
    expect(step.drone.mode).toBe('idle');
    expect(step.drone.speedMps).toBe(0);
  });

  it('moves toward the target each step', () => {
    const target = breacher('a1', 45.6, -75.7);
    const before = drone({ mode: 'shadow', targetId: 'a1' });
    const step = stepDrone(before, null, [target], 0, 1);
    expect(distanceMeters(step.drone.pos, target.pos)).toBeLessThan(
      distanceMeters(before.pos, target.pos),
    );
  });
});
