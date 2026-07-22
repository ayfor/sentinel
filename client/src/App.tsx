import { useLeafletMap } from './map/useLeafletMap';

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

export default function App() {
  useLeafletMap('map');

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <header style={barStyle}>
        <span style={{ letterSpacing: '0.28em', fontSize: 12 }}>SENTINEL</span>
        <span className="microlabel">YOW SECTOR</span>
        <span className="microlabel" style={{ marginLeft: 'auto' }}>
          FEED: <span style={{ color: 'var(--ink)' }}>BOOT</span>
        </span>
      </header>
      <div id="map" style={{ height: '100%' }} />
    </div>
  );
}
