import L from 'leaflet';
import type { Fix } from '@shared/types';
import { bearingDeg, destinationPoint, distanceMeters } from '@shared/geo';
import { getTrack } from '../net/api';
import { useUiStore } from '../state/uiStore';
import { useWorldStore } from '../state/worldStore';

/** Trail fade in about 10 bucketed segments (S7#d2), oldest faintest. */
const TRAIL_BUCKETS = 10;
/** Prediction horizon: 5 min dead-reckoned from the averaged track (S7#d3). */
const PREDICTION_S = 300;

export function attachTrailLayer(map: L.Map): () => void {
  const layer = L.layerGroup().addTo(map);
  let shownFor: string | null = null;

  const clear = () => { layer.clearLayers(); shownFor = null; };

  const draw = (fixes: Fix[]) => {
    layer.clearLayers();
    if (fixes.length >= 2) {
      const per = Math.max(2, Math.ceil(fixes.length / TRAIL_BUCKETS));
      for (let b = 0; b * per < fixes.length - 1; b++) {
        const slice = fixes.slice(b * per, (b + 1) * per + 1);
        const opacity = 0.08 + 0.5 * ((b + 1) / TRAIL_BUCKETS);
        L.polyline(
          slice.map((f) => [f.pos.lat, f.pos.lng] as [number, number]),
          { color: '#f2f0ec', weight: 1, opacity, interactive: false },
        ).addTo(layer);
      }
      // Averaged over the fetched window (S7#d3): bearing first-to-last fix,
      // speed as path length over duration.
      const first = fixes[0]!;
      const last = fixes[fixes.length - 1]!;
      const durationS = (last.timestampMs - first.timestampMs) / 1000;
      if (durationS > 0) {
        let pathM = 0;
        for (let i = 1; i < fixes.length; i++) pathM += distanceMeters(fixes[i - 1]!.pos, fixes[i]!.pos);
        const heading = bearingDeg(first.pos, last.pos);
        const speed = pathM / durationS;
        const end = destinationPoint(last.pos, heading, speed * PREDICTION_S);
        L.polyline(
          [[last.pos.lat, last.pos.lng], [end.lat, end.lng]],
          { color: '#f2f0ec', weight: 1, opacity: 0.55, dashArray: '2 6', interactive: false },
        ).addTo(layer);
      }
    }
  };

  const sync = async () => {
    const id = useUiStore.getState().selectedAssetId;
    if (!id) { clear(); return; }
    if (id === shownFor) return;
    shownFor = id;
    try {
      const fixes = await getTrack(id);
      if (useUiStore.getState().selectedAssetId === id) draw(fixes);
    } catch {
      clear();
    }
  };

  const unsubUi = useUiStore.subscribe((state, prev) => {
    if (state.selectedAssetId !== prev.selectedAssetId) void sync();
  });
  // TRACK LOST: trail and prediction clear immediately when the id despawns.
  const unsubWorld = useWorldStore.subscribe((state, prev) => {
    if (state.assets === prev.assets) return;
    const id = useUiStore.getState().selectedAssetId;
    if (id && !state.assets.has(id)) clear();
  });

  return () => {
    unsubUi();
    unsubWorld();
    layer.remove();
  };
}
