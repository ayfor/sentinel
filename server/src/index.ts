import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { HealthResponse } from '../../shared/types.js';
import { createWorld } from './world.js';
import { spawnAssets, ASSET_COUNT } from './generator.js';
import { startTick } from './tick.js';
import { Broadcaster } from './broadcast.js';

const PORT = 3001;

const world = createWorld();
spawnAssets(world);
const broadcaster = new Broadcaster(world);
startTick(world, (msg) => broadcaster.broadcast(msg));

const app = Fastify({ logger: { level: 'warn' } });

await app.register(websocket);

// Client-facing REST lives under /api — the Vite proxy forwards the prefix
// verbatim, and a production reverse proxy would present the same shape (D7).
app.get('/api/health', async (): Promise<HealthResponse> => ({ ok: true }));

app.get('/ws', { websocket: true }, (socket) => {
  broadcaster.add(socket);
});

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`[sentinel] server up on :${PORT} — ${ASSET_COUNT} assets ticking`);
