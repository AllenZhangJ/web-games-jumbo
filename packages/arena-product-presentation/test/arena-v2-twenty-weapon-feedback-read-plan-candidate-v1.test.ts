import { describe, expect, it } from 'vitest';
import {
  WEAPON_MODE_KIND_V1,
  type WeaponModeKindV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_TWENTY_WEAPON_FEEDBACK_READ_PLAN_CANDIDATE_V1 as CATALOG,
  ARENA_V2_SURVIVAL_WEAPON_FEEDBACK_ACTION_ALIASES_CANDIDATE_V1 as SURVIVAL_ALIASES,
  ARENA_V2_WEAPON_FEEDBACK_ACTION_READ_BINDINGS_CANDIDATE_V1 as BINDINGS,
  ARENA_V2_WEAPON_FEEDBACK_SIGNATURES_CANDIDATE_V1 as SIGNATURES,
  ARENA_V2_WEAPON_FEEDBACK_VERB_READ_PROFILES_CANDIDATE_V1 as VERBS,
  projectArenaV2TwentyWeaponFeedbackReadPlanCandidateV1,
} from '../src/index.js';

const MODES = Object.freeze([
  WEAPON_MODE_KIND_V1.DUEL,
  WEAPON_MODE_KIND_V1.RACE,
  WEAPON_MODE_KIND_V1.SURVIVAL,
]);
const ATTACK_FEEDBACK_KINDS = Object.freeze([
  'hit-confirm',
  'hit-surface-transfer',
  'hit-ring-out',
  'attack-evaded',
] as const);

function attackEvent(
  actionDefinitionId: string,
  kind: typeof ATTACK_FEEDBACK_KINDS[number],
  sequence: number,
): Readonly<Record<string, unknown>> {
  const common = {
    id: `feedback-${sequence}`,
    type: 'WeaponFeedbackResolved',
    sequence,
    tick: 50,
    kind,
    attackerId: 'player-1',
    targetId: 'player-2',
    actionDefinitionId,
    actionStartedTick: 10,
    initialSupportSurfaceId: 'surface-a',
  } as const;
  if (kind === 'hit-confirm') return Object.freeze({
    ...common,
    firstHitTick: 20,
    targetFallTick: null,
    finalSupportSurfaceId: 'surface-a',
    fallCause: null,
    creditedAttackerId: null,
  });
  if (kind === 'hit-surface-transfer') return Object.freeze({
    ...common,
    firstHitTick: 20,
    targetFallTick: null,
    finalSupportSurfaceId: 'surface-b',
    fallCause: null,
    creditedAttackerId: null,
  });
  if (kind === 'hit-ring-out') return Object.freeze({
    ...common,
    firstHitTick: 20,
    targetFallTick: 30,
    finalSupportSurfaceId: null,
    fallCause: 'credited-hit',
    creditedAttackerId: 'player-1',
  });
  return Object.freeze({
    ...common,
    firstHitTick: null,
    targetFallTick: null,
    finalSupportSurfaceId: 'surface-a',
    fallCause: null,
    creditedAttackerId: null,
  });
}

function movementFallEvent(
  sequence: number,
  actionDefinitionId: string | null = null,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    id: `movement-fall-${sequence}`,
    type: 'WeaponFeedbackResolved',
    sequence,
    tick: 60,
    kind: 'movement-fall',
    attackerId: actionDefinitionId === null ? null : 'player-1',
    targetId: 'player-2',
    actionDefinitionId,
    actionStartedTick: actionDefinitionId === null ? null : 10,
    firstHitTick: null,
    targetFallTick: 50,
    initialSupportSurfaceId: 'surface-a',
    finalSupportSurfaceId: null,
    fallCause: 'movement',
    creditedAttackerId: null,
  });
}

function project(
  modeKind: WeaponModeKindV1,
  event: Readonly<Record<string, unknown>>,
) {
  return projectArenaV2TwentyWeaponFeedbackReadPlanCandidateV1({
    schemaVersion: 1,
    modeKind,
    event,
  });
}

describe('Arena V2 twenty weapon feedback read plan candidate V1 (not run)', () => {
  it('normalizes twenty weapon identities, forty actions and six shared verb families', () => {
    expect(ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1).toHaveLength(20);
    expect(SIGNATURES).toHaveLength(20);
    expect(BINDINGS).toHaveLength(40);
    expect(new Set(BINDINGS.map(({ actionDefinitionId }) => actionDefinitionId)).size).toBe(40);
    expect(Object.keys(VERBS).sort()).toEqual([
      'charge', 'counter', 'flank', 'pull', 'push', 'suppress',
    ]);
    expect(CATALOG).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      hardGate: false,
      weaponCount: 20,
      actionBindingCount: 40,
      survivalRuntimeActionAliasCount: 400,
      acceptedActionIdentityCount: 440,
      weaponActionModeFeedbackPlanCapacity: 480,
      globalMovementFallPlanCount: 3,
      normalizedResolvedPlanCapacity: 483,
      acceptedRuntimeProjectionCombinationCount: 1923,
      formalVfxAssetsReady: false,
      formalAudioAssetsReady: false,
    });
  });

  it('resolves 320 duel/race collection and 1600 survival-tier runtime combinations', () => {
    const collectionPlans = BINDINGS.flatMap((binding, bindingIndex) => (
      MODES.slice(0, 2).flatMap((mode, modeIndex) => (
      ATTACK_FEEDBACK_KINDS.map((kind, kindIndex) => project(
        mode,
        attackEvent(
          binding.actionDefinitionId,
          kind,
          bindingIndex * 100 + modeIndex * 10 + kindIndex,
        ),
      ))
      ))
    ));
    const survivalPlans = SURVIVAL_ALIASES.flatMap((binding, bindingIndex) => (
      ATTACK_FEEDBACK_KINDS.map((kind, kindIndex) => project(
        WEAPON_MODE_KIND_V1.SURVIVAL,
        attackEvent(binding.actionDefinitionId, kind, 10_000 + bindingIndex * 10 + kindIndex),
      ))
    ));
    const plans = [...collectionPlans, ...survivalPlans];
    expect(collectionPlans).toHaveLength(320);
    expect(survivalPlans).toHaveLength(1600);
    expect(plans).toHaveLength(1920);
    expect(plans.every((plan) => (
      plan.weaponSpecific
      && plan.weaponId !== null
      && plan.actionContext !== null
      && plan.modeRead.consequence?.modeKind === plan.modeKind
      && plan.vfx.authoritySource === 'WeaponFeedbackResolved'
      && plan.audio.bus === 'SFX'
      && plan.governance.ownsRuleOrMatchAuthority === false
    ))).toBe(true);
    expect(new Set(plans.map(({ vfx }) => vfx.cueId)).size).toBe(480);
    expect(new Set(plans.map(({ audio }) => audio.cueId)).size).toBe(480);
    expect(survivalPlans.every((plan) => (
      plan.actionIdentityKind === 'survival-tier'
      && plan.survivalLevel !== null
      && plan.collectionActionDefinitionId !== plan.sourceActionDefinitionId
    ))).toBe(true);
  });

  it('keeps movement fall global in every mode even if an attack was active', () => {
    const activeActionId = BINDINGS[0]!.actionDefinitionId;
    const plans = MODES.map((mode, index) => project(
      mode,
      movementFallEvent(index, activeActionId),
    ));
    expect(plans).toHaveLength(3);
    expect(plans.every((plan) => (
      plan.weaponSpecific === false
      && plan.weaponId === null
      && plan.equipmentDefinitionId === null
      && plan.actionContext === null
      && plan.coreVerb === null
      && plan.modeRead.consequence === null
      && plan.vfx.semanticShape === 'downward-broken-line'
      && plan.audio.weaponIdentity === 'movement-fall-global'
    ))).toBe(true);
    expect(plans[0]!.sourceActionDefinitionId).toBe(activeActionId);
  });

  it('rejects unknown weapon actions and widened inputs instead of guessing a cue', () => {
    expect(() => project(
      WEAPON_MODE_KIND_V1.DUEL,
      attackEvent('arena-v2.action.unknown.ground.candidate.v1', 'hit-confirm', 1),
    )).toThrow(/未进入二十武器目录/);
    expect(() => projectArenaV2TwentyWeaponFeedbackReadPlanCandidateV1({
      schemaVersion: 1,
      modeKind: WEAPON_MODE_KIND_V1.DUEL,
      event: movementFallEvent(2),
      inferredPosition: { x: 0, y: 0, z: 0 },
    })).toThrow(/未知字段/);
    expect(() => project(
      WEAPON_MODE_KIND_V1.SURVIVAL,
      attackEvent(BINDINGS[0]!.actionDefinitionId, 'hit-confirm', 3),
    )).toThrow(/不属于survival运行时身份域/);
    expect(() => project(
      WEAPON_MODE_KIND_V1.DUEL,
      attackEvent(SURVIVAL_ALIASES[0]!.actionDefinitionId, 'hit-confirm', 4),
    )).toThrow(/不属于duel运行时身份域/);
  });
});
