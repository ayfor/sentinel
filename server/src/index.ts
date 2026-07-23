import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { EventKind, HealthResponse, LatLng } from '../../shared/types.js';
import { createWorld, pushEvent } from './world.js';
import { createZone, validatePath, validateRing } from './zones.js';
import { deriveAsset } from './derive.js';
import { stepInterceptors } from './interceptor.js';
import { spawnAssets, ASSET_COUNT } from './generator.js';
import { startTick } from './tick.js';
import { Broadcaster } from './broadcast.js';

const PORT = 3001;

const world = createWorld();
spawnAssets(world);
const broadcaster = new Broadcaster(world);

let eventCounter = 0;
const emitEvent = (kind: EventKind, text: string) => {
  const event = { id: `event-${++eventCounter}`, timestampMs: Date.now(), kind, text };
  pushEvent(world, event);
  broadcaster.broadcast({ type: 'event', event });
};

startTick(world, (msg) => broadcaster.broadcast(msg), emitEvent);

const app = Fastify({ logger: { level: 'warn' } });

await app.register(websocket);

// Client-facing REST lives under /api — the Vite proxy forwards the prefix
// verbatim, and a production reverse proxy would present the same shape (D7).
app.get('/api/health', async (): Promise<HealthResponse> => ({ ok: true }));

app.get('/ws', { websocket: true }, (socket) => {
  broadcaster.add(socket);
});

/**
 * Zone mutations re-derive every asset and push a fresh tick immediately:
 * without this, deleting the last zone leaves a false CRITICAL on screen for
 * up to a second (Codex P2 on PR #21).
 */
const rederiveAndBroadcast = () => {
  for (const asset of world.assets.values()) deriveAsset(asset, world.zones);
  // Interceptor truth must move with breach truth (Codex P2 on PR #29): a
  // zero-dt step dispatches and stands down without moving anyone, so the
  // synthesized tick is internally consistent.
  stepInterceptors(world, 0, emitEvent);
  broadcaster.broadcast({
    type: 'tick',
    timestampMs: Date.now(),
    assets: [...world.assets.values()],
    drone: world.drone,
    interceptors: [...world.interceptors.values()],
  });
};

app.post('/api/zones', async (req, reply) => {
  const body = req.body as { ring?: LatLng[] } | null;
  const result = validateRing(body?.ring);
  if (!result.ok) {
    return reply.code(400).send({ reason: result.reason });
  }
  const zone = createZone(result.ring, ++world.zoneCounter);
  world.zones.push(zone);
  broadcaster.broadcast({ type: 'zones', zones: world.zones });
  emitEvent('ZONE', `${zone.name} created by operator (${zone.ring.length} vertices)`);
  rederiveAndBroadcast();
  return reply.code(201).send(zone);
});

app.delete('/api/zones/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const index = world.zones.findIndex((z) => z.id === id);
  if (index === -1) return reply.code(404).send({ reason: 'unknown zone id' });
  const [removed] = world.zones.splice(index, 1);
  broadcaster.broadcast({ type: 'zones', zones: world.zones });
  emitEvent('ZONE', `${removed!.name} deleted by operator`);
  rederiveAndBroadcast();
  return reply.code(204).send();
});

app.get('/api/assets/:id/track', async (req, reply) => {
  const { id } = req.params as { id: string };
  const track = world.histories.get(id);
  if (!track) return reply.code(404).send({ reason: 'unknown asset id' });
  return reply.send(track);
});

app.put('/api/patrol', async (req, reply) => {
  const body = req.body as { points?: LatLng[] } | null;
  const result = validatePath(body?.points);
  if (!result.ok) {
    return reply.code(400).send({ reason: result.reason });
  }
  world.patrol = { id: 'patrol-1', points: result.points };
  world.patrolWaypointIndex = 0;
  broadcaster.broadcast({ type: 'patrol', patrol: world.patrol });
  emitEvent('SENTINEL', `patrol path set by operator (${result.points.length} waypoints)`);
  return reply.code(200).send(world.patrol);
});

app.delete('/api/patrol', async (_req, reply) => {
  if (!world.patrol) return reply.code(404).send({ reason: 'no patrol path' });
  world.patrol = null;
  broadcaster.broadcast({ type: 'patrol', patrol: null });
  emitEvent('SENTINEL', 'patrol path cleared by operator');
  return reply.code(204).send();
});

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`[sentinel] server up on :${PORT} — ${ASSET_COUNT} assets ticking`);
