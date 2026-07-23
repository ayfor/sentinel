import type { LatLng } from '../../shared/types.js';
import { distanceMeters } from '../../shared/geo.js';

export interface Airport {
  icao: string;
  name: string;
  pos: LatLng;
}

/** Static dataset: six real airports inside the sector (S10, FR-6). */
export const AIRPORTS: Airport[] = [
  { icao: 'CYOW', name: 'Ottawa Macdonald-Cartier', pos: { lat: 45.3225, lng: -75.6692 } },
  { icao: 'CYUL', name: 'Montreal-Trudeau', pos: { lat: 45.4706, lng: -73.7408 } },
  { icao: 'CYGK', name: 'Kingston Norman Rogers', pos: { lat: 44.2253, lng: -76.5969 } },
  { icao: 'CYND', name: 'Gatineau-Ottawa Executive', pos: { lat: 45.5217, lng: -75.5636 } },
  { icao: 'CYRP', name: 'Ottawa Carp', pos: { lat: 45.3192, lng: -76.0223 } },
  { icao: 'CYPQ', name: 'Peterborough', pos: { lat: 44.23, lng: -78.3632 } },
];

export function nearestAirport(pos: LatLng): Airport {
  return AIRPORTS.reduce((a, b) =>
    distanceMeters(pos, a.pos) <= distanceMeters(pos, b.pos) ? a : b,
  );
}
