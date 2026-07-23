import L from 'leaflet';
import { useWorldStore } from '../state/worldStore';
import { CYAN } from './palette';

/** Patrol path styling: dashed cyan, the Sentinel's color (T1 grammar). */
const PATROL_STYLE: L.PolylineOptions = {
  color: CYAN,
  weight: 1,
  dashArray: '4 6',
  opacity: 0.8,
};

/** Render-from-store, same rule as zones (S4#d1). */
export function attachPatrolLayer(map: L.Map): { resync: () => void; dispose: () => void } {
  const layer = L.layerGroup().addTo(map);

  const sync = () => {
    layer.clearLayers();
    const patrol = useWorldStore.getState().patrol;
    if (!patrol) return;
    const line = L.polyline(
      patrol.points.map((p) => [p.lat, p.lng] as [number, number]),
      PATROL_STYLE,
    );
    (line as unknown as { isPatrol: boolean }).isPatrol = true;
    line.addTo(layer);
  };

  sync();
  const unsubscribe = useWorldStore.subscribe((state, prev) => {
    if (state.patrol !== prev.patrol) sync();
  });

  return {
    resync: sync,
    dispose: () => {
      unsubscribe();
      layer.remove();
    },
  };
}
