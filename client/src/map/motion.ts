import type L from 'leaflet';
import type { LatLng } from '@shared/types';
import { useWorldStore } from '../state/worldStore';

/**
 * Entity interpolation (D5, S3): render one tick behind and linearly
 * interpolate between the two most recent fixes, so 1 Hz truth becomes
 * display-rate motion. Never extrapolate: alpha is clamped, so a missing
 * next fix simply holds position (S3 sequence, hold case).
 *
 * Fix pairs are timed by client arrival (not server timestamps), which
 * sidesteps client-server clock skew; the render delay of one tick interval
 * guarantees the render time falls between two known arrivals.
 */

/** Matches the server tick interval (S1). Render this far behind now. */
const RENDER_DELAY_MS = 1000;

/** Fix gaps larger than this snap instead of glide (S3#d-teleport guard). */
const SNAP_DISTANCE_DEG = 0.05; // ~5 km in latitude terms at this sector

interface FixPair {
  prevPos: LatLng;
  prevArrivalMs: number;
  nextPos: LatLng;
  nextArrivalMs: number;
}

const lerp = (a: number, b: number, alpha: number) => a + (b - a) * alpha;

const tooFar = (a: LatLng, b: LatLng) =>
  Math.abs(a.lat - b.lat) > SNAP_DISTANCE_DEG || Math.abs(a.lng - b.lng) > SNAP_DISTANCE_DEG;

export function attachMotion(markers: Map<string, L.CircleMarker>): () => void {
  const pairs = new Map<string, FixPair>();

  const ingest = (assets: Map<string, { pos: LatLng }>) => {
    const arrivalMs = Date.now();
    for (const [id, asset] of assets) {
      const pair = pairs.get(id);
      if (!pair || tooFar(pair.nextPos, asset.pos)) {
        // New asset or teleport: snap, no glide.
        pairs.set(id, {
          prevPos: asset.pos,
          prevArrivalMs: arrivalMs - RENDER_DELAY_MS,
          nextPos: asset.pos,
          nextArrivalMs: arrivalMs,
        });
      } else {
        pairs.set(id, {
          prevPos: pair.nextPos,
          prevArrivalMs: pair.nextArrivalMs,
          nextPos: asset.pos,
          nextArrivalMs: arrivalMs,
        });
      }
    }
    for (const id of pairs.keys()) {
      if (!assets.has(id)) pairs.delete(id);
    }
  };

  ingest(useWorldStore.getState().assets);
  const unsubscribe = useWorldStore.subscribe((state, prev) => {
    if (state.assets !== prev.assets) ingest(state.assets);
  });

  let frameId = 0;
  const frame = () => {
    const renderTimeMs = Date.now() - RENDER_DELAY_MS;
    for (const [id, pair] of pairs) {
      const marker = markers.get(id);
      if (!marker) continue;
      const span = pair.nextArrivalMs - pair.prevArrivalMs;
      const alpha =
        span <= 0 ? 1 : Math.min(1, Math.max(0, (renderTimeMs - pair.prevArrivalMs) / span));
      marker.setLatLng([
        lerp(pair.prevPos.lat, pair.nextPos.lat, alpha),
        lerp(pair.prevPos.lng, pair.nextPos.lng, alpha),
      ]);
    }
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(frameId);
    unsubscribe();
    pairs.clear();
  };
}
