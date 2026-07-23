import type { Asset, LatLng } from '../../shared/types.js';
import { FULL_CIRCLE_DEG, bearingDeg, destinationPoint, normalizeBearing } from '../../shared/geo.js';
import { recordFix, type World } from './world.js';

/** Spawn box around the Ottawa sector, matching the client's default view. */
const SECTOR = { latMin: 44.2, latMax: 46.6, lngMin: -78.5, lngMax: -73.0 };
const SECTOR_CENTER: LatLng = {
  lat: (SECTOR.latMin + SECTOR.latMax) / 2,
  lng: (SECTOR.lngMin + SECTOR.lngMax) / 2,
};

const AIRLINE_PREFIXES = ['ACA', 'WJA', 'DAL', 'UAL', 'JZA', 'ROU'];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export const ASSET_COUNT = 120;
/** About 60 percent of traffic rides the corridors (S12). */
const CORRIDOR_SHARE = 0.6;

interface Corridor {
  name: string;
  entry: LatLng;
  bearingDeg: number;
  /** Corridor speeds cluster (S12): base plus or minus 10 percent. */
  baseSpeedMps: number;
  altitudeM: [number, number];
}

/**
 * Four civil corridors (S12#d1): the YYZ-YUL trunk, YOW arrivals from east
 * and west, and a high transatlantic band across the north. Civil structure
 * only — T4 rules out decorative fiction.
 */
export const CORRIDORS: Corridor[] = [
  { name: 'YYZ-YUL trunk', entry: { lat: 44.35, lng: -78.4 }, bearingDeg: 65, baseSpeedMps: 230, altitudeM: [9000, 11500] },
  { name: 'YOW arrivals east', entry: { lat: 45.65, lng: -73.1 }, bearingDeg: 252, baseSpeedMps: 180, altitudeM: [6000, 8500] },
  { name: 'YOW arrivals west', entry: { lat: 44.95, lng: -78.4 }, bearingDeg: 74, baseSpeedMps: 190, altitudeM: [6500, 9000] },
  // Entry sits clear of latMax and the bearing drifts slightly south: at
  // 276 degrees the stream's tail spawned above the sector and recycled
  // immediately (Codex P2 on PR #27).
  { name: 'transatlantic band', entry: { lat: 46.35, lng: -73.05 }, bearingDeg: 268, baseSpeedMps: 250, altitudeM: [10500, 12000] },
];

/** Lateral jitter around the corridor centerline (about 3 km). */
const LATERAL_JITTER_M = 3000;
/** Staggered along-track spacing between stream members (8 to 15 km). */
const SPACING_M: [number, number] = [8000, 15000];

/** Server-internal corridor membership; recycled assets re-register on spawn. */
const corridorMembership = new WeakMap<Asset, Corridor>();

export const corridorOf = (asset: Asset): Corridor | undefined => corridorMembership.get(asset);

let spawnCounter = 0;
const usedCallsigns = new Set<string>();

const mintCallsign = (): string => {
  let callsign: string;
  do {
    const prefix = AIRLINE_PREFIXES[Math.floor(Math.random() * AIRLINE_PREFIXES.length)]!;
    callsign = `${prefix}-${Math.floor(rand(100, 1000))}`;
  } while (usedCallsigns.has(callsign));
  usedCallsigns.add(callsign);
  return callsign;
};

const spawnScatter = (): Asset => ({
  id: `asset-${spawnCounter++}`,
  callsign: mintCallsign(),
  pos: { lat: rand(SECTOR.latMin, SECTOR.latMax), lng: rand(SECTOR.lngMin, SECTOR.lngMax) },
  headingDeg: rand(0, FULL_CIRCLE_DEG),
  speedMps: rand(140, 250),
  altitudeM: rand(6000, 12000),
  threat: 'NORMAL',
  timeToEntrySeconds: null,
  nearestZoneMeters: null,
});

const spawnOnCorridor = (corridor: Corridor, alongTrackM: number): Asset => {
  const onCenterline = destinationPoint(corridor.entry, corridor.bearingDeg, alongTrackM);
  const lateral = rand(-LATERAL_JITTER_M, LATERAL_JITTER_M);
  const pos = destinationPoint(onCenterline, normalizeBearing(corridor.bearingDeg + 90), lateral);
  const asset: Asset = {
    id: `asset-${spawnCounter++}`,
    callsign: mintCallsign(),
    pos,
    headingDeg: normalizeBearing(corridor.bearingDeg + rand(-2, 2)),
    speedMps: corridor.baseSpeedMps * rand(0.9, 1.1),
    altitudeM: rand(corridor.altitudeM[0], corridor.altitudeM[1]),
    threat: 'NORMAL',
    timeToEntrySeconds: null,
    nearestZoneMeters: null,
  };
  corridorMembership.set(asset, corridor);
  return asset;
};

export function spawnAssets(world: World): void {
  const corridorCount = Math.round(ASSET_COUNT * CORRIDOR_SHARE);
  const perCorridor = Math.floor(corridorCount / CORRIDORS.length);
  for (const corridor of CORRIDORS) {
    let alongTrack = rand(0, SPACING_M[0]);
    for (let i = 0; i < perCorridor; i++) {
      world.assets.set(...entry(spawnOnCorridor(corridor, alongTrack)));
      alongTrack += rand(SPACING_M[0], SPACING_M[1]);
    }
  }
  while (world.assets.size < ASSET_COUNT) {
    world.assets.set(...entry(spawnScatter()));
  }
}

const entry = (asset: Asset): [string, Asset] => [asset.id, asset];

const inSector = (pos: LatLng): boolean =>
  pos.lat >= SECTOR.latMin && pos.lat <= SECTOR.latMax && pos.lng >= SECTOR.lngMin && pos.lng <= SECTOR.lngMax;

/**
 * Bounded heading drift per tick (design ruling: believable over theatrical).
 * Corridor assets drift around the corridor bearing with no center bias
 * (S12); scatter assets keep the original wander with center-bias steering
 * outside the sector.
 */
export function wander(asset: Asset, dtS: number): void {
  const corridor = corridorMembership.get(asset);
  if (corridor) {
    const drifted = asset.headingDeg + rand(-2, 2) * dtS;
    // Hold within 2 degrees of the corridor bearing.
    let offset = drifted - corridor.bearingDeg;
    if (offset > 180) offset -= 360;
    if (offset < -180) offset += 360;
    asset.headingDeg = normalizeBearing(corridor.bearingDeg + Math.max(-2, Math.min(2, offset)));
    return;
  }

  if (inSector(asset.pos)) {
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

/**
 * Advance all traffic one tick: wander or corridor-hold, move, record the
 * fix. Corridor assets recycle on sector exit (S12): the old id despawns
 * (history dropped — no leak) and a fresh id enters at the corridor entry,
 * exercising the client disposal path continuously. Recycling emits no
 * events.
 */
export function advanceAssets(world: World, dtS: number, nowMs: number): void {
  const recycled: Asset[] = [];
  for (const asset of world.assets.values()) {
    wander(asset, dtS);
    asset.pos = destinationPoint(asset.pos, asset.headingDeg, asset.speedMps * dtS);
    const corridor = corridorMembership.get(asset);
    if (corridor && !inSector(asset.pos)) {
      world.assets.delete(asset.id);
      world.histories.delete(asset.id);
      usedCallsigns.delete(asset.callsign);
      recycled.push(spawnOnCorridor(corridor, rand(0, SPACING_M[1])));
      continue;
    }
    recordFix(world, asset.id, { pos: asset.pos, timestampMs: nowMs });
  }
  for (const fresh of recycled) {
    world.assets.set(fresh.id, fresh);
    recordFix(world, fresh.id, { pos: fresh.pos, timestampMs: nowMs });
  }
}
