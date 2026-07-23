import L from 'leaflet';
import { useWorldStore } from '../state/worldStore';
import { RED } from './palette';

/** Pulse sweep: radius grows over the cycle while opacity fades to zero. */
const PULSE_MIN_R = 4;
const PULSE_MAX_R = 16;
const PULSE_PERIOD_MS = 1600;

/**
 * The CRITICAL pulse ring (S9, FR-7) — glow exception 1 of 3 (T1). The design
 * assigned this animation to S3's motion loop (S9#d1); with S3 deferred by
 * D12 it runs its own small rAF, which S3 absorbs when motion returns
 * (S9#d3).
 */
export function attachPulseLayer(map: L.Map): () => void {
  const layer = L.layerGroup().addTo(map);
  const rings = new Map<string, L.CircleMarker>();
  let raf = 0;

  const frame = (now: number) => {
    const t = (now % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
    const assets = useWorldStore.getState().assets;

    for (const [id, asset] of assets) {
      if (asset.threat !== 'CRITICAL') continue;
      let ring = rings.get(id);
      if (!ring) {
        ring = L.circleMarker([asset.pos.lat, asset.pos.lng], {
          radius: PULSE_MIN_R,
          fill: false,
          color: RED,
          weight: 1.5,
          interactive: false,
        }).addTo(layer);
        rings.set(id, ring);
      }
      ring.setLatLng([asset.pos.lat, asset.pos.lng]);
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
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    layer.remove();
    rings.clear();
  };
}
