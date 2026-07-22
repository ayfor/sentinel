import { useEffect } from 'react';
import type { WsMessage } from '@shared/types';
import { useWorldStore } from '../state/worldStore';

/** Fixed retry until S8 brings backoff and the stale indicator. */
const RECONNECT_DELAY_MS = 2000;

/**
 * One-way uplink (D1): the server pushes, the client never sends. Each wire
 * message dispatches to exactly one store action.
 */
export function useWebSocket(): void {
  useEffect(() => {
    const store = useWorldStore.getState();
    let socket: WebSocket | null = null;
    let retryTimer: number | null = null;
    let disposed = false;

    const connect = () => {
      store.setConnection('connecting');
      socket = new WebSocket(`ws://${location.host}/ws`);

      socket.onopen = () => store.setConnection('live');

      socket.onmessage = (ev: MessageEvent<string>) => {
        const msg = JSON.parse(ev.data) as WsMessage;
        switch (msg.type) {
          case 'snapshot':
            store.applySnapshot(msg.world);
            break;
          case 'tick':
            store.applyTick(msg.timestampMs, msg.assets, msg.drone);
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
        if (disposed) return;
        store.setConnection('closed');
        retryTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);
}
