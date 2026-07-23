import { describe, expect, it } from 'vitest';
import { createWorld } from './world.js';
import { ASSET_COUNT, advanceAssets, corridorOf, spawnAssets, wander } from './generator.js';

describe('corridor traffic (S12)', () => {
  it('spawns about 60 percent on corridors, the rest scatter (S12#d2)', () => {
    const world = createWorld();
    spawnAssets(world);
    expect(world.assets.size).toBe(ASSET_COUNT);
    const onCorridors = [...world.assets.values()].filter((a) => corridorOf(a)).length;
    expect(onCorridors).toBe(72);
  });

  it('every corridor member spawns inside the sector (no spawn-time recycling)', () => {
    // Guards the Codex P2 on PR #27: a corridor whose tail spawns past the
    // sector edge churns ids on the first tick.
    for (let run = 0; run < 20; run++) {
      const world = createWorld();
      spawnAssets(world);
      for (const a of world.assets.values()) {
        expect(a.pos.lat).toBeGreaterThanOrEqual(44.2);
        expect(a.pos.lat).toBeLessThanOrEqual(46.6);
        expect(a.pos.lng).toBeGreaterThanOrEqual(-78.5);
        expect(a.pos.lng).toBeLessThanOrEqual(-73.0);
      }
    }
  });

  it('corridor assets hold within 2 degrees of the corridor bearing', () => {
    const world = createWorld();
    spawnAssets(world);
    const member = [...world.assets.values()].find((a) => corridorOf(a))!;
    const corridor = corridorOf(member)!;
    for (let i = 0; i < 60; i++) wander(member, 1);
    let offset = member.headingDeg - corridor.bearingDeg;
    if (offset > 180) offset -= 360;
    if (offset < -180) offset += 360;
    expect(Math.abs(offset)).toBeLessThanOrEqual(2);
  });

  it('recycles corridor assets on sector exit with fresh ids and no history leak', () => {
    const world = createWorld();
    spawnAssets(world);
    const member = [...world.assets.values()].find((a) => corridorOf(a))!;
    const oldId = member.id;
    // Teleport past the sector edge along the corridor; next advance recycles.
    member.pos = { lat: 47.5, lng: -72.0 };
    advanceAssets(world, 1, Date.now());
    expect(world.assets.has(oldId)).toBe(false);
    expect(world.histories.has(oldId)).toBe(false);
    expect(world.assets.size).toBe(ASSET_COUNT);
  });
});
