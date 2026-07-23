import L from 'leaflet';
import type { Asset, ThreatLevel } from '@shared/types';
import { useWorldStore } from '../state/worldStore';
import { AMBER, INK, RED } from './palette';

/** Threat symbology (S9, FR-7): color from the single computed source (S9#d2). */
const THREAT_FILL: Record<ThreatLevel, string> = {
  NORMAL: INK,
  WARNING: AMBER,
  CRITICAL: RED,
};

const MARKER_STYLE: L.CircleMarkerOptions = {
  radius: 2.5,
  fillColor: INK,
  fillOpacity: 0.92,
  stroke: false,
};

/**
 * Imperative asset rendering (D6), subscribed to the store outside the React
 * tree: per-tick updates touch Leaflet directly and never trigger React
 * reconciliation. S3's interpolation loop slots into this module.
 *
 * Returns a dispose function.
 */
export interface AssetLayerHandle {
  markers: Map<string, L.CircleMarker>;
  layer: L.FeatureGroup;
  dispose: () => void;
}

export function attachAssetLayer(map: L.Map): AssetLayerHandle {
  const markers = new Map<string, L.CircleMarker>();
  // FeatureGroup, not LayerGroup: it re-emits child marker events, which is
  // what the S7 interaction module listens on.
  const layer = L.featureGroup().addTo(map);

  const sync = (assets: Map<string, Asset>) => {
    for (const [id, asset] of assets) {
      const existing = markers.get(id);
      if (existing) {
        existing.setLatLng([asset.pos.lat, asset.pos.lng]);
        if (existing.options.fillColor !== THREAT_FILL[asset.threat]) {
          existing.setStyle({ fillColor: THREAT_FILL[asset.threat] });
        }
      } else {
        const marker = L.circleMarker([asset.pos.lat, asset.pos.lng], {
          ...MARKER_STYLE,
          fillColor: THREAT_FILL[asset.threat],
        });
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
    layer,
    dispose: () => {
      unsubscribe();
      layer.remove();
      markers.clear();
    },
  };
}
