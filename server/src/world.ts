import type {
  Asset,
  DroneState,
  EventEntry,
  Fix,
  PatrolPath,
  WorldSnapshot,
  ZonePolygon,
} from '../../shared/types.js';

/** Track history capacity: 300 fixes at 1 Hz = 5 minutes (FR-4). */
export const HISTORY_CAPACITY = 300;

/** Recent events kept for snapshots. */
const EVENT_CAPACITY = 50;

export interface World {
  assets: Map<string, Asset>;
  /** Ring buffers keyed by asset id; oldest fix overwritten at capacity. */
  histories: Map<string, Fix[]>;
  zones: ZonePolygon[];
  patrol: PatrolPath | null;
  drone: DroneState;
  events: EventEntry[];
}

/** SEN-01 spawns over downtown Ottawa, idle until a patrol path exists (FR-3). */
const DRONE_SPAWN = { lat: 45.42, lng: -75.7 };

export function createWorld(): World {
  return {
    assets: new Map(),
    histories: new Map(),
    zones: [],
    patrol: null,
    drone: {
      id: 'drone-sen-01',
      callsign: 'SEN-01',
      pos: { ...DRONE_SPAWN },
      headingDeg: 0,
      speedMps: 0,
      mode: 'idle',
      targetId: null,
    },
    events: [],
  };
}

export function recordFix(world: World, assetId: string, fix: Fix): void {
  let buf = world.histories.get(assetId);
  if (!buf) {
    buf = [];
    world.histories.set(assetId, buf);
  }
  buf.push(fix);
  if (buf.length > HISTORY_CAPACITY) buf.shift();
}

export function pushEvent(world: World, event: EventEntry): void {
  world.events.push(event);
  if (world.events.length > EVENT_CAPACITY) world.events.shift();
}

export function snapshot(world: World): WorldSnapshot {
  return {
    assets: [...world.assets.values()],
    zones: world.zones,
    patrol: world.patrol,
    drone: world.drone,
    events: world.events,
  };
}
