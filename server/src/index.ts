import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { HealthResponse } from '../../shared/types.js';

const PORT = 3001;

const app = Fastify({ logger: { level: 'warn' } });

await app.register(websocket);

// Client-facing REST lives under /api — the Vite proxy forwards the prefix
// verbatim, and a production reverse proxy would present the same shape.
app.get('/api/health', async (): Promise<HealthResponse> => ({ ok: true }));

// S1 replaces this stub with the world protocol: snapshot on connect, deltas per tick.
app.get('/ws', { websocket: true }, (socket) => {
  socket.send(JSON.stringify({ type: 'hello', msg: 'SENTINEL uplink open — protocol arrives in S1' }));
});

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`[sentinel] server up on :${PORT}`);
