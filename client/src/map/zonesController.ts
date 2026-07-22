import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import type { LatLng } from '@shared/types';
import { postZone, deleteZone } from '../net/api';
import { useUiStore } from '../state/uiStore';

/**
 * Zone drawing and removal (S4). Draw-time prevention is the primary UX
 * (allowSelfIntersection false, polygon tool enforces 3+ vertices); the
 * server's six-clause validation remains authoritative, surfaced through the
 * client-local rejection notice (S4#d4).
 */
export function attachZonesController(map: L.Map, resyncZones: () => void): () => void {
  map.pm.addControls({
    position: 'bottomright',
    drawPolygon: true,
    removalMode: true,
    drawMarker: false,
    drawCircleMarker: false,
    drawPolyline: false,
    drawRectangle: false,
    drawCircle: false,
    drawText: false,
    editMode: false,
    dragMode: false,
    cutPolygon: false,
    rotateMode: false,
  });
  map.pm.setGlobalOptions({ allowSelfIntersection: false });

  const onCreate = async (e: { layer: L.Layer }) => {
    const drawn = e.layer as L.Polygon;
    const latlngs = (drawn.getLatLngs()[0] as L.LatLng[]).map(
      (p): LatLng => ({ lat: p.lat, lng: p.lng }),
    );
    // Render-from-store (S4#d1): the sketch never survives; the zone comes
    // back from the broadcast.
    drawn.remove();
    try {
      await postZone(latlngs);
    } catch (err) {
      useUiStore.getState().showNotice(`zone rejected: ${(err as Error).message}`);
    }
  };

  const onRemove = async (e: { layer: L.Layer }) => {
    const zoneId = (e.layer as unknown as { zoneId?: string }).zoneId;
    if (!zoneId) return; // not a zone polygon (defensive)
    try {
      await deleteZone(zoneId);
    } catch (err) {
      useUiStore.getState().showNotice(`delete failed: ${(err as Error).message}`);
      resyncZones(); // geoman already removed it locally; restore from store
    }
  };

  map.on('pm:create', onCreate);
  map.on('pm:remove', onRemove);

  return () => {
    map.off('pm:create', onCreate);
    map.off('pm:remove', onRemove);
    map.pm.removeControls();
  };
}
