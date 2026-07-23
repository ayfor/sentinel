// The wire contract. Server and client both import from here — if it isn't
// in this file, it doesn't cross the WebSocket.

export interface LatLng {
  lat: number;
  lng: number;
}

/** One recorded position sample. Track histories are arrays of these. */
export interface Fix {
  pos: LatLng;
  timestampMs: number; // epoch ms
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

export interface Interceptor {
  id: string;
  callsign: string; // VIPER-NN
  pos: LatLng;
  headingDeg: number;
  speedMps: number;
  /** ICAO of the dispatching airport. */
  originIcao: string;
  targetId: string;
  /** Live closing-speed estimate; null when not closing (S10#d2). */
  interceptSeconds: number | null;
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

export type EventKind = 'ZONE' | 'BREACH' | 'SENTINEL' | 'FEED';

export interface EventEntry {
  id: string;
  timestampMs: number; // epoch ms
  kind: EventKind;
  text: string;
}

export interface WorldSnapshot {
  assets: Asset[];
  zones: ZonePolygon[];
  patrol: PatrolPath | null;
  drone: DroneState;
  interceptors: Interceptor[];
  events: EventEntry[];
}

/** Server-to-client messages. The socket is one-way (D1); commands travel REST. */
export type WsMessage =
  | { type: 'snapshot'; world: WorldSnapshot }
  | { type: 'tick'; timestampMs: number; assets: Asset[]; drone: DroneState; interceptors: Interceptor[] }
  | { type: 'zones'; zones: ZonePolygon[] }
  | { type: 'patrol'; patrol: PatrolPath | null }
  | { type: 'event'; event: EventEntry };

export interface HealthResponse {
  ok: true;
}
