import L from 'leaflet';
import { useUiStore } from '../state/uiStore';
import { INK } from './palette';

/**
 * Hover and selection rings (S7, operator addition at the batch gate). Ink,
 * not cyan or red: hover is affordance, not state. The hover ring follows the
 * pointer between markers; the selection ring persists solid until deselect.
 */
const ringStyle = (solid: boolean): L.CircleMarkerOptions => ({
  radius: 6.5,
  fill: false,
  color: INK,
  weight: 1,
  opacity: solid ? 0.9 : 0.4,
  interactive: false,
});

export interface InteractionHandle {
  /** Selection-ring follower, registered with the S3 motion loop. */
  frame: () => void;
  dispose: () => void;
}

export function attachAssetInteraction(
  map: L.Map,
  markers: Map<string, L.CircleMarker>,
  layer: L.FeatureGroup,
): InteractionHandle {
  let hoverRing: L.CircleMarker | null = null;
  let selectRing: L.CircleMarker | null = null;

  const clearHover = () => { hoverRing?.remove(); hoverRing = null; };
  const clearSelect = () => { selectRing?.remove(); selectRing = null; };

  const syncSelectRing = () => {
    const id = useUiStore.getState().selectedAssetId;
    clearSelect();
    if (!id) return;
    const marker = markers.get(id);
    if (!marker) return;
    selectRing = L.circleMarker(marker.getLatLng(), ringStyle(true)).addTo(layer);
  };

  const onOver = (e: L.LeafletEvent) => {
    const marker = e.propagatedFrom as L.CircleMarker;
    clearHover();
    hoverRing = L.circleMarker(marker.getLatLng(), ringStyle(false)).addTo(layer);
    map.getContainer().style.cursor = 'pointer';
  };
  const onOut = () => {
    clearHover();
    map.getContainer().style.cursor = '';
  };
  const onClick = (e: L.LeafletMouseEvent) => {
    // A marker click must not bubble into the map's clear-selection click.
    // Pass the LEAFLET event: stopPropagation then stamps _stopped on the
    // native event, which is the flag Map._fireDOMEvent actually checks.
    // Passing e.originalEvent takes the native path and never sets it.
    L.DomEvent.stopPropagation(e);
    const marker = e.propagatedFrom as L.CircleMarker;
    for (const [id, m] of markers) {
      if (m === marker) { useUiStore.getState().selectAsset(id); break; }
    }
  };
  const onMapClick = () => {
    useUiStore.getState().selectAsset(null);
    useUiStore.getState().selectInterceptor(null);
  };

  layer.on('mouseover', onOver);
  layer.on('mouseout', onOut);
  layer.on('click', onClick);
  map.on('click', onMapClick);
  const unsubscribe = useUiStore.subscribe((state, prev) => {
    if (state.selectedAssetId !== prev.selectedAssetId) syncSelectRing();
  });
  // Selection ring follows its (interpolated) marker per frame via the S3
  // motion loop; the hover ring follows the same way.
  const frame = () => {
    const id = useUiStore.getState().selectedAssetId;
    if (id && selectRing) {
      const marker = markers.get(id);
      if (marker) selectRing.setLatLng(marker.getLatLng());
      else clearSelect();
    }
  };

  return {
    frame,
    dispose: () => {
      unsubscribe();
      layer.off('mouseover', onOver);
      layer.off('mouseout', onOut);
      layer.off('click', onClick);
      map.off('click', onMapClick);
      clearHover();
      clearSelect();
    },
  };
}
