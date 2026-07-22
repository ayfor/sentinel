import type { WsMessage } from '../../shared/types.js';
import { destinationPoint } from '../../shared/geo.js';
import { wander } from './generator.js';
import { recordFix, TICK_MS, type World } from './world.js';

/**
 * The 1 Hz simulation loop. dt is measured, not assumed (design ruling), so
 * event-loop delay under load cannot accumulate position error.
 */
export function startTick(world: World, broadcast: (msg: WsMessage) => void): NodeJS.Timeout {
  let lastTickMs = Date.now();

  return setInterval(() => {
    const nowMs = Date.now();
    const deltaSeconds = (nowMs - lastTickMs) / 1000;
    lastTickMs = nowMs;

    for (const asset of world.assets.values()) {
      wander(asset, deltaSeconds);
      asset.pos = destinationPoint(asset.pos, asset.headingDeg, asset.speedMps * deltaSeconds);
      recordFix(world, asset.id, { pos: asset.pos, timestampMs: nowMs });
    }

    // S6 advances the drone here; until then SEN-01 holds at spawn, idle.

    broadcast({
      type: 'tick',
      timestampMs: nowMs,
      assets: [...world.assets.values()],
      drone: world.drone,
    });
  }, TICK_MS);
}
