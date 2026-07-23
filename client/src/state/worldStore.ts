import { create } from 'zustand';
import type {
  Asset,
  DroneState,
  EventEntry,
  PatrolPath,
  WorldSnapshot,
  ZonePolygon,
} from '@shared/types';

export type ConnectionState = 'connecting' | 'live' | 'stale' | 'closed';

/**
 * Client event cap mirrors the server's snapshot cap (S2#d4): the log drawer
 * (S8) shows recent operational context, not an audit trail; capping identically
 * on both sides means a reconnect snapshot and a long-lived session hold the
 * same window.
 */
const EVENT_CAPACITY = 50;

interface WorldState {
  assets: Map<string, Asset>;
  drone: DroneState | null;
  zones: ZonePolygon[];
  patrol: PatrolPath | null;
  events: EventEntry[];
  lastTickMs: number;
  /** Client receipt time of the last tick — the stale check's clock (S8#d1). */
  lastTickReceivedMs: number;
  /** Bumped per snapshot so motion can reset its buffers (Codex P2, PR #28). */
  snapshotCount: number;
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
  lastTickReceivedMs: 0,
  snapshotCount: 0,
  connection: 'connecting',

  applySnapshot: (world) =>
    set((state) => ({
      snapshotCount: state.snapshotCount + 1,
      assets: toMap(world.assets),
      drone: world.drone,
      zones: world.zones,
      patrol: world.patrol,
      // Client-minted FEED events survive rehydration (S8): a snapshot from a
      // restarted server carries no history, and wholesale replacement would
      // erase the very sync story (lost/recovered) the log exists to tell.
      events: [
        ...state.events.filter((e) => e.id.startsWith('feed-client-')),
        ...world.events,
      ]
        .sort((a, b) => a.timestampMs - b.timestampMs)
        .slice(-EVENT_CAPACITY),
    })),

  applyTick: (timestampMs, assets, drone) =>
    set({ lastTickMs: timestampMs, lastTickReceivedMs: Date.now(), assets: toMap(assets), drone }),

  applyZones: (zones) => set({ zones }),

  applyPatrol: (patrol) => set({ patrol }),

  applyEvent: (event) =>
    set((state) => ({ events: [...state.events, event].slice(-EVENT_CAPACITY) })),

  setConnection: (connection) => set({ connection }),
}));
