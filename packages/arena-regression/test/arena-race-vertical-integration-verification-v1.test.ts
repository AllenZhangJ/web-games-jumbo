import { describe, expect, it } from 'vitest';
import { ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1 } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_RACE_EXECUTION_PURPOSE_V1,
  ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_PLAN_CANDIDATE_V1,
  ARENA_RACE_TIMELINE_RUNTIME_MIRROR_CANDIDATE_V1,
  ARENA_RACE_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMIT_ACTIVE_TICKS_CANDIDATE_V1,
  ArenaRaceAuthoritativeRuntimeCandidateV1,
  createArenaRaceInteractiveExecutionTimingCandidateV1,
  createArenaRaceVerificationExecutionTimingCandidateV1,
  runArenaRaceVerticalIntegrationScenarioCandidateV1,
  runArenaRaceVerticalIntegrationVerificationCandidateV1,
  validateArenaRaceExecutionTimingCandidateV1,
} from '../src/arena-race-vertical-integration-verification-v1.js';
import {
  ARENA_THREE_MODE_AUTHORITATIVE_QUICK_MATCH_COMPOSITION_CANDIDATE_V1,
} from '../src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.js';
import {
  validateArenaModeWeaponFeedbackCheckpointCapabilityV1,
} from '../src/arena-three-mode-weapon-feedback-checkpoint-capability-v1.js';

describe('Arena Race vertical integration verification candidate V1', () => {
  it('freezes a production-unreachable 2/3/4-player formal KZ plan', () => {
    const verificationTiming = createArenaRaceVerificationExecutionTimingCandidateV1();
    expect(ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_PLAN_CANDIDATE_V1).toEqual({
      status: 'production-unreachable',
      hardGate: false,
      participantCounts: [2, 3, 4],
      matchSeed: 0x5a17_c0de,
      preparingTicks: 60,
      respawnDelayTicks: 180,
      respawnTuningContentHash:
        ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_PLAN_CANDIDATE_V1
          .respawnTuningContentHash,
      respawnProtectionTicks: 30,
      respawnFallbackAnchorCapabilityId:
        ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_PLAN_CANDIDATE_V1
          .respawnFallbackAnchorCapabilityId,
      respawnProtectionBalanceApprovalStatus: 'not-run',
      explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
      explicitTimelinePolicyRuntimeMirrorWired: false,
      executionTimingPurpose: ARENA_RACE_EXECUTION_PURPOSE_V1.VERIFICATION_SCENARIO,
      executionTimingContentHash: verificationTiming.contentHash,
      interactiveLocalHardLimitActiveTicks: 5_940,
      interactiveLocalHardLimitSource:
        'preserved-unapproved-local-runtime-candidate-not-verification-budget',
      verificationExecutionTimingSeparatedFromInteractiveRuntime: true,
      executionTimingIdentityBoundToConfigAndModeFixture: true,
      verificationScenarioWatchdogControlsInteractiveFixture: false,
      checkpointIntervalTicks: 60,
      maximumScenarioTicks: 6_000,
      defaultRegistryWired: false,
      defaultCompositionWired: false,
      defaultEntryWired: false,
      validationStatus: 'not-run',
      combatRingOutRequired: true,
      combatRingOutClosure: 'code-written-not-run',
      terminalTickContractClosure: 'static-contract-patched-not-run',
      fullAuthorityCheckpointClosure: 'code-written-not-run',
      fixtureDefinitionId:
        'arena-v2.mode.race.vertical-integration.test.fixture.v1.verification-scenario'
        + `.timing-${verificationTiming.contentHash}`,
    });
  });

  it('separates interactive hard limit identity from the verification scenario watchdog', () => {
    const interactive = createArenaRaceInteractiveExecutionTimingCandidateV1();
    const verification = createArenaRaceVerificationExecutionTimingCandidateV1();
    expect(interactive).toMatchObject({
      purpose: ARENA_RACE_EXECUTION_PURPOSE_V1.INTERACTIVE_PRODUCT_CANDIDATE,
      preparingTicks: 60,
      interactiveLocalHardLimitActiveTicks: 5_940,
      verificationScenarioMaximumTicks: null,
    });
    expect(verification).toMatchObject({
      purpose: ARENA_RACE_EXECUTION_PURPOSE_V1.VERIFICATION_SCENARIO,
      preparingTicks: 60,
      interactiveLocalHardLimitActiveTicks: 5_940,
      verificationScenarioMaximumTicks: 6_000,
    });
    expect(ARENA_RACE_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMIT_ACTIVE_TICKS_CANDIDATE_V1)
      .toBe(5_940);
    expect(ARENA_RACE_TIMELINE_RUNTIME_MIRROR_CANDIDATE_V1).toEqual({
      preparingTicks: 60,
      hardLimitActiveTicks: 5_940,
      suddenDeathStartActiveTick: null,
    });
    expect(interactive.contentHash).not.toBe(verification.contentHash);
    expect(Object.isFrozen(interactive)).toBe(true);
    expect(Object.isFrozen(verification)).toBe(true);
  });

  it('rejects hostile or drifted Race execution timing without executing accessors or then', () => {
    const interactive = createArenaRaceInteractiveExecutionTimingCandidateV1();
    expect(validateArenaRaceExecutionTimingCandidateV1(interactive)).toEqual(interactive);
    expect(() => validateArenaRaceExecutionTimingCandidateV1({
      ...interactive,
      futureField: true,
    })).toThrow(/未知字段|futureField/u);
    expect(() => validateArenaRaceExecutionTimingCandidateV1({
      ...interactive,
      purpose: ARENA_RACE_EXECUTION_PURPOSE_V1.VERIFICATION_SCENARIO,
    })).toThrow(/purpose|数值|身份/u);
    expect(() => validateArenaRaceExecutionTimingCandidateV1({
      ...interactive,
      interactiveLocalHardLimitActiveTicks: 5_939,
    })).toThrow(/数值|身份/u);
    expect(() => validateArenaRaceExecutionTimingCandidateV1({
      ...interactive,
      contentHash: '00000000',
    })).toThrow(/数值|身份|hash/u);

    const hostileSymbol = Symbol('future');
    const symbolTiming = { ...interactive } as Record<PropertyKey, unknown>;
    symbolTiming[hostileSymbol] = true;
    expect(() => validateArenaRaceExecutionTimingCandidateV1(symbolTiming))
      .toThrow(/Symbol|symbol|未知字段/u);

    let getterCalls = 0;
    const accessor = { ...interactive } as Record<string, unknown>;
    Object.defineProperty(accessor, 'verificationScenarioMaximumTicks', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return null;
      },
    });
    expect(() => validateArenaRaceExecutionTimingCandidateV1(accessor))
      .toThrow(/访问器|数据字段|getter/u);
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => validateArenaRaceExecutionTimingCandidateV1({
      ...interactive,
      then() {
        thenCalls += 1;
      },
    })).toThrow(/未知字段|then/u);
    expect(thenCalls).toBe(0);
  });

  it('runs shared Rule/Movement/Physics through RaceModeSystem and ModeMatchRuntime V6', () => {
    const report = runArenaRaceVerticalIntegrationVerificationCandidateV1();
    expect(report.scenarios.map(({ participantCount }) => participantCount)).toEqual([2, 3, 4]);
    expect(report.usesSharedRuleMovementPhysics).toBe(true);
    expect(report.usesRaceSpecificWeaponSystem).toBe(false);
    expect(report.combatRingOutClosure).toBe('code-written-not-run');
    expect(report.terminalTickContractClosure).toBe('static-contract-patched-not-run');
    expect(report.fullAuthorityCheckpointClosure).toBe('code-written-not-run');
    expect(report.validationStatus).toBe('not-run');
    expect(report.deferredGaps).toEqual([]);
    for (const scenario of report.scenarios) {
      expect(scenario.participantIds).toHaveLength(scenario.participantCount);
      expect(scenario.startLineX).toBe(-1.8);
      expect(new Set(scenario.startLaneZs).size).toBe(scenario.participantCount);
      expect(scenario.preparationTicks).toBe(60);
      expect(scenario.pauseResumeCycleCount).toBe(1);
      expect(scenario.actionStartedCount).toBeGreaterThanOrEqual(2);
      expect(scenario.combatHitCount).toBeGreaterThanOrEqual(2);
      expect(scenario.combatCreditedFallCount).toBeGreaterThanOrEqual(1);
      expect(scenario.combatRingOutClosure).toBe('code-written-not-run');
      expect(scenario.combatRingOut.requiredScenario).toBe(true);
      expect(scenario.combatRingOut.combatSurfaceId).toBe('kz-s01-start');
      expect(scenario.combatRingOut.usesOnlyStandardInputFrame).toBe(true);
      expect(scenario.combatRingOut.directionalInputTick).toBe(
        scenario.combatRingOut.primaryInputTick,
      );
      expect(scenario.combatRingOut.jumpInputTick).toBeLessThan(
        scenario.combatRingOut.primaryInputTick,
      );
      expect(scenario.combatRingOut.actionStartedTick).toBe(
        scenario.combatRingOut.primaryInputTick,
      );
      expect(scenario.combatRingOut.firstHitTick).toBeGreaterThanOrEqual(
        scenario.combatRingOut.actionStartedTick,
      );
      expect(scenario.combatRingOut.appliedImpulse.tick).toBe(
        scenario.combatRingOut.firstHitTick,
      );
      expect(Math.hypot(
        scenario.combatRingOut.appliedImpulse.x,
        scenario.combatRingOut.appliedImpulse.z,
      )).toBeGreaterThan(0);
      expect(scenario.combatRingOut.supportTransition.fromSurfaceId).toBe('kz-s01-start');
      expect(scenario.combatRingOut.supportTransition.firstUnsupportedTick).toBeGreaterThanOrEqual(
        scenario.combatRingOut.firstHitTick,
      );
      expect(scenario.combatRingOut.supportTransition.lastSupportedTick).toBeLessThanOrEqual(
        scenario.combatRingOut.supportTransition.firstUnsupportedTick,
      );
      expect(scenario.combatRingOut.supportTransition.killYCrossingTick).toBeGreaterThanOrEqual(
        scenario.combatRingOut.supportTransition.firstUnsupportedTick,
      );
      expect(scenario.combatRingOut.creditedFall).toMatchObject({
        participantId: scenario.combatRingOut.targetId,
        fallCause: 'credited-hit',
        creditedAttackerId: scenario.combatRingOut.attackerId,
      });
      expect(scenario.combatRingOut.respawn.scheduledReadyTick
        - scenario.combatRingOut.creditedFall.tick).toBe(180);
      expect(scenario.combatRingOut.respawn.respawnTick).toBe(
        scenario.combatRingOut.respawn.scheduledReadyTick,
      );
      expect(scenario.combatRingOut.replayV6ResultIdentity.emittedFallEventId).toBe(
        scenario.combatRingOut.replayV6ResultIdentity.replayFallEventId,
      );
      expect(scenario.combatRingOut.replayV6ResultIdentity.resultParticipantId).toBe(
        scenario.combatRingOut.targetId,
      );
      expect(scenario.combatRingOut.replayV6ResultIdentity.resultEndedAtTick + 1).toBe(
        scenario.finalTick,
      );
      expect(scenario.controls.expiredLastHit.elapsedTicks).toBeGreaterThan(
        scenario.controls.expiredLastHit.lastHitCreditTicks,
      );
      expect(scenario.controls.expiredLastHit.lastHitCreditTicks).toBe(300);
      expect(scenario.controls.expiredLastHit).toMatchObject({
        fallCause: 'movement',
        creditedAttackerId: null,
      });
      expect(scenario.controls.expiredLastHit.respawn.respawnTick).toBe(
        scenario.controls.expiredLastHit.respawn.scheduledReadyTick,
      );
      expect(scenario.controls.noHitRouteMistake).toMatchObject({
        fallCause: 'movement',
        creditedAttackerId: null,
        lastHitByAtFall: null,
        lastHitTickAtFall: -1,
      });
      expect(scenario.controls.noHitRouteMistake.fallTick).toBeGreaterThanOrEqual(
        scenario.controls.noHitRouteMistake.phaseStartedTick,
      );
      expect(scenario.scriptedPhaseOrder).toEqual(expect.arrayContaining([
        'combat-stage',
        'combat-attack',
        'combat-await-fall',
        'expired-control-hold',
        'expired-control-drive-off',
        'route',
        'route-mistake-await-respawn',
      ]));
      expect(scenario.routeMistakeFallCount).toBeGreaterThan(0);
      expect(scenario.safeAnchorCommitCount).toBeGreaterThan(0);
      expect(scenario.respawns.length).toBeGreaterThan(0);
      expect(scenario.respawns.every((entry) => (
        entry.scheduledReadyTick - entry.fallTick === 180
        && entry.respawnTick === entry.scheduledReadyTick
      ))).toBe(true);
      expect(scenario.winnerParticipantIds.length).toBeGreaterThan(0);
      expect(scenario.rankings).toHaveLength(scenario.participantCount);
      expect(scenario.replayEventCount).toBeGreaterThan(0);
      expect(scenario.replayCheckpointCount).toBeGreaterThan(1);
      expect(scenario.feedbackOutcomeWindowTicks).toBe(
        ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
      );
      expect(
        scenario.combatRingOut.creditedFall.tick - scenario.combatRingOut.firstHitTick,
      ).toBeLessThanOrEqual(scenario.feedbackOutcomeWindowTicks);
      expect(scenario.fullAuthorityCheckpointRestoreCount).toBe(1);
      expect(scenario.fullAuthorityCheckpointRestoredAtTick).toBeGreaterThanOrEqual(
        scenario.combatRingOut.firstHitTick + 1,
      );
      expect(scenario.runtimeCheckpointV3RestoreIdentityHash).toMatch(/^[0-9a-f]{8}$/u);
      expect(scenario.feedbackCheckpointRestoreIdentityHash).toMatch(/^[0-9a-f]{8}$/u);
      expect(scenario.retainedResourceCountAfterDestroy).toBe(0);
      expect(scenario.finalHash).toMatch(/^[0-9a-f]{8}$/u);
    }
  });

  it('binds all three concrete runtimes to the real feedback checkpoint capability', () => {
    expect(typeof ArenaRaceAuthoritativeRuntimeCandidateV1.prototype
      .exportRuntimeCheckpointV2).toBe('function');
    expect(typeof ArenaRaceAuthoritativeRuntimeCandidateV1.prototype
      .forkFromRuntimeCheckpointV2).toBe('function');
    expect(typeof ArenaRaceAuthoritativeRuntimeCandidateV1.prototype
      .exportRuntimeCheckpointV3).toBe('function');
    expect(typeof ArenaRaceAuthoritativeRuntimeCandidateV1.prototype
      .forkFromRuntimeCheckpointV3).toBe('function');
    expect(
      ARENA_THREE_MODE_AUTHORITATIVE_QUICK_MATCH_COMPOSITION_CANDIDATE_V1
        .terminalAuthorityIdentity,
    ).toBe('real-replay-v6-terminal-session');
    const capabilities = ARENA_THREE_MODE_AUTHORITATIVE_QUICK_MATCH_COMPOSITION_CANDIDATE_V1
      .weaponFeedbackCheckpointCapabilities;
    expect(capabilities.map(({ modeKind }) => modeKind)).toEqual([
      'duel', 'race', 'survival',
    ]);
    for (const { capability } of capabilities) {
      expect(capability).toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        hardGate: false,
        feedbackCheckpointSchemaVersion: 1,
        runtimeCheckpointMethod: 'exportRuntimeCheckpointV1',
        runtimeCheckpointForkMethod: 'forkFromWeaponFeedbackCheckpointCapabilityV1',
        worldAuthorityCheckpointField: 'feedbackCheckpoint',
        validationStatus: 'not-run',
      });
      expect(typeof capability).toBe('object');
    }
    expect(
      ARENA_THREE_MODE_AUTHORITATIVE_QUICK_MATCH_COMPOSITION_CANDIDATE_V1
        .weaponFeedbackRestoreSuffixCapability,
    ).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      hardGate: false,
      supportedModeDefinitionIds: ['arena.mode.duel', 'arena.mode.race', 'arena.mode.survival'],
      validationStatus: 'not-run',
      defaultCompositionWired: false,
      defaultEntryWired: false,
    });
    expect(
      ARENA_THREE_MODE_AUTHORITATIVE_QUICK_MATCH_COMPOSITION_CANDIDATE_V1
        .contentSelectionCheckpointCapability,
    ).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      hardGate: false,
      duelEquipmentSelectionCardinality: 1,
      raceEquipmentSelectionCardinality: 1,
      survivalEquipmentSelectionCardinality: 20,
      runtimeExportMethod: 'exportContentSelectionCheckpointCapabilityV1',
      validationStatus: 'not-run',
      defaultCompositionWired: false,
      defaultEntryWired: false,
    });
  });

  it('rejects future, accessor and ordinary thenable capability claims without executing them', () => {
    expect(() => validateArenaModeWeaponFeedbackCheckpointCapabilityV1({
      futureSchema: 2,
    })).toThrow(/未知字段|futureSchema/u);
    let getterCalls = 0;
    expect(() => validateArenaModeWeaponFeedbackCheckpointCapabilityV1({
      get schemaVersion() {
        getterCalls += 1;
        return 1;
      },
      modeDefinitionId: 'arena.mode.race',
      runtimeCheckpoint: {},
      runtimeCheckpointIdentityHash: '00000000',
      feedbackCheckpoint: {},
      capabilityIdentityHash: '00000000',
    })).toThrow(/数据字段/u);
    expect(getterCalls).toBe(0);
    let thenCalls = 0;
    expect(() => validateArenaModeWeaponFeedbackCheckpointCapabilityV1({
      then() { thenCalls += 1; },
    })).toThrow(/未知字段|then/u);
    expect(thenCalls).toBe(0);
  });

  it('keeps scenario input exact-key, bounded and getter-safe', () => {
    expect(() => runArenaRaceVerticalIntegrationScenarioCandidateV1({
      participantCount: 1,
      matchSeed: 1,
    })).toThrow(/participantCount/u);
    expect(() => runArenaRaceVerticalIntegrationScenarioCandidateV1({
      participantCount: 4,
      matchSeed: 1,
      futureSchema: 2,
    })).toThrow(/未知字段|futureSchema/u);
    expect(() => runArenaRaceVerticalIntegrationScenarioCandidateV1({
      participantCount: 3.5,
      matchSeed: 1,
    })).toThrow(/participantCount/u);
    expect(() => runArenaRaceVerticalIntegrationScenarioCandidateV1({
      participantCount: 2,
      matchSeed: Number.POSITIVE_INFINITY,
    })).toThrow(/matchSeed/u);
    let getterCalls = 0;
    expect(() => runArenaRaceVerticalIntegrationScenarioCandidateV1({
      participantCount: 2,
      get matchSeed() {
        getterCalls += 1;
        return 1;
      },
    })).toThrow(/访问器|数据字段/u);
    expect(getterCalls).toBe(0);
  });

  it('keeps injected-seed scenario output deterministic', () => {
    const options = Object.freeze({ participantCount: 2, matchSeed: 0x1234_5678 });
    const first = runArenaRaceVerticalIntegrationScenarioCandidateV1(options);
    const second = runArenaRaceVerticalIntegrationScenarioCandidateV1(options);
    expect(second).toEqual(first);
    expect(second.resultHash).toBe(first.resultHash);
  });

  it.each([2, 3, 4] as const)(
    'requires the same real credited-hit ring-out chain for %i participants',
    (participantCount) => {
      const scenario = runArenaRaceVerticalIntegrationScenarioCandidateV1({
        participantCount,
        matchSeed: 0x3412_0000 + participantCount,
      });
      expect(scenario.combatRingOut.requiredScenario).toBe(true);
      expect(scenario.combatRingOut.creditedFall.fallCause).toBe('credited-hit');
      expect(scenario.combatRingOut.creditedFall.creditedAttackerId).toBe(
        scenario.combatRingOut.attackerId,
      );
      expect(scenario.combatRingOut.respawn.respawnTick
        - scenario.combatRingOut.creditedFall.tick).toBe(180);
      expect(scenario.controls.expiredLastHit.creditedAttackerId).toBeNull();
      expect(scenario.controls.noHitRouteMistake.lastHitByAtFall).toBeNull();
    },
  );

  it('releases the production-unreachable authority in reverse ownership order', () => {
    const scenario = runArenaRaceVerticalIntegrationScenarioCandidateV1({
      participantCount: 2,
      matchSeed: 0x7654_3210,
    });
    expect(scenario.retainedResourceCountAfterDestroy).toBe(0);
  });
});
