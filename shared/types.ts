// The wire contract. Server and client both import from here — if it isn't
// in this file, it doesn't cross the WebSocket.

export interface LatLng {
  lat: number;
  lng: number;
}

/** One recorded position sample. Track histories are arrays of these. */
export interface Fix {
  pos: LatLng;
  t: number; // epoch ms
}

/** Enumerated threat states. S1 emits NORMAL; S5 computes the real value. */
export type ThreatLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface Asset {
  id: string;
  callsign: string;
  pos: LatLng;
  headingDeg: number; // 0-360, clockwise from north
  speedMps: number;
  altitudeM: number;
  threat: ThreatLevel;
  /** seconds until the asset's current vector enters a zone; null = diverging */
  timeToEntrySeconds: number | null;
  /** meters to the nearest restricted zone boundary */
  nearestZoneMeters: number | null;
}

/** Restricted zone polygon. S4 populates; the type is part of the contract now. */
export interface ZonePolygon {
  id: string;
  name: string; // RZ-01 style designator
  ring: LatLng[]; // closed implicitly; first point not repeated
}

/** User-drawn patrol path for the drone. S6 populates. */
export interface PatrolPath {
  id: string;
  points: LatLng[];
}

export type DroneMode = 'idle' | 'patrol' | 'shadow';

export interface DroneState {
  id: string;
  callsign: string; // SEN-01
  pos: LatLng;
  headingDeg: number;
  speedMps: number;
  mode: DroneMode;
  /** asset currently being shadowed; null outside shadow mode */
  targetId: string | null;
}

export interface EventEntry {
  id: string;
  t: number; // epoch ms
  kind: 'ZONE' | 'BREACH' | 'SENTINEL' | 'FEED';
  text: string;
}

export interface WorldSnapshot {
  assets: Asset[];
  zones: ZonePolygon[];
  patrol: PatrolPath | null;
  drone: DroneState;
  events: EventEntry[];
}

/** Server-to-client messages. The socket is one-way (D1); commands travel REST. */
export type WsMessage =
  | { type: 'snapshot'; world: WorldSnapshot }
  | { type: 'tick'; t: number; assets: Asset[]; drone: DroneState }
  | { type: 'zones'; zones: ZonePolygon[] }
  | { type: 'patrol'; patrol: PatrolPath | null }
  | { type: 'event'; event: EventEntry };

export interface HealthResponse {
  ok: true;
}
