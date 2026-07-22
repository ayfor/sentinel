import L from 'leaflet';
import type { Asset } from '@shared/types';
import { useWorldStore } from '../state/worldStore';

/** Nominal asset dot, from the token sheet (threat colors arrive in S9). */
const MARKER_STYLE: L.CircleMarkerOptions = {
  radius: 2.5,
  fillColor: '#f2f0ec',
  fillOpacity: 0.92,
  stroke: false,
};

export interface AssetLayerHandle {
  /** Live marker registry, keyed by asset id. Motion (S3) drives positions. */
  markers: Map<string, L.CircleMarker>;
  /** When false, the layer stops positioning on tick (motion owns movement). */
  setTickPositioning: (enabled: boolean) => void;
  dispose: () => void;
}

/**
 * Imperative asset rendering (D6), subscribed to the store outside the React
 * tree: per-tick updates touch Leaflet directly and never trigger React
 * reconciliation. The layer owns marker add and remove; S3's motion module
 * takes over positioning while attached, and tick positioning is the fallback
 * when motion is disposed (S3 design).
 */
export function attachAssetLayer(map: L.Map): AssetLayerHandle {
  const markers = new Map<string, L.CircleMarker>();
  const layer = L.layerGroup().addTo(map);
  let tickPositioning = true;

  const sync = (assets: Map<string, Asset>) => {
    for (const [id, asset] of assets) {
      const existing = markers.get(id);
      if (existing) {
        if (tickPositioning) existing.setLatLng([asset.pos.lat, asset.pos.lng]);
      } else {
        const marker = L.circleMarker([asset.pos.lat, asset.pos.lng], MARKER_STYLE);
        marker.addTo(layer);
        markers.set(id, marker);
      }
    }
    // No age-out: departed ids are disposed immediately (S2 decision 3).
    for (const [id, marker] of markers) {
      if (!assets.has(id)) {
        layer.removeLayer(marker);
        markers.delete(id);
      }
    }
  };

  sync(useWorldStore.getState().assets);
  const unsubscribe = useWorldStore.subscribe((state, prev) => {
    if (state.assets !== prev.assets) sync(state.assets);
  });

  return {
    markers,
    setTickPositioning: (enabled) => {
      tickPositioning = enabled;
    },
    dispose: () => {
      unsubscribe();
      layer.remove();
      markers.clear();
    },
  };
}
