import type { WsMessage } from '../../shared/types.js';
import { advanceAssets } from './generator.js';
import { TICK_MS, type World } from './world.js';
import { deriveAsset } from './derive.js';
import { stepDrone } from './drone.js';
import { stepInterceptors } from './interceptor.js';

/**
 * The 1 Hz simulation loop. dt is measured, not assumed (design ruling), so
 * event-loop delay under load cannot accumulate position error.
 */
export function startTick(
  world: World,
  broadcast: (msg: WsMessage) => void,
  emitEvent: (kind: 'SENTINEL' | 'BREACH', text: string) => void,
): NodeJS.Timeout {
  let lastTickMs = Date.now();

  return setInterval(() => {
    const nowMs = Date.now();
    const deltaSeconds = (nowMs - lastTickMs) / 1000;
    lastTickMs = nowMs;

    advanceAssets(world, deltaSeconds, nowMs);
    for (const asset of world.assets.values()) {
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

    stepInterceptors(world, deltaSeconds, emitEvent);

    broadcast({
      type: 'tick',
      timestampMs: nowMs,
      assets: [...world.assets.values()],
      drone: world.drone,
      interceptors: [...world.interceptors.values()],
    });
  }, TICK_MS);
}
