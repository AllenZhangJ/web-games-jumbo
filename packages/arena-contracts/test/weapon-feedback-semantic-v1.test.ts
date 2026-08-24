import { describe, expect, it } from 'vitest';
import {
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_EVENT_TYPE,
  ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION,
  createArenaWeaponFeedbackSemanticEventV1,
} from '../src/index.js';

function event(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    schemaVersion: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_SCHEMA_VERSION,
    id: 'feedback-1',
    type: ARENA_WEAPON_FEEDBACK_SEMANTIC_V1_EVENT_TYPE,
    sequence: 1,
    tick: 20,
    kind: 'hit-confirm',
    attackerId: 'attacker',
    targetId: 'target',
    actionDefinitionId: 'weapon.attack',
    actionStartedTick: 10,
    firstHitTick: 14,
    targetFallTick: null,
    initialSupportSurfaceId: 'surface-a',
    finalSupportSurfaceId: 'surface-a',
    fallCause: null,
    creditedAttackerId: null,
    ...overrides,
  };
}

describe('Arena weapon feedback semantic event V1', () => {
  it('accepts all five explicit authority semantics', () => {
    expect(createArenaWeaponFeedbackSemanticEventV1(event()).kind).toBe('hit-confirm');
    expect(createArenaWeaponFeedbackSemanticEventV1(event({
      kind: 'hit-surface-transfer',
      finalSupportSurfaceId: 'surface-b',
    })).kind).toBe('hit-surface-transfer');
    expect(createArenaWeaponFeedbackSemanticEventV1(event({
      kind: 'hit-ring-out',
      targetFallTick: 18,
      finalSupportSurfaceId: null,
      fallCause: 'credited-hit',
      creditedAttackerId: 'attacker',
    })).kind).toBe('hit-ring-out');
    expect(createArenaWeaponFeedbackSemanticEventV1(event({
      kind: 'attack-evaded',
      targetId: null,
      firstHitTick: null,
      initialSupportSurfaceId: null,
      finalSupportSurfaceId: null,
    })).kind).toBe('attack-evaded');
    expect(createArenaWeaponFeedbackSemanticEventV1(event({
      kind: 'movement-fall',
      attackerId: null,
      actionDefinitionId: null,
      actionStartedTick: null,
      firstHitTick: null,
      targetFallTick: 12,
      finalSupportSurfaceId: null,
      fallCause: 'movement',
    })).kind).toBe('movement-fall');
  });

  it('fails closed on mismatched cause, chronology and future keys', () => {
    expect(() => createArenaWeaponFeedbackSemanticEventV1(event({
      kind: 'hit-ring-out',
      targetFallTick: 18,
      finalSupportSurfaceId: null,
      fallCause: 'credited-hit',
      creditedAttackerId: 'other',
    }))).toThrow(/当前攻击者/);
    expect(() => createArenaWeaponFeedbackSemanticEventV1(event({
      firstHitTick: 9,
    }))).toThrow(/动作起始/);
    expect(() => createArenaWeaponFeedbackSemanticEventV1(event({ future: true })))
      .toThrow(/future/);
    expect(() => createArenaWeaponFeedbackSemanticEventV1(event({
      kind: 'attack-evaded',
      firstHitTick: null,
    }))).toThrow(/目标、支撑面/);
  });

  it('rejects movement-fall events that carry any attack context', () => {
    const movementFall = {
      kind: 'movement-fall',
      attackerId: null,
      actionDefinitionId: null,
      actionStartedTick: null,
      firstHitTick: null,
      targetFallTick: 12,
      finalSupportSurfaceId: null,
      fallCause: 'movement',
    };
    for (const forgedContext of [
      { attackerId: 'attacker' },
      { actionDefinitionId: 'weapon.attack' },
      { actionStartedTick: 10 },
      {
        attackerId: 'attacker',
        actionDefinitionId: 'weapon.attack',
        actionStartedTick: 10,
      },
    ]) {
      expect(() => createArenaWeaponFeedbackSemanticEventV1(event({
        ...movementFall,
        ...forgedContext,
      }))).toThrow(/攻击上下文必须全部存在或全部为null|无命中归因/);
    }
  });
});
