import { describe, expect, it } from 'vitest';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_EXPANDED_WEAPON_IDS_CANDIDATE_V1,
  ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1,
  ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_EXPANDED_WEAPON_COUNTERPLAY_VERIFICATION_PLAN_CANDIDATE_V1,
  createArenaExpandedWeaponCounterplayVerificationPlanV1,
  validateArenaExpandedWeaponCounterplayVerificationPlanV1,
} from '../src/arena-expanded-weapon-counterplay-verification-v1.js';
import {
  createArenaWeaponDefenderCounterplayInputScriptCandidateV1,
  runArenaWeaponDefenderCounterfactualProbeCandidateV1,
  type ArenaBaselineWeaponBundleV1,
} from '../src/arena-baseline-weapon-consequence-verification-v1.js';

const EXPECTED_PROBES = Object.freeze([
  ['hook-spear', 'gravity-chain', 'targeting.range', 'targeting.minimumFacingDot'],
  ['burst-gauntlet', 'heavy-hammer', 'timing.windupTicks', 'targeting.range'],
  [
    'vault-lance',
    'charge-shield',
    'effect.selfHorizontalImpulse',
    'timing.recoveryTicks',
  ],
  ['scatter-cannon', 'line-suppressor', 'targeting.radius', 'timing.cooldownTicks'],
  ['sky-anchor', 'heavy-hammer', 'targeting.range', 'timing.recoveryTicks'],
  [
    'edge-scythe',
    'heavy-hammer',
    'targeting.minimumFacingDot',
    'effect.horizontalImpulse',
  ],
  ['rebound-hook', 'gravity-chain', 'timing.windupTicks', 'targeting.range'],
  ['pulse-baton', 'line-suppressor', 'timing.cooldownTicks', 'targeting.range'],
  ['siege-axe', 'heavy-hammer', 'effect.horizontalImpulse', 'timing.windupTicks'],
  ['twin-fan', 'line-suppressor', 'targeting.radius', 'targeting.range'],
  ['diving-claw', 'flank-blade', 'targeting.range', 'targeting.range'],
  ['route-bow', 'line-suppressor', 'targeting.range', 'targeting.radius'],
  ['pivot-blade', 'flank-blade', 'timing.windupTicks', 'targeting.range'],
  ['commitment-fist', 'read-counter', 'timing.windupTicks', 'effect.horizontalImpulse'],
] as const);

interface MutableProbe extends Record<string, unknown> {
  sourceTemplateId: string;
  grammarDefinitionId: string;
  groundCounterInputs: string[];
}

interface MutablePlan extends Record<string, unknown> {
  schemaVersion: number;
  probes: MutableProbe[];
}

function mutablePlan(): MutablePlan {
  return JSON.parse(JSON.stringify(
    ARENA_EXPANDED_WEAPON_COUNTERPLAY_VERIFICATION_PLAN_CANDIDATE_V1,
  )) as MutablePlan;
}

function expandedBundle(index = 0): ArenaBaselineWeaponBundleV1 {
  const weapon = ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1[index]!;
  return Object.freeze({
    id: weapon.id,
    actions: weapon.actions,
    equipment: weapon.equipment,
    grammar: weapon.grammar,
    contentHash: weapon.contentHash,
  });
}

function mutableScript(bundle = expandedBundle()): Array<Record<string, unknown>> {
  return JSON.parse(JSON.stringify(
    createArenaWeaponDefenderCounterplayInputScriptCandidateV1(bundle, 'ground', 'edge'),
  )) as Array<Record<string, unknown>>;
}

describe('Arena expanded weapon counterplay verification V1 candidate', () => {
  it('closes exactly fourteen independently named probes to real definitions and templates', () => {
    const plan = createArenaExpandedWeaponCounterplayVerificationPlanV1();
    expect(plan).toMatchObject({
      schemaVersion: 1,
      candidateStatus: 'production-unreachable',
      hardGate: false,
      defaultRegistryWired: false,
      weaponCount: 14,
      allowedCounterInputs: ['direction', 'jump'],
    });
    expect(plan.probeOrder).toEqual(ARENA_V2_EXPANDED_WEAPON_IDS_CANDIDATE_V1);
    expect(plan.probes).toHaveLength(14);
    expect(new Set(plan.probes.map(({ probeId }) => probeId)).size).toBe(14);
    expect(new Set(plan.probes.map(({ probeIdentityHash }) => probeIdentityHash)).size).toBe(14);

    for (const probe of plan.probes) {
      const weapon = ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1.find(({ id }) => (
        id === probe.weaponId
      ));
      const source = ARENA_V2_LAUNCH_WEAPONS_CANDIDATE_V1.find(({ id }) => (
        id === probe.sourceTemplateId
      ));
      expect(weapon).toBeDefined();
      expect(source).toBeDefined();
      expect(probe).toMatchObject({
        probeId: `arena.p4.expanded-counterplay.${probe.weaponId}.v1`,
        weaponContentHash: weapon!.contentHash,
        sourceTemplateContentHash: source!.contentHash,
        equipmentDefinitionId: weapon!.equipment.id,
        grammarDefinitionId: weapon!.grammar.id,
        groundActionDefinitionId: weapon!.actions[0]!.id,
        aerialActionDefinitionId: weapon!.actions[1]!.id,
        coreVerb: source!.grammar.coreVerb,
        sharedExecutorCoverage: 'real-rule-movement-physics-counterfactual-candidate',
      });
      expect(probe.executionEvidence.map(({ context }) => context)).toEqual([
        'ground',
        'aerial',
      ]);
      for (const evidence of probe.executionEvidence) {
        expect(evidence).toMatchObject({
          weaponId: probe.weaponId,
          equipmentDefinitionId: probe.equipmentDefinitionId,
          grammarDefinitionId: probe.grammarDefinitionId,
          weaponContentHash: probe.weaponContentHash,
          mapSituation: 'edge',
          seed: 4,
        });
        expect(evidence.control.actionStarted).toBe(true);
        expect(evidence.counterfactual.actionStarted).toBe(true);
        expect(evidence.control.hitCount).toBeGreaterThan(0);
        expect(evidence.control.inputFrames).toHaveLength(
          evidence.counterfactual.inputFrames.length,
        );
        expect(evidence.declaredCounterInputs.every((input) => (
          input === 'direction' || input === 'jump'
        ))).toBe(true);
        if (evidence.declaredCounterInputs.includes('direction')) {
          expect(evidence.counterfactual.directionIntentAppliedTickCount).toBeGreaterThan(0);
        }
        if (evidence.declaredCounterInputs.includes('jump')) {
          expect(evidence.counterfactual.jumpPressedTickCount).toBeGreaterThan(0);
          expect(evidence.counterfactual.jumpHeldTickCount).toBeGreaterThan(0);
          expect(evidence.counterfactual.targetFirstUnsupportedTick).not.toBeNull();
        }
      }
      if (probe.counterplayExecutionStatus === 'executed-counterfactual-candidate-unverified') {
        expect(probe.executionEvidence.some(({ counterplayChangedObservableOutcome }) => (
          counterplayChangedObservableOutcome
        ))).toBe(true);
        expect(probe.dynamicClosureGap).toBeNull();
      } else {
        expect(probe.counterplayExecutionStatus).toBe(
          'executed-counterfactual-no-observable-outcome-difference-unverified',
        );
        expect(probe.executionEvidence.every(({ counterplayChangedObservableOutcome }) => (
          !counterplayChangedObservableOutcome
        ))).toBe(true);
        expect(probe.dynamicClosureGap).toContain('已执行');
      }
      expect(probe.probeIdentityHash).toBe(createDeterministicDataHash(
        Object.fromEntries(Object.entries(probe).filter(([key]) => key !== 'probeIdentityHash')),
        `${probe.weaponId} counterplay probe identity`,
      ));
    }
  });

  it.each(EXPECTED_PROBES)(
    'binds %s to its own advantage, failure cost, counterplay and ground/aerial difference',
    (weaponId, sourceTemplateId, advantageMetric, failureMetric) => {
      const probe = ARENA_EXPANDED_WEAPON_COUNTERPLAY_VERIFICATION_PLAN_CANDIDATE_V1.probes
        .find(({ weaponId: candidateId }) => candidateId === weaponId)!;
      expect(probe.sourceTemplateId).toBe(sourceTemplateId);
      expect(probe.advantage.metric).toBe(advantageMetric);
      expect(probe.failureCost.metric).toBe(failureMetric);
      expect(probe.advantage.relation === 'greater-than-template'
        ? probe.advantage.weaponValue > probe.advantage.sourceTemplateValue
        : probe.advantage.weaponValue < probe.advantage.sourceTemplateValue).toBe(true);
      expect(probe.failureCost.relation === 'greater-than-template'
        ? probe.failureCost.weaponValue > probe.failureCost.sourceTemplateValue
        : probe.failureCost.weaponValue < probe.failureCost.sourceTemplateValue).toBe(true);
      expect(probe.failureCost.declaredFailureRisk.length).toBeGreaterThan(0);
      expect(probe.groundCounterInputs.length).toBeGreaterThan(0);
      expect(probe.aerialCounterInputs.length).toBeGreaterThan(0);
      expect([
        ...probe.groundCounterInputs,
        ...probe.aerialCounterInputs,
      ].every((input) => input === 'direction' || input === 'jump')).toBe(true);
      expect(probe.groundAirDifferenceAxes.length).toBeGreaterThan(0);
      expect(probe.groundIntendedResult).not.toBe(probe.aerialIntendedResult);
      expect(probe.sharedExecutorCoverage).toBe(
        'real-rule-movement-physics-counterfactual-candidate',
      );
      expect(probe.counterplayExecutionStatus).toMatch(/^executed-counterfactual-/u);
    },
  );

  it('is deterministic while failing closed on omissions, duplicates and order drift', () => {
    expect(createArenaExpandedWeaponCounterplayVerificationPlanV1()).toEqual(
      createArenaExpandedWeaponCounterplayVerificationPlanV1(),
    );

    const missing = mutablePlan();
    missing.probes.pop();
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(missing)).toThrow();

    const duplicate = mutablePlan();
    duplicate.probes[1] = duplicate.probes[0]!;
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(duplicate)).toThrow();

    const reordered = mutablePlan();
    const first = reordered.probes[0]!;
    reordered.probes[0] = reordered.probes[1]!;
    reordered.probes[1] = first;
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(reordered)).toThrow(
      /顺序|身份/u,
    );
  });

  it('rejects template, identity, input, schema and future-field drift', () => {
    const templateDrift = mutablePlan();
    templateDrift.probes[0]!.sourceTemplateId = 'heavy-hammer';
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(templateDrift)).toThrow();

    const identityDrift = mutablePlan();
    identityDrift.probes[0]!.grammarDefinitionId = 'arena.invalid.grammar';
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(identityDrift)).toThrow();

    const addedPrimary = mutablePlan();
    addedPrimary.probes[0]!.groundCounterInputs.push('primary');
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(addedPrimary)).toThrow();

    const futureSchema = mutablePlan();
    futureSchema.schemaVersion = 2;
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(futureSchema)).toThrow();

    const futureField = mutablePlan();
    futureField.probes[0]!.futureField = true;
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(futureField)).toThrow();

    const missingField = mutablePlan();
    Reflect.deleteProperty(missingField.probes[0]!, 'failureCost');
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(missingField)).toThrow();
  });

  it('rejects sparse, cyclic, Symbol and accessor-bearing evidence without reading the getter', () => {
    const sparse = mutablePlan();
    Reflect.deleteProperty(sparse.probes, '3');
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(sparse)).toThrow();

    const cyclic = mutablePlan();
    cyclic.cycle = cyclic;
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(cyclic)).toThrow();

    const symbol = mutablePlan();
    Object.defineProperty(symbol.probes[0]!, Symbol('future'), {
      value: true,
      enumerable: true,
    });
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(symbol)).toThrow();

    const accessor = mutablePlan();
    let getterCalls = 0;
    Object.defineProperty(accessor.probes[0]!, 'weaponId', {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return 'hook-spear';
      },
    });
    expect(() => validateArenaExpandedWeaponCounterplayVerificationPlanV1(accessor)).toThrow();
    expect(getterCalls).toBe(0);
  });

  it('executes deterministic defender-only direction/jump scripts through Rule, Movement and Physics', () => {
    const bundle = expandedBundle();
    const defenderInputScript = mutableScript(bundle);
    const first = runArenaWeaponDefenderCounterfactualProbeCandidateV1(bundle, {
      context: 'ground',
      mapSituation: 'edge',
      defenderInputScript,
    });
    const second = runArenaWeaponDefenderCounterfactualProbeCandidateV1(bundle, {
      context: 'ground',
      mapSituation: 'edge',
      defenderInputScript,
    });
    expect(first).toEqual(second);
    expect(first.control.actionStarted).toBe(true);
    expect(first.control.hitCount).toBeGreaterThan(0);
    expect(first.control.inputFrames).toHaveLength(first.counterfactual.inputFrames.length);
    expect(first.control.inputFrames.filter(({ participantId }) => (
      participantId === 'arena-p4-target'
    )).every(({ moveX, moveZ, jumpPressed, jumpHeld }) => (
      moveX === 0 && moveZ === 0 && !jumpPressed && !jumpHeld
    ))).toBe(true);
    expect(first.counterfactual.resultHash).not.toBe(first.control.resultHash);
  });

  it('fails closed before authority execution on malformed or hostile counterfactual scripts', () => {
    const bundle = expandedBundle();
    const run = (defenderInputScript: unknown) => (
      runArenaWeaponDefenderCounterfactualProbeCandidateV1(bundle, {
        context: 'ground',
        mapSituation: 'edge',
        defenderInputScript,
      })
    );

    const missingTick = mutableScript(bundle);
    missingTick.pop();
    expect(() => run(missingTick)).toThrow(/tick/u);

    const missingTickField = mutableScript(bundle);
    Reflect.deleteProperty(missingTickField[0]!, 'tick');
    expect(() => run(missingTickField)).toThrow(/tick/u);

    const nonContinuous = mutableScript(bundle);
    nonContinuous[1]!.tick = 3;
    expect(() => run(nonContinuous)).toThrow(/连续/u);

    const duplicateParticipant = mutableScript(bundle);
    const duplicateInputs = duplicateParticipant[0]!.inputs as Array<Record<string, unknown>>;
    duplicateInputs[1]!.participantId = duplicateInputs[0]!.participantId;
    expect(() => run(duplicateParticipant)).toThrow(/participant/u);

    const futureField = mutableScript(bundle);
    (futureField[0]!.inputs as Array<Record<string, unknown>>)[1]!.future = true;
    expect(() => run(futureField)).toThrow();

    for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const nonFinite = mutableScript(bundle);
      (nonFinite[0]!.inputs as Array<Record<string, unknown>>)[1]!.moveX = invalid;
      expect(() => run(nonFinite)).toThrow(/有限数/u);
    }

    const attackerMutation = mutableScript(bundle);
    (attackerMutation[0]!.inputs as Array<Record<string, unknown>>)[0]!.moveX = 1;
    expect(() => run(attackerMutation)).toThrow(/defender/u);

    const missingDirection = mutableScript(bundle);
    for (const tick of missingDirection) {
      const defender = (tick.inputs as Array<Record<string, unknown>>)[1]!;
      defender.moveX = 0;
      defender.moveZ = 0;
    }
    expect(() => run(missingDirection)).toThrow(/direction/u);

    const missingJump = mutableScript(bundle);
    for (const tick of missingJump) {
      const defender = (tick.inputs as Array<Record<string, unknown>>)[1]!;
      defender.jumpPressed = false;
      defender.jumpHeld = false;
    }
    expect(() => run(missingJump)).toThrow(/jump/u);

    const primaryInjection = mutableScript(bundle);
    (primaryInjection[0]!.inputs as Array<Record<string, unknown>>)[1]!.primaryPressed = true;
    expect(() => run(primaryInjection)).toThrow();

    const accessor = mutableScript(bundle);
    let getterCalls = 0;
    Object.defineProperty(accessor[0]!, 'tick', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 0;
      },
    });
    expect(() => run(accessor)).toThrow();
    expect(getterCalls).toBe(0);

    const proxy = new Proxy({
      context: 'ground',
      mapSituation: 'edge',
      defenderInputScript: mutableScript(bundle),
    }, {
      ownKeys() {
        throw new Error('hostile-ownKeys');
      },
    });
    expect(() => runArenaWeaponDefenderCounterfactualProbeCandidateV1(bundle, proxy)).toThrow(
      /hostile-ownKeys/u,
    );

    expect(() => run(mutableScript(bundle))).not.toThrow();
  });
});
