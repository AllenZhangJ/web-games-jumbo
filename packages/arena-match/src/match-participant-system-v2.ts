import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_PARTICIPANT_ROLE_V2,
  createArenaMatchConfigV6,
  type ArenaMatchConfigV6,
  type ArenaMatchParticipantAssignmentV2,
} from './match-config-v6.js';

export const MATCH_PARTICIPANT_RUNTIME_STATUS_V2 = Object.freeze({
  REGISTERED: 'registered',
  ACTIVE: 'active',
  RESPAWNING: 'respawning',
  FINISHED: 'finished',
  ELIMINATED: 'eliminated',
  INACTIVE: 'inactive',
} as const);

export const MATCH_PARTICIPANT_SYSTEM_STATE_V2 = Object.freeze({
  CREATED: 'created',
  ACTIVE: 'active',
  PAUSED: 'paused',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type MatchParticipantRuntimeStatusV2 =
  typeof MATCH_PARTICIPANT_RUNTIME_STATUS_V2[keyof typeof MATCH_PARTICIPANT_RUNTIME_STATUS_V2];
export type MatchParticipantSystemStateV2 =
  typeof MATCH_PARTICIPANT_SYSTEM_STATE_V2[keyof typeof MATCH_PARTICIPANT_SYSTEM_STATE_V2];

export type MatchParticipantTransitionKindV2 =
  | 'activate'
  | 'deactivate'
  | 'begin-respawn'
  | 'complete-respawn'
  | 'finish'
  | 'eliminate';

export interface MatchParticipantTransitionCommandV2 {
  readonly kind: MatchParticipantTransitionKindV2;
  readonly participantId: string;
  readonly slotGeneration: number | null;
}

export interface MatchParticipantSnapshotV2 extends ArenaMatchParticipantAssignmentV2 {
  readonly status: MatchParticipantRuntimeStatusV2;
  readonly runtimeSlotGeneration: number;
  readonly revision: number;
}

export interface MatchParticipantOwnedResourceV2 {
  destroy(): void;
}

export type MatchParticipantResourceFactoryV2 = (
  assignment: ArenaMatchParticipantAssignmentV2,
) => MatchParticipantOwnedResourceV2;

interface ParticipantRuntimeV2 {
  readonly assignment: ArenaMatchParticipantAssignmentV2;
  status: MatchParticipantRuntimeStatusV2;
  runtimeSlotGeneration: number;
  revision: number;
}

interface OwnedResourceRecord {
  readonly participantId: string;
  readonly owner: object;
  readonly destroyMethod: (...args: unknown[]) => unknown;
}

const COMMAND_KEYS = new Set(['kind', 'participantId', 'slotGeneration']);
const COMMAND_KINDS: ReadonlySet<unknown> = new Set([
  'activate',
  'deactivate',
  'begin-respawn',
  'complete-respawn',
  'finish',
  'eliminate',
]);
const MAX_SYNC_RETURN_PROTOTYPE_DEPTH = 32;
const NATIVE_PROMISE_PROTOTYPE = Promise.prototype;
const NATIVE_PROMISE_CONSTRUCTOR = Promise;
const CAPTURED_PROMISE_THEN_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_PROTOTYPE,
  'then',
);
if (CAPTURED_PROMISE_THEN_DESCRIPTOR === undefined
  || !Object.hasOwn(CAPTURED_PROMISE_THEN_DESCRIPTOR, 'value')
  || typeof CAPTURED_PROMISE_THEN_DESCRIPTOR.value !== 'function') {
  throw new TypeError('MatchParticipantSystemV2无法捕获原生Promise.prototype.then。');
}
const NATIVE_PROMISE_THEN = CAPTURED_PROMISE_THEN_DESCRIPTOR.value as (
  ...arguments_: unknown[]
) => unknown;

type MatchParticipantSystemOperationV2 =
  | 'state-read'
  | 'participant-ids-read'
  | 'start'
  | 'pause'
  | 'resume'
  | 'snapshot-read'
  | 'snapshot-list-read'
  | 'apply-transitions'
  | 'destroy';

export const MATCH_PARTICIPANT_SYSTEM_OPERATION_GUARD_V2 = Object.freeze({
  operationGuardPrecedesLifecycleAndInputValidation: true,
  publicReadsRejectParticipantTransactionIntermediateState: true,
  transitionCommitChecksStickyReentryFact: true,
  resourceCleanupWatermarkPrecedesReentryRejection: true,
  swallowedResourceReentryStopsLaterCleanup: true,
  failedCleanupRetainsUnprocessedResourceOwnership: true,
  destroyFastPathChecksOperationBeforeIdempotence: true,
  validationStatus: 'not-run',
} as const);
const NATIVE_PROMISE_THEN_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_THEN_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_THEN_DESCRIPTOR.enumerable,
  writable: CAPTURED_PROMISE_THEN_DESCRIPTOR.writable,
});
const CAPTURED_PROMISE_SPECIES_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  NATIVE_PROMISE_CONSTRUCTOR,
  Symbol.species,
);
if (CAPTURED_PROMISE_SPECIES_DESCRIPTOR === undefined
  || typeof CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get !== 'function'
  || CAPTURED_PROMISE_SPECIES_DESCRIPTOR.set !== undefined) {
  throw new TypeError('MatchParticipantSystemV2无法捕获原生Promise[Symbol.species]。');
}
const NATIVE_PROMISE_SPECIES_GETTER = CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get;
const NATIVE_PROMISE_SPECIES_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.enumerable,
});
const NOOP = (): void => {};

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function staticError(message: string, cause?: unknown): Error {
  const error = new Error(message);
  if (arguments.length > 1) {
    Object.defineProperty(error, 'cause', {
      value: cause,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }
  return error;
}

function findDataMethod(value: unknown, name: string): ((...args: unknown[]) => unknown) | null {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return null;
  const visited = new Set<object>();
  let current: object | null = value as object;
  for (
    let depth = 0;
    current !== null && depth < MAX_SYNC_RETURN_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(current)) throw new TypeError(`${name} prototype 链不能循环。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, name);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name} 必须是数据方法。`);
      }
      return descriptor.value as (...args: unknown[]) => unknown;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  if (current !== null) {
    throw new RangeError(`${name} prototype 链超过 ${MAX_SYNC_RETURN_PROTOTYPE_DEPTH} 层。`);
  }
  return null;
}

function assertNativePromiseIntegrity(): void {
  const thenDescriptor = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then');
  if (thenDescriptor === undefined
    || !Object.hasOwn(thenDescriptor, 'value')
    || thenDescriptor.value !== NATIVE_PROMISE_THEN
    || thenDescriptor.configurable !== NATIVE_PROMISE_THEN_FLAGS.configurable
    || thenDescriptor.enumerable !== NATIVE_PROMISE_THEN_FLAGS.enumerable
    || thenDescriptor.writable !== NATIVE_PROMISE_THEN_FLAGS.writable) {
    throw new TypeError('MatchParticipantSystemV2原生Promise.prototype.then描述符漂移。');
  }
}

function assertNativePromiseSpeciesIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    NATIVE_PROMISE_CONSTRUCTOR,
    Symbol.species,
  );
  if (descriptor === undefined
    || descriptor.get !== NATIVE_PROMISE_SPECIES_GETTER
    || descriptor.set !== undefined
    || descriptor.configurable !== NATIVE_PROMISE_SPECIES_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_SPECIES_FLAGS.enumerable) {
    throw new TypeError('MatchParticipantSystemV2原生Promise[Symbol.species]描述符漂移。');
  }
}

function rejectAsyncSyncReturn(value: unknown, name: string): void {
  assertNativePromiseIntegrity();
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  const visited = new Set<object>();
  let current: object | null = value as object;
  let thenDescriptor: PropertyDescriptor | null = null;
  let constructorDescriptor: PropertyDescriptor | null = null;
  for (
    let depth = 0;
    current !== null && depth < MAX_SYNC_RETURN_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(current)) throw new TypeError(`${name} then prototype 链不能循环。`);
    visited.add(current);
    thenDescriptor ??= Object.getOwnPropertyDescriptor(current, 'then') ?? null;
    constructorDescriptor ??=
      Object.getOwnPropertyDescriptor(current, 'constructor') ?? null;
    current = Object.getPrototypeOf(current) as object | null;
  }
  if (current !== null) {
    throw new RangeError(
      `${name} then prototype 链超过 ${MAX_SYNC_RETURN_PROTOTYPE_DEPTH} 层。`,
    );
  }
  if (constructorDescriptor !== null && !Object.hasOwn(constructorDescriptor, 'value')) {
    throw new TypeError(`${name} 返回了访问器 constructor。`);
  }
  if (constructorDescriptor?.value === NATIVE_PROMISE_CONSTRUCTOR) {
    assertNativePromiseSpeciesIntegrity();
    let nativePromise = false;
    try {
      Reflect.apply(NATIVE_PROMISE_THEN, value, [NOOP, NOOP]);
      nativePromise = true;
    } catch {
      // constructor identity can be spoofed; ordinary thenables stay descriptor-only.
    }
    if (nativePromise) throw staticError(`${name} 必须同步完成。`);
  }
  if (thenDescriptor === null) return;
  if (!Object.hasOwn(thenDescriptor, 'value')) {
    throw new TypeError(`${name} 返回了访问器 thenable。`);
  }
  throw new TypeError(`${name} 返回了 then 字段，必须同步完成。`);
}

function createOwnedResourceRecord(
  candidate: unknown,
  participantId: string,
): OwnedResourceRecord {
  const destroyMethod = findDataMethod(candidate, 'destroy');
  if (destroyMethod === null || candidate === null) {
    throw new TypeError(`participant ${participantId} resource 缺少同步 destroy()。`);
  }
  return Object.freeze({
    participantId,
    owner: candidate as object,
    destroyMethod,
  });
}

function destroyOwnedResource(record: OwnedResourceRecord): void {
  const result = Reflect.apply(record.destroyMethod, record.owner, []);
  rejectAsyncSyncReturn(result, `participant ${record.participantId} destroy()`);
}

function throwConstructionFailure(error: unknown, cleanupErrors: readonly unknown[]): never {
  const failure = staticError('MatchParticipantSystemV2 构造失败。', error);
  Object.defineProperty(failure, 'cleanupErrors', {
    value: Object.freeze([...cleanupErrors]),
    enumerable: false,
    configurable: false,
    writable: false,
  });
  throw failure;
}

function cloneRuntime(runtime: ParticipantRuntimeV2): ParticipantRuntimeV2 {
  return {
    assignment: runtime.assignment,
    status: runtime.status,
    runtimeSlotGeneration: runtime.runtimeSlotGeneration,
    revision: runtime.revision,
  };
}

function createSnapshot(runtime: ParticipantRuntimeV2): MatchParticipantSnapshotV2 {
  return Object.freeze({
    ...runtime.assignment,
    status: runtime.status,
    runtimeSlotGeneration: runtime.runtimeSlotGeneration,
    revision: runtime.revision,
  });
}

function normalizeCommand(value: unknown, index: number): MatchParticipantTransitionCommandV2 {
  const name = `MatchParticipantSystemV2 commands[${index}]`;
  assertKnownKeys(value, COMMAND_KEYS, name);
  for (const key of COMMAND_KEYS) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
  if (!COMMAND_KINDS.has(value.kind)) throw new RangeError(`${name}.kind 不受支持。`);
  return Object.freeze({
    kind: value.kind as MatchParticipantTransitionKindV2,
    participantId: assertNonEmptyString(value.participantId, `${name}.participantId`),
    slotGeneration: value.slotGeneration === null
      ? null
      : assertIntegerAtLeast(value.slotGeneration, 0, `${name}.slotGeneration`),
  });
}

function applyTransition(
  runtime: ParticipantRuntimeV2,
  command: MatchParticipantTransitionCommandV2,
): void {
  const isEnemy = runtime.assignment.modeRole === ARENA_MATCH_PARTICIPANT_ROLE_V2.ENEMY;
  if (isEnemy !== (command.slotGeneration !== null)) {
    throw new RangeError(`${command.participantId} transition slotGeneration 与 role 不一致。`);
  }
  if (isEnemy) {
    const expectedGeneration = command.kind === 'activate'
      && runtime.status === MATCH_PARTICIPANT_RUNTIME_STATUS_V2.INACTIVE
      ? runtime.runtimeSlotGeneration + 1
      : runtime.runtimeSlotGeneration;
    if (!Number.isSafeInteger(expectedGeneration) || command.slotGeneration !== expectedGeneration) {
      throw new RangeError(`${command.participantId} slot generation 不连续。`);
    }
  }
  const transitions: Readonly<Record<
    MatchParticipantTransitionKindV2,
    readonly MatchParticipantRuntimeStatusV2[]
  >> = {
    activate: [
      MATCH_PARTICIPANT_RUNTIME_STATUS_V2.REGISTERED,
      MATCH_PARTICIPANT_RUNTIME_STATUS_V2.INACTIVE,
    ],
    deactivate: [MATCH_PARTICIPANT_RUNTIME_STATUS_V2.ACTIVE],
    'begin-respawn': [MATCH_PARTICIPANT_RUNTIME_STATUS_V2.ACTIVE],
    'complete-respawn': [MATCH_PARTICIPANT_RUNTIME_STATUS_V2.RESPAWNING],
    finish: [
      MATCH_PARTICIPANT_RUNTIME_STATUS_V2.ACTIVE,
      MATCH_PARTICIPANT_RUNTIME_STATUS_V2.RESPAWNING,
    ],
    eliminate: [
      MATCH_PARTICIPANT_RUNTIME_STATUS_V2.ACTIVE,
      MATCH_PARTICIPANT_RUNTIME_STATUS_V2.RESPAWNING,
    ],
  };
  if (!transitions[command.kind].includes(runtime.status)) {
    throw new Error(
      `${command.participantId} 不能从 ${runtime.status} 执行 ${command.kind}。`,
    );
  }
  if (command.kind === 'begin-respawn' || command.kind === 'complete-respawn') {
    if (isEnemy) throw new RangeError('enemy participant 不能进入通用 respawn 状态。');
  }
  if (command.kind === 'deactivate' && !isEnemy) {
    throw new RangeError('只有 enemy participant 可以 deactivate。');
  }
  if (command.kind === 'activate') {
    runtime.status = MATCH_PARTICIPANT_RUNTIME_STATUS_V2.ACTIVE;
    if (isEnemy) runtime.runtimeSlotGeneration = command.slotGeneration as number;
  } else if (command.kind === 'deactivate') {
    runtime.status = MATCH_PARTICIPANT_RUNTIME_STATUS_V2.INACTIVE;
  } else if (command.kind === 'begin-respawn') {
    runtime.status = MATCH_PARTICIPANT_RUNTIME_STATUS_V2.RESPAWNING;
  } else if (command.kind === 'complete-respawn') {
    runtime.status = MATCH_PARTICIPANT_RUNTIME_STATUS_V2.ACTIVE;
  } else if (command.kind === 'finish') {
    runtime.status = MATCH_PARTICIPANT_RUNTIME_STATUS_V2.FINISHED;
  } else {
    runtime.status = MATCH_PARTICIPANT_RUNTIME_STATUS_V2.ELIMINATED;
  }
  runtime.revision += 1;
}

export class MatchParticipantSystemV2 {
  readonly #config: ArenaMatchConfigV6;
  readonly #participantIds: readonly string[];
  readonly #participants: Map<string, ParticipantRuntimeV2>;
  readonly #resources: Array<OwnedResourceRecord | null>;
  #state: MatchParticipantSystemStateV2 = MATCH_PARTICIPANT_SYSTEM_STATE_V2.CREATED;
  #operation: MatchParticipantSystemOperationV2 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(
    config: unknown,
    resourceFactory: MatchParticipantResourceFactoryV2 = () => ({ destroy() {} }),
  ) {
    if (typeof resourceFactory !== 'function') {
      throw new TypeError('MatchParticipantSystemV2 resourceFactory 必须是函数。');
    }
    this.#config = createArenaMatchConfigV6(config);
    this.#participantIds = Object.freeze(
      this.#config.participantAssignments.map(({ participantId }) => participantId),
    );
    this.#participants = new Map(this.#config.participantAssignments.map((assignment) => [
      assignment.participantId,
      {
        assignment,
        status: MATCH_PARTICIPANT_RUNTIME_STATUS_V2.REGISTERED,
        runtimeSlotGeneration: assignment.slotGeneration,
        revision: 0,
      },
    ]));
    this.#resources = [];
    try {
      for (const assignment of this.#config.participantAssignments) {
        let candidate: unknown;
        try {
          candidate = resourceFactory(assignment);
          rejectAsyncSyncReturn(
            candidate,
            `participant ${assignment.participantId} resourceFactory`,
          );
          this.#resources.push(createOwnedResourceRecord(candidate, assignment.participantId));
        } catch (error) {
          const cleanupErrors: unknown[] = [];
          if (candidate !== undefined) {
            try {
              const candidateRecord = createOwnedResourceRecord(candidate, assignment.participantId);
              destroyOwnedResource(candidateRecord);
            } catch (cleanupError) {
              cleanupErrors.push(cleanupError);
            }
          }
          for (let index = this.#resources.length - 1; index >= 0; index -= 1) {
            const resource = this.#resources[index];
            if (resource === null || resource === undefined) continue;
            try {
              destroyOwnedResource(resource);
            } catch (cleanupError) {
              cleanupErrors.push(cleanupError);
            }
          }
          throwConstructionFailure(error, cleanupErrors);
        }
      }
    } catch (error) {
      this.#participants.clear();
      this.#resources.length = 0;
      throw error;
    }
  }

  get state(): MatchParticipantSystemStateV2 {
    return this.#runOperation('state-read', () => this.#state, {
      allowDestroyed: true,
      allowFailed: true,
    });
  }

  get participantIds(): readonly string[] {
    return this.#runOperation('participant-ids-read', () => this.#participantIds);
  }

  #recordReentry(requestedOperation: MatchParticipantSystemOperationV2): Error {
    this.#reentrySequence += 1;
    if (this.#reentryError === null) {
      this.#reentryError = new Error(
        `MatchParticipantSystemV2 ${String(this.#operation)}期间不可重入${requestedOperation}。`,
      );
    }
    return this.#reentryError;
  }

  #assertReentryFree(sequence: number, operation: string): void {
    if (this.#reentrySequence === sequence) return;
    throw this.#reentryError
      ?? new Error(`MatchParticipantSystemV2 ${operation}期间发生重入。`);
  }

  #runOperation<T>(
    operation: MatchParticipantSystemOperationV2,
    callback: () => T,
    options: Readonly<{ allowDestroyed?: boolean; allowFailed?: boolean }> = {},
  ): T {
    if (this.#operation !== null) throw this.#recordReentry(operation);
    this.#operation = operation;
    const sequence = this.#reentrySequence;
    try {
      if (!options.allowDestroyed && this.#state === MATCH_PARTICIPANT_SYSTEM_STATE_V2.DESTROYED) {
        throw new Error('MatchParticipantSystemV2 已销毁。');
      }
      if (!options.allowFailed && this.#state === MATCH_PARTICIPANT_SYSTEM_STATE_V2.FAILED) {
        throw new Error('MatchParticipantSystemV2 已失败关闭。');
      }
      try {
        const result = callback();
        this.#assertReentryFree(sequence, operation);
        return result;
      } catch (error) {
        if (
          operation === 'apply-transitions'
          && this.#reentrySequence !== sequence
        ) this.#state = MATCH_PARTICIPANT_SYSTEM_STATE_V2.FAILED;
        throw error;
      }
    } finally {
      this.#operation = null;
      this.#reentryError = null;
    }
  }

  #assertTransitionCommitReady(): void {
    if (this.#reentryError !== null) {
      this.#state = MATCH_PARTICIPANT_SYSTEM_STATE_V2.FAILED;
      throw this.#reentryError;
    }
    if (this.#operation !== 'apply-transitions') {
      throw new Error('MatchParticipantSystemV2 transition缺少权威操作所有权。');
    }
  }

  start(): void {
    this.#runOperation('start', () => {
      if (this.#state !== MATCH_PARTICIPANT_SYSTEM_STATE_V2.CREATED) {
        throw new Error('MatchParticipantSystemV2 只能从 created 启动。');
      }
      this.#state = MATCH_PARTICIPANT_SYSTEM_STATE_V2.ACTIVE;
    });
  }

  pause(): void {
    this.#runOperation('pause', () => {
      if (this.#state !== MATCH_PARTICIPANT_SYSTEM_STATE_V2.ACTIVE) {
        throw new Error('MatchParticipantSystemV2 只能从 active 暂停。');
      }
      this.#state = MATCH_PARTICIPANT_SYSTEM_STATE_V2.PAUSED;
    });
  }

  resume(): void {
    this.#runOperation('resume', () => {
      if (this.#state !== MATCH_PARTICIPANT_SYSTEM_STATE_V2.PAUSED) {
        throw new Error('MatchParticipantSystemV2 只能从 paused 恢复。');
      }
      this.#state = MATCH_PARTICIPANT_SYSTEM_STATE_V2.ACTIVE;
    });
  }

  getSnapshot(participantId: unknown): MatchParticipantSnapshotV2 {
    return this.#runOperation('snapshot-read', () => {
      const id = assertNonEmptyString(participantId, 'participantId');
      const runtime = this.#participants.get(id);
      if (!runtime) throw new RangeError(`未知 participant ${id}。`);
      return createSnapshot(runtime);
    });
  }

  listSnapshots(): readonly MatchParticipantSnapshotV2[] {
    return this.#runOperation('snapshot-list-read', () => Object.freeze(
      this.#participantIds.map((id) => {
        const runtime = this.#participants.get(id);
        if (!runtime) throw new Error(`participant ${id} runtime 缺失。`);
        return createSnapshot(runtime);
      }),
    ));
  }

  applyTransitions(value: unknown): readonly MatchParticipantSnapshotV2[] {
    return this.#runOperation('apply-transitions', () => {
      if (this.#state !== MATCH_PARTICIPANT_SYSTEM_STATE_V2.ACTIVE) {
        throw new Error('MatchParticipantSystemV2 只在 active 状态接受 transition。');
      }
      const source = cloneFrozenData(value, 'MatchParticipantSystemV2 commands');
      if (!Array.isArray(source) || source.length === 0) {
        throw new RangeError('MatchParticipantSystemV2 commands 必须是非空数组。');
      }
      const commands = source.map(normalizeCommand).sort(
        (left, right) => compareText(left.participantId, right.participantId),
      );
      if (new Set(commands.map(({ participantId }) => participantId)).size !== commands.length) {
        throw new RangeError('每个 participant 每批最多一个 transition。');
      }
      const candidates = new Map<string, ParticipantRuntimeV2>();
      for (const command of commands) {
        const current = this.#participants.get(command.participantId);
        if (!current) throw new RangeError(`未知 participant ${command.participantId}。`);
        const candidate = cloneRuntime(current);
        applyTransition(candidate, command);
        candidates.set(command.participantId, candidate);
      }
      this.#assertTransitionCommitReady();
      for (const [participantId, candidate] of candidates) {
        this.#participants.set(participantId, candidate);
      }
      return Object.freeze(commands.map(({ participantId }) => {
        const runtime = this.#participants.get(participantId);
        if (!runtime) throw new Error(`participant ${participantId} commit 丢失。`);
        return createSnapshot(runtime);
      }));
    });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      if (this.#state === MATCH_PARTICIPANT_SYSTEM_STATE_V2.DESTROYED) return;
      const errors: unknown[] = [];
      for (let index = this.#resources.length - 1; index >= 0; index -= 1) {
        const resource = this.#resources[index];
        if (resource === null || resource === undefined) continue;
        const sequence = this.#reentrySequence;
        try {
          destroyOwnedResource(resource);
          this.#resources[index] = null;
          this.#assertReentryFree(sequence, `resource ${resource.participantId} 清理`);
        } catch (error) {
          errors.push(error);
          if (this.#reentrySequence !== sequence) break;
        }
      }
      if (errors.length > 0 || this.#reentryError !== null) {
        this.#state = MATCH_PARTICIPANT_SYSTEM_STATE_V2.FAILED;
        const failure = staticError(
          'MatchParticipantSystemV2 清理未完整完成。',
          this.#reentryError ?? errors[0],
        );
        Object.defineProperty(failure, 'cleanupErrors', {
          value: Object.freeze(errors),
          enumerable: false,
        });
        throw failure;
      }
      this.#participants.clear();
      this.#state = MATCH_PARTICIPANT_SYSTEM_STATE_V2.DESTROYED;
    }, { allowDestroyed: true, allowFailed: true });
  }
}
