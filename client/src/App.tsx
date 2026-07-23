import { useEffect } from 'react';
import { useLeafletMap } from './map/useLeafletMap';
import { attachAssetLayer } from './map/assetLayer';
import { attachZoneLayer } from './map/zoneLayer';
import { attachZonesController } from './map/zonesController';
import { useWebSocket } from './net/useWebSocket';
import { useWorldStore } from './state/worldStore';
import { useUiStore } from './state/uiStore';

const barStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'baseline',
  gap: 16,
  padding: '9px 14px',
  borderBottom: '1px solid var(--line)',
  background: 'rgba(12, 12, 13, 0.85)',
  backdropFilter: 'blur(var(--glass-blur))',
};

const FEED_LABEL = {
  connecting: 'CONNECTING',
  live: 'LIVE',
  closed: 'CLOSED',
} as const;

const FEED_COLOR = {
  connecting: 'var(--dim)',
  live: 'var(--cyan)',
  closed: 'var(--red)',
} as const;

function NoticeChip() {
  const notice = useUiStore((s) => s.notice);
  if (!notice) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 44,
        left: 14,
        zIndex: 1000,
        padding: '5px 10px',
        fontSize: 11,
        letterSpacing: '0.06em',
        color: 'var(--red)',
        background: 'var(--glass-threat-fill)',
        border: '1px solid var(--glass-threat-line)',
        borderRadius: 'var(--radius-control)',
        backdropFilter: 'blur(var(--glass-blur))',
      }}
    >
      {notice}
    </div>
  );
}

function StatusBar() {
  const connection = useWorldStore((s) => s.connection);
  const trackCount = useWorldStore((s) => s.assets.size);

  return (
    <header style={barStyle}>
      <span style={{ letterSpacing: '0.28em', fontSize: 12 }}>SENTINEL</span>
      <span className="microlabel">YOW SECTOR</span>
      <span className="microlabel" style={{ marginLeft: 'auto' }}>
        FEED: <span style={{ color: FEED_COLOR[connection] }}>{FEED_LABEL[connection]}</span>
      </span>
      <span className="microlabel">
        TRACKS: <span style={{ color: 'var(--ink)' }}>{trackCount}</span>
      </span>
    </header>
  );
}

export default function App() {
  const mapRef = useLeafletMap('map');
  useWebSocket();

  useEffect(() => {
    if (!mapRef.current) return;
    const disposeAssets = attachAssetLayer(mapRef.current);
    const zones = attachZoneLayer(mapRef.current);
    const disposeController = attachZonesController(mapRef.current, zones.resync);
    return () => {
      disposeController();
      zones.dispose();
      disposeAssets();
    };
  }, [mapRef]);

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <StatusBar />
      <NoticeChip />
      <div id="map" style={{ height: '100%' }} />
    </div>
  );
}
