import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1 } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1,
  ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1,
  ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1,
  ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_PLAN_V1,
  ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION,
  ARENA_SURVIVAL_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMITS_CANDIDATE_V1,
  ArenaSurvivalSharedWorldAuthorityVerificationRuntimeV1,
  createArenaSurvivalInteractiveExecutionTimingCandidateV1,
  createArenaSurvivalTimelineRuntimeMirrorCandidateV1,
  createArenaSurvivalVerificationExecutionTimingCandidateV1,
  runArenaSurvivalSharedWorldAuthorityScenarioCandidateV1,
  runArenaSurvivalSharedWorldAuthorityVerificationCandidateV1,
  validateArenaSurvivalSharedWorldExecutionTimingCandidateV1,
} from '../src/arena-survival-shared-world-authority-verification-v1.js';

const OPTIONS = Object.freeze({
  schemaVersion: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION,
  matchSeed: 0x5033_0001,
  enemyCounts: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1,
});
const MATRIX_EXTERNAL = process.env.ARENA_P3_SURVIVAL_MATRIX_EXTERNAL === '1';
const matrixIt = MATRIX_EXTERNAL ? it.skip : it;

let sharedReport!: ReturnType<
  typeof runArenaSurvivalSharedWorldAuthorityVerificationCandidateV1
>;
let sharedRuntime: ArenaSurvivalSharedWorldAuthorityVerificationRuntimeV1 | null = null;

describe('Arena Survival shared world authority verification candidate V1', () => {
  beforeAll(() => {
    if (MATRIX_EXTERNAL) return;
    sharedRuntime = new ArenaSurvivalSharedWorldAuthorityVerificationRuntimeV1(OPTIONS);
    sharedReport = sharedRuntime.run({ authorityStartTick: 0 });
  }, 450_000);

  afterAll(() => {
    sharedRuntime?.destroy();
    sharedRuntime = null;
  });

  it('keeps the candidate production-unreachable while closing one shared tick authority', () => {
    expect(ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      interactiveInitialPlayerProtectionTicks: 0,
      verificationExecutionTimingSeparatedFromInteractiveRuntime: true,
      verificationScenarioBudgetNeverUsedAsInteractiveProtection: true,
      interactiveLocalHardLimitSource:
        'preserved-unapproved-local-runtime-candidate-not-verification-budget',
      executionTimingCheckpointSchemaVersion: 3,
      explicitTimelinePolicyRuntimeMirrorWired: false,
      validationStatus: 'not-run',
    });
    expect(ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_PLAN_V1).toMatchObject({
      schemaVersion: 1,
      candidateStatus: 'production-unreachable',
      hardGate: false,
      explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
      explicitTimelinePolicyRuntimeMirrorWired: false,
      verificationExecutionTimingSeparatedFromInteractiveRuntime: true,
      interactiveInitialPlayerProtectionTicks: 0,
      interactiveLocalHardLimitBalanceApprovalStatus: 'not-run',
      validationStatus: 'not-run',
      defaultRegistryWired: false,
      defaultCompositionWired: false,
      defaultEntryWired: false,
      enemyCounts: [1, 4, 8, 12, 16],
      integratedInOneWorldAuthority: true,
      fullWorldCheckpointRestore: true,
      runtimeValidationExecuted: false,
    });
    if (!MATRIX_EXTERNAL) {
      expect(sharedReport).toMatchObject({
        candidateStatus: 'production-unreachable',
        hardGate: false,
        validationStatus: 'not-run',
        usesArenaV1Experiment: false,
        usesSingleSharedTickAuthority: true,
        usesP4SupplyTimeline: true,
        usesObservationV2: true,
        usesControllerV2InputFramesOnly: true,
        usesSharedRuleMovementPhysics: true,
        usesRealKillYFacts: true,
        usesModeMatchRuntimeV6: true,
        tickContract: 'T-events-to-T-plus-1-post-frame',
      });
      expect(sharedReport.resultHash).toMatch(/^[0-9a-f]{8}$/u);
    }
  });

  it('separates interactive protection from verification fall driving without changing local hard limits', () => {
    for (const { enemyCount, hardLimitActiveTicks } of
      ARENA_SURVIVAL_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMITS_CANDIDATE_V1) {
      const interactive = createArenaSurvivalInteractiveExecutionTimingCandidateV1(enemyCount);
      const verification = createArenaSurvivalVerificationExecutionTimingCandidateV1(enemyCount);
      expect(interactive).toMatchObject({
        purpose:
          ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1.INTERACTIVE_PRODUCT_CANDIDATE,
        enemyCount,
        initialPlayerProtectionTicks: 0,
        interactiveLocalHardLimitActiveTicks: hardLimitActiveTicks,
        scenarioFallDriveStartTick: null,
        verificationScenarioMaximumTick: null,
        verificationPressurePolicyContentHash: null,
      });
      expect(verification).toMatchObject({
        purpose: ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1.VERIFICATION_SCENARIO,
        enemyCount,
        initialPlayerProtectionTicks: verification.verificationScenarioMaximumTick,
        interactiveLocalHardLimitActiveTicks: hardLimitActiveTicks,
      });
      expect(verification.scenarioFallDriveStartTick).toBeGreaterThan(0);
      expect(verification.verificationScenarioMaximumTick).toBe(
        verification.scenarioFallDriveStartTick! + 2_400,
      );
      expect(createArenaSurvivalTimelineRuntimeMirrorCandidateV1(enemyCount)).toEqual({
        preparingTicks: 0,
        hardLimitActiveTicks,
        suddenDeathStartActiveTick: null,
      });
      expect(interactive.contentHash).not.toBe(verification.contentHash);
      expect(Object.isFrozen(interactive)).toBe(true);
      expect(Object.isFrozen(verification)).toBe(true);
    }
  });

  it('rejects hostile or drifted execution timing before it can become authority identity', () => {
    const interactive = createArenaSurvivalInteractiveExecutionTimingCandidateV1(4);
    expect(validateArenaSurvivalSharedWorldExecutionTimingCandidateV1(interactive))
      .toEqual(interactive);
    expect(() => validateArenaSurvivalSharedWorldExecutionTimingCandidateV1({
      ...interactive,
      futureField: true,
    })).toThrow(/未知字段|futureField/u);
    expect(() => validateArenaSurvivalSharedWorldExecutionTimingCandidateV1({
      ...interactive,
      purpose: ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1.VERIFICATION_SCENARIO,
    })).toThrow(/purpose|数值|身份/u);
    expect(() => validateArenaSurvivalSharedWorldExecutionTimingCandidateV1({
      ...interactive,
      initialPlayerProtectionTicks: 1,
    })).toThrow(/数值|身份/u);

    let getterCalls = 0;
    const hostile = { ...interactive } as Record<string, unknown>;
    Object.defineProperty(hostile, 'initialPlayerProtectionTicks', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 0;
      },
    });
    expect(() => validateArenaSurvivalSharedWorldExecutionTimingCandidateV1(hostile))
      .toThrow(/访问器|数据字段|getter/u);
    expect(getterCalls).toBe(0);
  });

  matrixIt('covers the exact 1/4/8/12/16 roster and reaches each pressure target', () => {
    expect(sharedReport.scenarios.map(({ enemyCount }) => enemyCount)).toEqual([
      1, 4, 8, 12, 16,
    ]);
    for (const scenario of sharedReport.scenarios) {
      expect(scenario.participantCount).toBe(scenario.enemyCount + 1);
      expect(scenario.configuredEnemyCount).toBe(scenario.enemyCount);
      expect(scenario.maximumActiveEnemyCount).toBeGreaterThan(0);
      expect(scenario.maximumActiveEnemyCount).toBeLessThanOrEqual(scenario.enemyCount);
      expect(
        scenario.pressureTargetReached,
        `enemy=${scenario.enemyCount}, terminalStage=${scenario.modeResult.pressureStage}, maxActive=${scenario.maximumActiveEnemyCount}`,
      ).toBe(true);
      expect(scenario.behaviorSeeds).toHaveLength(scenario.enemyCount);
      expect(new Set(scenario.behaviorSeeds.map(({ seed }) => seed)).size).toBe(
        scenario.enemyCount,
      );
    }
  });

  matrixIt('executes P4 supply before Observation V2 while the terminal matrix remains independent from equipment action driving', () => {
    for (const scenario of sharedReport.scenarios) {
      expect(scenario.firstSpawnTick).toBe(1_200);
      expect(scenario.spawnIntervalTicks).toBe(1_200);
      expect(scenario.spawnCountPerWave).toBe(3);
      expect(scenario.unpickedLifetimeTicks).toBe(600);
      expect(scenario.firstObservedSpawnTick).toBe(1_200);
      expect(scenario.firstObservedPickupTick).toBe(1_200);
      expect(scenario.firstObservedReplacementTick).not.toBeNull();
      expect(scenario.supplySpawnedCount).toBeGreaterThanOrEqual(6);
      expect(scenario.supplyPickedUpCount).toBeGreaterThan(0);
      expect(scenario.supplyReplacementCount).toBeGreaterThan(0);
      expect(scenario.observedSurvivalLevels[0]).toBe(1);
      expect(scenario.v2ObservationCount).toBeGreaterThan(0);
      expect(scenario.unarmedVisibleSupplyObservationCount).toBeGreaterThan(0);
      expect(scenario.botInputFrameCount).toBe(scenario.v2ObservationCount);
      expect(scenario.controllerWritesOnlyInputFrame).toBe(true);
    }
    expect(sharedReport.scenarios.some(({ supplyExpiredCount, firstObservedExpiryTick }) => (
      supplyExpiredCount > 0 && firstObservedExpiryTick === 1_800
    ))).toBe(true);
  });

  matrixIt('routes Controller V2 observations through real InputFrame production without duplicating the independent equipment-action Replay proof', () => {
    for (const scenario of sharedReport.scenarios) {
      expect(scenario.botInputFrameCount).toBeGreaterThan(0);
      expect(scenario.v2ObservationCount).toBeGreaterThan(0);
      expect(scenario.controllerWritesOnlyInputFrame).toBe(true);
    }
  });

  matrixIt('derives canonical Product Result equipment usage from the real Replay V6 events', () => {
    const allowedCollectionIds = new Set(
      ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1
        .collectionEquipmentDefinitionIds,
    );
    for (const scenario of sharedReport.scenarios) {
      expect(scenario.participantEquipmentUsage).toHaveLength(scenario.participantCount);
      expect(scenario.participantIds).toHaveLength(scenario.participantCount);
      const participantIds = scenario.participantEquipmentUsage.map(({ participantId }) => (
        participantId
      ));
      expect(participantIds).toEqual(scenario.participantIds);
      expect(scenario.participantIds).toEqual([...scenario.participantIds].sort());
      expect(new Set(participantIds).size).toBe(scenario.participantCount);
      expect(scenario.participantEquipmentUsageAllowedCollectionEquipmentDefinitionIds)
        .toEqual(ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1
          .collectionEquipmentDefinitionIds);
      for (const usage of scenario.participantEquipmentUsage) {
        expect(usage.usedCollectionEquipmentDefinitionIds)
          .toEqual([...usage.usedCollectionEquipmentDefinitionIds].sort());
        expect(new Set(usage.usedCollectionEquipmentDefinitionIds).size)
          .toBe(usage.usedCollectionEquipmentDefinitionIds.length);
      }
      const usedCollectionIds = scenario.participantEquipmentUsage.flatMap(
        ({ usedCollectionEquipmentDefinitionIds }) => usedCollectionEquipmentDefinitionIds,
      );
      expect(usedCollectionIds.every((id) => allowedCollectionIds.has(id))).toBe(true);
      expect(scenario.participantEquipmentUsageIdentityHash).toMatch(/^[0-9a-f]{8}$/u);
      expect(scenario.participantEquipmentUsageOwnership).toEqual({
        canonicalProducer: 'arena-contracts.createParticipantEquipmentUsageV3FromEvents',
        source: 'replay-v6-action-started-events',
        productResultOwner: 'ProductMatchResultV3',
        modeResultOwnsUsage: false,
        learningVerification: 'recomputed-from-replay-v6',
      });
      expect(Object.isFrozen(scenario.participantEquipmentUsage)).toBe(true);
    }
  });

  matrixIt('submits real killY facts to SurvivalModeSystem and closes T events/T+1 terminal frame', () => {
    for (const scenario of sharedReport.scenarios) {
      expect(scenario.playerFallTicks).toHaveLength(2);
      expect(scenario.playerFallTicks[1]).toBeGreaterThan(scenario.playerFallTicks[0]);
      expect(scenario.modeResult.kind).toBe('survival');
      expect(scenario.modeResult.reason).toBe('terminal-player-fall');
      expect(scenario.modeResult.fallCount).toBe(2);
      expect(scenario.terminalPostFrameTick).toBe(scenario.modeResult.endedAtTick + 1);
      expect(scenario.replayEventCount).toBeGreaterThan(0);
      expect(scenario.feedbackOutcomeWindowTicks).toBe(
        ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
      );
      expect(scenario.fullWorldCheckpointRestoreCount).toBe(1);
      expect(scenario.fullWorldCheckpointRestoredAtTick).toBeGreaterThanOrEqual(1_237);
      expect(scenario.runtimeCheckpointV3RestoreIdentityHash).toMatch(/^[0-9a-f]{8}$/u);
      expect(scenario.feedbackCheckpointRestoreIdentityHash).toMatch(/^[0-9a-f]{8}$/u);
      expect(scenario.replayInputFrameCount).toBe(
        scenario.modeResult.endedAtTick * scenario.participantCount
          + scenario.participantCount,
      );
      expect(scenario.finalHash).toMatch(/^[0-9a-f]{8}$/u);
      expect(scenario.replayIdentityHash).toMatch(/^[0-9a-f]{8}$/u);
      expect(scenario.retainedResourceCountAfterDestroy).toBe(0);
    }
    expect(sharedReport.scenarios.some(({ enemyFallCount, enemyReactivationCount }) => (
      enemyFallCount > 0 && enemyReactivationCount > 0
    ))).toBe(true);
  });

  matrixIt('is deterministic for the same injected match seed and input script', () => {
    const options = Object.freeze({
      schemaVersion: 1 as const,
      enemyCount: 1 as const,
      matchSeed: 0x5033_1001,
      authorityStartTick: 0 as const,
    });
    const first = runArenaSurvivalSharedWorldAuthorityScenarioCandidateV1(options);
    const second = runArenaSurvivalSharedWorldAuthorityScenarioCandidateV1(options);
    expect(second).toEqual(first);
    expect(second.finalHash).toBe(first.finalHash);
    expect(second.replayIdentityHash).toBe(first.replayIdentityHash);
    expect(second.participantEquipmentUsageIdentityHash)
      .toBe(first.participantEquipmentUsageIdentityHash);
  }, 60_000);

  it('rejects unknown fields, invalid matrix members and late authority ticks', () => {
    expect(() => runArenaSurvivalSharedWorldAuthorityScenarioCandidateV1({
      schemaVersion: 1,
      enemyCount: 2,
      matchSeed: 1,
      authorityStartTick: 0,
    })).toThrow(/enemyCount/u);
    expect(() => runArenaSurvivalSharedWorldAuthorityScenarioCandidateV1({
      schemaVersion: 1,
      enemyCount: 1,
      matchSeed: 1,
      authorityStartTick: 1,
    })).toThrow(/迟到/u);
    expect(() => runArenaSurvivalSharedWorldAuthorityScenarioCandidateV1({
      schemaVersion: 1,
      enemyCount: 1,
      matchSeed: 1,
      authorityStartTick: 0,
      futureField: true,
      nestedOverride: { tick: 9_999 },
    })).toThrow(/未知字段|futureField/u);
    expect(() => new ArenaSurvivalSharedWorldAuthorityVerificationRuntimeV1({
      ...OPTIONS,
      enemyCounts: [1, 4, 8, 12],
    })).toThrow(/enemyCounts/u);
  });

  it('fails closed after a rejected run, repeated run or destroy', () => {
    const late = new ArenaSurvivalSharedWorldAuthorityVerificationRuntimeV1(OPTIONS);
    expect(() => late.run({ authorityStartTick: 1 })).toThrow(/迟到/u);
    expect(late.getSnapshot()).toEqual({
      state: 'failed',
      hasReport: false,
      retainedResourceCount: 0,
    });
    expect(() => late.run({ authorityStartTick: 0 })).toThrow(/拒绝重入/u);
    late.destroy();
    expect(late.getSnapshot().state).toBe('destroyed');
    expect(() => late.run({ authorityStartTick: 0 })).toThrow(/已销毁/u);
    expect(() => late.destroy()).not.toThrow();

    if (MATRIX_EXTERNAL) return;

    const complete = sharedRuntime;
    if (complete === null) throw new Error('P3 Survival缺少已完成的共享Runtime。');
    const report = sharedReport;
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/u);
    expect(() => complete.run({ authorityStartTick: 0 })).toThrow(/拒绝重入/u);
    complete.destroy();
    expect(complete.getSnapshot()).toEqual({
      state: 'destroyed',
      hasReport: false,
      retainedResourceCount: 0,
    });
    sharedRuntime = null;
  }, 300_000);

  matrixIt('keeps only runtime validation work explicitly deferred', () => {
    for (const scenario of sharedReport.scenarios) {
      expect(scenario.deferredGap.map(({ id }) => id)).toEqual([
        'deferred-runtime-validation',
      ]);
    }
  });
});
