import L from 'leaflet';
import { useWorldStore } from '../state/worldStore';
import { useUiStore } from '../state/uiStore';
import { INK, DIM } from './palette';

/**
 * Interceptors (S10, FR-6): ink chevrons with mono microlabels and a dim
 * line to the target. Ink, not cyan or red — a friendly response asset is
 * neither the Sentinel nor a threat. Markers are created and removed here at
 * tick rate; per-frame position and rotation belong to the motion loop.
 */
const chevronIcon = (callsign: string) =>
  L.divIcon({
    className: 'interceptor-icon',
    html: `
      <svg width="18" height="18" viewBox="-9 -9 18 18" style="display: block;">
        <path d="M 0,-7 L 5,6 L 0,3 L -5,6 Z" fill="none" stroke="${INK}" stroke-width="1.2" />
      </svg>
      <div class="interceptor-label">${callsign}</div>`,
    iconSize: [18, 30],
    iconAnchor: [9, 9],
  });

const TARGET_LINE_STYLE: L.PolylineOptions = {
  color: DIM,
  weight: 1,
  dashArray: '2 4',
  opacity: 0.6,
  interactive: false,
};

export interface InterceptorLayerHandle {
  markers: Map<string, L.Marker>;
  setRotation: (id: string, deg: number) => void;
  setTargetLine: (id: string, ends: [L.LatLngExpression, L.LatLngExpression] | null) => void;
  dispose: () => void;
}

export function attachInterceptorLayer(map: L.Map): InterceptorLayerHandle {
  const markers = new Map<string, L.Marker>();
  const lines = new Map<string, L.Polyline>();

  const sync = () => {
    const interceptors = useWorldStore.getState().interceptors;
    for (const [id, interceptor] of interceptors) {
      if (!markers.has(id)) {
        const marker = L.marker([interceptor.pos.lat, interceptor.pos.lng], {
          icon: chevronIcon(interceptor.callsign),
        }).addTo(map);
        marker.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e); // the S7#d6 idiom
          useUiStore.getState().selectInterceptor(id);
        });
        markers.set(id, marker);
      }
    }
    for (const [id, marker] of markers) {
      if (!interceptors.has(id)) {
        marker.remove();
        markers.delete(id);
        lines.get(id)?.remove();
        lines.delete(id);
        if (useUiStore.getState().selectedInterceptorId === id) {
          useUiStore.getState().selectInterceptor(null);
        }
      }
    }
  };

  sync();
  const unsubscribe = useWorldStore.subscribe((state, prev) => {
    if (state.interceptors !== prev.interceptors) sync();
  });

  return {
    markers,
    setRotation: (id, deg) => {
      const svg = markers.get(id)?.getElement()?.querySelector('svg');
      if (svg) (svg as SVGElement).style.transform = `rotate(${deg}deg)`;
    },
    setTargetLine: (id, ends) => {
      const existing = lines.get(id);
      if (!ends) {
        existing?.remove();
        lines.delete(id);
        return;
      }
      if (!existing) {
        lines.set(id, L.polyline(ends, TARGET_LINE_STYLE).addTo(map));
      } else {
        existing.setLatLngs(ends);
      }
    },
    dispose: () => {
      unsubscribe();
      for (const m of markers.values()) m.remove();
      for (const l of lines.values()) l.remove();
      markers.clear();
      lines.clear();
    },
  };
}
