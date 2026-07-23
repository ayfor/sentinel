import { useEffect, useRef, useState } from 'react';
import type { Asset } from '@shared/types';
import { useUiStore } from '../state/uiStore';
import { useWorldStore } from '../state/worldStore';

const THREAT_COLOR: Record<Asset['threat'], string> = {
  NORMAL: 'var(--dim)',
  WARNING: 'var(--amber)',
  CRITICAL: 'var(--red)',
};

const TRACK_LOST_MS = 5000;

const fmt = {
  alt: (m: number) => `${Math.round(m).toLocaleString()} m`,
  speed: (mps: number) => `${Math.round(mps)} m/s`,
  heading: (deg: number) => `${Math.round(deg).toString().padStart(3, '0')}°`,
  tte: (s: number | null) => (s === null ? '—' : s === 0 ? 'BREACH' : `${s} s`),
  dist: (m: number | null) => (m === null ? '—' : `${(m / 1000).toFixed(1)} km`),
};

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="inspector-row">
      <span className="inspector-label">{label}</span>
      <span className="inspector-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

/**
 * The right slide-out inspector (S7, the ruled layout's first panel). Values
 * re-render at 1 Hz from the store; a despawned selection freezes under a
 * TRACK LOST banner and auto-clears after 5 s.
 */
export function InspectorPanel() {
  const selectedId = useUiStore((s) => s.selectedAssetId);
  const asset = useWorldStore((s) => (selectedId ? s.assets.get(selectedId) : undefined));
  const [frozen, setFrozen] = useState<Asset | null>(null);
  const lastSeen = useRef<Asset | null>(null);

  useEffect(() => {
    if (asset) { lastSeen.current = asset; setFrozen(null); return; }
    if (!selectedId || !lastSeen.current) return;
    setFrozen(lastSeen.current);
    const timer = window.setTimeout(() => {
      useUiStore.getState().selectAsset(null);
      setFrozen(null);
      lastSeen.current = null;
    }, TRACK_LOST_MS);
    return () => window.clearTimeout(timer);
  }, [asset, selectedId]);

  const shown = asset ?? frozen;
  if (!selectedId || !shown) return null;
  const lost = !asset;

  return (
    <aside className={`inspector ${lost ? 'inspector-lost' : ''}`}>
      <div className="inspector-header">
        <span className="inspector-callsign">{shown.callsign}</span>
        <button
          className="inspector-close"
          onClick={() => useUiStore.getState().selectAsset(null)}
          aria-label="close inspector"
        >
          ×
        </button>
      </div>
      {lost && <div className="inspector-banner">TRACK LOST</div>}
      <Row label="ALT" value={fmt.alt(shown.altitudeM)} />
      <Row label="SPD" value={fmt.speed(shown.speedMps)} />
      <Row label="HDG" value={fmt.heading(shown.headingDeg)} />
      <Row label="TTE" value={fmt.tte(shown.timeToEntrySeconds)} color={shown.timeToEntrySeconds !== null ? THREAT_COLOR[shown.threat] : undefined} />
      <Row label="ZONE" value={fmt.dist(shown.nearestZoneMeters)} />
      <Row label="THREAT" value={shown.threat} color={THREAT_COLOR[shown.threat]} />
    </aside>
  );
}
