import type { WsMessage } from '../../shared/types.js';
import { destinationPoint } from '../../shared/geo.js';
import { wander } from './generator.js';
import { recordFix, TICK_MS, type World } from './world.js';
import { deriveAsset } from './derive.js';
import { stepDrone } from './drone.js';

/**
 * The 1 Hz simulation loop. dt is measured, not assumed (design ruling), so
 * event-loop delay under load cannot accumulate position error.
 */
export function startTick(
  world: World,
  broadcast: (msg: WsMessage) => void,
  emitEvent: (kind: 'SENTINEL', text: string) => void,
): NodeJS.Timeout {
  let lastTickMs = Date.now();

  return setInterval(() => {
    const nowMs = Date.now();
    const deltaSeconds = (nowMs - lastTickMs) / 1000;
    lastTickMs = nowMs;

    for (const asset of world.assets.values()) {
      wander(asset, deltaSeconds);
      asset.pos = destinationPoint(asset.pos, asset.headingDeg, asset.speedMps * deltaSeconds);
      recordFix(world, asset.id, { pos: asset.pos, timestampMs: nowMs });
      deriveAsset(asset, world.zones);
    }

    const step = stepDrone(
      world.drone,
      world.patrol,
      [...world.assets.values()],
      world.patrolWaypointIndex,
      deltaSeconds,
    );
    world.drone = step.drone;
    world.patrolWaypointIndex = step.waypointIndex;
    for (const text of step.events) emitEvent('SENTINEL', text);

    broadcast({
      type: 'tick',
      timestampMs: nowMs,
      assets: [...world.assets.values()],
      drone: world.drone,
    });
  }, TICK_MS);
}
