import { describe, expect, it } from 'vitest';
import type { Asset, ZonePolygon } from '../../shared/types.js';
import { distanceToSegmentMeters, pointInPolygon } from '../../shared/geo.js';
import { computeNearestZoneMeters, computeThreat, computeTimeToEntry } from './derive.js';

/** Square zone straddling -75 lng, north of the test assets. */
const SQUARE: ZonePolygon = {
  id: 'zone-1',
  name: 'RZ-01',
  ring: [
    { lat: 45.4, lng: -75.1 },
    { lat: 45.4, lng: -74.9 },
    { lat: 45.6, lng: -74.9 },
    { lat: 45.6, lng: -75.1 },
  ],
};

const asset = (partial: Partial<Asset>): Asset => ({
  id: 'asset-1',
  callsign: 'TST-001',
  pos: { lat: 45.0, lng: -75.0 },
  headingDeg: 0,
  speedMps: 200,
  altitudeM: 9000,
  threat: 'NORMAL',
  timeToEntrySeconds: null,
  nearestZoneMeters: null,
  ...partial,
});

describe('computeTimeToEntry', () => {
  it('head-on course gives the hand-computed TTE', () => {
    // 0.4 deg of latitude at ~111.2 km/deg is ~44,487 m; at 200 m/s the first
    // sample inside the zone is t = 223 s (1 s resolution, S5#d1).
    const tte = computeTimeToEntry(asset({}), [SQUARE]);
    expect(tte).not.toBeNull();
    expect(tte!).toBeGreaterThanOrEqual(221);
    expect(tte!).toBeLessThanOrEqual(225);
  });

  it('parallel course never enters (null)', () => {
    expect(computeTimeToEntry(asset({ headingDeg: 90 }), [SQUARE])).toBeNull();
  });

  it('asset already inside is 0', () => {
    expect(computeTimeToEntry(asset({ pos: { lat: 45.5, lng: -75.0 } }), [SQUARE])).toBe(0);
  });

  it('no zones is null', () => {
    expect(computeTimeToEntry(asset({}), [])).toBeNull();
  });

  it('crossing beyond the 600 s horizon is null (S5#d2)', () => {
    // Same head-on course at 50 m/s needs ~890 s, outside the horizon.
    expect(computeTimeToEntry(asset({ speedMps: 50 }), [SQUARE])).toBeNull();
  });
});

describe('computeThreat (FR-7)', () => {
  it('120 s is WARNING, 121 s is NORMAL (threshold boundary)', () => {
    expect(computeThreat(120, false)).toBe('WARNING');
    expect(computeThreat(121, false)).toBe('NORMAL');
  });

  it('breached is CRITICAL regardless of TTE', () => {
    expect(computeThreat(0, true)).toBe('CRITICAL');
  });

  it('null TTE is NORMAL', () => {
    expect(computeThreat(null, false)).toBe('NORMAL');
  });
});

describe('computeNearestZoneMeters', () => {
  it('south of the square, nearest edge is the southern one', () => {
    // 0.4 deg of latitude at 111,320 m/deg (equirectangular) = 44,528 m.
    const d = computeNearestZoneMeters(asset({}), [SQUARE]);
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(44000);
    expect(d!).toBeLessThan(45000);
  });

  it('no zones is null (S5#d5)', () => {
    expect(computeNearestZoneMeters(asset({}), [])).toBeNull();
  });
});

describe('geo primitives', () => {
  it('pointInPolygon: center in, outside out', () => {
    expect(pointInPolygon({ lat: 45.5, lng: -75.0 }, SQUARE.ring)).toBe(true);
    expect(pointInPolygon({ lat: 45.0, lng: -75.0 }, SQUARE.ring)).toBe(false);
  });

  it('pointInPolygon: vertex and edge count as inside (S5#d4)', () => {
    expect(pointInPolygon({ lat: 45.4, lng: -75.1 }, SQUARE.ring)).toBe(true);
    expect(pointInPolygon({ lat: 45.4, lng: -75.0 }, SQUARE.ring)).toBe(true);
  });

  it('distanceToSegmentMeters: perpendicular drop onto a lat-parallel segment', () => {
    // 0.1 deg of latitude = 11,132 m equirectangular.
    const d = distanceToSegmentMeters(
      { lat: 45.0, lng: -75.0 },
      { lat: 45.1, lng: -75.1 },
      { lat: 45.1, lng: -74.9 },
    );
    expect(d).toBeGreaterThan(11000);
    expect(d).toBeLessThan(11300);
  });

  it('distanceToSegmentMeters: clamps to the nearest endpoint past the segment', () => {
    // Point due south of the segment's west end, offset west: nearest is the endpoint.
    const d = distanceToSegmentMeters(
      { lat: 45.0, lng: -75.2 },
      { lat: 45.1, lng: -75.1 },
      { lat: 45.1, lng: -74.9 },
    );
    const straight = distanceToSegmentMeters(
      { lat: 45.0, lng: -75.2 },
      { lat: 45.1, lng: -75.1 },
      { lat: 45.1, lng: -75.1 },
    );
    expect(d).toBeCloseTo(straight, 5);
  });
});
