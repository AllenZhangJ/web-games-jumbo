import { beforeAll, describe, expect, it } from 'vitest';
import {
  ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_ENEMY_COUNTS_V1,
  createArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1,
  runArenaSurvivalModeVerticalIntegrationCandidateV1,
} from '../src/arena-survival-mode-vertical-integration-candidate-v1.js';

const OPTIONS = Object.freeze({
  schemaVersion: 1 as const,
  matchSeed: 0x5030_0001,
  enemyCounts: ARENA_SURVIVAL_MODE_VERTICAL_INTEGRATION_ENEMY_COUNTS_V1,
});

let sharedReport!: ReturnType<typeof runArenaSurvivalModeVerticalIntegrationCandidateV1>;

describe('Arena Survival Mode vertical integration candidate V1', () => {
  beforeAll(() => {
    sharedReport = runArenaSurvivalModeVerticalIntegrationCandidateV1(OPTIONS);
  });

  it('orchestrates the real component candidates without claiming a shared authority', () => {
    const report = sharedReport;
    expect(report.candidateStatus).toBe('production-unreachable');
    expect(report.hardGate).toBe(false);
    expect(report.defaultRegistryWired).toBe(false);
    expect(report.defaultCompositionWired).toBe(false);
    expect(report.defaultEntryWired).toBe(false);
    expect(report.validationStatus).toBe('not-run');
    expect(report.usesArenaV1Experiment).toBe(false);
    expect(report.enemyCounts).toEqual([1, 4, 8, 12, 16]);
    expect(report.integratedAuthority).toEqual({
      kzMapRouteMovementPhysics: 'component-candidate',
      restrictedBotObservationToInputFrame: 'component-candidate',
      equipmentSupplyMatchCore: 'component-candidate',
      weaponRuleMovementPhysicsConsequences: 'component-candidate',
      survivalModeLifecycle: 'component-candidate',
      singleSharedTickAuthority: 'deferred',
      hitFallToModeLifecycleSameScenario: 'deferred',
      supplyAwareEnemyDecisionSameScenario: 'deferred',
    });
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('covers the 1/4/8/12/16 matrix and the two-fall Mode lifecycle', () => {
    const report = sharedReport;
    expect(report.lifecycleScenarios.map(({ enemyCount }) => enemyCount)).toEqual([
      1, 4, 8, 12, 16,
    ]);
    for (const scenario of report.lifecycleScenarios) {
      expect(scenario.participantCount).toBe(scenario.enemyCount + 1);
      expect(scenario.playerFallCounts).toEqual([1, 2]);
      expect(scenario.respawnScheduledCount).toBe(1);
      expect(scenario.respawnedCount).toBe(1);
      expect(scenario.matchEndedCount).toBe(1);
      expect(scenario.fallCount).toBe(2);
      expect(scenario.resultReason).toBe('terminal-player-fall');
      expect(scenario.continuousFinalHash).toBe(scenario.restoredFinalHash);
    }
  });

  it('records real supply, replacement, expiry, tier and weapon-use component facts', () => {
    const report = sharedReport;
    expect(report.supplyFacts).toMatchObject({
      firstSpawnTick: 1_200,
      spawnIntervalTicks: 1_200,
      spawnCount: 3,
      unpickedLifetimeTicks: 600,
      noEquipmentBeforeFirstSpawn: true,
      firstWaveSpawnCount: 3,
      replacementKind: 'replaced',
      expectedWaveLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      allSeedsReachedLevelTen: true,
    });
    expect(report.supplyFacts.worldExpiryEventCount).toBeGreaterThan(0);
    expect(report.weaponUsageFacts.pickedSurvivalLevel).toBe(1);
    expect(report.weaponUsageFacts.actionStartedEventCount).toBeGreaterThan(0);
    expect(report.weaponUsageFacts.hitResolvedEventCount).toBeGreaterThan(0);
    expect(report.weaponUsageFacts.knockbackAppliedEventCount).toBeGreaterThan(0);
    expect(report.weaponUsageFacts.rulePhysicsScenarioCount).toBeGreaterThan(0);
  });

  it('keeps the remaining supply-aware world wiring gap explicit', () => {
    const report = sharedReport;
    expect(report.botFacts.usesRestrictedObservationInput).toBe(true);
    expect(report.botFacts.emitsOnlyInputFrames).toBe(true);
    expect(report.botFacts.supplyAwareUnarmedRoutingAvailable).toBe(true);
    expect(report.deferredGap.map(({ id }) => id)).toContain('supply-aware-enemy-observation');
    expect(report.deferredGap.map(({ id }) => id)).toContain('single-shared-tick-authority');
    expect(report.deferredGap.map(({ id }) => id))
      .not.toContain('legacy-movement-handler-transitive-dependency');
    expect(report.deferredGap.map(({ id }) => id))
      .not.toContain('mode-result-weapon-usage-contract');
  });

  it('is deterministic for the same named seed and exact matrix', () => {
    const first = sharedReport;
    const second = runArenaSurvivalModeVerticalIntegrationCandidateV1(OPTIONS);
    expect(first.resultHash).toBe(second.resultHash);
    expect(first.lifecycleScenarios).toEqual(second.lifecycleScenarios);
    expect(first.componentResultHashes).toEqual(second.componentResultHashes);
  });

  it('rejects unknown fields, wrong matrices and late authority start ticks fail closed', () => {
    expect(() => createArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1({
      ...OPTIONS,
      futureField: true,
    })).toThrow();
    expect(() => createArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1({
      ...OPTIONS,
      enemyCounts: [1, 4, 8, 12],
    })).toThrow();
    const futureRuntime = createArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1(OPTIONS);
    expect(() => futureRuntime.run({ authorityStartTick: 0, futureField: true })).toThrow();
    expect(futureRuntime.getSnapshot().state).toBe('failed');
    futureRuntime.destroy();
    const lateRuntime = createArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1(OPTIONS);
    expect(() => lateRuntime.run({ authorityStartTick: 1 })).toThrow(/迟到|非零/);
    expect(lateRuntime.getSnapshot()).toEqual({
      state: 'failed',
      retainedResourceCount: 0,
      hasReport: false,
    });
    expect(() => lateRuntime.run({ authorityStartTick: 0 })).toThrow(/不可重入/);
    lateRuntime.destroy();
    expect(lateRuntime.getRetainedResourceCount()).toBe(0);
  });

  it('fails closed when hostile input throws an unknown error during normalization', () => {
    const runtime = createArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1(OPTIONS);
    const hostile = Object.defineProperty({}, 'authorityStartTick', {
      enumerable: true,
      get() { throw new Error('hostile getter'); },
    });
    expect(() => runtime.run(hostile)).toThrow();
    expect(runtime.getSnapshot()).toEqual({
      state: 'failed',
      retainedResourceCount: 0,
      hasReport: false,
    });
    runtime.destroy();
  });

  it('rejects repeated run and calls after destroy while retaining no resources', () => {
    const runtime = createArenaSurvivalModeVerticalIntegrationCandidateRuntimeV1(OPTIONS);
    const report = runtime.run({ authorityStartTick: 0 });
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
    expect(() => runtime.run({ authorityStartTick: 0 })).toThrow(/不可重入/);
    runtime.destroy();
    expect(runtime.getSnapshot()).toEqual({
      state: 'destroyed',
      retainedResourceCount: 0,
      hasReport: false,
    });
    expect(() => runtime.run({ authorityStartTick: 0 })).toThrow(/已销毁/);
    expect(() => runtime.destroy()).not.toThrow();
  });
});
