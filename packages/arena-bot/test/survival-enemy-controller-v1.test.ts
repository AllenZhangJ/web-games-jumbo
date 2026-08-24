import { describe, expect, it } from 'vitest';
import {
  SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
  SURVIVAL_ENEMY_OBSERVATION_V1_SCHEMA_VERSION,
  SurvivalEnemyControllerV1,
  createSurvivalEnemyObservationV1,
  validateSurvivalEnemyControllerCheckpointV1,
} from '../src/index.js';

function observation(tick: number, overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: SURVIVAL_ENEMY_OBSERVATION_V1_SCHEMA_VERSION,
    tick,
    eventSequence: tick,
    modeDefinitionId: 'arena.survival.mode.test.v1',
    participantId: 'enemy-1',
    slotId: 'enemy-slot-1',
    slotGeneration: 0,
    active: true,
    primaryRange: 2,
    primaryMinimumCommitmentTicks: 0,
    primaryCommitment: null,
    self: {
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      hitstunTicks: 0,
      actionReady: true,
      actionInProgress: false,
      currentSegmentId: 'segment-a',
    },
    player: {
      participantId: 'player-1',
      position: { x: 1.4, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      invulnerableTicks: 0,
      currentSegmentId: 'segment-a',
    },
    routeTargets: [{
      segmentId: 'segment-a',
      anchorId: 'anchor-pursuit',
      position: { x: 2, y: 1, z: 0 },
      intent: 'pursuit',
      traversal: 'walk',
      priority: 80,
    }, {
      segmentId: 'segment-b',
      anchorId: 'anchor-recovery',
      position: { x: 0, y: 1, z: 2 },
      intent: 'recovery',
      traversal: 'jump',
      priority: 70,
    }],
    ...overrides,
  };
}

function controller() {
  return new SurvivalEnemyControllerV1({
    participantId: 'enemy-1',
    slotId: 'enemy-slot-1',
    behaviorSeed: 20260810,
    profile: SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
  });
}

describe('SurvivalEnemyControllerV1', () => {
  it('emits only ordinary InputFrame values from the restricted current observation', () => {
    const bot = controller();
    const frame = bot.createInput(observation(0));
    expect(Object.keys(frame).sort()).toEqual([
      'jumpHeld', 'jumpPressed', 'moveX', 'moveZ', 'participantId',
      'primaryHeld', 'primaryPressed', 'slamPressed', 'tick',
    ].sort());
    expect(frame.participantId).toBe('enemy-1');
    expect(frame.primaryPressed).toBe(true);
    expect(frame.slamPressed).toBe(false);
    expect(Math.hypot(frame.moveX, frame.moveZ)).toBeLessThanOrEqual(0.82);
  });

  it('is deterministic for the same seed and current observation sequence', () => {
    const first = controller();
    const second = controller();
    for (let tick = 0; tick < 80; tick += 1) {
      const current = observation(tick);
      expect(first.createInput(current)).toEqual(second.createInput(current));
    }
    expect(first.getDebugSnapshot()).toEqual(second.getDebugSnapshot());
  });

  it('holds and releases a commitment weapon from authority progress only', () => {
    const bot = controller();
    const start = bot.createInput(observation(0, {
      primaryMinimumCommitmentTicks: 3,
    }));
    expect(start).toMatchObject({ primaryPressed: true, primaryHeld: true });
    const hold = bot.createInput(observation(1, {
      primaryMinimumCommitmentTicks: 3,
      primaryCommitment: { status: 'charging', chargeTicks: 0 },
      self: { ...observation(1).self, actionReady: false, actionInProgress: true },
    }));
    expect(hold).toMatchObject({ primaryPressed: false, primaryHeld: true });
    const release = bot.createInput(observation(2, {
      primaryMinimumCommitmentTicks: 3,
      primaryCommitment: { status: 'charging', chargeTicks: 2 },
      self: { ...observation(2).self, actionReady: false, actionInProgress: true },
    }));
    expect(release).toMatchObject({ primaryPressed: false, primaryHeld: false });
  });

  it('uses normal jump input and neutral input while stunned or inactive', () => {
    const bot = controller();
    const jumpTarget = observation(0, {
      self: {
        ...observation(0).self,
        currentSegmentId: 'segment-a',
      },
      player: {
        ...observation(0).player,
        position: { x: 8, y: 1, z: 0 },
        currentSegmentId: 'segment-c',
      },
      routeTargets: [{
        segmentId: 'segment-b',
        anchorId: 'anchor-jump',
        position: { x: 2, y: 1.4, z: 0 },
        intent: 'intercept',
        traversal: 'jump',
        priority: 100,
      }],
    });
    expect(bot.createInput(jumpTarget).jumpPressed).toBe(true);
    const stunned = observation(1, {
      self: { ...observation(1).self, hitstunTicks: 1 },
    });
    expect(bot.createInput(stunned)).toMatchObject({
      tick: 1,
      moveX: 0,
      moveZ: 0,
      primaryPressed: false,
      jumpPressed: false,
    });
    const inactive = observation(2, { active: false, routeTargets: [] });
    expect(bot.createInput(inactive)).toMatchObject({
      tick: 2,
      moveX: 0,
      moveZ: 0,
      primaryPressed: false,
      jumpPressed: false,
    });
  });

  it('fails closed on future-shaped data, tick forks and identity drift', () => {
    const extra = observation(0) as Record<string, unknown>;
    extra.futureTarget = { x: 99, y: 99, z: 99 };
    expect(() => createSurvivalEnemyObservationV1(extra)).toThrow(/不支持字段/);

    const bot = controller();
    bot.createInput(observation(0));
    expect(() => bot.createInput(observation(0, { eventSequence: 2 }))).toThrow(/同tick/);
    expect(() => bot.createInput(observation(2))).toThrow(/tick必须连续/);
    expect(() => controller().createInput(observation(0, {
      participantId: 'different-enemy',
    }))).toThrow(/身份漂移/);
  });

  it('derives a fresh named stream when the authority slot generation advances', () => {
    const bot = controller();
    bot.createInput(observation(0));
    const before = bot.getDebugSnapshot().rngState;
    bot.createInput(observation(1, { slotGeneration: 1 }));
    const after = bot.getDebugSnapshot();
    expect(after.slotGeneration).toBe(1);
    expect(after.rngState).not.toBe(before);
  });

  it('continues with the same InputFrame suffix after controller checkpoint restore', () => {
    const continuous = controller();
    let interrupted = controller();
    for (let tick = 0; tick < 10; tick += 1) {
      const current = observation(tick);
      expect(interrupted.createInput(current)).toEqual(continuous.createInput(current));
    }
    const checkpoint = interrupted.exportCheckpointV1();
    interrupted.destroy();
    interrupted = SurvivalEnemyControllerV1.restoreFromCheckpointV1(checkpoint);
    for (let tick = 10; tick < 80; tick += 1) {
      const current = observation(tick);
      expect(interrupted.createInput(current)).toEqual(continuous.createInput(current));
    }
    expect(interrupted.getDebugSnapshot()).toEqual(continuous.getDebugSnapshot());
  });

  it('preserves paused lifecycle and rejects checkpoint identity tampering', () => {
    const bot = controller();
    bot.createInput(observation(0));
    bot.pause();
    const checkpoint = bot.exportCheckpointV1();
    const restored = SurvivalEnemyControllerV1.restoreFromCheckpointV1(checkpoint);
    expect(restored.getDebugSnapshot().lifecycle).toBe('paused');
    expect(() => restored.createInput(observation(1))).toThrow(/paused/);
    restored.resume();
    expect(restored.createInput(observation(1)).tick).toBe(1);

    const tampered = JSON.parse(JSON.stringify(checkpoint)) as Record<string, unknown>;
    tampered.nextAttackTick = 0;
    expect(() => validateSurvivalEnemyControllerCheckpointV1(tampered)).toThrow(/hash漂移/);
  });
});
