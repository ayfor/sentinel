import type { WsMessage } from '../../shared/types.js';
import { destinationPoint } from '../../shared/geo.js';
import { wander } from './generator.js';
import { recordFix, TICK_MS, type World } from './world.js';

/**
 * The 1 Hz simulation loop. dt is measured, not assumed (design ruling), so
 * event-loop delay under load cannot accumulate position error.
 */
export function startTick(world: World, broadcast: (msg: WsMessage) => void): NodeJS.Timeout {
  let last = Date.now();

  return setInterval(() => {
    const now = Date.now();
    const dtS = (now - last) / 1000;
    last = now;

    for (const asset of world.assets.values()) {
      wander(asset, dtS);
      asset.pos = destinationPoint(asset.pos, asset.headingDeg, asset.speedMps * dtS);
      recordFix(world, asset.id, { pos: asset.pos, t: now });
    }

    // S6 advances the drone here; until then SEN-01 holds at spawn, idle.

    broadcast({
      type: 'tick',
      t: now,
      assets: [...world.assets.values()],
      drone: world.drone,
    });
  }, TICK_MS);
}
