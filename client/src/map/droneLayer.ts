import L from 'leaflet';
import type { LatLng } from '@shared/types';
import { useWorldStore } from '../state/worldStore';
import { CYAN } from './palette';

/**
 * SEN-01: cyan hollow hexagon with center dot, mode label under. The glow is
 * a licensed T1 exception; the shadow tether is solid cyan (red stays
 * threat-only, T2). Rotation is applied to the icon's svg element per frame
 * by the motion loop (S3) — no per-frame setIcon churn; setIcon runs only on
 * mode changes (1 Hz at most).
 */
const droneIcon = (mode: string) =>
  L.divIcon({
    className: 'drone-icon',
    html: `
      <svg width="26" height="26" viewBox="-13 -13 26 26" style="display: block;">
        <polygon points="0,-10 8.7,-5 8.7,5 0,10 -8.7,5 -8.7,-5"
          fill="none" stroke="${CYAN}" stroke-width="1.5" />
        <circle r="1.8" fill="${CYAN}" />
      </svg>
      <div class="drone-label">SEN-01 · ${mode.toUpperCase()}</div>`,
    iconSize: [26, 40],
    iconAnchor: [13, 13],
  });

const TETHER_STYLE: L.PolylineOptions = { color: CYAN, weight: 1, opacity: 0.9, interactive: false };

export interface DroneLayerHandle {
  getMarker: () => L.Marker | null;
  setRotation: (deg: number) => void;
  setTether: (ends: [LatLng, LatLng] | null) => void;
  dispose: () => void;
}

export function attachDroneLayer(map: L.Map): DroneLayerHandle {
  let marker: L.Marker | null = null;
  let tether: L.Polyline | null = null;
  let lastMode: string | null = null;
  let lastRotation = 0;

  const applyRotation = (deg: number) => {
    lastRotation = deg;
    const svg = marker?.getElement()?.querySelector('svg');
    if (svg) (svg as SVGElement).style.transform = `rotate(${deg}deg)`;
  };

  const sync = () => {
    const { drone } = useWorldStore.getState();
    if (!drone) return;
    const pos: [number, number] = [drone.pos.lat, drone.pos.lng];
    if (!marker) {
      marker = L.marker(pos, { icon: droneIcon(drone.mode), interactive: false }).addTo(map);
      lastMode = drone.mode;
    } else if (drone.mode !== lastMode) {
      marker.setIcon(droneIcon(drone.mode));
      lastMode = drone.mode;
      applyRotation(lastRotation); // setIcon rebuilt the DOM; reapply
    }
  };

  sync();
  const unsubscribe = useWorldStore.subscribe((state, prev) => {
    if (state.drone !== prev.drone) sync();
  });

  return {
    getMarker: () => marker,
    setRotation: applyRotation,
    setTether: (ends) => {
      if (!ends) {
        tether?.remove();
        tether = null;
        return;
      }
      const coords: [number, number][] = [[ends[0].lat, ends[0].lng], [ends[1].lat, ends[1].lng]];
      if (!tether) tether = L.polyline(coords, TETHER_STYLE).addTo(map);
      else tether.setLatLngs(coords);
    },
    dispose: () => {
      unsubscribe();
      marker?.remove();
      tether?.remove();
    },
  };
}
