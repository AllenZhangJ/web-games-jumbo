import { expect, test } from 'vitest';
import {
  NumberStrategyGame,
  type PlatformPort,
  type RendererPort,
} from '../packages/application/src/number-strategy-game.js';
import type { GameSnapshot } from '@number-strategy/game-contracts';

test('forty 120 Hz jumps keep render-time motion continuous without changing fixed-step truth', async () => {
  let clockMs = 0;
  let nextFrameId = 1;
  let scheduledFrame: ((time?: number) => void) | null = null;
  let lastJumpId = -1;
  let lastPosition: { x: number; y: number; z: number } | null = null;
  let lastSampleTimeMs = -1;
  let projectedFrames = 0;
  let comparableFrames = 0;
  let repeatedFrames = 0;
  let invalidProjections = 0;

  const renderer: RendererPort = {
    resize: () => true,
    load: async () => {},
    render(snapshot: GameSnapshot) {
      if (snapshot.phase !== 'jumping') {
        lastPosition = null;
        return true;
      }
      const presentation = snapshot.presentation as {
        jumpId?: number;
        motionProjection?: {
          playerPosition?: { x: number; y: number; z: number };
          jumpProgress?: number;
          sampleTimeMs?: number;
        } | null;
      };
      const projection = presentation.motionProjection;
      const position = projection?.playerPosition;
      if (
        !position
        || !Number.isFinite(position.x)
        || !Number.isFinite(position.y)
        || !Number.isFinite(position.z)
        || !Number.isFinite(projection?.jumpProgress)
        || !Number.isFinite(projection?.sampleTimeMs)
      ) {
        invalidProjections += 1;
        return true;
      }
      const jumpId = presentation.jumpId ?? -1;
      if (jumpId !== lastJumpId) {
        lastJumpId = jumpId;
        lastPosition = null;
        lastSampleTimeMs = -1;
      }
      if ((projection?.sampleTimeMs ?? -1) < lastSampleTimeMs) invalidProjections += 1;
      lastSampleTimeMs = projection?.sampleTimeMs ?? -1;
      projectedFrames += 1;
      if (lastPosition) {
        comparableFrames += 1;
        if (
          position.x === lastPosition.x
          && position.y === lastPosition.y
          && position.z === lastPosition.z
        ) repeatedFrames += 1;
      }
      lastPosition = { ...position };
      return true;
    },
    destroy: () => {},
  };
  const platform: PlatformPort = {
    createCanvas: () => ({}),
    now: () => clockMs,
    requestFrame(callback) {
      scheduledFrame = callback;
      return nextFrameId++;
    },
    cancelFrame() {
      scheduledFrame = null;
    },
    bindInput: () => () => {},
    onResize: () => () => {},
    onShow: () => () => {},
    onHide: () => () => {},
  };
  const game = new NumberStrategyGame(platform, {
    seed: 20260715,
    restoreSave: false,
    rendererFactory: () => renderer,
  });
  const fireFrame = () => {
    const callback = scheduledFrame;
    scheduledFrame = null;
    expect(callback).not.toBeNull();
    callback?.(clockMs);
  };

  await game.start();
  for (let jump = 0; jump < 40; jump += 1) {
    if (game.state.phase !== 'ready') game.restart();
    expect(game.debugJump(jump % 2)).toBe(true);
    let frameGuard = 0;
    while (game.state.phase === 'jumping' || game.state.phase === 'landing') {
      clockMs += 1000 / 120;
      fireFrame();
      frameGuard += 1;
      expect(frameGuard).toBeLessThan(400);
    }
  }

  expect(invalidProjections).toBe(0);
  expect(projectedFrames).toBeGreaterThan(2_000);
  expect(comparableFrames).toBeGreaterThan(2_000);
  expect(repeatedFrames / comparableFrames).toBeLessThanOrEqual(0.01);
  expect(game.runtimeErrorCount).toBe(0);
  game.destroy();
});
