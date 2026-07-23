import { useEffect } from 'react';
import type { WsMessage } from '@shared/types';
import { useWorldStore } from '../state/worldStore';

/** Exponential backoff: 1, 2, 4, 8, capped 15 s (S8#d2), with small jitter. */
const BACKOFF_BASE_MS = 1000;
const BACKOFF_CAP_MS = 15000;
/** No tick for this long with an open socket flips FEED to STALE (S8#d1). */
const STALE_AFTER_MS = 3000;
/**
 * A connect attempt that neither opens nor closes within this window is
 * abandoned (S8#d4): a half-open upgrade would otherwise stall the backoff
 * loop forever in CONNECTING — onclose drives retries, and a hung socket
 * never fires it.
 */
const CONNECT_TIMEOUT_MS = 5000;

let clientEventCounter = 0;

/** Connection transitions tell their story in the event log (S8). */
const feedEvent = (text: string) =>
  useWorldStore.getState().applyEvent({
    id: `feed-client-${++clientEventCounter}`,
    timestampMs: Date.now(),
    kind: 'FEED',
    text,
  });

/**
 * One-way uplink (D1): the server pushes, the client never sends. Each wire
 * message dispatches to exactly one store action.
 */
export function useWebSocket(): void {
  useEffect(() => {
    const store = useWorldStore.getState();
    let socket: WebSocket | null = null;
    let retryTimer: number | null = null;
    let attempt = 0;
    let everConnected = false;
    let disposed = false;

    const connect = () => {
      store.setConnection('connecting');
      const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
      // Dev connects to the server directly (S8#d5): Vite's ws proxy wedges
      // permanently after a backend restart (every upgrade errors until Vite
      // itself restarts), which would fail FR-5's kill-and-recover
      // acceptance. Production keeps the same-origin path.
      const url = import.meta.env.DEV
        ? `ws://${location.hostname}:3001/ws`
        : `${scheme}://${location.host}/ws`;
      socket = new WebSocket(url);

      const connectTimer = window.setTimeout(() => {
        if (socket && socket.readyState === WebSocket.CONNECTING) socket.close();
      }, CONNECT_TIMEOUT_MS);

      socket.onopen = () => {
        window.clearTimeout(connectTimer);
        attempt = 0;
        // Seed the stale clock at open (Codex P1 on PR #24): a server that
        // completes the handshake but never ticks must go STALE, not sit
        // LIVE behind a never-armed timer.
        useWorldStore.setState({ lastTickReceivedMs: Date.now() });
        store.setConnection('live');
        feedEvent(everConnected ? 'feed recovered' : 'feed connected');
        everConnected = true;
      };

      socket.onmessage = (ev: MessageEvent<string>) => {
        const msg = JSON.parse(ev.data) as WsMessage;
        switch (msg.type) {
          case 'snapshot':
            store.applySnapshot(msg.world);
            break;
          case 'tick':
            store.applyTick(msg.timestampMs, msg.assets, msg.drone);
            if (useWorldStore.getState().connection === 'stale') store.setConnection('live');
            break;
          case 'zones':
            store.applyZones(msg.zones);
            break;
          case 'patrol':
            store.applyPatrol(msg.patrol);
            break;
          case 'event':
            store.applyEvent(msg.event);
            break;
        }
      };

      socket.onclose = () => {
        window.clearTimeout(connectTimer);
        if (disposed) return;
        store.setConnection('closed');
        if (everConnected && attempt === 0) feedEvent('feed lost');
        const delay = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_CAP_MS);
        attempt += 1;
        retryTimer = window.setTimeout(connect, delay + Math.random() * 300);
      };
    };

    connect();

    // Stale watch (S8#d1): tick age, not socket state — a wedged server with
    // an open socket is the exact failure a socket-state indicator misses.
    const staleTimer = window.setInterval(() => {
      const { connection, lastTickReceivedMs } = useWorldStore.getState();
      if (connection === 'live' && Date.now() - lastTickReceivedMs > STALE_AFTER_MS) {
        useWorldStore.getState().setConnection('stale');
        feedEvent('feed stale (no tick for 3 s)');
      }
    }, 1000);

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.clearInterval(staleTimer);
      socket?.close();
    };
  }, []);
}
