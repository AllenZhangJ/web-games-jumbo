import { describe, expect, it } from 'vitest';
import {
  runArenaV2WeaponAttackJumpInterleaveReplayPrototype,
} from '../src/index.js';

describe('Arena V2 weapon attack/jump interleave Replay prototype', () => {
  it('keeps attack and jump independent on the same input and selects aerial actions after jump', () => {
    const result = runArenaV2WeaponAttackJumpInterleaveReplayPrototype();
    expect(result).toMatchObject({
      candidateCount: 3,
      scenarioCount: 2,
      usesIndependentActionLanes: true,
    });
    expect(result.results).toHaveLength(6);
    for (const candidate of ['line-pressure', 'read-punish', 'flank']) {
      const sameTick = result.results.find(({ candidateId, scenario }) => (
        candidateId === candidate && scenario === 'same-tick-independent-lanes'
      ));
      const airborne = result.results.find(({ candidateId, scenario }) => (
        candidateId === candidate && scenario === 'airborne-weapon-action'
      ));
      expect(sameTick?.sameTickAttackAndJumpStarted).toBe(true);
      expect(sameTick?.airborneWeaponActionStarted).toBe(false);
      expect(airborne?.sameTickAttackAndJumpStarted).toBe(false);
      expect(airborne?.airborneWeaponActionStarted).toBe(true);
      expect(airborne?.airborneMovementMode).toBe('down-smash');
      expect(airborne?.replayVerified).toBe(true);
    }
  });

  it('is deterministic and keeps action identities distinct per candidate', () => {
    const first = runArenaV2WeaponAttackJumpInterleaveReplayPrototype();
    const second = runArenaV2WeaponAttackJumpInterleaveReplayPrototype();
    expect(first).toEqual(second);
    expect(new Set(first.results.map(({ groundActionDefinitionId }) => groundActionDefinitionId)).size)
      .toBe(3);
    expect(new Set(first.results.map(({ aerialActionDefinitionId }) => aerialActionDefinitionId)).size)
      .toBe(3);
    expect(first.results.every(({ checkpointCount, inputFrameCount }) => (
      checkpointCount > 1 && inputFrameCount > 0
    ))).toBe(true);
  });
});
