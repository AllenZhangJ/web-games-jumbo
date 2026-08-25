import {
  ARENA_MATCH_EVENT_V6,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  createArenaMatchEventV6,
  createDeterministicDataHash,
  normalizeInputFrame,
  type ArenaInputFrame,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1 } from './arena-duel-authoritative-runtime-candidate-v1.js';
import { ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1 } from './arena-race-vertical-integration-verification-v1.js';
import { ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1 } from './arena-survival-shared-world-authority-verification-v1.js';
import {
  validateArenaModeWeaponFeedbackCheckpointCapabilityV1,
  type ArenaModeWeaponFeedbackCheckpointCapabilityV1,
} from './arena-three-mode-weapon-feedback-checkpoint-capability-v1.js';
import {
  validateArenaThreeModeContentSelectionCheckpointCapabilityV1,
} from './arena-three-mode-content-selection-checkpoint-capability-v1.js';

export const ARENA_THREE_MODE_WEAPON_FEEDBACK_RESTORE_SUFFIX_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1,
  status: 'production-unreachable',
  implementationStatus: 'code-written-not-run',
  hardGate: false,
  supportedModeDefinitionIds: Object.freeze([
    ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
    ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
    ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
  ]),
  requiredRuntimeDataMethods: Object.freeze([
    'exportRuntimeCheckpointV1',
    'exportWeaponFeedbackCheckpointCapabilityV1',
    'forkFromWeaponFeedbackCheckpointCapabilityV1',
    'exportContentSelectionCheckpointCapabilityV1',
  ]),
  comparedNextStepFields: Object.freeze([
    'full-step-outcome',
    'weapon-feedback-events',
    'runtime-checkpoint-identity',
    'feedback-checkpoint-identity',
    'content-selection-checkpoint-identity',
    'state-hash',
  ]),
  consumesOneStablePreTerminalTick: true,
  validationStatus: 'not-run',
  defaultRegistryWired: false,
  defaultCompositionWired: false,
  defaultEntryWired: false,
} as const);

export const ARENA_THREE_MODE_WEAPON_FEEDBACK_LONG_RESTORE_SUFFIX_CANDIDATE_V2 =
  Object.freeze({
    schemaVersion: 2,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    hardGate: false,
    supportedModeDefinitionIds:
      ARENA_THREE_MODE_WEAPON_FEEDBACK_RESTORE_SUFFIX_CANDIDATE_V1
        .supportedModeDefinitionIds,
    requiredRuntimeDataMethods: Object.freeze([
      ...ARENA_THREE_MODE_WEAPON_FEEDBACK_RESTORE_SUFFIX_CANDIDATE_V1
        .requiredRuntimeDataMethods,
      'getRetainedResourceSnapshot',
    ]),
    minimumComparedTickCount: 2,
    maximumComparedTickCount: 240,
    comparesEveryIntermediateCheckpoint: true,
    comparesEveryIntermediateRetainedResourceSnapshot: true,
    requiresRestoredResourcesReleasedAfterDestroy: true,
    validationStatus: 'not-run',
    defaultRegistryWired: false,
    defaultCompositionWired: false,
    defaultEntryWired: false,
  } as const);

export interface ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1 {
  step(localInput: ArenaInputFrame): unknown;
  exportRuntimeCheckpointV1(): unknown;
  exportWeaponFeedbackCheckpointCapabilityV1(): unknown;
  exportContentSelectionCheckpointCapabilityV1(): unknown;
  getRetainedResourceSnapshot?(): unknown;
  forkFromWeaponFeedbackCheckpointCapabilityV1(
    capability: ArenaModeWeaponFeedbackCheckpointCapabilityV1,
  ): ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1;
  destroy(): unknown;
}

export interface ArenaThreeModeWeaponFeedbackRestoreSuffixCandidateV1Options {
  readonly modeDefinitionId: string;
  readonly runtime: ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1;
  readonly localInput: unknown;
}

export interface ArenaThreeModeWeaponFeedbackRestoreSuffixReportV1 {
  readonly schemaVersion: 1;
  readonly modeDefinitionId: string;
  readonly comparedTick: number;
  readonly feedbackEventCount: number;
  readonly fullStepOutcomeIdentityHash: string;
  readonly weaponFeedbackEventsIdentityHash: string;
  readonly runtimeCheckpointIdentityHash: string;
  readonly feedbackCheckpointIdentityHash: string;
  readonly contentSelectionCapabilityIdentityHash: string;
  readonly collectionCatalogIdentityHash: string;
  readonly stateHash: string;
  readonly restoredRuntimeDestroyed: true;
  readonly validationStatus: 'code-written-not-run';
  readonly reportIdentityHash: string;
}

export interface ArenaThreeModeWeaponFeedbackLongRestoreSuffixTraceEntryV2 {
  readonly tick: number;
  readonly feedbackEventCount: number;
  readonly fullStepOutcomeIdentityHash: string;
  readonly weaponFeedbackEventsIdentityHash: string;
  readonly runtimeCheckpointIdentityHash: string;
  readonly feedbackCheckpointIdentityHash: string;
  readonly contentSelectionCapabilityIdentityHash: string;
  readonly retainedResourceSnapshotIdentityHash: string;
  readonly stateHash: string;
}

export interface ArenaThreeModeWeaponFeedbackLongRestoreSuffixCandidateV2Options {
  readonly modeDefinitionId: string;
  readonly runtime: ArenaThreeModeWeaponFeedbackRestoreSuffixRuntimePortV1;
  readonly localInputs: readonly unknown[];
}

export interface ArenaThreeModeWeaponFeedbackLongRestoreSuffixReportV2 {
  readonly schemaVersion: 2;
  readonly modeDefinitionId: string;
  readonly firstComparedTick: number;
  readonly lastComparedTick: number;
  readonly comparedTickCount: number;
  readonly totalFeedbackEventCount: number;
  readonly trace: readonly ArenaThreeModeWeaponFeedbackLongRestoreSuffixTraceEntryV2[];
  readonly traceIdentityHash: string;
  readonly finalRuntimeCheckpointIdentityHash: string;
  readonly finalFeedbackCheckpointIdentityHash: string;
  readonly finalContentSelectionCapabilityIdentityHash: string;
  readonly collectionCatalogIdentityHash: string;
  readonly finalRetainedResourceSnapshotIdentityHash: string;
  readonly finalStateHash: string;
  readonly restoredRuntimeDestroyed: true;
  readonly restoredOwnedResourceCountAfterDestroy: 0;
  readonly restoredCommittedRecordCountAfterDestroy: 0;
  readonly releasedResourceSnapshotIdentityHash: string;
  readonly validationStatus: 'code-written-not-run';
  readonly reportIdentityHash: string;
}

const OPTION_KEYS = new Set(['modeDefinitionId', 'runtime', 'localInput']);
const LONG_SUFFIX_OPTION_KEYS = new Set(['modeDefinitionId', 'runtime', 'localInputs']);
const RETAINED_RESOURCE_KEYS = new Set([
  'authorityOwned',
  'modeDriverOwned',
  'ownedResourceCount',
  'committedRecordCount',
]);
const STEP_OUTCOME_KEYS = new Set([
  'readFrame',
  'readFrameAudit',
  'events',
  'supplyFacts',
  'supplyCadence',
  'localJumpAvailability',
  'inputs',
  'weaponFeedbackDirectionFactsV2',
]);
const SUPPORTED_MODE_IDS: ReadonlySet<string> = new Set(
  ARENA_THREE_MODE_WEAPON_FEEDBACK_RESTORE_SUFFIX_CANDIDATE_V1.supportedModeDefinitionIds,
);
const RUNTIME_METHODS = Object.freeze([
  'step',
  'exportRuntimeCheckpointV1',
  'exportWeaponFeedbackCheckpointCapabilityV1',
  'exportContentSelectionCheckpointCapabilityV1',
  'forkFromWeaponFeedbackCheckpointCapabilityV1',
  'destroy',
] as const);

interface CapturedRuntimePortV1 {
  readonly step: (localInput: ArenaInputFrame) => unknown;
  readonly exportWeaponFeedbackCheckpointCapabilityV1: () => unknown;
  readonly exportContentSelectionCheckpointCapabilityV1: () => unknown;
  readonly getRetainedResourceSnapshot: (() => unknown) | null;
  readonly forkFromWeaponFeedbackCheckpointCapabilityV1: (
    capability: ArenaModeWeaponFeedbackCheckpointCapabilityV1,
  ) => CapturedRuntimePortV1;
  readonly destroy: () => unknown;
}

function destroyRejectedFork(value: unknown, name: string, primaryFailure: unknown): never {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    throw primaryFailure;
  }
  const visited = new Set<object>();
  let cursor: object | null = value as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) break;
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, 'destroy');
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') break;
      try {
        Reflect.apply(descriptor.value, value, []);
      } catch (cleanupError) {
        throw new AggregateError(
          [primaryFailure, cleanupError],
          `${name}端口捕获与清理均失败。`,
        );
      }
      throw primaryFailure;
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new AggregateError(
    [primaryFailure, new Error(`${name}缺少可调用destroy数据方法。`)],
    `${name}端口捕获失败且无法证明清理。`,
  );
}

function captureRuntimePort(
  value: unknown,
  name: string,
): CapturedRuntimePortV1 {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name}必须是同步runtime对象。`);
  }
  const methods = new Map<string, (...arguments_: readonly unknown[]) => unknown>();
  const retainedResourceMethodName = 'getRetainedResourceSnapshot';
  let retainedResourceMethod: (() => unknown) | null = null;
  for (const methodName of RUNTIME_METHODS) {
    if (Object.getOwnPropertyDescriptor(value, methodName) !== undefined) {
      throw new TypeError(`${name}.${methodName}不得以实例字段遮蔽正式原型方法。`);
    }
  }
  if (Object.getOwnPropertyDescriptor(value, retainedResourceMethodName) !== undefined) {
    throw new TypeError(
      `${name}.${retainedResourceMethodName}不得以实例字段遮蔽正式原型方法。`,
    );
  }
  const visited = new Set<object>();
  let cursor: object | null = Object.getPrototypeOf(value);
  while (cursor !== null
    && (methods.size < RUNTIME_METHODS.length || retainedResourceMethod === null)) {
    if (visited.has(cursor) || visited.size >= 32) {
      throw new TypeError(`${name}原型链无效。`);
    }
    visited.add(cursor);
    for (const methodName of RUNTIME_METHODS) {
      if (methods.has(methodName)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(cursor, methodName);
      if (descriptor === undefined) continue;
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${methodName}必须是数据方法。`);
      }
      methods.set(methodName, descriptor.value as (...arguments_: readonly unknown[]) => unknown);
    }
    if (retainedResourceMethod === null) {
      const descriptor = Object.getOwnPropertyDescriptor(cursor, retainedResourceMethodName);
      if (descriptor !== undefined) {
        if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
          throw new TypeError(`${name}.${retainedResourceMethodName}必须是数据方法。`);
        }
        retainedResourceMethod = descriptor.value as () => unknown;
      }
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  for (const methodName of RUNTIME_METHODS) {
    if (!methods.has(methodName)) throw new TypeError(`${name}缺少${methodName}数据方法。`);
  }
  const call = (methodName: typeof RUNTIME_METHODS[number], arguments_: readonly unknown[]) => (
    Reflect.apply(methods.get(methodName)!, value, arguments_)
  );
  return Object.freeze({
    step(localInput: ArenaInputFrame) {
      return call('step', [localInput]);
    },
    exportWeaponFeedbackCheckpointCapabilityV1() {
      return call('exportWeaponFeedbackCheckpointCapabilityV1', []);
    },
    exportContentSelectionCheckpointCapabilityV1() {
      return call('exportContentSelectionCheckpointCapabilityV1', []);
    },
    getRetainedResourceSnapshot: retainedResourceMethod === null
      ? null
      : () => Reflect.apply(retainedResourceMethod!, value, []),
    forkFromWeaponFeedbackCheckpointCapabilityV1(
      capability: ArenaModeWeaponFeedbackCheckpointCapabilityV1,
    ) {
      const restoredValue = call('forkFromWeaponFeedbackCheckpointCapabilityV1', [capability]);
      try {
        return captureRuntimePort(restoredValue, `${name} restored fork`);
      } catch (error) {
        return destroyRejectedFork(restoredValue, `${name} restored fork`, error);
      }
    },
    destroy() {
      return call('destroy', []);
    },
  });
}

function sameIdentity(left: string, right: string, name: string): void {
  if (left !== right) throw new RangeError(`${name}连续分支与恢复分支不一致。`);
}

function normalizeStepOutcome(value: unknown, name: string) {
  const source = assertPlainRecord(cloneFrozenData(value, name), name);
  assertKnownKeys(source, STEP_OUTCOME_KEYS, name);
  for (const key of STEP_OUTCOME_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}.${key}为必填数据字段。`);
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
  if (!Array.isArray(source.events)) throw new TypeError(`${name}.events必须是数组。`);
  const events = Object.freeze(source.events.map((event, index) => (
    createArenaMatchEventV6(cloneFrozenData(event, `${name}.events[${index}]`))
  )));
  const normalizedSource = Object.freeze({ ...source, events });
  const feedbackEvents = Object.freeze(events.filter(
    ({ type }) => type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
  ));
  const readFrame = assertPlainRecord(source.readFrame, `${name}.readFrame`);
  const worldSnapshot = assertPlainRecord(
    readFrame.worldSnapshot,
    `${name}.readFrame.worldSnapshot`,
  );
  if (worldSnapshot.result !== null) {
    throw new RangeError(`${name}必须消费非终局稳定tick，终局比较由Replay finalHash承担。`);
  }
  return Object.freeze({ source: normalizedSource, feedbackEvents });
}

function destroyRestored(
  runtime: CapturedRuntimePortV1,
  primaryFailure: unknown,
): never | void {
  try {
    runtime.destroy();
  } catch (cleanupError) {
    if (primaryFailure !== undefined) {
      throw new AggregateError(
        [primaryFailure, cleanupError],
        'Arena feedback恢复后缀比较与恢复分支清理均失败。',
      );
    }
    throw cleanupError;
  }
  if (primaryFailure !== undefined) throw primaryFailure;
}

export function runArenaThreeModeWeaponFeedbackRestoreSuffixCandidateV1(
  value: ArenaThreeModeWeaponFeedbackRestoreSuffixCandidateV1Options,
): DeepReadonly<ArenaThreeModeWeaponFeedbackRestoreSuffixReportV1> {
  const source = assertPlainRecord(value, 'Arena feedback restore suffix options');
  assertKnownKeys(source, OPTION_KEYS, 'Arena feedback restore suffix options');
  for (const key of OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena feedback restore suffix options.${key}为必填字段。`);
    }
  }
  if (
    typeof source.modeDefinitionId !== 'string'
    || !SUPPORTED_MODE_IDS.has(source.modeDefinitionId)
  ) throw new RangeError('Arena feedback restore suffix modeDefinitionId不受支持。');
  const runtime = captureRuntimePort(
    source.runtime,
    'Arena feedback restore suffix runtime',
  );
  const before = validateArenaModeWeaponFeedbackCheckpointCapabilityV1(
    runtime.exportWeaponFeedbackCheckpointCapabilityV1(),
  );
  const contentBefore = validateArenaThreeModeContentSelectionCheckpointCapabilityV1(
    runtime.exportContentSelectionCheckpointCapabilityV1(),
  );
  if (before.modeDefinitionId !== source.modeDefinitionId) {
    throw new RangeError('Arena feedback restore suffix runtime Mode身份漂移。');
  }
  if (
    contentBefore.modeDefinitionId !== source.modeDefinitionId
    || contentBefore.runtimeCheckpoint.runtimeCheckpointIdentityHash
      !== before.runtimeCheckpointIdentityHash
  ) throw new RangeError('Arena feedback restore suffix content/runtime身份漂移。');
  const comparedTick = before.runtimeCheckpoint.readFrame.worldSnapshot.tick;
  const localInput = normalizeInputFrame(source.localInput, {
    expectedTick: comparedTick,
    participantIds: [before.runtimeCheckpoint.localParticipantId],
  });
  const restored = runtime.forkFromWeaponFeedbackCheckpointCapabilityV1(before);
  let primaryFailure: unknown = undefined;
  try {
    const restoredBefore = validateArenaModeWeaponFeedbackCheckpointCapabilityV1(
      restored.exportWeaponFeedbackCheckpointCapabilityV1(),
    );
    const restoredContentBefore =
      validateArenaThreeModeContentSelectionCheckpointCapabilityV1(
        restored.exportContentSelectionCheckpointCapabilityV1(),
      );
    sameIdentity(
      before.capabilityIdentityHash,
      restoredBefore.capabilityIdentityHash,
      'Arena feedback restore suffix初始capability',
    );
    sameIdentity(
      contentBefore.capabilityIdentityHash,
      restoredContentBefore.capabilityIdentityHash,
      'Arena feedback restore suffix初始content selection capability',
    );
    const continuousOutcome = normalizeStepOutcome(
      runtime.step(localInput),
      'Arena feedback restore suffix continuous outcome',
    );
    const restoredOutcome = normalizeStepOutcome(
      restored.step(localInput),
      'Arena feedback restore suffix restored outcome',
    );
    const fullStepOutcomeIdentityHash = createDeterministicDataHash(
      continuousOutcome.source,
      'Arena feedback restore suffix full step outcome',
    );
    sameIdentity(
      fullStepOutcomeIdentityHash,
      createDeterministicDataHash(
        restoredOutcome.source,
        'Arena feedback restore suffix full step outcome',
      ),
      'Arena feedback restore suffix完整下一步结果',
    );
    const weaponFeedbackEventsIdentityHash = createDeterministicDataHash(
      continuousOutcome.feedbackEvents,
      'Arena feedback restore suffix weapon feedback events',
    );
    sameIdentity(
      weaponFeedbackEventsIdentityHash,
      createDeterministicDataHash(
        restoredOutcome.feedbackEvents,
        'Arena feedback restore suffix weapon feedback events',
      ),
      'Arena feedback restore suffix反馈事件',
    );
    const continuousAfter = validateArenaModeWeaponFeedbackCheckpointCapabilityV1(
      runtime.exportWeaponFeedbackCheckpointCapabilityV1(),
    );
    const restoredAfter = validateArenaModeWeaponFeedbackCheckpointCapabilityV1(
      restored.exportWeaponFeedbackCheckpointCapabilityV1(),
    );
    const continuousContentAfter =
      validateArenaThreeModeContentSelectionCheckpointCapabilityV1(
        runtime.exportContentSelectionCheckpointCapabilityV1(),
      );
    const restoredContentAfter =
      validateArenaThreeModeContentSelectionCheckpointCapabilityV1(
        restored.exportContentSelectionCheckpointCapabilityV1(),
      );
    sameIdentity(
      continuousAfter.runtimeCheckpointIdentityHash,
      restoredAfter.runtimeCheckpointIdentityHash,
      'Arena feedback restore suffix runtime checkpoint',
    );
    sameIdentity(
      continuousAfter.feedbackCheckpoint.checkpointIdentityHash,
      restoredAfter.feedbackCheckpoint.checkpointIdentityHash,
      'Arena feedback restore suffix feedback checkpoint',
    );
    sameIdentity(
      continuousAfter.runtimeCheckpoint.stateHash,
      restoredAfter.runtimeCheckpoint.stateHash,
      'Arena feedback restore suffix state hash',
    );
    sameIdentity(
      continuousContentAfter.capabilityIdentityHash,
      restoredContentAfter.capabilityIdentityHash,
      'Arena feedback restore suffix content selection checkpoint',
    );
    sameIdentity(
      continuousAfter.runtimeCheckpointIdentityHash,
      continuousContentAfter.runtimeCheckpoint.runtimeCheckpointIdentityHash,
      'Arena feedback restore suffix feedback/content runtime checkpoint',
    );
    const reportCore = Object.freeze({
      schemaVersion: 1 as const,
      modeDefinitionId: source.modeDefinitionId,
      comparedTick,
      feedbackEventCount: continuousOutcome.feedbackEvents.length,
      fullStepOutcomeIdentityHash,
      weaponFeedbackEventsIdentityHash,
      runtimeCheckpointIdentityHash: continuousAfter.runtimeCheckpointIdentityHash,
      feedbackCheckpointIdentityHash:
        continuousAfter.feedbackCheckpoint.checkpointIdentityHash,
      contentSelectionCapabilityIdentityHash:
        continuousContentAfter.capabilityIdentityHash,
      collectionCatalogIdentityHash:
        continuousContentAfter.collectionCatalogIdentityHash,
      stateHash: continuousAfter.runtimeCheckpoint.stateHash,
      restoredRuntimeDestroyed: true as const,
      validationStatus: 'code-written-not-run' as const,
    });
    return Object.freeze({
      ...reportCore,
      reportIdentityHash: createDeterministicDataHash(
        reportCore,
        'ArenaThreeModeWeaponFeedbackRestoreSuffixReportV1 identity',
      ),
    });
  } catch (error) {
    primaryFailure = error;
    throw error;
  } finally {
    destroyRestored(restored, primaryFailure);
  }
}

interface NormalizedRetainedResourceSnapshotV2 {
  readonly authorityOwned: boolean;
  readonly modeDriverOwned: boolean;
  readonly ownedResourceCount: number;
  readonly committedRecordCount: number;
}

function normalizeRetainedResourceSnapshotV2(
  value: unknown,
  name: string,
): NormalizedRetainedResourceSnapshotV2 {
  const source = assertPlainRecord(cloneFrozenData(value, name), name);
  assertKnownKeys(source, RETAINED_RESOURCE_KEYS, name);
  for (const key of RETAINED_RESOURCE_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
  if (typeof source.authorityOwned !== 'boolean'
    || typeof source.modeDriverOwned !== 'boolean') {
    throw new TypeError(`${name}资源所有权必须是布尔值。`);
  }
  const ownedResourceCount = assertIntegerAtLeast(
    source.ownedResourceCount,
    0,
    `${name}.ownedResourceCount`,
  );
  const committedRecordCount = assertIntegerAtLeast(
    source.committedRecordCount,
    0,
    `${name}.committedRecordCount`,
  );
  if (ownedResourceCount
    !== Number(source.authorityOwned) + Number(source.modeDriverOwned)) {
    throw new RangeError(`${name}资源所有权计数不闭合。`);
  }
  return Object.freeze({
    authorityOwned: source.authorityOwned,
    modeDriverOwned: source.modeDriverOwned,
    ownedResourceCount,
    committedRecordCount,
  });
}

function requireActiveRetainedResourcesV2(
  value: NormalizedRetainedResourceSnapshotV2,
  name: string,
): void {
  if (!value.authorityOwned || !value.modeDriverOwned || value.ownedResourceCount !== 2) {
    throw new RangeError(`${name}必须保留完整authority与mode driver所有权。`);
  }
}

function retainedResourceIdentityHashV2(
  value: NormalizedRetainedResourceSnapshotV2,
): string {
  return createDeterministicDataHash(
    value,
    'Arena feedback long restore suffix retained resource snapshot',
  );
}

function releaseRestoredRuntimeAndReadSnapshotV2(
  runtime: CapturedRuntimePortV1,
  primaryFailure: unknown,
): NormalizedRetainedResourceSnapshotV2 {
  const cleanupErrors: unknown[] = [];
  try {
    runtime.destroy();
  } catch (error) {
    cleanupErrors.push(error);
  }
  let released: NormalizedRetainedResourceSnapshotV2 | null = null;
  if (runtime.getRetainedResourceSnapshot === null) {
    cleanupErrors.push(new Error('Arena feedback long restore suffix销毁后缺少资源快照。'));
  } else {
    try {
      released = normalizeRetainedResourceSnapshotV2(
        runtime.getRetainedResourceSnapshot(),
        'Arena feedback long restore suffix released resources',
      );
      if (released.authorityOwned
        || released.modeDriverOwned
        || released.ownedResourceCount !== 0
        || released.committedRecordCount !== 0) {
        cleanupErrors.push(new RangeError(
          'Arena feedback long restore suffix恢复分支销毁后仍保留资源或提交记录。',
        ));
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (primaryFailure !== undefined) {
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [primaryFailure, ...cleanupErrors],
        'Arena feedback长恢复后缀比较与恢复分支资源清理均失败。',
      );
    }
    throw primaryFailure;
  }
  if (cleanupErrors.length > 0) {
    throw cleanupErrors.length === 1
      ? cleanupErrors[0]
      : new AggregateError(
        cleanupErrors,
        'Arena feedback长恢复后缀恢复分支资源清理不完整。',
      );
  }
  if (released === null) {
    throw new Error('Arena feedback long restore suffix缺少销毁后资源快照。');
  }
  return released;
}

export function runArenaThreeModeWeaponFeedbackLongRestoreSuffixCandidateV2(
  value: ArenaThreeModeWeaponFeedbackLongRestoreSuffixCandidateV2Options,
): DeepReadonly<ArenaThreeModeWeaponFeedbackLongRestoreSuffixReportV2> {
  const name = 'Arena feedback long restore suffix options';
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, LONG_SUFFIX_OPTION_KEYS, name);
  for (const key of LONG_SUFFIX_OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
  const modeDefinitionId = source.modeDefinitionId;
  if (typeof modeDefinitionId !== 'string'
    || !SUPPORTED_MODE_IDS.has(modeDefinitionId)) {
    throw new RangeError('Arena feedback long restore suffix modeDefinitionId不受支持。');
  }
  const localInputs = source.localInputs;
  if (!Array.isArray(localInputs)
    || localInputs.length
      < ARENA_THREE_MODE_WEAPON_FEEDBACK_LONG_RESTORE_SUFFIX_CANDIDATE_V2
        .minimumComparedTickCount
    || localInputs.length
      > ARENA_THREE_MODE_WEAPON_FEEDBACK_LONG_RESTORE_SUFFIX_CANDIDATE_V2
        .maximumComparedTickCount) {
    throw new RangeError('Arena feedback long restore suffix localInputs数量越界。');
  }

  const runtime = captureRuntimePort(source.runtime, 'Arena feedback long restore suffix runtime');
  if (runtime.getRetainedResourceSnapshot === null) {
    throw new TypeError(
      'Arena feedback long restore suffix runtime缺少getRetainedResourceSnapshot数据方法。',
    );
  }
  const readContinuousRetainedResources = runtime.getRetainedResourceSnapshot;
  let continuousCapability = validateArenaModeWeaponFeedbackCheckpointCapabilityV1(
    runtime.exportWeaponFeedbackCheckpointCapabilityV1(),
  );
  let continuousContent = validateArenaThreeModeContentSelectionCheckpointCapabilityV1(
    runtime.exportContentSelectionCheckpointCapabilityV1(),
  );
  if (continuousCapability.modeDefinitionId !== modeDefinitionId
    || continuousContent.modeDefinitionId !== modeDefinitionId
    || continuousContent.runtimeCheckpoint.runtimeCheckpointIdentityHash
      !== continuousCapability.runtimeCheckpointIdentityHash) {
    throw new RangeError('Arena feedback long restore suffix初始Mode/content/runtime身份漂移。');
  }
  const continuousInitialResources = normalizeRetainedResourceSnapshotV2(
    readContinuousRetainedResources(),
    'Arena feedback long restore suffix continuous initial resources',
  );
  requireActiveRetainedResourcesV2(
    continuousInitialResources,
    'Arena feedback long restore suffix continuous initial resources',
  );

  const restored = runtime.forkFromWeaponFeedbackCheckpointCapabilityV1(
    continuousCapability,
  );
  let primaryFailure: unknown = undefined;
  let reportCore: Omit<
    ArenaThreeModeWeaponFeedbackLongRestoreSuffixReportV2,
    | 'restoredRuntimeDestroyed'
    | 'restoredOwnedResourceCountAfterDestroy'
    | 'restoredCommittedRecordCountAfterDestroy'
    | 'releasedResourceSnapshotIdentityHash'
    | 'reportIdentityHash'
  > | null = null;
  try {
    if (restored.getRetainedResourceSnapshot === null) {
      throw new TypeError(
        'Arena feedback long restore suffix restored runtime缺少资源快照数据方法。',
      );
    }
    const readRestoredRetainedResources = restored.getRetainedResourceSnapshot;
    let restoredCapability = validateArenaModeWeaponFeedbackCheckpointCapabilityV1(
      restored.exportWeaponFeedbackCheckpointCapabilityV1(),
    );
    let restoredContent = validateArenaThreeModeContentSelectionCheckpointCapabilityV1(
      restored.exportContentSelectionCheckpointCapabilityV1(),
    );
    sameIdentity(
      continuousCapability.capabilityIdentityHash,
      restoredCapability.capabilityIdentityHash,
      'Arena feedback long restore suffix初始feedback capability',
    );
    sameIdentity(
      continuousContent.capabilityIdentityHash,
      restoredContent.capabilityIdentityHash,
      'Arena feedback long restore suffix初始content capability',
    );
    const restoredInitialResources = normalizeRetainedResourceSnapshotV2(
      readRestoredRetainedResources(),
      'Arena feedback long restore suffix restored initial resources',
    );
    requireActiveRetainedResourcesV2(
      restoredInitialResources,
      'Arena feedback long restore suffix restored initial resources',
    );
    sameIdentity(
      retainedResourceIdentityHashV2(continuousInitialResources),
      retainedResourceIdentityHashV2(restoredInitialResources),
      'Arena feedback long restore suffix初始资源快照',
    );

    const firstComparedTick = continuousCapability
      .runtimeCheckpoint.readFrame.worldSnapshot.tick;
    const trace: ArenaThreeModeWeaponFeedbackLongRestoreSuffixTraceEntryV2[] = [];
    let totalFeedbackEventCount = 0;
    let finalResources = continuousInitialResources;
    localInputs.forEach((inputValue, index) => {
      const comparedTick = continuousCapability.runtimeCheckpoint.readFrame.worldSnapshot.tick;
      if (comparedTick !== firstComparedTick + index) {
        throw new RangeError('Arena feedback long restore suffix输入tick序列不连续。');
      }
      const localInput = normalizeInputFrame(inputValue, {
        expectedTick: comparedTick,
        participantIds: [continuousCapability.runtimeCheckpoint.localParticipantId],
      });
      const continuousOutcome = normalizeStepOutcome(
        runtime.step(localInput),
        `Arena feedback long restore suffix continuous outcome[${index}]`,
      );
      const restoredOutcome = normalizeStepOutcome(
        restored.step(localInput),
        `Arena feedback long restore suffix restored outcome[${index}]`,
      );
      const fullStepOutcomeIdentityHash = createDeterministicDataHash(
        continuousOutcome.source,
        'Arena feedback long restore suffix full step outcome',
      );
      sameIdentity(
        fullStepOutcomeIdentityHash,
        createDeterministicDataHash(
          restoredOutcome.source,
          'Arena feedback long restore suffix full step outcome',
        ),
        `Arena feedback long restore suffix完整step[${index}]`,
      );
      const weaponFeedbackEventsIdentityHash = createDeterministicDataHash(
        continuousOutcome.feedbackEvents,
        'Arena feedback long restore suffix feedback events',
      );
      sameIdentity(
        weaponFeedbackEventsIdentityHash,
        createDeterministicDataHash(
          restoredOutcome.feedbackEvents,
          'Arena feedback long restore suffix feedback events',
        ),
        `Arena feedback long restore suffix反馈事件[${index}]`,
      );

      continuousCapability = validateArenaModeWeaponFeedbackCheckpointCapabilityV1(
        runtime.exportWeaponFeedbackCheckpointCapabilityV1(),
      );
      restoredCapability = validateArenaModeWeaponFeedbackCheckpointCapabilityV1(
        restored.exportWeaponFeedbackCheckpointCapabilityV1(),
      );
      continuousContent = validateArenaThreeModeContentSelectionCheckpointCapabilityV1(
        runtime.exportContentSelectionCheckpointCapabilityV1(),
      );
      restoredContent = validateArenaThreeModeContentSelectionCheckpointCapabilityV1(
        restored.exportContentSelectionCheckpointCapabilityV1(),
      );
      sameIdentity(
        continuousCapability.runtimeCheckpointIdentityHash,
        restoredCapability.runtimeCheckpointIdentityHash,
        `Arena feedback long restore suffix runtime checkpoint[${index}]`,
      );
      sameIdentity(
        continuousCapability.feedbackCheckpoint.checkpointIdentityHash,
        restoredCapability.feedbackCheckpoint.checkpointIdentityHash,
        `Arena feedback long restore suffix feedback checkpoint[${index}]`,
      );
      sameIdentity(
        continuousCapability.runtimeCheckpoint.stateHash,
        restoredCapability.runtimeCheckpoint.stateHash,
        `Arena feedback long restore suffix state hash[${index}]`,
      );
      sameIdentity(
        continuousContent.capabilityIdentityHash,
        restoredContent.capabilityIdentityHash,
        `Arena feedback long restore suffix content capability[${index}]`,
      );
      sameIdentity(
        continuousCapability.runtimeCheckpointIdentityHash,
        continuousContent.runtimeCheckpoint.runtimeCheckpointIdentityHash,
        `Arena feedback long restore suffix continuous feedback/content[${index}]`,
      );
      sameIdentity(
        restoredCapability.runtimeCheckpointIdentityHash,
        restoredContent.runtimeCheckpoint.runtimeCheckpointIdentityHash,
        `Arena feedback long restore suffix restored feedback/content[${index}]`,
      );

      const continuousResources = normalizeRetainedResourceSnapshotV2(
        readContinuousRetainedResources(),
        `Arena feedback long restore suffix continuous resources[${index}]`,
      );
      const restoredResources = normalizeRetainedResourceSnapshotV2(
        readRestoredRetainedResources(),
        `Arena feedback long restore suffix restored resources[${index}]`,
      );
      requireActiveRetainedResourcesV2(
        continuousResources,
        `Arena feedback long restore suffix continuous resources[${index}]`,
      );
      requireActiveRetainedResourcesV2(
        restoredResources,
        `Arena feedback long restore suffix restored resources[${index}]`,
      );
      const retainedResourceSnapshotIdentityHash =
        retainedResourceIdentityHashV2(continuousResources);
      sameIdentity(
        retainedResourceSnapshotIdentityHash,
        retainedResourceIdentityHashV2(restoredResources),
        `Arena feedback long restore suffix资源快照[${index}]`,
      );
      totalFeedbackEventCount += continuousOutcome.feedbackEvents.length;
      finalResources = continuousResources;
      trace.push(Object.freeze({
        tick: comparedTick,
        feedbackEventCount: continuousOutcome.feedbackEvents.length,
        fullStepOutcomeIdentityHash,
        weaponFeedbackEventsIdentityHash,
        runtimeCheckpointIdentityHash: continuousCapability.runtimeCheckpointIdentityHash,
        feedbackCheckpointIdentityHash:
          continuousCapability.feedbackCheckpoint.checkpointIdentityHash,
        contentSelectionCapabilityIdentityHash: continuousContent.capabilityIdentityHash,
        retainedResourceSnapshotIdentityHash,
        stateHash: continuousCapability.runtimeCheckpoint.stateHash,
      }));
    });
    const frozenTrace = Object.freeze([...trace]);
    reportCore = Object.freeze({
      schemaVersion: 2 as const,
      modeDefinitionId,
      firstComparedTick,
      lastComparedTick: frozenTrace.at(-1)!.tick,
      comparedTickCount: frozenTrace.length,
      totalFeedbackEventCount,
      trace: frozenTrace,
      traceIdentityHash: createDeterministicDataHash(
        frozenTrace,
        'Arena feedback long restore suffix trace',
      ),
      finalRuntimeCheckpointIdentityHash:
        continuousCapability.runtimeCheckpointIdentityHash,
      finalFeedbackCheckpointIdentityHash:
        continuousCapability.feedbackCheckpoint.checkpointIdentityHash,
      finalContentSelectionCapabilityIdentityHash:
        continuousContent.capabilityIdentityHash,
      collectionCatalogIdentityHash: continuousContent.collectionCatalogIdentityHash,
      finalRetainedResourceSnapshotIdentityHash:
        retainedResourceIdentityHashV2(finalResources),
      finalStateHash: continuousCapability.runtimeCheckpoint.stateHash,
      validationStatus: 'code-written-not-run' as const,
    });
  } catch (error) {
    primaryFailure = error;
  }

  const released = releaseRestoredRuntimeAndReadSnapshotV2(restored, primaryFailure);
  if (reportCore === null) {
    throw new Error('Arena feedback long restore suffix未生成报告。');
  }
  const completed = Object.freeze({
    ...reportCore,
    restoredRuntimeDestroyed: true as const,
    restoredOwnedResourceCountAfterDestroy: 0 as const,
    restoredCommittedRecordCountAfterDestroy: 0 as const,
    releasedResourceSnapshotIdentityHash: retainedResourceIdentityHashV2(released),
  });
  return Object.freeze({
    ...completed,
    reportIdentityHash: createDeterministicDataHash(
      completed,
      'ArenaThreeModeWeaponFeedbackLongRestoreSuffixReportV2 identity',
    ),
  });
}
