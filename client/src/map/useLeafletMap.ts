import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// D6: plain Leaflet, imperatively owned. React renders the container div once;
// everything on the map is managed by layer modules against this instance.
// Rationale: S3's interpolation mutates markers in a rAF loop — a declarative
// wrapper would fight that at 60fps.

/** Ottawa sector — the demo stage. */
const CENTER: L.LatLngExpression = [45.42, -75.7];
const ZOOM = 8;

export function useLeafletMap(containerId: string) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const map = L.map(containerId, {
      preferCanvas: true,
      zoomControl: false,
      attributionControl: true,
    }).setView(CENTER, ZOOM);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 12,
      minZoom: 4,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [containerId]);

  return mapRef;
}
