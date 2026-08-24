import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  createMatchContentSelectionV2,
  createMatchRosterAssignmentV2,
  finalizeMatchParticipantAssignmentV2,
  type DeepReadonly,
  type FinalizedMatchAssignmentV2,
  type MatchContentSelectionV2,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  MODE_MATCH_ASSIGNMENT_PLAN_V2_SCHEMA_VERSION,
  createModeMatchAssignmentPlanV2,
  type ModeMatchAssignmentPlanV2,
} from '@number-strategy-jump/arena-matchmaking';
import {
  ModeAuthoritativeLocalMatchSessionV3,
  type ModeAuthoritativeMatchRuntimeV3,
} from '@number-strategy-jump/arena-session';

export interface ModeAuthoritativeQuickMatchV3 {
  readonly modeDefinitionId: string;
  readonly matchSeed: number;
  readonly assignmentPlan: ModeMatchAssignmentPlanV2;
  readonly selection: MatchContentSelectionV2;
  readonly finalAssignment: FinalizedMatchAssignmentV2;
  readonly session: ModeAuthoritativeLocalMatchSessionV3;
}

export interface ModeAuthoritativeQuickMatchServiceV3Options {
  readonly seedSource: unknown;
  readonly rosterProvider: unknown;
  readonly contentProvider: unknown;
  readonly runtimeFactory: unknown;
}

export const MODE_AUTHORITATIVE_QUICK_MATCH_SERVICE_V3_LIFECYCLE_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  createGuardPrecedesRequestValidation: true,
  seedRosterContentAndRuntimePortsCheckedBeforeNextOwner: true,
  createdSessionRetainsCleanupOwnershipUntilSafeReturn: true,
  swallowedPortOrCleanupReentryRejectsCreate: true,
  stickyReentryUsesMonotonicSequenceAndFirstError: true,
  failedConstructionCleanupRetainsRetryOwnership: true,
  cleanupReentryRetainsCurrentAndLaterQuickMatchOwners: true,
  validationStatus: 'not-run',
} as const);

type PortMethod = (...arguments_: readonly unknown[]) => unknown;
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
  throw new TypeError('ModeAuthoritativeQuickMatchServiceV3无法捕获原生Promise.prototype.then。');
}
const NATIVE_PROMISE_THEN = CAPTURED_PROMISE_THEN_DESCRIPTOR.value as (
  ...arguments_: unknown[]
) => unknown;
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
  throw new TypeError('ModeAuthoritativeQuickMatchServiceV3无法捕获原生Promise[Symbol.species]。');
}
const NATIVE_PROMISE_SPECIES_GETTER = CAPTURED_PROMISE_SPECIES_DESCRIPTOR.get;
const NATIVE_PROMISE_SPECIES_FLAGS = Object.freeze({
  configurable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.configurable,
  enumerable: CAPTURED_PROMISE_SPECIES_DESCRIPTOR.enumerable,
});
const NOOP = (): void => {};
const OPTION_KEYS = new Set(['seedSource', 'rosterProvider', 'contentProvider', 'runtimeFactory']);
const CREATE_KEYS = new Set(['modeDefinitionId']);

function wrapped(value: unknown, message: string): Error {
  const error = new Error(message);
  Object.defineProperty(error, 'cause', {
    value,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return error;
}

function requireKeys(value: PlainRecord, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少字段${key}。`);
  }
}

function method(target: unknown, key: string, name: string): PortMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${name}.${key}()不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNC_RETURN_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(cursor)) throw new TypeError(`${name}原型链循环。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是数据方法。`);
      }
      const value = descriptor.value as PortMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(value, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  if (cursor !== null) {
    throw new RangeError(`${name}原型链超过${MAX_SYNC_RETURN_PROTOTYPE_DEPTH}层。`);
  }
  throw new TypeError(`${name}.${key}()不存在。`);
}

function assertNativePromiseIntegrity(): void {
  const descriptor = Object.getOwnPropertyDescriptor(NATIVE_PROMISE_PROTOTYPE, 'then');
  if (descriptor === undefined
    || !Object.hasOwn(descriptor, 'value')
    || descriptor.value !== NATIVE_PROMISE_THEN
    || descriptor.configurable !== NATIVE_PROMISE_THEN_FLAGS.configurable
    || descriptor.enumerable !== NATIVE_PROMISE_THEN_FLAGS.enumerable
    || descriptor.writable !== NATIVE_PROMISE_THEN_FLAGS.writable) {
    throw new TypeError(
      'ModeAuthoritativeQuickMatchServiceV3原生Promise.prototype.then描述符漂移。',
    );
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
    throw new TypeError(
      'ModeAuthoritativeQuickMatchServiceV3原生Promise[Symbol.species]描述符漂移。',
    );
  }
}

function synchronous<T>(value: T, name: string): T {
  assertNativePromiseIntegrity();
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return value;
  const visited = new Set<object>();
  let cursor: object | null = value as object;
  let thenDescriptor: PropertyDescriptor | null = null;
  let constructorDescriptor: PropertyDescriptor | null = null;
  for (
    let depth = 0;
    cursor !== null && depth < MAX_SYNC_RETURN_PROTOTYPE_DEPTH;
    depth += 1
  ) {
    if (visited.has(cursor)) throw new TypeError(`${name}返回值原型链循环。`);
    visited.add(cursor);
    thenDescriptor ??= Object.getOwnPropertyDescriptor(cursor, 'then') ?? null;
    constructorDescriptor ??=
      Object.getOwnPropertyDescriptor(cursor, 'constructor') ?? null;
    cursor = Object.getPrototypeOf(cursor);
  }
  if (cursor !== null) {
    throw new RangeError(`${name}返回值原型链超过${MAX_SYNC_RETURN_PROTOTYPE_DEPTH}层。`);
  }
  if (constructorDescriptor !== null && !Object.hasOwn(constructorDescriptor, 'value')) {
    throw new TypeError(`${name}返回访问器constructor。`);
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
    if (nativePromise) throw new TypeError(`${name}必须同步完成。`);
  }
  if (thenDescriptor === null) return value;
  if (!Object.hasOwn(thenDescriptor, 'value')) {
    throw new TypeError(`${name}返回访问器thenable。`);
  }
  throw new TypeError(`${name}返回then字段，必须同步完成。`);
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffff_ffff) {
    throw new RangeError(`${name}必须是uint32。`);
  }
  return value as number;
}

interface PendingCleanupResource {
  readonly target: unknown;
  readonly name: string;
}

/**
 * Quick Match V3 transfers one owner containing world + Bot controllers into
 * the Session. It deliberately has no sibling controllerFactory, preventing
 * same-tick supply ordering and controller checkpoint state from splitting.
 */
export class ModeAuthoritativeQuickMatchServiceV3 {
  readonly #nextSeed: PortMethod;
  readonly #createRoster: PortMethod;
  readonly #createContent: PortMethod;
  readonly #createRuntime: PortMethod;
  #operation: 'create' | 'destroy' | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #pendingCleanupResources: PendingCleanupResource[] = [];
  #destroyed = false;

  constructor(options: ModeAuthoritativeQuickMatchServiceV3Options);
  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'ModeAuthoritativeQuickMatchServiceV3 options');
    assertKnownKeys(source, OPTION_KEYS, 'ModeAuthoritativeQuickMatchServiceV3 options');
    requireKeys(source, OPTION_KEYS, 'ModeAuthoritativeQuickMatchServiceV3 options');
    this.#nextSeed = method(
      source.seedSource,
      'nextSeed',
      'ModeAuthoritativeQuickMatchServiceV3 seedSource',
    );
    this.#createRoster = method(
      source.rosterProvider,
      'createRoster',
      'ModeAuthoritativeQuickMatchServiceV3 rosterProvider',
    );
    this.#createContent = method(
      source.contentProvider,
      'createContent',
      'ModeAuthoritativeQuickMatchServiceV3 contentProvider',
    );
    this.#createRuntime = method(
      source.runtimeFactory,
      'createRuntime',
      'ModeAuthoritativeQuickMatchServiceV3 runtimeFactory',
    );
  }

  #rejectReentry(operation: string): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `ModeAuthoritativeQuickMatchServiceV3操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) this.#rejectReentry(operation);
  }

  #beginOperation(operation: 'create' | 'destroy'): number {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    return this.#reentrySequence;
  }

  #assertCurrentOperationCommit(operation: string): void {
    if (this.#operation === null) throw new Error(`${operation}缺少当前操作所有权。`);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #callChecked(methodValue: PortMethod, arguments_: readonly unknown[], name: string): unknown {
    try {
      const result = synchronous(methodValue(...arguments_), name);
      this.#assertCurrentOperationCommit(name);
      return result;
    } catch (error) {
      this.#assertCurrentOperationCommit(name);
      throw error;
    }
  }

  #retainCleanupResource(target: unknown, name: string): void {
    if (this.#pendingCleanupResources.some((resource) => Object.is(resource.target, target))) return;
    this.#pendingCleanupResources.push(Object.freeze({ target, name }));
  }

  #destroyChecked(target: unknown, name: string): Error[] {
    try {
      const destroy = method(target, 'destroy', name);
      this.#assertCurrentOperationCommit(`${name}.destroy端口捕获`);
      this.#callChecked(destroy, [], `${name}.destroy`);
      return [];
    } catch (error) {
      try {
        this.#assertCurrentOperationCommit(`${name}.destroy失败`);
      } catch (reentryError) {
        return [wrapped(reentryError, `${name}清理反调。`)];
      }
      return [wrapped(error, `${name}清理失败。`)];
    }
  }

  #releaseOrRetain(target: unknown, name: string): Error[] {
    const errors = this.#destroyChecked(target, name);
    if (errors.length > 0) this.#retainCleanupResource(target, name);
    return errors;
  }

  #releasePendingCleanupResources(): Error[] {
    const errors: Error[] = [];
    const retained: PendingCleanupResource[] = [];
    const pending = this.#pendingCleanupResources;
    for (let index = 0; index < pending.length; index += 1) {
      const resource = pending[index]!;
      const resourceErrors = this.#destroyChecked(resource.target, resource.name);
      if (resourceErrors.length > 0) {
        retained.push(resource);
        errors.push(...resourceErrors);
      }
      this.#pendingCleanupResources = [...retained, ...pending.slice(index + 1)];
      if (this.#reentryError !== null) return errors;
    }
    this.#pendingCleanupResources = retained;
    return errors;
  }

  create(value: unknown): DeepReadonly<ModeAuthoritativeQuickMatchV3> {
    const reentrySequence = this.#beginOperation('create');
    let modeDefinitionId: string;
    try {
      if (this.#destroyed) throw new Error('ModeAuthoritativeQuickMatchServiceV3已销毁。');
      const source = assertPlainRecord(
        value,
        'ModeAuthoritativeQuickMatchServiceV3 create options',
      );
      assertKnownKeys(source, CREATE_KEYS, 'ModeAuthoritativeQuickMatchServiceV3 create options');
      requireKeys(source, CREATE_KEYS, 'ModeAuthoritativeQuickMatchServiceV3 create options');
      modeDefinitionId = assertNonEmptyString(
        source.modeDefinitionId,
        'ModeAuthoritativeQuickMatchServiceV3.modeDefinitionId',
      );
      this.#assertCurrentOperationCommit('ModeAuthoritativeQuickMatchServiceV3 request validation');
    } catch (error) {
      this.#operation = null;
      throw error;
    }
    let runtime: unknown = null;
    let session: ModeAuthoritativeLocalMatchSessionV3 | null = null;
    try {
      const priorCleanupErrors = this.#releasePendingCleanupResources();
      if (priorCleanupErrors.length > 0) {
        throw new AggregateError(
          priorCleanupErrors,
          'ModeAuthoritativeQuickMatchServiceV3历史资源清理不完整。',
        );
      }
      const seedValue = this.#callChecked(
        this.#nextSeed,
        [],
        'ModeAuthoritativeQuickMatchServiceV3 seedSource',
      );
      const matchSeed = uint32(
        seedValue,
        'ModeAuthoritativeQuickMatchServiceV3 matchSeed',
      );
      const rosterValue = this.#callChecked(
        this.#createRoster,
        [{ modeDefinitionId, matchSeed }],
        'ModeAuthoritativeQuickMatchServiceV3 rosterProvider',
      );
      const roster = createMatchRosterAssignmentV2(rosterValue);
      this.#assertCurrentOperationCommit('ModeAuthoritativeQuickMatchServiceV3 roster normalization');
      if (roster.modeDefinitionId !== modeDefinitionId) {
        throw new RangeError('ModeAuthoritativeQuickMatchServiceV3 roster Mode身份漂移。');
      }
      const assignmentPlan = createModeMatchAssignmentPlanV2({
        schemaVersion: MODE_MATCH_ASSIGNMENT_PLAN_V2_SCHEMA_VERSION,
        matchSeed,
        roster,
      });
      const contentValue = this.#callChecked(
        this.#createContent,
        [{
          modeDefinitionId,
          matchSeed,
          roster,
          seeds: assignmentPlan.seeds,
        }],
        'ModeAuthoritativeQuickMatchServiceV3 contentProvider',
      );
      const selection = createMatchContentSelectionV2(contentValue);
      this.#assertCurrentOperationCommit('ModeAuthoritativeQuickMatchServiceV3 content normalization');
      const finalAssignment = finalizeMatchParticipantAssignmentV2({ roster, content: selection });
      const humans = finalAssignment.participants.filter(
        ({ controllerKind }) => controllerKind === 'human',
      );
      if (humans.length !== 1) {
        throw new RangeError('ModeAuthoritativeQuickMatchServiceV3本地模式必须精确包含1名human。');
      }
      runtime = this.#callChecked(
        this.#createRuntime,
        [{
          modeDefinitionId,
          matchSeed,
          assignmentPlan,
          selection,
          finalAssignment,
          localParticipantId: humans[0]!.participantId,
        }],
        'ModeAuthoritativeQuickMatchServiceV3 runtimeFactory',
      );
      const transferred = runtime as ModeAuthoritativeMatchRuntimeV3;
      session = new ModeAuthoritativeLocalMatchSessionV3({
        runtime: transferred,
        modeDefinitionId,
        participantIds: finalAssignment.participants.map(({ participantId }) => participantId),
        localParticipantId: humans[0]!.participantId,
      });
      runtime = null;
      this.#assertCurrentOperationCommit('ModeAuthoritativeQuickMatchServiceV3 session construction');
      const result = Object.freeze({
        modeDefinitionId,
        matchSeed,
        assignmentPlan,
        selection,
        finalAssignment,
        session,
      }) as DeepReadonly<ModeAuthoritativeQuickMatchV3>;
      this.#assertCurrentOperationCommit('ModeAuthoritativeQuickMatchServiceV3 result publication');
      session = null;
      return result;
    } catch (error) {
      const cleanupErrors: Error[] = [];
      const cleanupCandidates = session !== null
        ? [Object.freeze({
          target: session,
          name: 'ModeAuthoritativeQuickMatchServiceV3 session',
        })]
        : runtime === null
          ? []
          : [Object.freeze({
            target: runtime,
            name: 'ModeAuthoritativeQuickMatchServiceV3 runtime',
          })];
      if (this.#reentryError !== null) {
        for (const candidate of cleanupCandidates) {
          this.#retainCleanupResource(candidate.target, candidate.name);
        }
      } else {
        for (const candidate of cleanupCandidates) {
          cleanupErrors.push(...this.#releaseOrRetain(candidate.target, candidate.name));
          if (this.#reentryError !== null) break;
        }
      }
      if (
        this.#reentrySequence !== reentrySequence
        && this.#reentryError !== null
        && !cleanupErrors.includes(this.#reentryError)
      ) cleanupErrors.push(this.#reentryError);
      const failure = wrapped(error, 'ModeAuthoritativeQuickMatchServiceV3创建失败。');
      if (cleanupErrors.length > 0) {
        const combined = new Error(
          'ModeAuthoritativeQuickMatchServiceV3创建失败且清理不完整。',
        ) as Error & { originalError: Error; cleanupErrors: readonly Error[] };
        combined.originalError = failure;
        combined.cleanupErrors = Object.freeze(cleanupErrors);
        throw combined;
      }
      throw failure;
    } finally {
      this.#operation = null;
    }
  }

  destroy(): void {
    this.#beginOperation('destroy');
    try {
      if (this.#destroyed && this.#pendingCleanupResources.length === 0) return;
      const cleanupErrors = this.#releasePendingCleanupResources();
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          cleanupErrors,
          'ModeAuthoritativeQuickMatchServiceV3销毁清理不完整。',
        );
      }
      this.#destroyed = true;
    } finally {
      this.#operation = null;
    }
  }
}
