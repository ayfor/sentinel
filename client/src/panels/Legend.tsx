/**
 * The map legend (S9): glass chip, mono microlabels. The mockup ruled it
 * bottom-left, but the event drawer claimed that corner first (S8); it lives
 * bottom-right above the zoom control instead (S9#d4).
 */
export function Legend() {
  return (
    <div className="legend">
      <div className="legend-row"><span className="legend-dot" style={{ background: 'var(--ink)' }} /> NOMINAL</div>
      <div className="legend-row"><span className="legend-dot" style={{ background: 'var(--amber)' }} /> WARNING · TTE ≤ 120 S</div>
      <div className="legend-row"><span className="legend-dot" style={{ background: 'var(--red)' }} /> CRITICAL · IN ZONE</div>
      <div className="legend-row">
        <svg width="10" height="10" viewBox="-6 -6 12 12" className="legend-hex">
          <polygon points="0,-5 4.3,-2.5 4.3,2.5 0,5 -4.3,2.5 -4.3,-2.5" fill="none" stroke="var(--cyan)" strokeWidth="1" />
        </svg>
        {' '}SEN-01
      </div>
    </div>
  );
}
