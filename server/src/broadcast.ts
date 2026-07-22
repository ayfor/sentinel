import type { WebSocket } from 'ws';
import type { WsMessage } from '../../shared/types.js';
import { snapshot, type World } from './world.js';

/**
 * Connected-socket registry. One-way transport (D1): the server pushes state,
 * clients never send. Snapshot on connect, then per-tick messages (D8).
 */
export class Broadcaster {
  private readonly sockets = new Set<WebSocket>();

  constructor(private readonly world: World) {}

  add(socket: WebSocket): void {
    this.sockets.add(socket);
    socket.send(JSON.stringify({ type: 'snapshot', world: snapshot(this.world) } satisfies WsMessage));
    socket.on('close', () => this.sockets.delete(socket));
  }

  broadcast(msg: WsMessage): void {
    const payload = JSON.stringify(msg);
    for (const socket of this.sockets) {
      if (socket.readyState === socket.OPEN) socket.send(payload);
    }
  }

  get count(): number {
    return this.sockets.size;
  }
}
