import L from 'leaflet';
import type { LatLng } from '@shared/types';
import { distanceMeters } from '@shared/geo';
import { useWorldStore } from '../state/worldStore';

/** Server tick interval; the render clock trails by one tick plus safety (S3#d1). */
const TICK_MS = 1000;
const SAFETY_MS = 150;
/** A fix jump above this snaps instead of gliding (respawn, feed switch). */
const TELEPORT_M = 5000;
const BUFFER_CAP = 5;
/** Occlusion fallback cadence: rAF starves in background tabs (attempt 1 finding). */
const FALLBACK_MS = 250;
/** Smoothing factor for the server-clock offset estimate (S3#d4). */
const OFFSET_ALPHA = 0.1;

interface Sample {
  serverMs: number;
  pos: LatLng;
  headingDeg: number;
}

export interface DroneMotionTarget {
  getMarker: () => L.Marker | null;
  setRotation: (deg: number) => void;
  setTether: (ends: [LatLng, LatLng] | null) => void;
}

export interface MotionHandle {
  /** Register a per-frame callback (the single-loop contract: S9 pulse, rings). */
  onFrame: (cb: (nowMs: number) => void) => () => void;
  dispose: () => void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpPos = (a: LatLng, b: LatLng, t: number): LatLng => ({
  lat: lerp(a.lat, b.lat, t),
  lng: lerp(a.lng, b.lng, t),
});

/** Shortest-arc heading interpolation for the drone icon. */
const lerpHeading = (a: number, b: number, t: number): number => {
  let diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
};

/**
 * The motion loop (S3, D5 made real): buffers server-stamped fixes per
 * entity, estimates the server clock offset (S3#d4), and renders one tick
 * behind by interpolating the straddling pair. Clamps at the newest fix —
 * never extrapolates (S3#d1) — so a late tick costs a brief hold, and the
 * next segment departs from the clamped position: no snap.
 */
export function attachMotion(
  markers: Map<string, L.CircleMarker>,
  drone: DroneMotionTarget,
): MotionHandle {
  const buffers = new Map<string, Sample[]>();
  const droneBuffer: Sample[] = [];
  const frameCallbacks = new Set<(nowMs: number) => void>();
  /** serverMs - performance.now() at arrival, exponentially smoothed. */
  let clockOffset: number | null = null;

  const push = (buffer: Sample[], sample: Sample) => {
    const last = buffer[buffer.length - 1];
    if (last && distanceMeters(last.pos, sample.pos) > TELEPORT_M) buffer.length = 0;
    buffer.push(sample);
    if (buffer.length > BUFFER_CAP) buffer.shift();
  };

  const unsubscribe = useWorldStore.subscribe((state, prev) => {
    // A snapshot (initial or reconnect) invalidates every buffered sample and
    // the clock estimate: pre-disconnect fixes must not overwrite the
    // rehydrated world (Codex P2, PR #28).
    if (state.snapshotCount !== prev.snapshotCount) {
      buffers.clear();
      droneBuffer.length = 0;
      clockOffset = null;
    }
    if (state.lastTickMs === prev.lastTickMs) return;
    const arrival = state.lastTickMs - performance.now();
    clockOffset = clockOffset === null ? arrival : lerp(clockOffset, arrival, OFFSET_ALPHA);
    for (const [id, asset] of state.assets) {
      let buffer = buffers.get(id);
      if (!buffer) {
        buffer = [];
        buffers.set(id, buffer);
      }
      push(buffer, { serverMs: state.lastTickMs, pos: asset.pos, headingDeg: asset.headingDeg });
    }
    for (const id of buffers.keys()) {
      if (!state.assets.has(id)) buffers.delete(id);
    }
    if (state.drone) {
      push(droneBuffer, {
        serverMs: state.lastTickMs,
        pos: state.drone.pos,
        headingDeg: state.drone.headingDeg,
      });
    }
  });

  const sampleAt = (buffer: Sample[], renderMs: number): Sample | null => {
    if (buffer.length === 0) return null;
    const newest = buffer[buffer.length - 1]!;
    if (renderMs >= newest.serverMs) return newest; // clamp: never extrapolate (d1)
    if (renderMs <= buffer[0]!.serverMs) return buffer[0]!;
    for (let i = buffer.length - 2; i >= 0; i--) {
      const a = buffer[i]!;
      const b = buffer[i + 1]!;
      if (renderMs >= a.serverMs) {
        const t = (renderMs - a.serverMs) / (b.serverMs - a.serverMs);
        return { serverMs: renderMs, pos: lerpPos(a.pos, b.pos, t), headingDeg: lerpHeading(a.headingDeg, b.headingDeg, t) };
      }
    }
    return newest;
  };

  const frame = () => {
    if (clockOffset === null) return;
    const renderMs = performance.now() + clockOffset - TICK_MS - SAFETY_MS;

    for (const [id, marker] of markers) {
      const sample = sampleAt(buffers.get(id) ?? [], renderMs);
      if (sample) marker.setLatLng([sample.pos.lat, sample.pos.lng]);
    }

    const droneMarker = drone.getMarker();
    const droneSample = sampleAt(droneBuffer, renderMs);
    if (droneMarker && droneSample) {
      droneMarker.setLatLng([droneSample.pos.lat, droneSample.pos.lng]);
      drone.setRotation(droneSample.headingDeg);
      const { drone: droneState } = useWorldStore.getState();
      const targetId = droneState?.mode === 'shadow' ? droneState.targetId : null;
      const targetMarker = targetId ? markers.get(targetId) : undefined;
      drone.setTether(
        targetMarker
          ? [droneSample.pos, { lat: targetMarker.getLatLng().lat, lng: targetMarker.getLatLng().lng }]
          : null,
      );
    }

    const nowMs = performance.now();
    for (const cb of frameCallbacks) cb(nowMs);
  };

  let raf = 0;
  const loop = () => {
    frame();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  // Occlusion fallback: background tabs starve rAF; a coarse interval keeps
  // positions advancing at roughly tick rate (attempt 1 hardening).
  const fallback = window.setInterval(() => {
    if (document.hidden) frame();
  }, FALLBACK_MS);

  return {
    onFrame: (cb) => {
      frameCallbacks.add(cb);
      return () => frameCallbacks.delete(cb);
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      window.clearInterval(fallback);
      unsubscribe();
      buffers.clear();
    },
  };
}
