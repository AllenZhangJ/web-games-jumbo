import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponBloodShadowHookBladeReplayPrototype } from '../src/index.js';

describe('Arena V2 blood shadow hook blade Replay prototype', () => {
  it('verifies target-facing branches and records the pull feedback', () => {
    const result = runArenaV2WeaponBloodShadowHookBladeReplayPrototype();
    expect(result.scenarios.map(({ scenario }) => scenario)).toEqual([
      'target-keeps-facing-away',
      'target-turns-to-attacker',
      'target-turns-back-before-active',
    ]);
    const keepFacingAway = result.scenarios[0]!;
    const turnsToAttacker = result.scenarios[1]!;
    const turnsBack = result.scenarios[2]!;
    expect(keepFacingAway.firstHitTick).not.toBeNull();
    expect(keepFacingAway.feedback.kind).toBe('hit-pull');
    expect(keepFacingAway.targetHorizontalDisplacementAfterHit).toBeGreaterThan(0);
    expect(turnsToAttacker.firstHitTick).toBeNull();
    expect(turnsToAttacker.feedback.kind).toBe('attack-evaded');
    expect(turnsBack.firstHitTick).not.toBeNull();
    expect(turnsBack.feedback.kind).toBe('hit-pull');
    expect(result.scenarios.every(({ replayVerified, finalHash, inputFrameCount }) => (
      replayVerified && finalHash.length > 0 && inputFrameCount > 0
    ))).toBe(true);
  });

  it('is deterministic and keeps action samples frozen', () => {
    const first = runArenaV2WeaponBloodShadowHookBladeReplayPrototype();
    const second = runArenaV2WeaponBloodShadowHookBladeReplayPrototype();
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.scenarios)).toBe(true);
    expect(Object.isFrozen(first.scenarios[0]?.actionStateSamples)).toBe(true);
  });
});
