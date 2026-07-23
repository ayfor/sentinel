import L from 'leaflet';
import { useWorldStore } from '../state/worldStore';
import { RED } from './palette';

/** Pulse sweep: radius grows over the cycle while opacity fades to zero. */
const PULSE_MIN_R = 4;
const PULSE_MAX_R = 16;
const PULSE_PERIOD_MS = 1600;

/**
 * The CRITICAL pulse ring (S9, FR-7) — glow exception 1 of 3 (T1). Runs as a
 * frame callback inside the S3 motion loop (S9#d3 fulfilled): one rAF owns
 * all motion. Rings follow the asset MARKERS (interpolated positions), not
 * raw store fixes, so the pulse glides with its asset.
 */
export function attachPulseLayer(
  map: L.Map,
  markers: Map<string, L.CircleMarker>,
): { frame: (now: number) => void; dispose: () => void } {
  const layer = L.layerGroup().addTo(map);
  const rings = new Map<string, L.CircleMarker>();

  const frame = (now: number) => {
    const t = (now % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
    const assets = useWorldStore.getState().assets;

    for (const [id, asset] of assets) {
      if (asset.threat !== 'CRITICAL') continue;
      const marker = markers.get(id);
      if (!marker) continue;
      let ring = rings.get(id);
      if (!ring) {
        ring = L.circleMarker(marker.getLatLng(), {
          radius: PULSE_MIN_R,
          fill: false,
          color: RED,
          weight: 1.5,
          interactive: false,
        }).addTo(layer);
        rings.set(id, ring);
      }
      ring.setLatLng(marker.getLatLng());
      ring.setRadius(PULSE_MIN_R + t * (PULSE_MAX_R - PULSE_MIN_R));
      ring.setStyle({ opacity: 0.7 * (1 - t) });
    }
    for (const [id, ring] of rings) {
      const asset = assets.get(id);
      if (!asset || asset.threat !== 'CRITICAL') {
        layer.removeLayer(ring);
        rings.delete(id);
      }
    }
  };

  return {
    frame,
    dispose: () => {
      layer.remove();
      rings.clear();
    },
  };
}
