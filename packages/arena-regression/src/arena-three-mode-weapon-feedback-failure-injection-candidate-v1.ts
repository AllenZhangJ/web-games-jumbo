import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import type { ArenaModeWeaponFeedbackCheckpointCapabilityV1 } from './arena-three-mode-weapon-feedback-checkpoint-capability-v1.js';
import type { ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1 } from './arena-three-mode-weapon-feedback-restore-suffix-candidate-v1.js';

export const ARENA_THREE_MODE_WEAPON_FEEDBACK_FAILURE_INJECTION_POINTS_V1 = Object.freeze([
  'fork-after-construction',
  'continuous-step-before-delegate',
  'restored-step-before-delegate',
  'restored-capability-corruption',
  'continuous-unknown-event',
  'restored-destroy-after-delegate',
] as const);

export type ArenaThreeModeWeaponFeedbackFailureInjectionPointV1 =
  typeof ARENA_THREE_MODE_WEAPON_FEEDBACK_FAILURE_INJECTION_POINTS_V1[number];

export const ARENA_THREE_MODE_WEAPON_FEEDBACK_FAILURE_INJECTION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1,
  status: 'production-unreachable',
  implementationStatus: 'code-written-not-run',
  hardGate: false,
  injectionPoints: ARENA_THREE_MODE_WEAPON_FEEDBACK_FAILURE_INJECTION_POINTS_V1,
  authorityMutationAllowed: false,
  injectedRuntimeOwnsOnlyRestoredForkCleanup: true,
  unknownEventKind: 'ArenaFutureWeaponFeedbackEvent',
  validationStatus: 'not-run',
  defaultRegistryWired: false,
  defaultCompositionWired: false,
  defaultEntryWired: false,
} as const);

export const ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_POINTS_V2 = Object.freeze([
  'fork-after-construction',
  'continuous-step-before-delegate',
  'restored-step-before-delegate',
  'restored-capability-corruption',
  'continuous-unknown-event',
  'restored-retained-resource-read-before-delegate',
  'continuous-retained-resource-read-before-delegate',
  'restored-destroy-after-delegate',
] as const);

export type ArenaThreeModeWeaponFeedbackScheduledFailurePointV2 =
  typeof ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_POINTS_V2[number];

export const ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_MAX_CALL_ORDINAL_V2 =
  Object.freeze({
    'fork-after-construction': 1,
    'continuous-step-before-delegate': 240,
    'restored-step-before-delegate': 240,
    'restored-capability-corruption': 241,
    'continuous-unknown-event': 240,
    'continuous-retained-resource-read-before-delegate': 241,
    'restored-retained-resource-read-before-delegate': 242,
    'restored-destroy-after-delegate': 1,
  } satisfies Readonly<Record<ArenaThreeModeWeaponFeedbackScheduledFailurePointV2, number>>);

export const ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_CANDIDATE_V2 =
  Object.freeze({
    schemaVersion: 2,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    hardGate: false,
    injectionPoints: ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_POINTS_V2,
    minimumScheduleEntryCount: 1,
    maximumScheduleEntryCount: 8,
    minimumCallOrdinal: 1,
    maximumCallOrdinal: 242,
    maximumCallOrdinalByPoint:
      ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_MAX_CALL_ORDINAL_V2,
    maximumComparedStepCount: 240,
    resourceSnapshotReadAfterDestroySupported: true,
    multipleCleanupFailureAggregationSupported: true,
    authorityMutationAllowed: false,
    injectedRuntimeOwnsOnlyRestoredForkCleanup: true,
    unknownEventKind:
      ARENA_THREE_MODE_WEAPON_FEEDBACK_FAILURE_INJECTION_CANDIDATE_V1.unknownEventKind,
    validationStatus: 'not-run',
    defaultRegistryWired: false,
    defaultCompositionWired: false,
    defaultEntryWired: false,
  } as const);

export interface ArenaThreeModeWeaponFeedbackFailureInjectionEvidenceV1 {
  readonly failurePoint: ArenaThreeModeWeaponFeedbackFailureInjectionPointV1;
  readonly forkCallCount: number;
  readonly continuousStepCallCount: number;
  readonly restoredStepCallCount: number;
  readonly restoredDestroyCallCount: number;
  readonly injectedFailureCount: number;
  readonly restoredForkCreatedCount: number;
  readonly restoredForkCleanupAttemptCount: number;
}

export interface ArenaThreeModeWeaponFeedbackFailureInjectionCandidateV1Options {
  readonly runtime: ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1;
  readonly failurePoint: ArenaThreeModeWeaponFeedbackFailureInjectionPointV1;
}

export interface ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2 {
  readonly point: ArenaThreeModeWeaponFeedbackScheduledFailurePointV2;
  readonly callOrdinal: number;
}

export interface ArenaThreeModeWeaponFeedbackScheduledFailureInjectionCandidateV2Options {
  readonly runtime: ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1;
  readonly schedule: readonly ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2[];
}

export interface ArenaThreeModeWeaponFeedbackScheduledFailureInjectionEvidenceV2 {
  readonly schemaVersion: 2;
  readonly schedule: readonly ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2[];
  readonly triggeredFailures: readonly ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2[];
  readonly pendingFailures: readonly ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2[];
  readonly forkCallCount: number;
  readonly continuousStepCallCount: number;
  readonly restoredStepCallCount: number;
  readonly restoredCapabilityExportCallCount: number;
  readonly continuousRetainedResourceReadCallCount: number;
  readonly restoredRetainedResourceReadCallCount: number;
  readonly restoredDestroyCallCount: number;
  readonly restoredForkCreatedCount: number;
  readonly restoredForkCleanupAttemptCount: number;
  readonly injectedFailureCount: number;
}

export interface ArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimePortV2
extends ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1 {
  getScheduledFailureInjectionEvidenceV2():
  ArenaThreeModeWeaponFeedbackScheduledFailureInjectionEvidenceV2;
}

interface MutableEvidenceV1 {
  forkCallCount: number;
  continuousStepCallCount: number;
  restoredStepCallCount: number;
  restoredDestroyCallCount: number;
  injectedFailureCount: number;
  restoredForkCreatedCount: number;
  restoredForkCleanupAttemptCount: number;
}

const OPTION_KEYS = new Set(['runtime', 'failurePoint']);
const SCHEDULED_OPTION_KEYS = new Set(['runtime', 'schedule']);
const SCHEDULE_ENTRY_KEYS = new Set(['point', 'callOrdinal']);
const FAILURE_POINTS = new Set<string>(
  ARENA_THREE_MODE_WEAPON_FEEDBACK_FAILURE_INJECTION_POINTS_V1,
);
const SCHEDULED_FAILURE_POINTS = new Set<string>(
  ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_POINTS_V2,
);

function injected(point: ArenaThreeModeWeaponFeedbackFailureInjectionPointV1): Error {
  return new Error(`Arena feedback failure injection: ${point}`);
}

export class ArenaThreeModeWeaponFeedbackFailureInjectionRuntimeV1
implements ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1 {
  readonly #runtime: ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1;
  readonly #failurePoint: ArenaThreeModeWeaponFeedbackFailureInjectionPointV1;
  readonly #branch: 'continuous' | 'restored';
  readonly #evidence: MutableEvidenceV1;
  #injected = false;
  #destroyed = false;

  constructor(
    runtime: ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1,
    failurePoint: ArenaThreeModeWeaponFeedbackFailureInjectionPointV1,
    branch: 'continuous' | 'restored' = 'continuous',
    evidence: MutableEvidenceV1 = {
      forkCallCount: 0,
      continuousStepCallCount: 0,
      restoredStepCallCount: 0,
      restoredDestroyCallCount: 0,
      injectedFailureCount: 0,
      restoredForkCreatedCount: 0,
      restoredForkCleanupAttemptCount: 0,
    },
  ) {
    if (!FAILURE_POINTS.has(failurePoint)) {
      throw new RangeError('Arena feedback failure injection point不受支持。');
    }
    this.#runtime = runtime;
    this.#failurePoint = failurePoint;
    this.#branch = branch;
    this.#evidence = evidence;
  }

  #throwOnce(point: ArenaThreeModeWeaponFeedbackFailureInjectionPointV1): never | void {
    if (this.#failurePoint !== point || this.#injected) return;
    this.#injected = true;
    this.#evidence.injectedFailureCount += 1;
    throw injected(point);
  }

  step(localInput: ArenaInputFrame): unknown {
    if (this.#destroyed) throw new Error('Arena feedback failure injection runtime已销毁。');
    if (this.#branch === 'continuous') {
      this.#evidence.continuousStepCallCount += 1;
      this.#throwOnce('continuous-step-before-delegate');
    } else {
      this.#evidence.restoredStepCallCount += 1;
      this.#throwOnce('restored-step-before-delegate');
    }
    const outcome = this.#runtime.step(localInput);
    if (
      this.#branch === 'continuous'
      && this.#failurePoint === 'continuous-unknown-event'
      && !this.#injected
    ) {
      this.#injected = true;
      this.#evidence.injectedFailureCount += 1;
      const source = assertPlainRecord(
        cloneFrozenData(outcome, 'Arena feedback failure injection step outcome'),
        'Arena feedback failure injection step outcome',
      );
      if (!Array.isArray(source.events)) {
        throw new TypeError('Arena feedback failure injection step outcome.events必须是数组。');
      }
      return Object.freeze({
        ...source,
        events: Object.freeze([
          ...source.events,
          Object.freeze({
            schemaVersion: 6,
            id: 'arena.feedback.failure-injection.future-event',
            sequence: source.events.length,
            tick: localInput.tick,
            type: ARENA_THREE_MODE_WEAPON_FEEDBACK_FAILURE_INJECTION_CANDIDATE_V1
              .unknownEventKind,
          }),
        ]),
      });
    }
    return outcome;
  }

  exportRuntimeCheckpointV1(): unknown {
    if (this.#destroyed) throw new Error('Arena feedback failure injection runtime已销毁。');
    return this.#runtime.exportRuntimeCheckpointV1();
  }

  getRetainedResourceSnapshot(): unknown {
    const read = this.#runtime.getRetainedResourceSnapshot;
    if (typeof read !== 'function') {
      throw new Error('Arena feedback failure injection runtime缺少保留资源快照。');
    }
    return Reflect.apply(read, this.#runtime, []);
  }

  exportWeaponFeedbackCheckpointCapabilityV1(): unknown {
    if (this.#destroyed) throw new Error('Arena feedback failure injection runtime已销毁。');
    const capability = this.#runtime.exportWeaponFeedbackCheckpointCapabilityV1();
    if (
      this.#branch !== 'restored'
      || this.#failurePoint !== 'restored-capability-corruption'
      || this.#injected
    ) return capability;
    this.#injected = true;
    this.#evidence.injectedFailureCount += 1;
    const source = assertPlainRecord(
      cloneFrozenData(capability, 'Arena feedback failure injection capability'),
      'Arena feedback failure injection capability',
    );
    const feedbackCheckpoint = assertPlainRecord(
      source.feedbackCheckpoint,
      'Arena feedback failure injection feedback checkpoint',
    );
    return Object.freeze({
      ...source,
      feedbackCheckpoint: Object.freeze({
        ...feedbackCheckpoint,
        tick: typeof feedbackCheckpoint.tick === 'number'
          ? feedbackCheckpoint.tick + 1
          : 1,
      }),
    });
  }

  exportContentSelectionCheckpointCapabilityV1(): unknown {
    if (this.#destroyed) throw new Error('Arena feedback failure injection runtime已销毁。');
    return this.#runtime.exportContentSelectionCheckpointCapabilityV1();
  }

  forkFromWeaponFeedbackCheckpointCapabilityV1(
    capability: ArenaModeWeaponFeedbackCheckpointCapabilityV1,
  ): ArenaThreeModeWeaponFeedbackFailureInjectionRuntimeV1 {
    if (this.#destroyed) throw new Error('Arena feedback failure injection runtime已销毁。');
    this.#evidence.forkCallCount += 1;
    const restored = this.#runtime.forkFromWeaponFeedbackCheckpointCapabilityV1(capability);
    this.#evidence.restoredForkCreatedCount += 1;
    if (this.#failurePoint === 'fork-after-construction' && !this.#injected) {
      this.#injected = true;
      this.#evidence.injectedFailureCount += 1;
      this.#evidence.restoredForkCleanupAttemptCount += 1;
      try {
        restored.destroy();
      } catch (cleanupError) {
        throw new AggregateError(
          [injected(this.#failurePoint), cleanupError],
          'Arena feedback fork构造后注入与清理均失败。',
        );
      }
      throw injected(this.#failurePoint);
    }
    return new ArenaThreeModeWeaponFeedbackFailureInjectionRuntimeV1(
      restored,
      this.#failurePoint,
      'restored',
      this.#evidence,
    );
  }

  getFailureInjectionEvidenceV1(): ArenaThreeModeWeaponFeedbackFailureInjectionEvidenceV1 {
    return Object.freeze({
      failurePoint: this.#failurePoint,
      ...this.#evidence,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#branch === 'restored') {
      this.#evidence.restoredDestroyCallCount += 1;
      this.#evidence.restoredForkCleanupAttemptCount += 1;
    }
    this.#runtime.destroy();
    this.#destroyed = true;
    if (
      this.#branch === 'restored'
      && this.#failurePoint === 'restored-destroy-after-delegate'
      && !this.#injected
    ) {
      this.#injected = true;
      this.#evidence.injectedFailureCount += 1;
      throw injected(this.#failurePoint);
    }
  }
}

export function createArenaThreeModeWeaponFeedbackFailureInjectionRuntimeV1(
  value: ArenaThreeModeWeaponFeedbackFailureInjectionCandidateV1Options,
): ArenaThreeModeWeaponFeedbackFailureInjectionRuntimeV1 {
  const source = assertPlainRecord(value, 'Arena feedback failure injection options');
  assertKnownKeys(source, OPTION_KEYS, 'Arena feedback failure injection options');
  if (!Object.hasOwn(source, 'runtime') || !Object.hasOwn(source, 'failurePoint')) {
    throw new TypeError('Arena feedback failure injection options缺少必填字段。');
  }
  if (typeof source.failurePoint !== 'string' || !FAILURE_POINTS.has(source.failurePoint)) {
    throw new RangeError('Arena feedback failure injection point不受支持。');
  }
  return new ArenaThreeModeWeaponFeedbackFailureInjectionRuntimeV1(
    source.runtime as ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1,
    source.failurePoint as ArenaThreeModeWeaponFeedbackFailureInjectionPointV1,
  );
}

interface MutableScheduledFailureEntryV2
extends ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2 {
  triggered: boolean;
}

interface MutableScheduledFailureEvidenceV2 {
  forkCallCount: number;
  continuousStepCallCount: number;
  restoredStepCallCount: number;
  restoredCapabilityExportCallCount: number;
  continuousRetainedResourceReadCallCount: number;
  restoredRetainedResourceReadCallCount: number;
  restoredDestroyCallCount: number;
  restoredForkCreatedCount: number;
  restoredForkCleanupAttemptCount: number;
  injectedFailureCount: number;
}

function scheduledInjected(
  point: ArenaThreeModeWeaponFeedbackScheduledFailurePointV2,
  callOrdinal: number,
): Error {
  return new Error(`Arena feedback scheduled failure injection: ${point}@${callOrdinal}`);
}

function normalizeScheduledFailureEntriesV2(
  value: unknown,
): readonly MutableScheduledFailureEntryV2[] {
  if (!Array.isArray(value)
    || value.length
      < ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_CANDIDATE_V2
        .minimumScheduleEntryCount
    || value.length
      > ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_CANDIDATE_V2
        .maximumScheduleEntryCount) {
    throw new RangeError('Arena feedback scheduled failure schedule数量越界。');
  }
  const identities = new Set<string>();
  return Object.freeze(value.map((entryValue, index) => {
    const name = `Arena feedback scheduled failure schedule[${index}]`;
    const source = assertPlainRecord(cloneFrozenData(entryValue, name), name);
    assertKnownKeys(source, SCHEDULE_ENTRY_KEYS, name);
    if (!Object.hasOwn(source, 'point') || !Object.hasOwn(source, 'callOrdinal')) {
      throw new TypeError(`${name}缺少必填字段。`);
    }
    if (typeof source.point !== 'string' || !SCHEDULED_FAILURE_POINTS.has(source.point)) {
      throw new RangeError(`${name}.point不受支持。`);
    }
    const point = source.point as ArenaThreeModeWeaponFeedbackScheduledFailurePointV2;
    const callOrdinal = assertIntegerAtLeast(source.callOrdinal, 1, `${name}.callOrdinal`);
    if (callOrdinal
      > ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_MAX_CALL_ORDINAL_V2[point]) {
      throw new RangeError(`${name}.callOrdinal越界。`);
    }
    const identity = `${point}@${callOrdinal}`;
    if (identities.has(identity)) throw new RangeError(`${name}重复计划${identity}。`);
    identities.add(identity);
    return {
      point,
      callOrdinal,
      triggered: false,
    };
  }));
}

function projectScheduledFailureEntryV2(
  value: MutableScheduledFailureEntryV2,
): ArenaThreeModeWeaponFeedbackScheduledFailureEntryV2 {
  return Object.freeze({
    point: value.point,
    callOrdinal: value.callOrdinal,
  });
}

class ArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimeV2
implements ArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimePortV2 {
  readonly #runtime: ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1;
  readonly #schedule: readonly MutableScheduledFailureEntryV2[];
  readonly #branch: 'continuous' | 'restored';
  readonly #evidence: MutableScheduledFailureEvidenceV2;
  #destroyed = false;

  constructor(
    runtime: ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1,
    schedule: readonly MutableScheduledFailureEntryV2[],
    branch: 'continuous' | 'restored' = 'continuous',
    evidence: MutableScheduledFailureEvidenceV2 = {
      forkCallCount: 0,
      continuousStepCallCount: 0,
      restoredStepCallCount: 0,
      restoredCapabilityExportCallCount: 0,
      continuousRetainedResourceReadCallCount: 0,
      restoredRetainedResourceReadCallCount: 0,
      restoredDestroyCallCount: 0,
      restoredForkCreatedCount: 0,
      restoredForkCleanupAttemptCount: 0,
      injectedFailureCount: 0,
    },
  ) {
    this.#runtime = runtime;
    this.#schedule = schedule;
    this.#branch = branch;
    this.#evidence = evidence;
  }

  #throwScheduled(
    point: ArenaThreeModeWeaponFeedbackScheduledFailurePointV2,
    callOrdinal: number,
  ): never | void {
    const scheduled = this.#schedule.find((entry) => (
      !entry.triggered && entry.point === point && entry.callOrdinal === callOrdinal
    ));
    if (scheduled === undefined) return;
    scheduled.triggered = true;
    this.#evidence.injectedFailureCount += 1;
    throw scheduledInjected(point, callOrdinal);
  }

  step(localInput: ArenaInputFrame): unknown {
    if (this.#destroyed) throw new Error('Arena feedback scheduled failure runtime已销毁。');
    let callOrdinal: number;
    if (this.#branch === 'continuous') {
      this.#evidence.continuousStepCallCount += 1;
      callOrdinal = this.#evidence.continuousStepCallCount;
      this.#throwScheduled('continuous-step-before-delegate', callOrdinal);
    } else {
      this.#evidence.restoredStepCallCount += 1;
      callOrdinal = this.#evidence.restoredStepCallCount;
      this.#throwScheduled('restored-step-before-delegate', callOrdinal);
    }
    const outcome = this.#runtime.step(localInput);
    if (this.#branch === 'continuous') {
      const scheduled = this.#schedule.find((entry) => (
        !entry.triggered
        && entry.point === 'continuous-unknown-event'
        && entry.callOrdinal === callOrdinal
      ));
      if (scheduled !== undefined) {
        scheduled.triggered = true;
        this.#evidence.injectedFailureCount += 1;
        const source = assertPlainRecord(
          cloneFrozenData(outcome, 'Arena feedback scheduled failure step outcome'),
          'Arena feedback scheduled failure step outcome',
        );
        if (!Array.isArray(source.events)) {
          throw new TypeError('Arena feedback scheduled failure step outcome.events必须是数组。');
        }
        return Object.freeze({
          ...source,
          events: Object.freeze([
            ...source.events,
            Object.freeze({
              schemaVersion: 6,
              id: `arena.feedback.scheduled-failure.future-event.${callOrdinal}`,
              sequence: source.events.length,
              tick: localInput.tick,
              type:
                ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_CANDIDATE_V2
                  .unknownEventKind,
            }),
          ]),
        });
      }
    }
    return outcome;
  }

  exportRuntimeCheckpointV1(): unknown {
    if (this.#destroyed) throw new Error('Arena feedback scheduled failure runtime已销毁。');
    return this.#runtime.exportRuntimeCheckpointV1();
  }

  getRetainedResourceSnapshot(): unknown {
    const read = this.#runtime.getRetainedResourceSnapshot;
    if (typeof read !== 'function') {
      throw new Error('Arena feedback scheduled failure runtime缺少保留资源快照。');
    }
    let callOrdinal: number;
    if (this.#branch === 'continuous') {
      this.#evidence.continuousRetainedResourceReadCallCount += 1;
      callOrdinal = this.#evidence.continuousRetainedResourceReadCallCount;
      this.#throwScheduled(
        'continuous-retained-resource-read-before-delegate',
        callOrdinal,
      );
    } else {
      this.#evidence.restoredRetainedResourceReadCallCount += 1;
      callOrdinal = this.#evidence.restoredRetainedResourceReadCallCount;
      this.#throwScheduled(
        'restored-retained-resource-read-before-delegate',
        callOrdinal,
      );
    }
    return Reflect.apply(read, this.#runtime, []);
  }

  exportWeaponFeedbackCheckpointCapabilityV1(): unknown {
    if (this.#destroyed) throw new Error('Arena feedback scheduled failure runtime已销毁。');
    const capability = this.#runtime.exportWeaponFeedbackCheckpointCapabilityV1();
    if (this.#branch !== 'restored') return capability;
    this.#evidence.restoredCapabilityExportCallCount += 1;
    const callOrdinal = this.#evidence.restoredCapabilityExportCallCount;
    const scheduled = this.#schedule.find((entry) => (
      !entry.triggered
      && entry.point === 'restored-capability-corruption'
      && entry.callOrdinal === callOrdinal
    ));
    if (scheduled === undefined) return capability;
    scheduled.triggered = true;
    this.#evidence.injectedFailureCount += 1;
    const source = assertPlainRecord(
      cloneFrozenData(capability, 'Arena feedback scheduled failure capability'),
      'Arena feedback scheduled failure capability',
    );
    const feedbackCheckpoint = assertPlainRecord(
      source.feedbackCheckpoint,
      'Arena feedback scheduled failure feedback checkpoint',
    );
    return Object.freeze({
      ...source,
      feedbackCheckpoint: Object.freeze({
        ...feedbackCheckpoint,
        tick: typeof feedbackCheckpoint.tick === 'number'
          ? feedbackCheckpoint.tick + 1
          : 1,
      }),
    });
  }

  exportContentSelectionCheckpointCapabilityV1(): unknown {
    if (this.#destroyed) throw new Error('Arena feedback scheduled failure runtime已销毁。');
    return this.#runtime.exportContentSelectionCheckpointCapabilityV1();
  }

  forkFromWeaponFeedbackCheckpointCapabilityV1(
    capability: ArenaModeWeaponFeedbackCheckpointCapabilityV1,
  ): ArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimeV2 {
    if (this.#destroyed) throw new Error('Arena feedback scheduled failure runtime已销毁。');
    this.#evidence.forkCallCount += 1;
    const restored = this.#runtime.forkFromWeaponFeedbackCheckpointCapabilityV1(capability);
    this.#evidence.restoredForkCreatedCount += 1;
    const forkCallOrdinal = this.#evidence.forkCallCount;
    const scheduled = this.#schedule.find((entry) => (
      !entry.triggered
      && entry.point === 'fork-after-construction'
      && entry.callOrdinal === forkCallOrdinal
    ));
    if (scheduled !== undefined) {
      scheduled.triggered = true;
      this.#evidence.injectedFailureCount += 1;
      this.#evidence.restoredForkCleanupAttemptCount += 1;
      try {
        restored.destroy();
      } catch (cleanupError) {
        throw new AggregateError(
          [scheduledInjected(scheduled.point, scheduled.callOrdinal), cleanupError],
          'Arena feedback scheduled fork构造后注入与清理均失败。',
        );
      }
      throw scheduledInjected(scheduled.point, scheduled.callOrdinal);
    }
    return new ArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimeV2(
      restored,
      this.#schedule,
      'restored',
      this.#evidence,
    );
  }

  getScheduledFailureInjectionEvidenceV2():
    ArenaThreeModeWeaponFeedbackScheduledFailureInjectionEvidenceV2 {
    return Object.freeze({
      schemaVersion: 2 as const,
      schedule: Object.freeze(this.#schedule.map(projectScheduledFailureEntryV2)),
      triggeredFailures: Object.freeze(
        this.#schedule.filter(({ triggered }) => triggered).map(projectScheduledFailureEntryV2),
      ),
      pendingFailures: Object.freeze(
        this.#schedule.filter(({ triggered }) => !triggered).map(projectScheduledFailureEntryV2),
      ),
      ...this.#evidence,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    let callOrdinal = 0;
    if (this.#branch === 'restored') {
      this.#evidence.restoredDestroyCallCount += 1;
      this.#evidence.restoredForkCleanupAttemptCount += 1;
      callOrdinal = this.#evidence.restoredDestroyCallCount;
    }
    this.#runtime.destroy();
    this.#destroyed = true;
    if (this.#branch === 'restored') {
      this.#throwScheduled('restored-destroy-after-delegate', callOrdinal);
    }
  }
}

export function createArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimeV2(
  value: ArenaThreeModeWeaponFeedbackScheduledFailureInjectionCandidateV2Options,
): ArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimePortV2 {
  const name = 'Arena feedback scheduled failure injection options';
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, SCHEDULED_OPTION_KEYS, name);
  if (!Object.hasOwn(source, 'runtime') || !Object.hasOwn(source, 'schedule')) {
    throw new TypeError(`${name}缺少必填字段。`);
  }
  return new ArenaThreeModeWeaponFeedbackScheduledFailureInjectionRuntimeV2(
    source.runtime as ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1,
    normalizeScheduledFailureEntriesV2(source.schedule),
  );
}
