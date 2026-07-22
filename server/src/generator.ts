import type { Asset, LatLng } from '../../shared/types.js';
import { bearingDeg, normalizeBearing } from '../../shared/geo.js';
import type { World } from './world.js';

/** Spawn box around the Ottawa sector, matching the client's default view. */
const SECTOR = { latMin: 44.2, latMax: 46.6, lngMin: -78.5, lngMax: -73.0 };
const SECTOR_CENTER: LatLng = {
  lat: (SECTOR.latMin + SECTOR.latMax) / 2,
  lng: (SECTOR.lngMin + SECTOR.lngMax) / 2,
};

const AIRLINE_PREFIXES = ['ACA', 'WJA', 'DAL', 'UAL', 'JZA', 'ROU'];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export const ASSET_COUNT = 120;

export function spawnAssets(world: World): void {
  const used = new Set<string>();
  for (let i = 0; i < ASSET_COUNT; i++) {
    let callsign: string;
    do {
      const prefix = AIRLINE_PREFIXES[Math.floor(Math.random() * AIRLINE_PREFIXES.length)]!;
      callsign = `${prefix}-${Math.floor(rand(100, 1000))}`;
    } while (used.has(callsign));
    used.add(callsign);

    const asset: Asset = {
      id: `asset-${i}`,
      callsign,
      pos: { lat: rand(SECTOR.latMin, SECTOR.latMax), lng: rand(SECTOR.lngMin, SECTOR.lngMax) },
      headingDeg: rand(0, 360),
      speedMps: rand(140, 250),
      altitudeM: rand(6000, 12000),
      threat: 'NORMAL',
      timeToEntrySeconds: null,
      nearestZoneMeters: null,
    };
    world.assets.set(asset.id, asset);
  }
}

/**
 * Bounded heading drift per tick (design ruling: believable over theatrical).
 * Outside the sector the drift biases toward the center, so traffic orbits the
 * stage instead of emptying it. Speed and altitude stay constant.
 */
export function wander(asset: Asset, dtS: number): void {
  const inSector =
    asset.pos.lat >= SECTOR.latMin &&
    asset.pos.lat <= SECTOR.latMax &&
    asset.pos.lng >= SECTOR.lngMin &&
    asset.pos.lng <= SECTOR.lngMax;

  if (inSector) {
    asset.headingDeg = normalizeBearing(asset.headingDeg + rand(-2, 2) * dtS);
    return;
  }
  const homeward = bearingDeg(asset.pos, SECTOR_CENTER);
  let diff = homeward - asset.headingDeg;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  const turn = Math.max(-8, Math.min(8, diff)) * dtS;
  asset.headingDeg = normalizeBearing(asset.headingDeg + turn);
}
