import { useWorldStore } from '../state/worldStore';
import { useUiStore } from '../state/uiStore';

const fmt = {
  speed: (mps: number) => `${Math.round(mps)} m/s`,
  eta: (s: number | null) => (s === null ? 'NOT CLOSING' : `${s} s`),
};

/**
 * Interceptor detail panel (S10, FR-6): the inspector shell carrying the
 * response picture — origin, target identity and speed, live closing-speed
 * intercept estimate (S10#d2).
 */
export function InterceptorPanel() {
  const selectedId = useUiStore((s) => s.selectedInterceptorId);
  const interceptor = useWorldStore((s) => (selectedId ? s.interceptors.get(selectedId) : undefined));
  const target = useWorldStore((s) =>
    interceptor ? s.assets.get(interceptor.targetId) : undefined,
  );

  if (!selectedId || !interceptor) return null;

  return (
    <aside className="inspector">
      <div className="inspector-header">
        <span className="inspector-callsign">{interceptor.callsign}</span>
        <button
          className="inspector-close"
          onClick={() => useUiStore.getState().selectInterceptor(null)}
          aria-label="close interceptor panel"
        >
          ×
        </button>
      </div>
      <div className="inspector-row">
        <span className="inspector-label">ORIGIN</span>
        <span className="inspector-value">{interceptor.originIcao}</span>
      </div>
      <div className="inspector-row">
        <span className="inspector-label">TARGET</span>
        <span className="inspector-value" style={{ color: 'var(--red)' }}>
          {target?.callsign ?? 'LOST'}
        </span>
      </div>
      <div className="inspector-row">
        <span className="inspector-label">TGT SPD</span>
        <span className="inspector-value">{target ? fmt.speed(target.speedMps) : '—'}</span>
      </div>
      <div className="inspector-row">
        <span className="inspector-label">SPD</span>
        <span className="inspector-value">{fmt.speed(interceptor.speedMps)}</span>
      </div>
      <div className="inspector-row">
        <span className="inspector-label">INTERCEPT</span>
        <span className="inspector-value">{fmt.eta(interceptor.interceptSeconds)}</span>
      </div>
    </aside>
  );
}
