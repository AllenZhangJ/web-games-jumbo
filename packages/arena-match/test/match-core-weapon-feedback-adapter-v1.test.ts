import { describe, expect, it } from 'vitest';
import {
  MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_V2_MAX_CLOSED_HIT_ATTRIBUTIONS,
  MatchCoreWeaponFeedbackAdapterV1,
  validateMatchCoreWeaponFeedbackAdapterCheckpointV1,
  validateMatchCoreWeaponFeedbackAdapterCheckpointV2,
} from '../src/index.js';

const PARTICIPANT_IDS = Object.freeze(['player-1', 'player-2']);

function observation(
  tick: number,
  eventSequence: number,
  actionDefinitionId: string | null = null,
  targetSurfaceId: string | null = 'surface-a',
  targetActive = true,
) {
  return {
    tick,
    eventSequence,
    participants: [
      {
        participantId: 'player-1',
        active: true,
        actionDefinitionId,
        supportSurfaceId: 'surface-a',
      },
      {
        participantId: 'player-2',
        active: targetActive,
        actionDefinitionId: null,
        supportSurfaceId: targetSurfaceId,
      },
    ],
  };
}

function adapter() {
  return new MatchCoreWeaponFeedbackAdapterV1({
    participantIds: PARTICIPANT_IDS,
    outcomeWindowTicks: 2,
    initialObservation: observation(0, 0),
  });
}

function longWindowAdapter() {
  return new MatchCoreWeaponFeedbackAdapterV1({
    participantIds: PARTICIPANT_IDS,
    outcomeWindowTicks: 20,
    initialObservation: observation(0, 0),
  });
}

function startAndHit(system: MatchCoreWeaponFeedbackAdapterV1, action = 'hammer.attack') {
  expect(system.step({
    sequenceStart: 0,
    sourceEvents: [
      {
        id: 'action-stale', sequence: 0, tick: 0, type: 'ActionStarted',
        participantId: 'player-1', action,
      },
      {
        id: 'hit-stale', sequence: 1, tick: 0, type: 'HitResolved',
        attackerId: 'player-1', targetId: 'player-2', action,
      },
    ],
    observation: observation(1, 2, action),
  })).toEqual([]);
}

function advanceToClosedHit(system: MatchCoreWeaponFeedbackAdapterV1) {
  for (let tick = 2; tick <= 21; tick += 1) {
    system.step({
      sequenceStart: 0,
      sourceEvents: [],
      observation: observation(tick, 2),
    });
  }
}

describe('MatchCore weapon feedback adapter V1', () => {
  it('turns a MatchCore-style hit into one delayed stable support result', () => {
    const system = adapter();
    try {
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [
          {
            id: 'action-1', sequence: 0, tick: 0, type: 'ActionStarted',
            participantId: 'player-1', action: 'hammer.attack',
          },
          {
            id: 'hit-1', sequence: 1, tick: 0, type: 'HitResolved',
            attackerId: 'player-1', targetId: 'player-2', action: 'hammer.attack',
          },
        ],
        observation: observation(1, 2, 'hammer.attack'),
      })).toEqual([]);
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [],
        observation: observation(2, 2),
      })).toEqual([]);
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [],
        observation: observation(3, 2),
      })).toMatchObject([{ kind: 'hit-confirm', firstHitTick: 0 }]);
    } finally {
      system.destroy();
    }
  });

  it('closes a pending hit against the last authority support when terminal state has no elimination', () => {
    const system = adapter();
    try {
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [
          {
            id: 'action-terminal', sequence: 0, tick: 0, type: 'ActionStarted',
            participantId: 'player-1', action: 'hammer.attack',
          },
          {
            id: 'hit-terminal', sequence: 1, tick: 0, type: 'HitResolved',
            attackerId: 'player-1', targetId: 'player-2', action: 'hammer.attack',
          },
        ],
        observation: observation(1, 2, 'hammer.attack'),
      })).toEqual([]);
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [],
        observation: observation(2, 2, null, null, false),
      })).toEqual([]);
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [],
        observation: observation(3, 2, null, null, false),
      })).toMatchObject([{
        id: 'feedback:hit-terminal',
        kind: 'hit-confirm',
        initialSupportSurfaceId: 'surface-a',
        finalSupportSurfaceId: 'surface-a',
        targetFallTick: null,
      }]);
      expect(system.pendingHitCount).toBe(0);
    } finally {
      system.destroy();
    }
  });

  it('separates credited ring-out, movement fall and whiff', () => {
    const ringOut = adapter();
    try {
      const events = ringOut.step({
        sequenceStart: 4,
        sourceEvents: [
          {
            id: 'action-1', sequence: 0, tick: 0, type: 'ActionStarted',
            participantId: 'player-1', action: 'hammer.attack',
          },
          {
            id: 'hit-1', sequence: 1, tick: 0, type: 'HitResolved',
            attackerId: 'player-1', targetId: 'player-2', action: 'hammer.attack',
          },
          {
            id: 'fall-1', sequence: 2, tick: 0, type: 'PlayerEliminated',
            participantId: 'player-2', remainingLives: 2, creditedAttackerId: 'player-1',
          },
        ],
        observation: observation(1, 3, 'hammer.attack', null, false),
      });
      expect(events).toMatchObject([{ sequence: 4, kind: 'hit-ring-out' }]);
    } finally {
      ringOut.destroy();
    }

    const movement = adapter();
    try {
      expect(movement.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'fall-2', sequence: 0, tick: 0, type: 'PlayerEliminated',
          participantId: 'player-2', remainingLives: 2, creditedAttackerId: null,
        }],
        observation: observation(1, 1, null, null, false),
      })).toMatchObject([{ kind: 'movement-fall' }]);
    } finally {
      movement.destroy();
    }

    const whiff = adapter();
    try {
      expect(whiff.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'action-2', sequence: 0, tick: 0, type: 'ActionStarted',
          participantId: 'player-1', action: 'chain.attack',
        }],
        observation: observation(1, 1, 'chain.attack'),
      })).toEqual([]);
      expect(whiff.step({
        sequenceStart: 0,
        sourceEvents: [],
        observation: observation(2, 1),
      })).toMatchObject([{ kind: 'attack-evaded', targetId: null }]);
    } finally {
      whiff.destroy();
    }
  });

  it('settles the superseded hit before the latest same-tick hit owns ring-out credit', () => {
    const system = adapter();
    try {
      const events = system.step({
        sequenceStart: 20,
        sourceEvents: [
          {
            id: 'action-multi', sequence: 0, tick: 0, type: 'ActionStarted',
            participantId: 'player-1', action: 'multi.attack',
          },
          {
            id: 'hit-first', sequence: 1, tick: 0, type: 'HitResolved',
            attackerId: 'player-1', targetId: 'player-2', action: 'multi.attack',
          },
          {
            id: 'hit-final', sequence: 2, tick: 0, type: 'HitResolved',
            attackerId: 'player-1', targetId: 'player-2', action: 'multi.attack',
          },
          {
            id: 'fall-final', sequence: 3, tick: 0, type: 'PlayerEliminated',
            participantId: 'player-2', remainingLives: 0, creditedAttackerId: 'player-1',
          },
        ],
        observation: observation(1, 4, 'multi.attack', null, false),
      });
      expect(events).toMatchObject([
        { id: 'feedback:hit-first', kind: 'hit-confirm', finalSupportSurfaceId: 'surface-a' },
        { id: 'feedback:hit-final', kind: 'hit-ring-out', targetFallTick: 0 },
      ]);
      expect(system.pendingHitCount).toBe(0);
    } finally {
      system.destroy();
    }
  });

  it('drops an explicitly cancelled commitment without reporting an evasion', () => {
    const system = adapter();
    try {
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'action-charge', sequence: 0, tick: 0, type: 'ActionStarted',
          participantId: 'player-1', action: 'charged.attack',
        }],
        observation: observation(1, 1, 'charged.attack'),
      })).toEqual([]);
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'action-charge-cancelled', sequence: 1, tick: 1,
          type: 'ActionCommitmentCancelled', participantId: 'player-1',
          action: 'charged.attack', chargeTicks: 1, chargeLevel: 0,
          facingAtStart: { x: 1, z: 0 }, facingAtResult: { x: 1, z: 0 },
        }],
        observation: observation(2, 2),
      })).toEqual([]);
      expect(system.pendingActionCount).toBe(0);
    } finally {
      system.destroy();
    }
  });

  it('drops an equipment-interrupted action without reporting an evasion', () => {
    const system = adapter();
    try {
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'action-before-replace', sequence: 0, tick: 0, type: 'ActionStarted',
          participantId: 'player-1', action: 'old-weapon.attack',
        }],
        observation: observation(1, 1, 'old-weapon.attack'),
      })).toEqual([]);
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'equipment-replaced', sequence: 1, tick: 1, type: 'EquipmentReplaced',
          payload: {
            schemaVersion: 1, supplyDefinitionId: 'supply.1', supplyId: 'supply-slot.1',
            equipmentInstanceId: 'equipment.new', spawnTick: 0, expireTick: 10,
            tick: 1, participantId: 'player-1',
            previousEquipmentInstanceId: 'equipment.old',
            nextEquipmentInstanceId: 'equipment.new',
          },
        }],
        observation: observation(2, 2),
      })).toEqual([]);
      expect(system.pendingActionCount).toBe(0);
    } finally {
      system.destroy();
    }
  });

  it('keeps an already committed hit on the old action identity across equipment replacement', () => {
    const system = adapter();
    try {
      expect(system.step({
        sequenceStart: 30,
        sourceEvents: [
          {
            id: 'action-old', sequence: 0, tick: 0, type: 'ActionStarted',
            participantId: 'player-1', action: 'old-weapon.attack',
          },
          {
            id: 'hit-old', sequence: 1, tick: 0, type: 'HitResolved',
            attackerId: 'player-1', targetId: 'player-2', action: 'old-weapon.attack',
          },
        ],
        observation: observation(1, 2, 'old-weapon.attack'),
      })).toEqual([]);

      const events = system.step({
        sequenceStart: 30,
        sourceEvents: [
          {
            id: 'equipment-replaced-after-hit', sequence: 2, tick: 1,
            type: 'EquipmentReplaced',
            payload: {
              schemaVersion: 1, supplyDefinitionId: 'supply.1', supplyId: 'supply-slot.1',
              equipmentInstanceId: 'equipment.new', spawnTick: 0, expireTick: 20,
              tick: 1, participantId: 'player-1',
              previousEquipmentInstanceId: 'equipment.old',
              nextEquipmentInstanceId: 'equipment.new',
            },
          },
          {
            id: 'action-new', sequence: 3, tick: 1, type: 'ActionStarted',
            participantId: 'player-1', action: 'new-weapon.attack',
          },
          {
            id: 'hit-new', sequence: 4, tick: 1, type: 'HitResolved',
            attackerId: 'player-1', targetId: 'player-2', action: 'new-weapon.attack',
          },
        ],
        observation: observation(2, 5, 'new-weapon.attack'),
      });
      expect(events).toMatchObject([{
        id: 'feedback:hit-old',
        kind: 'hit-confirm',
        actionDefinitionId: 'old-weapon.attack',
        actionStartedTick: 0,
        firstHitTick: 0,
      }]);
      expect(system.exportCheckpointV1().pendingHits).toMatchObject([{
        sourceEventId: 'hit-new',
        actionDefinitionId: 'new-weapon.attack',
        actionStartedTick: 1,
      }]);
    } finally {
      system.destroy();
    }
  });

  it('ignores non-combat lane starts in the same authority batch', () => {
    const system = adapter();
    try {
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'weapon-action', sequence: 0, tick: 0, type: 'ActionStarted',
          participantId: 'player-1', action: 'weapon.attack', lane: 'combat',
        }, {
          id: 'movement-action', sequence: 1, tick: 0, type: 'ActionStarted',
          participantId: 'player-1', action: 'movement.jump', lane: 'locomotion',
        }],
        observation: observation(1, 2, 'weapon.attack'),
      })).toEqual([]);
      expect(system.pendingActionCount).toBe(1);
      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [],
        observation: observation(2, 2),
      })).toMatchObject([{
        kind: 'attack-evaded', actionDefinitionId: 'weapon.attack',
      }]);
    } finally {
      system.destroy();
    }
  });

  it('exports and restores V1-expressible pending hit state without changing terminal feedback', () => {
    const continuous = adapter();
    let restored: MatchCoreWeaponFeedbackAdapterV1 | null = null;
    try {
      continuous.step({
        sequenceStart: 0,
        sourceEvents: [
          {
            id: 'action-restore', sequence: 0, tick: 0, type: 'ActionStarted',
            participantId: 'player-1', action: 'hammer.attack',
          },
          {
            id: 'hit-restore', sequence: 1, tick: 0, type: 'HitResolved',
            attackerId: 'player-1', targetId: 'player-2', action: 'hammer.attack',
          },
        ],
        observation: observation(1, 2, 'hammer.attack'),
      });
      const checkpoint = continuous.exportCheckpointV1();
      restored = MatchCoreWeaponFeedbackAdapterV1.restoreFromCheckpointV1(checkpoint);
      const steps = [
        { sequenceStart: 0, sourceEvents: [], observation: observation(2, 2) },
        { sequenceStart: 0, sourceEvents: [], observation: observation(3, 2) },
      ];
      const continuousEvents = steps.flatMap((step) => continuous.step(step));
      const restoredEvents = steps.flatMap((step) => restored!.step(step));
      expect(restoredEvents).toEqual(continuousEvents);
      expect(restored.exportCheckpointV2()).toEqual(continuous.exportCheckpointV2());
    } finally {
      continuous.destroy();
      restored?.destroy();
    }
  });

  it('restores an unfinished action and preserves evasion identity', () => {
    const continuous = adapter();
    let restored: MatchCoreWeaponFeedbackAdapterV1 | null = null;
    try {
      continuous.step({
        sequenceStart: 7,
        sourceEvents: [{
          id: 'action-evade-restore', sequence: 0, tick: 0, type: 'ActionStarted',
          participantId: 'player-1', action: 'chain.attack',
        }],
        observation: observation(1, 1, 'chain.attack'),
      });
      restored = MatchCoreWeaponFeedbackAdapterV1.restoreFromCheckpointV1(
        continuous.exportCheckpointV1(),
      );
      const terminalStep = {
        sequenceStart: 7,
        sourceEvents: [],
        observation: observation(2, 1),
      };
      expect(restored.step(terminalStep)).toEqual(continuous.step(terminalStep));
    } finally {
      continuous.destroy();
      restored?.destroy();
    }
  });

  it('rejects tampered checkpoints and keeps a failed step atomic', () => {
    const system = adapter();
    try {
      const before = system.exportCheckpointV1();
      expect(() => system.step({
        sequenceStart: 0,
        sourceEvents: [
          {
            id: 'action-atomic', sequence: 0, tick: 0, type: 'ActionStarted',
            participantId: 'player-1', action: 'hammer.attack',
          },
          {
            id: 'bad-hit', sequence: 1, tick: 0, type: 'HitResolved',
            attackerId: 'player-1', targetId: 'unknown-player', action: 'hammer.attack',
          },
        ],
        observation: observation(1, 2, 'hammer.attack'),
      })).toThrow(/不属于当前对局/);
      expect(system.exportCheckpointV1()).toEqual(before);

      expect(() => validateMatchCoreWeaponFeedbackAdapterCheckpointV1({
        ...before,
        tick: before.tick + 1,
      })).toThrow(/身份hash不一致/);
      expect(() => validateMatchCoreWeaponFeedbackAdapterCheckpointV1({
        ...before,
        future: true,
      })).toThrow(/未知字段|不支持字段/);
    } finally {
      system.destroy();
    }
    expect(() => system.exportCheckpointV1()).toThrow(/已销毁/);
  });

  it('keeps 19/20 credited eliminations in the pending window and consumes only the stale 21 tick authority event', () => {
    const atNineteen = longWindowAdapter();
    const atTwenty = longWindowAdapter();
    const stale = longWindowAdapter();
    try {
      startAndHit(atNineteen);
      for (let tick = 2; tick <= 19; tick += 1) {
        atNineteen.step({ sequenceStart: 0, sourceEvents: [], observation: observation(tick, 2) });
      }
      expect(atNineteen.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'fall-19', sequence: 2, tick: 19, type: 'PlayerEliminated',
          participantId: 'player-2', remainingLives: 0, creditedAttackerId: 'player-1',
        }],
        observation: observation(20, 3, null, null, false),
      })).toMatchObject([{ kind: 'hit-ring-out', targetFallTick: 19 }]);

      startAndHit(atTwenty);
      for (let tick = 2; tick <= 20; tick += 1) {
        atTwenty.step({ sequenceStart: 0, sourceEvents: [], observation: observation(tick, 2) });
      }
      expect(atTwenty.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'fall-20', sequence: 2, tick: 20, type: 'PlayerEliminated',
          participantId: 'player-2', remainingLives: 0, creditedAttackerId: 'player-1',
        }],
        observation: observation(21, 3, null, null, false),
      })).toMatchObject([{ kind: 'hit-ring-out', targetFallTick: 20 }]);

      startAndHit(stale);
      advanceToClosedHit(stale);
      expect(stale.closedHitAttributionCount).toBe(1);
      expect(stale.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'fall-21', sequence: 2, tick: 21, type: 'PlayerEliminated',
          participantId: 'player-2', remainingLives: 0, creditedAttackerId: 'player-1',
        }],
        observation: observation(22, 3, null, null, false),
      })).toEqual([]);
      expect(stale.closedHitAttributionCount).toBe(0);
    } finally {
      atNineteen.destroy();
      atTwenty.destroy();
      stale.destroy();
    }
  });

  it('fails closed for stale credited attribution drift, duplication, and a new hit that supersedes the closed target', () => {
    const system = longWindowAdapter();
    try {
      startAndHit(system);
      advanceToClosedHit(system);
      const beforeWrongAttacker = system.exportCheckpointV2();
      expect(() => system.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'fall-wrong', sequence: 2, tick: 21, type: 'PlayerEliminated',
          participantId: 'player-2', remainingLives: 0, creditedAttackerId: 'player-2',
        }],
        observation: observation(22, 3, null, null, false),
      })).toThrow(/缺少匹配的HitResolved归因/);
      expect(system.exportCheckpointV2()).toEqual(beforeWrongAttacker);

      expect(system.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'fall-once', sequence: 2, tick: 21, type: 'PlayerEliminated',
          participantId: 'player-2', remainingLives: 0, creditedAttackerId: 'player-1',
        }],
        observation: observation(22, 3, null, null, false),
      })).toEqual([]);
      expect(() => system.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'fall-twice', sequence: 3, tick: 22, type: 'PlayerEliminated',
          participantId: 'player-2', remainingLives: 0, creditedAttackerId: 'player-1',
        }],
        observation: observation(23, 4, null, null, false),
      })).toThrow(/缺少匹配的HitResolved归因/);
    } finally {
      system.destroy();
    }

    const superseded = longWindowAdapter();
    try {
      startAndHit(superseded, 'first.attack');
      advanceToClosedHit(superseded);
      expect(superseded.step({
        sequenceStart: 0,
        sourceEvents: [
          {
            id: 'action-second', sequence: 2, tick: 21, type: 'ActionStarted',
            participantId: 'player-1', action: 'second.attack',
          },
          {
            id: 'hit-second', sequence: 3, tick: 21, type: 'HitResolved',
            attackerId: 'player-1', targetId: 'player-2', action: 'second.attack',
          },
        ],
        observation: observation(22, 4, 'second.attack'),
      })).toEqual([]);
      expect(superseded.step({
        sequenceStart: 0,
        sourceEvents: [{
          id: 'fall-old', sequence: 4, tick: 22, type: 'PlayerEliminated',
          participantId: 'player-2', remainingLives: 0, creditedAttackerId: 'player-1',
        }],
        observation: observation(23, 5, null, null, false),
      })).toMatchObject([{ id: 'feedback:hit-second', kind: 'hit-ring-out' }]);
    } finally {
      superseded.destroy();
    }
  });

  it('rejects lossy V1 export after closed attribution while V2 restore remains exact', () => {
    const continuous = longWindowAdapter();
    let restored: MatchCoreWeaponFeedbackAdapterV1 | null = null;
    try {
      startAndHit(continuous);
      advanceToClosedHit(continuous);
      const beforeV2 = continuous.exportCheckpointV2();
      expect(() => continuous.exportCheckpointV1()).toThrow(/不能无损表达.*必须导出V2/);
      expect(continuous.exportCheckpointV2()).toEqual(beforeV2);
      const v2 = beforeV2;
      expect(v2.schemaVersion).toBe(2);
      expect(v2.closedHitAttributions).toMatchObject([{
        sourceEventId: 'hit-stale', attackerId: 'player-1', targetId: 'player-2',
        firstHitTick: 0, resolutionTick: 20, resultKind: 'hit-confirm',
      }]);
      restored = MatchCoreWeaponFeedbackAdapterV1.restoreFromCheckpointV2(v2);
      const staleElimination = {
        sequenceStart: 0,
        sourceEvents: [{
          id: 'fall-restored', sequence: 2, tick: 21, type: 'PlayerEliminated',
          participantId: 'player-2', remainingLives: 0, creditedAttackerId: 'player-1',
        }],
        observation: observation(22, 3, null, null, false),
      };
      expect(restored.step(staleElimination)).toEqual(continuous.step(staleElimination));
      expect(restored.exportCheckpointV2()).toEqual(continuous.exportCheckpointV2());

      expect(() => validateMatchCoreWeaponFeedbackAdapterCheckpointV2({
        ...v2,
        closedHitAttributions: Array.from(
          { length: MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_V2_MAX_CLOSED_HIT_ATTRIBUTIONS + 1 },
          () => v2.closedHitAttributions[0],
        ),
      })).toThrow(/超过有界容量/);
      expect(() => validateMatchCoreWeaponFeedbackAdapterCheckpointV2({
        ...v2,
        closedHitAttributions: [{ ...v2.closedHitAttributions[0], resultKind: 'hit-ring-out' }],
      })).toThrow(/非击落反馈/);
      expect(() => validateMatchCoreWeaponFeedbackAdapterCheckpointV2({
        ...v2,
        closedHitAttributions: [
          v2.closedHitAttributions[0],
          { ...v2.closedHitAttributions[0], targetId: 'player-1' },
        ],
      })).toThrow(/重复source event/);
      expect(() => validateMatchCoreWeaponFeedbackAdapterCheckpointV2({
        ...v2,
        future: true,
      })).toThrow(/未知字段|不支持字段/);
    } finally {
      continuous.destroy();
      restored?.destroy();
    }
  });

  it('clears closed V2 attribution on destroy and never exports a destroyed owner', () => {
    const system = longWindowAdapter();
    startAndHit(system);
    advanceToClosedHit(system);
    expect(system.closedHitAttributionCount).toBe(1);
    system.destroy();
    expect(system.closedHitAttributionCount).toBe(0);
    expect(() => system.exportCheckpointV2()).toThrow(/已销毁/);
  });
});
