import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  type ArenaInputFrame,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1 } from './arena-duel-authoritative-runtime-candidate-v1.js';
import { ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1 } from './arena-race-vertical-integration-verification-v1.js';
import { ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1 } from './arena-survival-shared-world-authority-verification-v1.js';
import {
  createArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimeV2,
  type ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2,
  type ArenaThreeModeWeaponFeedbackScheduledFailureInjectionEvidenceV2,
  type ArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimePortV2,
} from './arena-three-mode-weapon-feedback-failure-injection-candidate-v1.js';
import {
  runArenaThreeModeWeaponFeedbackLongRestoreSuffixCandidateV2,
  type ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1,
} from './arena-three-mode-weapon-feedback-restore-suffix-candidate-v1.js';

const COMPARED_TICK_COUNT = 120 as const;
const DUEL_STABLE_COMPARED_TICK_COUNT = 97 as const;

const MODE_DEFINITION_IDS = Object.freeze([
  ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
  ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
  ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
] as const);

export type ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeDefinitionIdV1 =
  typeof MODE_DEFINITION_IDS[number];

export interface ArenaThreeModeWeaponFeedbackScheduledFailureReplayScenarioV1 {
  readonly scenarioId: string;
  readonly comparedTickCount: number;
  readonly schedule: readonly ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2[];
  readonly expectedTriggeredFailureCount: number;
}

export interface ArenaThreeModeWeaponFeedbackScheduledFailureReplayModePlanV1 {
  readonly modeDefinitionId:
  ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeDefinitionIdV1;
  readonly scenarios: readonly ArenaThreeModeWeaponFeedbackScheduledFailureReplayScenarioV1[];
}

export interface ArenaThreeModeWeaponFeedbackScheduledFailureReplayManifestV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly hardGate: false;
  readonly comparedTickCount: typeof COMPARED_TICK_COUNT;
  readonly modePlans: readonly ArenaThreeModeWeaponFeedbackScheduledFailureReplayModePlanV1[];
  readonly scenarioCountPerMode: number;
  readonly totalScenarioCount: number;
  readonly manifestIdentityHash: string;
  readonly validationStatus: 'not-run';
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
  readonly defaultEntryWired: false;
}

export interface ArenaThreeModeWeaponFeedbackFailureFingerprintV1 {
  readonly name: string;
  readonly message: string;
  readonly aggregateFailures: readonly ArenaThreeModeWeaponFeedbackFailureFingerprintV1[];
}

export type ArenaThreeModeWeaponFeedbackScheduledFailureReplayCaseStatusV1 =
  | 'expected-failure-observed'
  | 'unexpected-success'
  | 'incomplete-injection'
  | 'cleanup-incomplete';

export interface ArenaThreeModeWeaponFeedbackScheduledFailureReplayCaseReportV1 {
  readonly schemaVersion: 1;
  readonly modeDefinitionId:
  ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeDefinitionIdV1;
  readonly scenarioId: string;
  readonly comparedTickCount: number;
  readonly schedule: readonly ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2[];
  readonly status: ArenaThreeModeWeaponFeedbackScheduledFailureReplayCaseStatusV1;
  readonly executionFailure: ArenaThreeModeWeaponFeedbackFailureFingerprintV1 | null;
  readonly cleanupFailure: ArenaThreeModeWeaponFeedbackFailureFingerprintV1 | null;
  readonly evidence: ArenaThreeModeWeaponFeedbackScheduledFailureInjectionEvidenceV2;
  readonly caseIdentityHash: string;
}

export interface ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeReportV1 {
  readonly modeDefinitionId:
  ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeDefinitionIdV1;
  readonly caseCount: number;
  readonly expectedFailureObservedCount: number;
  readonly allExpectedFailuresObserved: boolean;
  readonly caseIdentityHashes: readonly string[];
}

export interface ArenaThreeModeWeaponFeedbackScheduledFailureReplayReportV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly executionStatus: 'assembled';
  readonly hardGate: false;
  readonly manifestIdentityHash: string;
  readonly caseCount: number;
  readonly expectedFailureObservedCount: number;
  readonly allExpectedFailuresObserved: boolean;
  readonly modeReports: readonly ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeReportV1[];
  readonly cases: readonly ArenaThreeModeWeaponFeedbackScheduledFailureReplayCaseReportV1[];
  readonly reportIdentityHash: string;
}

export interface ArenaThreeModeWeaponFeedbackScheduledFailureReplayReportCandidateV1Options {
  readonly createRuntime: (
    modeDefinitionId: ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeDefinitionIdV1,
    scenario: ArenaThreeModeWeaponFeedbackScheduledFailureReplayScenarioV1,
  ) => ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1;
  readonly createLocalInputs: (
    modeDefinitionId: ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeDefinitionIdV1,
    scenario: ArenaThreeModeWeaponFeedbackScheduledFailureReplayScenarioV1,
  ) => readonly ArenaInputFrame[];
}

const REPORT_OPTION_KEYS = new Set(['createRuntime', 'createLocalInputs']);

function failure(
  point: ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2['point'],
  callOrdinal: number,
): ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2 {
  return Object.freeze({ point, callOrdinal });
}

function scenario(
  scenarioId: string,
  comparedTickCount: number,
  schedule: readonly ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2[],
): ArenaThreeModeWeaponFeedbackScheduledFailureReplayScenarioV1 {
  return Object.freeze({
    scenarioId,
    comparedTickCount,
    schedule: Object.freeze([...schedule]),
    expectedTriggeredFailureCount: schedule.length,
  });
}

function scenariosFor(
  comparedTickCount: number,
): readonly ArenaThreeModeWeaponFeedbackScheduledFailureReplayScenarioV1[] {
  const afterAllStepsCapabilityOrdinal = comparedTickCount + 1;
  const afterDestroyRestoredResourceOrdinal = comparedTickCount + 2;
  return Object.freeze([
    scenario('fork-after-construction', comparedTickCount, [failure('fork-after-construction', 1)]),
    scenario('continuous-step-first', comparedTickCount, [failure('continuous-step-before-delegate', 1)]),
    scenario('continuous-step-mid', comparedTickCount, [failure('continuous-step-before-delegate', 60)]),
    scenario('restored-step-mid', comparedTickCount, [failure('restored-step-before-delegate', 60)]),
    scenario('restored-capability-final', comparedTickCount, [
      failure('restored-capability-corruption', afterAllStepsCapabilityOrdinal),
    ]),
    scenario('continuous-unknown-event-final', comparedTickCount, [
      failure('continuous-unknown-event', comparedTickCount),
    ]),
    scenario('continuous-resource-final', comparedTickCount, [
      failure(
        'continuous-retained-resource-read-before-delegate',
        afterAllStepsCapabilityOrdinal,
      ),
    ]),
    scenario('restored-resource-final', comparedTickCount, [
      failure(
        'restored-retained-resource-read-before-delegate',
        afterAllStepsCapabilityOrdinal,
      ),
    ]),
    scenario('restored-destroy', comparedTickCount, [failure('restored-destroy-after-delegate', 1)]),
    scenario('restored-resource-after-destroy', comparedTickCount, [
      failure(
        'restored-retained-resource-read-before-delegate',
        afterDestroyRestoredResourceOrdinal,
      ),
    ]),
    scenario('aggregate-restored-cleanup', comparedTickCount, [
      failure('restored-destroy-after-delegate', 1),
      failure(
        'restored-retained-resource-read-before-delegate',
        afterDestroyRestoredResourceOrdinal,
      ),
    ]),
  ]);
}

const MANIFEST_CORE = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  comparedTickCount: COMPARED_TICK_COUNT,
  modePlans: Object.freeze(MODE_DEFINITION_IDS.map((modeDefinitionId) => Object.freeze({
    modeDefinitionId,
    scenarios: scenariosFor(
      modeDefinitionId === ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId
        ? DUEL_STABLE_COMPARED_TICK_COUNT
        : COMPARED_TICK_COUNT,
    ),
  }))),
  scenarioCountPerMode: 11,
  totalScenarioCount: MODE_DEFINITION_IDS.length * 11,
  validationStatus: 'not-run' as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
});

export const ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_REPLAY_MANIFEST_V1:
DeepReadonly<ArenaThreeModeWeaponFeedbackScheduledFailureReplayManifestV1> = Object.freeze({
  ...MANIFEST_CORE,
  manifestIdentityHash: createDeterministicDataHash(
    MANIFEST_CORE,
    'Arena three-mode weapon feedback scheduled failure replay manifest V1',
  ),
});

function fingerprintFailure(
  value: unknown,
  depth = 0,
): ArenaThreeModeWeaponFeedbackFailureFingerprintV1 {
  const aggregateFailures = value instanceof AggregateError && depth < 8
    ? Object.freeze(Array.from(value.errors).slice(0, 8).map((entry) => (
      fingerprintFailure(entry, depth + 1)
    )))
    : Object.freeze([]);
  return Object.freeze({
    name: value instanceof Error ? value.name : 'NonErrorFailure',
    message: value instanceof Error ? value.message : `thrown-${typeof value}`,
    aggregateFailures,
  });
}

function sameSchedule(
  left: readonly ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2[],
  right: readonly ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2[],
): boolean {
  return left.length === right.length && left.every((entry, index) => (
    entry.point === right[index]?.point && entry.callOrdinal === right[index]?.callOrdinal
  ));
}

function executeCase(
  options: ArenaThreeModeWeaponFeedbackScheduledFailureReplayReportCandidateV1Options,
  modeDefinitionId: ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeDefinitionIdV1,
  plannedScenario: ArenaThreeModeWeaponFeedbackScheduledFailureReplayScenarioV1,
): ArenaThreeModeWeaponFeedbackScheduledFailureReplayCaseReportV1 {
  const runtime = options.createRuntime(modeDefinitionId, plannedScenario);
  let localInputs: DeepReadonly<readonly ArenaInputFrame[]>;
  try {
    localInputs = cloneFrozenData(
      options.createLocalInputs(modeDefinitionId, plannedScenario),
      `Arena scheduled failure ${plannedScenario.scenarioId} local inputs`,
    );
  } catch (error) {
    try {
      runtime.destroy();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `Arena scheduled failure ${plannedScenario.scenarioId}输入准备与runtime清理均失败。`,
      );
    }
    throw error;
  }
  let injectedRuntime: ArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimePortV2;
  try {
    injectedRuntime = createArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimeV2({
      runtime,
      schedule: plannedScenario.schedule,
    });
  } catch (error) {
    try {
      runtime.destroy();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `Arena scheduled failure ${plannedScenario.scenarioId}装配与回滚均失败。`,
      );
    }
    throw error;
  }
  let executionFailure: unknown = null;
  let cleanupFailure: unknown = null;
  try {
    runArenaThreeModeWeaponFeedbackLongRestoreSuffixCandidateV2({
      modeDefinitionId,
      runtime: injectedRuntime,
      localInputs,
    });
  } catch (error) {
    executionFailure = error;
  }
  let evidence: ArenaThreeModeWeaponFeedbackScheduledFailureInjectionEvidenceV2;
  try {
    evidence = injectedRuntime.getScheduledFailureInjectionEvidenceV2();
  } catch (evidenceError) {
    const failures = executionFailure === null
      ? [evidenceError]
      : [executionFailure, evidenceError];
    try {
      injectedRuntime.destroy();
    } catch (cleanupError) {
      failures.push(cleanupError);
    }
    if (failures.length === 1) throw evidenceError;
    throw new AggregateError(
      failures,
      `Arena scheduled failure ${plannedScenario.scenarioId}执行、证据读取或清理失败。`,
    );
  }
  try {
    injectedRuntime.destroy();
  } catch (error) {
    cleanupFailure = error;
  }
  const allScheduledFailuresTriggered = evidence.pendingFailures.length === 0
    && evidence.injectedFailureCount === plannedScenario.expectedTriggeredFailureCount
    && sameSchedule(evidence.triggeredFailures, plannedScenario.schedule);
  const status: ArenaThreeModeWeaponFeedbackScheduledFailureReplayCaseStatusV1 =
    cleanupFailure !== null
      ? 'cleanup-incomplete'
      : executionFailure === null
        ? 'unexpected-success'
        : allScheduledFailuresTriggered
          ? 'expected-failure-observed'
          : 'incomplete-injection';
  const reportCore = Object.freeze({
    schemaVersion: 1 as const,
    modeDefinitionId,
    scenarioId: plannedScenario.scenarioId,
    comparedTickCount: plannedScenario.comparedTickCount,
    schedule: plannedScenario.schedule,
    status,
    executionFailure: executionFailure === null
      ? null
      : fingerprintFailure(executionFailure),
    cleanupFailure: cleanupFailure === null ? null : fingerprintFailure(cleanupFailure),
    evidence,
  });
  return Object.freeze({
    ...reportCore,
    caseIdentityHash: createDeterministicDataHash(
      reportCore,
      'Arena three-mode scheduled failure replay case report V1',
    ),
  });
}

/**
 * Executes the immutable three-mode schedule one case at a time. The caller
 * owns runtime/input construction; this assembler owns and destroys each
 * returned runtime and never records stack traces, wall-clock or device data.
 */
export function runArenaThreeModeWeaponFeedbackScheduledFailureReplayReportCandidateV1(
  value: ArenaThreeModeWeaponFeedbackScheduledFailureReplayReportCandidateV1Options,
): DeepReadonly<ArenaThreeModeWeaponFeedbackScheduledFailureReplayReportV1> {
  const source = assertPlainRecord(value, 'Arena scheduled failure replay report options');
  assertKnownKeys(source, REPORT_OPTION_KEYS, 'Arena scheduled failure replay report options');
  for (const key of REPORT_OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena scheduled failure replay report options.${key}为必填字段。`);
    }
  }
  if (typeof source.createRuntime !== 'function'
    || typeof source.createLocalInputs !== 'function') {
    throw new TypeError('Arena scheduled failure replay report工厂必须是函数。');
  }
  const options = source as unknown as
  ArenaThreeModeWeaponFeedbackScheduledFailureReplayReportCandidateV1Options;
  const cases = ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_REPLAY_MANIFEST_V1
    .modePlans.flatMap(({ modeDefinitionId, scenarios }) => (
      scenarios.map((plannedScenario) => executeCase(options, modeDefinitionId, plannedScenario))
    ));
  const modeReports = MODE_DEFINITION_IDS.map((modeDefinitionId) => {
    const modeCases = cases.filter((entry) => entry.modeDefinitionId === modeDefinitionId);
    const expectedFailureObservedCount = modeCases.filter(
      ({ status }) => status === 'expected-failure-observed',
    ).length;
    return Object.freeze({
      modeDefinitionId,
      caseCount: modeCases.length,
      expectedFailureObservedCount,
      allExpectedFailuresObserved: expectedFailureObservedCount === modeCases.length,
      caseIdentityHashes: Object.freeze(modeCases.map(({ caseIdentityHash }) => caseIdentityHash)),
    });
  });
  const expectedFailureObservedCount = cases.filter(
    ({ status }) => status === 'expected-failure-observed',
  ).length;
  const reportCore = Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    executionStatus: 'assembled' as const,
    hardGate: false as const,
    manifestIdentityHash:
      ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_REPLAY_MANIFEST_V1
        .manifestIdentityHash,
    caseCount: cases.length,
    expectedFailureObservedCount,
    allExpectedFailuresObserved: expectedFailureObservedCount === cases.length,
    modeReports: Object.freeze(modeReports),
    cases: Object.freeze(cases),
  });
  return Object.freeze({
    ...reportCore,
    reportIdentityHash: createDeterministicDataHash(
      reportCore,
      'Arena three-mode scheduled failure replay report V1',
    ),
  });
}
