import { describe, expect, it } from 'vitest';
import {
  advanceArenaV2WarningZone,
  createArenaV2WarningZoneRuntime,
  isArenaV2WarningZonePointInside,
} from '../src/index.js';

function createRuntime() {
  return createArenaV2WarningZoneRuntime({
    id: 'warning-zone-1',
    ownerId: 'player-1',
    languageId: 'zone-denial',
    center: { x: 2, y: 1, z: 0 },
    radius: 1.2,
    maximumVerticalDifference: 1.5,
    startsAtTick: 24,
    activeTicks: 3,
  });
}

describe('Arena V2 warning zone prototype', () => {
  it('keeps public telegraph, active and expiry phases on integer ticks', () => {
    let runtime = createRuntime();
    for (let tick = 0; tick <= 27; tick += 1) runtime = advanceArenaV2WarningZone(runtime, tick);
    expect(runtime.startsAtTick).toBe(24);
    expect(runtime.expiresAtTickExclusive).toBe(27);
    expect(runtime.lastObservedTick).toBe(27);
    expect(runtime.phase).toBe('expired');
  });

  it('only exposes an active point test while the marker is active', () => {
    let runtime = createRuntime();
    for (let tick = 0; tick < 25; tick += 1) runtime = advanceArenaV2WarningZone(runtime, tick);
    expect(runtime.phase).toBe('active');
    expect(isArenaV2WarningZonePointInside(runtime, { x: 2.5, y: 2, z: 0 })).toBe(true);
    expect(isArenaV2WarningZonePointInside(runtime, { x: 3.3, y: 1, z: 0 })).toBe(false);
    for (let tick = 25; tick <= 27; tick += 1) runtime = advanceArenaV2WarningZone(runtime, tick);
    expect(isArenaV2WarningZonePointInside(runtime, { x: 2, y: 1, z: 0 })).toBe(false);
  });

  it('keeps a persistent zone active after the impact window without changing telegraph timing', () => {
    let runtime = createArenaV2WarningZoneRuntime({
      id: 'persistent-warning-zone',
      ownerId: 'player-1',
      languageId: 'zone-denial',
      center: { x: 0, y: 0, z: 0 },
      radius: 1,
      maximumVerticalDifference: 1,
      startsAtTick: 24,
      activeTicks: 3,
      lingerTicks: 2,
    });
    for (let tick = 0; tick <= 27; tick += 1) runtime = advanceArenaV2WarningZone(runtime, tick);
    expect(runtime.phase).toBe('lingering');
    expect(runtime.lingerStartsAtTick).toBe(27);
    expect(runtime.expiresAtTickExclusive).toBe(29);
    expect(isArenaV2WarningZonePointInside(runtime, { x: 0, y: 0, z: 0 })).toBe(true);
    runtime = advanceArenaV2WarningZone(runtime, 28);
    expect(runtime.phase).toBe('lingering');
    runtime = advanceArenaV2WarningZone(runtime, 29);
    expect(runtime.phase).toBe('expired');
    expect(isArenaV2WarningZonePointInside(runtime, { x: 0, y: 0, z: 0 })).toBe(false);
  });

  it('rejects gaps and non-positive active duration before state can advance', () => {
    expect(() => createArenaV2WarningZoneRuntime({
      id: 'invalid',
      ownerId: 'player-1',
      languageId: 'zone-denial',
      center: { x: 0, y: 0, z: 0 },
      radius: 1,
      maximumVerticalDifference: 1,
      startsAtTick: 0,
      activeTicks: 0,
    })).toThrow('activeTicks');
    const runtime = createRuntime();
    expect(() => advanceArenaV2WarningZone(runtime, 1)).toThrow('连续 tick');
  });
});
