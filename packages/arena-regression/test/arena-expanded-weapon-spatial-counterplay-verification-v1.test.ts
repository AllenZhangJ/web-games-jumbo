import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1,
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_PLAN_CANDIDATE_V1,
  createArenaExpandedWeaponSpatialCounterplayPlanV1,
  runArenaExpandedWeaponSpatialCounterplayVerificationCandidateV1,
  runArenaExpandedWeaponSpatialCounterplayWeaponCandidateV1,
  validateArenaExpandedWeaponSpatialCounterplayPlanV1,
} from '../src/arena-expanded-weapon-spatial-counterplay-verification-v1.js';

interface MutablePlan extends Record<string, unknown> {
  schemaVersion: number;
  validationStatus: string;
  weapons: Array<Record<string, unknown>>;
}

function mutablePlan(): MutablePlan {
  return JSON.parse(JSON.stringify(
    ARENA_EXPANDED_WEAPON_SPATIAL_COUNTERPLAY_PLAN_CANDIDATE_V1,
  )) as MutablePlan;
}

function expectContiguousInputFrames(
  frames: readonly Readonly<{
    tick: number;
    participantId: string;
    moveX: number;
    moveZ: number;
    primaryPressed: boolean;
    primaryHeld: boolean;
    jumpPressed: boolean;
    jumpHeld: boolean;
    slamPressed: boolean;
  }>[],
  participantCount: number,
): void {
  expect(frames.length % participantCount).toBe(0);
  for (let offset = 0; offset < frames.length; offset += participantCount) {
    const tick = offset / participantCount;
    const batch = frames.slice(offset, offset + participantCount);
    expect(batch.every((frame) => frame.tick === tick)).toBe(true);
    expect(new Set(batch.map(({ participantId }) => participantId)).size).toBe(participantCount);
    expect(batch.every(({ moveX, moveZ }) => Number.isFinite(moveX) && Number.isFinite(moveZ)))
      .toBe(true);
    expect(batch.filter(({ participantId }) => participantId !== 'arena-p4-spatial-attacker')
      .every(({ primaryPressed, primaryHeld, slamPressed }) => (
        !primaryPressed && !primaryHeld && !slamPressed
      ))).toBe(true);
  }
}

describe('Arena expanded weapon spatial counterplay verification V1 candidate', () => {
  it('freezes a not-run exact-key plan for exactly twenty catalog weapons and three probes each', () => {
    const plan = createArenaExpandedWeaponSpatialCounterplayPlanV1();
    expect(plan).toMatchObject({
      schemaVersion: 1,
      candidateStatus: 'production-unreachable',
      hardGate: false,
      defaultRegistryWired: false,
      validationStatus: 'not-run',
      weaponCatalogHash: ARENA_V2_COLLECTION_WEAPON_CATALOG_CANDIDATE_V1.contentHash,
      weaponCount: 20,
      probeKinds: ['height-difference', 'multi-target', 'collision-edge'],
      allowedCounterInputs: ['direction', 'jump'],
    });
    expect(Object.isFrozen(plan)).toBe(true);
    expect(plan.weapons).toHaveLength(20);
    expect(plan.weapons.map(({ weaponId }) => weaponId)).toEqual(
      ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ id }) => id),
    );
    expect(plan.weapons.map(({ collectionOrder }) => collectionOrder)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(new Set(plan.weapons.flatMap(({ probeIds }) => probeIds)).size).toBe(60);
    for (const [index, weaponPlan] of plan.weapons.entries()) {
      const weapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1[index]!;
      expect(weaponPlan).toEqual(expect.objectContaining({
        weaponId: weapon.id,
        sourceBatch: weapon.sourceBatch,
        equipmentDefinitionId: weapon.equipment.id,
        grammarDefinitionId: weapon.grammar.id,
        actionDefinitionIds: weapon.actions.map(({ id }) => id),
        weaponContentHash: weapon.contentHash,
      }));
    }
  });

  it('routes all sixty candidate probes through real Rule, Movement and Physics evidence without claiming pass', () => {
    const report = runArenaExpandedWeaponSpatialCounterplayVerificationCandidateV1();
    expect(report).toMatchObject({
      candidateStatus: 'production-unreachable',
      hardGate: false,
      defaultRegistryWired: false,
      weaponCount: 20,
      probeKinds: ['height-difference', 'multi-target', 'collision-edge'],
    });
    expect(report.weapons).toHaveLength(20);
    expect(
      report.observedProbeCount
        + report.indistinguishableProbeCount
        + report.deferredProbeCount,
    ).toBe(60);
    const allowedStatuses = new Set(['observed', 'indistinguishable', 'deferred']);
    for (const weapon of report.weapons) {
      expect([
        weapon.heightDifference.status,
        weapon.multiTarget.status,
        weapon.collisionEdge.status,
      ].every((status) => allowedStatuses.has(status))).toBe(true);
      expect(weapon.heightDifference.groundControl.context).toBe('ground');
      expect(weapon.heightDifference.aerialControl.context).toBe('aerial');
      if (weapon.heightDifference.status !== 'deferred') {
        expect([
          weapon.heightDifference.groundControl,
          weapon.heightDifference.groundCounterfactual,
          weapon.heightDifference.aerialControl,
          weapon.heightDifference.aerialCounterfactual,
        ].every(({ selectedFromEquipmentSystem }) => selectedFromEquipmentSystem)).toBe(true);
      }
      expect(weapon.heightDifference.aerialControl.initialStates[0]!.position.y)
        .toBeGreaterThan(weapon.heightDifference.aerialControl.initialStates[1]!.position.y);
      expect(weapon.collisionEdge.declaredCounterInputs.every((input) => (
        input === 'direction' || input === 'jump'
      ))).toBe(true);
      expect(weapon.collisionEdge.control.inputFrames).toHaveLength(
        weapon.collisionEdge.counterfactual.inputFrames.length,
      );
      for (const run of [
        weapon.heightDifference.groundControl,
        weapon.heightDifference.groundCounterfactual,
        weapon.heightDifference.aerialControl,
        weapon.heightDifference.aerialCounterfactual,
        weapon.multiTarget.forward,
        weapon.multiTarget.reversed,
        weapon.collisionEdge.control,
        weapon.collisionEdge.counterfactual,
      ]) expectContiguousInputFrames(run.inputFrames, run.initialStates.length);
      expect(weapon.heightDifference.evidenceHash).toMatch(/^[0-9a-f]{8}$/u);
      expect(weapon.multiTarget.evidenceHash).toMatch(/^[0-9a-f]{8}$/u);
      expect(weapon.collisionEdge.evidenceHash).toMatch(/^[0-9a-f]{8}$/u);
    }
  });

  it('uses official stable target ordering across candidate insertion permutations', () => {
    const evidence = runArenaExpandedWeaponSpatialCounterplayWeaponCandidateV1('heavy-hammer');
    const { multiTarget } = evidence;
    expect(multiTarget.forward.actorInsertionOrder).toEqual([
      'arena-p4-spatial-attacker',
      'arena-p4-spatial-defender-a',
      'arena-p4-spatial-defender-b',
    ]);
    expect(multiTarget.reversed.actorInsertionOrder).toEqual([
      'arena-p4-spatial-attacker',
      'arena-p4-spatial-defender-b',
      'arena-p4-spatial-defender-a',
    ]);
    expect(multiTarget.candidateRoles).toEqual([
      { participantId: 'arena-p4-spatial-defender-a', role: 'legal-center' },
      { participantId: 'arena-p4-spatial-defender-b', role: 'boundary-near' },
    ]);
    expect(multiTarget.forward.inputFrames).toEqual(multiTarget.reversed.inputFrames);
    expect(multiTarget.targetOrderHash).toMatch(/^[0-9a-f]{8}$/u);
    if (multiTarget.status === 'observed') {
      expect(multiTarget.stableTargetOrder).toBe(true);
      expect(multiTarget.forward.resolvedTargetOrder).toEqual(
        multiTarget.reversed.resolvedTargetOrder,
      );
      expect(multiTarget.selectedTargetId).toBe('arena-p4-spatial-defender-a');
      expect(multiTarget.otherTargetId).toBe('arena-p4-spatial-defender-b');
    } else {
      expect(['indistinguishable', 'deferred']).toContain(multiTarget.status);
    }
  });

  it('is repeatable without shared mutable lifecycle state and keeps defender-only input deltas', () => {
    const first = runArenaExpandedWeaponSpatialCounterplayWeaponCandidateV1('gravity-chain');
    const second = runArenaExpandedWeaponSpatialCounterplayWeaponCandidateV1('gravity-chain');
    expect(first).toEqual(second);
    for (const [control, counterfactual] of [
      [first.heightDifference.groundControl, first.heightDifference.groundCounterfactual],
      [first.heightDifference.aerialControl, first.heightDifference.aerialCounterfactual],
      [first.collisionEdge.control, first.collisionEdge.counterfactual],
    ] as const) {
      expect(control.inputFrames).toHaveLength(counterfactual.inputFrames.length);
      for (let index = 0; index < control.inputFrames.length; index += 1) {
        const before = control.inputFrames[index]!;
        const after = counterfactual.inputFrames[index]!;
        expect(after).toMatchObject({
          tick: before.tick,
          participantId: before.participantId,
          primaryPressed: before.primaryPressed,
          primaryHeld: before.primaryHeld,
          slamPressed: before.slamPressed,
        });
        if (before.participantId === 'arena-p4-spatial-attacker') {
          expect(after).toEqual(before);
        }
      }
    }
  });

  it('fails closed on missing, duplicate, reordered, future-schema and future-field plans', () => {
    const missing = mutablePlan();
    missing.weapons.pop();
    expect(() => validateArenaExpandedWeaponSpatialCounterplayPlanV1(missing)).toThrow();

    const duplicate = mutablePlan();
    duplicate.weapons[1] = duplicate.weapons[0]!;
    expect(() => validateArenaExpandedWeaponSpatialCounterplayPlanV1(duplicate)).toThrow();

    const reordered = mutablePlan();
    const first = reordered.weapons[0]!;
    reordered.weapons[0] = reordered.weapons[1]!;
    reordered.weapons[1] = first;
    expect(() => validateArenaExpandedWeaponSpatialCounterplayPlanV1(reordered)).toThrow();

    const futureSchema = mutablePlan();
    futureSchema.schemaVersion = 2;
    expect(() => validateArenaExpandedWeaponSpatialCounterplayPlanV1(futureSchema)).toThrow();

    const forgedLifecycle = mutablePlan();
    forgedLifecycle.validationStatus = 'observed';
    expect(() => runArenaExpandedWeaponSpatialCounterplayVerificationCandidateV1(
      forgedLifecycle,
    )).toThrow();

    const futureField = mutablePlan();
    futureField.weapons[0]!.futureRule = true;
    expect(() => validateArenaExpandedWeaponSpatialCounterplayPlanV1(futureField)).toThrow();

    const nonFinite = mutablePlan();
    nonFinite.weapons[0]!.collectionOrder = Number.POSITIVE_INFINITY;
    expect(() => validateArenaExpandedWeaponSpatialCounterplayPlanV1(nonFinite)).toThrow();

    expect(() => runArenaExpandedWeaponSpatialCounterplayWeaponCandidateV1('missing-weapon'))
      .toThrow(/未知/u);
  });

  it('rejects sparse, Symbol, cyclic, accessor and Proxy plans without executing getters', () => {
    const sparse = mutablePlan();
    Reflect.deleteProperty(sparse.weapons, '3');
    expect(() => validateArenaExpandedWeaponSpatialCounterplayPlanV1(sparse)).toThrow();

    const symbol = mutablePlan();
    Object.defineProperty(symbol.weapons[0]!, Symbol('future'), {
      value: true,
      enumerable: true,
    });
    expect(() => validateArenaExpandedWeaponSpatialCounterplayPlanV1(symbol)).toThrow();

    const cyclic = mutablePlan();
    cyclic.cycle = cyclic;
    expect(() => validateArenaExpandedWeaponSpatialCounterplayPlanV1(cyclic)).toThrow();

    const accessor = mutablePlan();
    let getterCalls = 0;
    Object.defineProperty(accessor.weapons[0]!, 'weaponId', {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return 'charge-shield';
      },
    });
    expect(() => validateArenaExpandedWeaponSpatialCounterplayPlanV1(accessor)).toThrow();
    expect(getterCalls).toBe(0);

    const proxy = new Proxy(mutablePlan(), {
      ownKeys() {
        throw new Error('hostile-ownKeys');
      },
    });
    expect(() => validateArenaExpandedWeaponSpatialCounterplayPlanV1(proxy)).toThrow(
      /hostile-ownKeys/u,
    );
  });
});
