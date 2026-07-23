import L from 'leaflet';
import type { ZonePolygon } from '@shared/types';
import { useWorldStore } from '../state/worldStore';
import { RED } from './palette';

/** Zone styling from the token sheet: red dashed boundary, 12 percent fill. */
const ZONE_STYLE: L.PolylineOptions = {
  color: RED,
  weight: 1,
  dashArray: '6 4',
  fillColor: RED,
  fillOpacity: 0.12,
};

const centroid = (zone: ZonePolygon) => {
  const lat = zone.ring.reduce((sum, p) => sum + p.lat, 0) / zone.ring.length;
  const lng = zone.ring.reduce((sum, p) => sum + p.lng, 0) / zone.ring.length;
  return [lat, lng] as [number, number];
};

/**
 * Render-from-store (S4#d1): zones are always drawn from broadcast state,
 * never from the local sketch. Polygons carry their zone id for the removal
 * flow. Returns a handle with a manual resync (used after failed deletes).
 */
export function attachZoneLayer(map: L.Map): { resync: () => void; dispose: () => void } {
  const layer = L.layerGroup().addTo(map);

  const sync = (zones: ZonePolygon[]) => {
    layer.clearLayers();
    for (const zone of zones) {
      const polygon = L.polygon(
        zone.ring.map((p) => [p.lat, p.lng] as [number, number]),
        ZONE_STYLE,
      );
      (polygon as unknown as { zoneId: string }).zoneId = zone.id;
      polygon.addTo(layer);

      const label = L.marker(centroid(zone), {
        interactive: false,
        icon: L.divIcon({
          className: 'zone-label',
          html: zone.name,
          iconSize: [60, 14],
          iconAnchor: [30, 7],
        }),
      });
      label.addTo(layer);
    }
  };

  sync(useWorldStore.getState().zones);
  const unsubscribe = useWorldStore.subscribe((state, prev) => {
    if (state.zones !== prev.zones) sync(state.zones);
  });

  return {
    resync: () => sync(useWorldStore.getState().zones),
    dispose: () => {
      unsubscribe();
      layer.remove();
    },
  };
}
