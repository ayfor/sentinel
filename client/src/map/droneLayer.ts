import L from 'leaflet';
import { useWorldStore } from '../state/worldStore';
import { CYAN } from './palette';

/**
 * SEN-01: cyan hollow hexagon with center dot, rotated to heading, mode label
 * under. The glow is a licensed T1 exception; the shadow tether is solid cyan
 * (red stays threat-only, T2).
 */
const droneIcon = (headingDeg: number, mode: string) =>
  L.divIcon({
    className: 'drone-icon',
    html: `
      <svg width="26" height="26" viewBox="-13 -13 26 26" style="transform: rotate(${headingDeg}deg); display: block;">
        <polygon points="0,-10 8.7,-5 8.7,5 0,10 -8.7,5 -8.7,-5"
          fill="none" stroke="${CYAN}" stroke-width="1.5" />
        <circle r="1.8" fill="${CYAN}" />
      </svg>
      <div class="drone-label">SEN-01 · ${mode.toUpperCase()}</div>`,
    iconSize: [26, 40],
    iconAnchor: [13, 13],
  });

const TETHER_STYLE: L.PolylineOptions = { color: CYAN, weight: 1, opacity: 0.9 };

export function attachDroneLayer(map: L.Map): () => void {
  let marker: L.Marker | null = null;
  let tether: L.Polyline | null = null;

  const sync = () => {
    const { drone, assets } = useWorldStore.getState();
    if (!drone) return;
    const pos: [number, number] = [drone.pos.lat, drone.pos.lng];
    if (!marker) {
      marker = L.marker(pos, { icon: droneIcon(drone.headingDeg, drone.mode), interactive: false }).addTo(map);
    } else {
      marker.setLatLng(pos);
      marker.setIcon(droneIcon(drone.headingDeg, drone.mode));
    }
    const target = drone.mode === 'shadow' && drone.targetId ? assets.get(drone.targetId) : undefined;
    if (target) {
      const coords: [number, number][] = [pos, [target.pos.lat, target.pos.lng]];
      if (!tether) tether = L.polyline(coords, TETHER_STYLE).addTo(map);
      else tether.setLatLngs(coords);
    } else if (tether) {
      tether.remove();
      tether = null;
    }
  };

  sync();
  const unsubscribe = useWorldStore.subscribe((state, prev) => {
    if (state.drone !== prev.drone) sync();
  });

  return () => {
    unsubscribe();
    marker?.remove();
    tether?.remove();
  };
}
