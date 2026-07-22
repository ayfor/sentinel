// The wire contract. Server and client both import from here — if it isn't
// in this file, it doesn't cross the WebSocket.

export interface LatLng {
  lat: number;
  lng: number;
}

export type ThreatLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface Asset {
  id: string;
  callsign: string;
  pos: LatLng;
  headingDeg: number; // 0–360, clockwise from north
  speedMps: number;
  altitudeM: number;
  threat: ThreatLevel;
  /** seconds until the asset's current vector enters a zone; null = diverging */
  tteS: number | null;
  /** metres to the nearest restricted zone boundary */
  nearestZoneM: number | null;
}

// S1 extends this file with the full world/message protocol.
export interface HealthResponse {
  ok: true;
}
