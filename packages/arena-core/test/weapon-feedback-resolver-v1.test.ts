import { describe, expect, it } from 'vitest';
import { resolveArenaWeaponFeedbackSemanticV1 } from '../src/index.js';

function resolution(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    id: 'exchange-1',
    sequence: 0,
    resolutionTick: 30,
    attackerId: 'attacker',
    targetId: 'target',
    actionDefinitionId: 'weapon.attack',
    actionStartedTick: 10,
    firstHitTick: 15,
    targetFallTick: null,
    initialSupportSurfaceId: 'surface-a',
    finalSupportSurfaceId: 'surface-a',
    fallCause: null,
    creditedAttackerId: null,
    ...overrides,
  };
}

describe('Arena weapon feedback resolver V1', () => {
  it('resolves the five causal outcomes without presentation inference', () => {
    expect(resolveArenaWeaponFeedbackSemanticV1(resolution()).kind).toBe('hit-confirm');
    expect(resolveArenaWeaponFeedbackSemanticV1(resolution({
      finalSupportSurfaceId: 'surface-b',
    })).kind).toBe('hit-surface-transfer');
    expect(resolveArenaWeaponFeedbackSemanticV1(resolution({
      targetFallTick: 22,
      finalSupportSurfaceId: null,
      fallCause: 'credited-hit',
      creditedAttackerId: 'attacker',
    })).kind).toBe('hit-ring-out');
    expect(resolveArenaWeaponFeedbackSemanticV1(resolution({
      firstHitTick: null,
    })).kind).toBe('attack-evaded');
    expect(resolveArenaWeaponFeedbackSemanticV1(resolution({
      attackerId: null,
      actionDefinitionId: null,
      actionStartedTick: null,
      firstHitTick: null,
      targetFallTick: 12,
      finalSupportSurfaceId: null,
      fallCause: 'movement',
    })).kind).toBe('movement-fall');
  });

  it('rejects a ring-out credited to a different attacker', () => {
    expect(() => resolveArenaWeaponFeedbackSemanticV1(resolution({
      targetFallTick: 22,
      finalSupportSurfaceId: null,
      fallCause: 'credited-hit',
      creditedAttackerId: 'other',
    }))).toThrow(/当前攻击者/);
  });
});
