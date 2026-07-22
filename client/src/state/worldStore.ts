import { create } from 'zustand';
import type {
  Asset,
  DroneState,
  EventEntry,
  PatrolPath,
  WorldSnapshot,
  ZonePolygon,
} from '@shared/types';

export type ConnectionState = 'connecting' | 'live' | 'closed';

/** Client-side event cap, mirroring the server's snapshot cap. */
const EVENT_CAPACITY = 50;

interface WorldState {
  assets: Map<string, Asset>;
  drone: DroneState | null;
  zones: ZonePolygon[];
  patrol: PatrolPath | null;
  events: EventEntry[];
  lastTickMs: number;
  connection: ConnectionState;

  applySnapshot: (world: WorldSnapshot) => void;
  applyTick: (timestampMs: number, assets: Asset[], drone: DroneState) => void;
  applyZones: (zones: ZonePolygon[]) => void;
  applyPatrol: (patrol: PatrolPath | null) => void;
  applyEvent: (event: EventEntry) => void;
  setConnection: (connection: ConnectionState) => void;
}

const toMap = (assets: Asset[]) => new Map(assets.map((a) => [a.id, a]));

/**
 * The world store: wire messages map one-to-one onto actions, and no derived
 * state is computed here (D3) — the client renders what the server declares.
 * Assets are replaced wholesale each tick (D8); there is no age-out. An asset
 * absent from a tick is disposed immediately.
 */
export const useWorldStore = create<WorldState>((set) => ({
  assets: new Map(),
  drone: null,
  zones: [],
  patrol: null,
  events: [],
  lastTickMs: 0,
  connection: 'connecting',

  applySnapshot: (world) =>
    set({
      assets: toMap(world.assets),
      drone: world.drone,
      zones: world.zones,
      patrol: world.patrol,
      events: world.events.slice(-EVENT_CAPACITY),
    }),

  applyTick: (timestampMs, assets, drone) => set({ lastTickMs: timestampMs, assets: toMap(assets), drone }),

  applyZones: (zones) => set({ zones }),

  applyPatrol: (patrol) => set({ patrol }),

  applyEvent: (event) =>
    set((state) => ({ events: [...state.events, event].slice(-EVENT_CAPACITY) })),

  setConnection: (connection) => set({ connection }),
}));
