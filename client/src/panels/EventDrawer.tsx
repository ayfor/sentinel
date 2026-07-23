import { useState } from 'react';
import type { EventEntry } from '@shared/types';
import { useWorldStore } from '../state/worldStore';

/** Kind colors per token semantics: red is threat-only (T2). */
const KIND_COLOR: Record<EventEntry['kind'], string> = {
  BREACH: 'var(--red)',
  SENTINEL: 'var(--cyan)',
  ZONE: 'var(--dim)',
  FEED: 'var(--dim)',
};

const timeOf = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', { hour12: false });

/**
 * The event ticker and slide-up log (S8, the second ruled slide-out). Reuses
 * the inspector's glass mechanics rather than inventing a second panel
 * language (S8#d3).
 */
export function EventDrawer() {
  const events = useWorldStore((s) => s.events);
  const [open, setOpen] = useState(false);
  const latest = events[events.length - 1];

  return (
    <div className="event-drawer">
      {open && (
        <div className="event-log">
          {[...events].reverse().map((e) => (
            <div key={e.id} className="event-row">
              <span className="event-time">{timeOf(e.timestampMs)}</span>
              <span className="event-kind" style={{ color: KIND_COLOR[e.kind] }}>{e.kind}</span>
              <span className="event-text">{e.text}</span>
            </div>
          ))}
          {events.length === 0 && <div className="event-row event-empty">no events</div>}
        </div>
      )}
      <button className="event-ticker" onClick={() => setOpen(!open)}>
        {latest ? (
          <>
            <span className="event-kind" style={{ color: KIND_COLOR[latest.kind] }}>{latest.kind}</span>
            <span className="event-text">{latest.text}</span>
          </>
        ) : (
          <span className="event-text event-empty">no events</span>
        )}
        <span className="event-caret">{open ? '▾' : '▴'}</span>
      </button>
    </div>
  );
}
