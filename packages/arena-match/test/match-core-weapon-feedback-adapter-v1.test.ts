import { describe, expect, it } from 'vitest';
import {
  MatchCoreWeaponFeedbackAdapterV1,
  validateMatchCoreWeaponFeedbackAdapterCheckpointV1,
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

  it('restores a pending hit without changing the terminal feedback event', () => {
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
      expect(restored.exportCheckpointV1()).toEqual(continuous.exportCheckpointV1());
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
      })).toThrow(/未知字段/);
    } finally {
      system.destroy();
    }
    expect(() => system.exportCheckpointV1()).toThrow(/已销毁/);
  });
});
