import { describe, expect, it } from 'vitest';
import type { Asset } from '../../shared/types.js';
import { createWorld } from './world.js';
import { interceptEstimateSeconds, stepInterceptors } from './interceptor.js';
import { nearestAirport } from './airports.js';

const breacher = (id: string, lat: number, lng: number, headingDeg = 0): Asset => ({
  id,
  callsign: id.toUpperCase(),
  pos: { lat, lng },
  headingDeg,
  speedMps: 200,
  altitudeM: 9000,
  threat: 'CRITICAL',
  timeToEntrySeconds: 0,
  nearestZoneMeters: 0,
});

describe('interceptors (S10, FR-6)', () => {
  it('nearest airport: downtown Ottawa breacher scrambles CYOW', () => {
    expect(nearestAirport({ lat: 45.42, lng: -75.7 }).icao).toBe('CYOW');
  });

  it('dispatches one interceptor per breacher from the nearest airport', () => {
    const world = createWorld();
    const events: string[] = [];
    world.assets.set('a1', breacher('a1', 45.42, -75.7));
    stepInterceptors(world, 1, (_k, text) => events.push(text));
    expect(world.interceptors.size).toBe(1);
    const viper = [...world.interceptors.values()][0]!;
    expect(viper.originIcao).toBe('CYOW');
    expect(viper.targetId).toBe('a1');
    expect(events[0]).toContain('VIPER-01 dispatched from CYOW for A1');
    stepInterceptors(world, 1, () => {});
    expect(world.interceptors.size).toBe(1);
  });

  it('closes distance each tick and reports a closing estimate', () => {
    const world = createWorld();
    world.assets.set('a1', breacher('a1', 45.42, -75.7, 0));
    stepInterceptors(world, 1, () => {});
    const viper = [...world.interceptors.values()][0]!;
    const est1 = viper.interceptSeconds;
    stepInterceptors(world, 1, () => {});
    expect(viper.interceptSeconds).not.toBeNull();
    expect(est1).not.toBeNull();
    expect(viper.interceptSeconds!).toBeLessThanOrEqual(est1!);
  });

  it('reports null when the geometry is opening (S10#d2)', () => {
    const viper = {
      id: 'i', callsign: 'VIPER-01', pos: { lat: 45.0, lng: -75.7 },
      headingDeg: 180, speedMps: 450, originIcao: 'CYOW', targetId: 'a1',
      interceptSeconds: null as number | null,
    };
    const away = breacher('a1', 45.5, -75.7, 0);
    away.speedMps = 500;
    expect(interceptEstimateSeconds(viper, away)).toBeNull();
  });

  it('stands down when the target leaves breach state', () => {
    const world = createWorld();
    const events: string[] = [];
    const target = breacher('a1', 45.42, -75.7);
    world.assets.set('a1', target);
    stepInterceptors(world, 1, () => {});
    expect(world.interceptors.size).toBe(1);
    target.timeToEntrySeconds = 45;
    stepInterceptors(world, 1, (_k, text) => events.push(text));
    expect(world.interceptors.size).toBe(0);
    expect(events[0]).toContain('VIPER-01 standing down');
  });

  it('stands down when the target despawns (recycle case)', () => {
    const world = createWorld();
    world.assets.set('a1', breacher('a1', 45.42, -75.7));
    stepInterceptors(world, 1, () => {});
    world.assets.delete('a1');
    stepInterceptors(world, 1, () => {});
    expect(world.interceptors.size).toBe(0);
  });
});
