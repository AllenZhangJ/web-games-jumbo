import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  assertSynchronousReturn,
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
  ModeLocalMatchSessionV2,
  type ModeInputControllerBindingV2,
  type ModeMatchRuntimeV2,
} from '@number-strategy-jump/arena-session';

export interface ModeQuickMatchV2 {
  readonly modeDefinitionId: string;
  readonly matchSeed: number;
  readonly assignmentPlan: ModeMatchAssignmentPlanV2;
  readonly selection: MatchContentSelectionV2;
  readonly finalAssignment: FinalizedMatchAssignmentV2;
  readonly session: ModeLocalMatchSessionV2;
}

export interface ModeQuickMatchServiceV2Options {
  readonly seedSource: unknown;
  readonly rosterProvider: unknown;
  readonly contentProvider: unknown;
  readonly runtimeFactory: unknown;
  readonly controllerFactory: unknown;
}

export const MODE_QUICK_MATCH_SERVICE_V2_LIFECYCLE_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  operationGuardPrecedesRequestValidation: true,
  seedRosterContentRuntimeAndControllerPortsCheckedBeforeNextOwner: true,
  sessionConstructionOwnsTransferredRuntimeAndControllersOnEntry: true,
  stickyReentryUsesMonotonicSequenceAndFirstError: true,
  failedConstructionCleanupRetainsRetryOwnership: true,
  cleanupReentryRetainsCurrentAndLaterQuickMatchOwners: true,
  validationStatus: 'not-run',
} as const);

type PortMethod = (...arguments_: readonly unknown[]) => unknown;
interface PendingCleanupResource {
  readonly target: unknown;
  readonly name: string;
}

const OPTION_KEYS = new Set([
  'seedSource', 'rosterProvider', 'contentProvider', 'runtimeFactory', 'controllerFactory',
]);
const CREATE_KEYS = new Set(['modeDefinitionId']);

function safelyWrapThrownError(value: unknown, message: string): Error {
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

function dataMethod(target: unknown, methodName: string, ownerName: string): PortMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${ownerName}.${methodName}()不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${ownerName}原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, methodName);
    if (descriptor) {
      if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
        throw new TypeError(`${ownerName}.${methodName}必须是数据方法。`);
      }
      const method = descriptor.value as PortMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(method, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`${ownerName}.${methodName}()不存在。`);
}

function assertSynchronous<T>(value: T, name: string): T {
  assertSynchronousReturn(value, name);
  return value;
}

function uint32(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name}必须是uint32。`);
  }
  return value as number;
}

export class ModeQuickMatchServiceV2 {
  readonly #nextSeed: PortMethod;
  readonly #createRoster: PortMethod;
  readonly #createContent: PortMethod;
  readonly #createRuntime: PortMethod;
  readonly #createController: PortMethod;
  #operation: 'create' | 'destroy' | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #pendingCleanupResources: PendingCleanupResource[] = [];
  #destroyed = false;

  constructor(options: ModeQuickMatchServiceV2Options);
  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'ModeQuickMatchServiceV2 options');
    assertKnownKeys(source, OPTION_KEYS, 'ModeQuickMatchServiceV2 options');
    requireKeys(source, OPTION_KEYS, 'ModeQuickMatchServiceV2 options');
    this.#nextSeed = dataMethod(source.seedSource, 'nextSeed', 'ModeQuickMatchServiceV2 seedSource');
    this.#createRoster = dataMethod(
      source.rosterProvider,
      'createRoster',
      'ModeQuickMatchServiceV2 rosterProvider',
    );
    this.#createContent = dataMethod(
      source.contentProvider,
      'createContent',
      'ModeQuickMatchServiceV2 contentProvider',
    );
    this.#createRuntime = dataMethod(
      source.runtimeFactory,
      'createRuntime',
      'ModeQuickMatchServiceV2 runtimeFactory',
    );
    this.#createController = dataMethod(
      source.controllerFactory,
      'createController',
      'ModeQuickMatchServiceV2 controllerFactory',
    );
  }

  #rejectReentry(operation: 'create' | 'destroy'): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `ModeQuickMatchServiceV2操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #beginOperation(operation: 'create' | 'destroy'): number {
    if (this.#operation !== null) this.#rejectReentry(operation);
    this.#operation = operation;
    this.#reentryError = null;
    return this.#reentrySequence;
  }

  #assertCurrentOperationCommit(operation: string): void {
    if (this.#operation === null) throw new Error(`${operation}缺少当前操作所有权。`);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #callChecked(method: PortMethod, arguments_: readonly unknown[], name: string): unknown {
    try {
      const result = assertSynchronous(method(...arguments_), name);
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
      const destroy = dataMethod(target, 'destroy', name);
      this.#assertCurrentOperationCommit(`${name}.destroy端口捕获`);
      this.#callChecked(destroy, [], `${name}.destroy`);
      return [];
    } catch (error) {
      try {
        this.#assertCurrentOperationCommit(`${name}.destroy失败`);
      } catch (reentryError) {
        return [safelyWrapThrownError(reentryError, `${name}清理反调。`)];
      }
      return [safelyWrapThrownError(error, `${name}清理失败。`)];
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

  create(value: unknown): DeepReadonly<ModeQuickMatchV2> {
    const reentrySequence = this.#beginOperation('create');
    let modeDefinitionId: string;
    try {
      if (this.#destroyed) throw new Error('ModeQuickMatchServiceV2已销毁。');
      const source = assertPlainRecord(value, 'ModeQuickMatchServiceV2 create options');
      assertKnownKeys(source, CREATE_KEYS, 'ModeQuickMatchServiceV2 create options');
      requireKeys(source, CREATE_KEYS, 'ModeQuickMatchServiceV2 create options');
      modeDefinitionId = assertNonEmptyString(
        source.modeDefinitionId,
        'ModeQuickMatchServiceV2.modeDefinitionId',
      );
      this.#assertCurrentOperationCommit('ModeQuickMatchServiceV2 request validation');
    } catch (error) {
      this.#operation = null;
      throw error;
    }
    let runtime: unknown = null;
    const controllerResources: unknown[] = [];
    let session: ModeLocalMatchSessionV2 | null = null;
    try {
      const priorCleanupErrors = this.#releasePendingCleanupResources();
      if (priorCleanupErrors.length > 0) {
        throw new AggregateError(priorCleanupErrors, 'ModeQuickMatchServiceV2历史资源清理不完整。');
      }
      const matchSeed = uint32(
        this.#callChecked(this.#nextSeed, [], 'ModeQuickMatchServiceV2 seedSource'),
        'ModeQuickMatchServiceV2 matchSeed',
      );
      const roster = createMatchRosterAssignmentV2(this.#callChecked(
        this.#createRoster,
        [{ modeDefinitionId, matchSeed }],
        'ModeQuickMatchServiceV2 rosterProvider',
      ));
      this.#assertCurrentOperationCommit('ModeQuickMatchServiceV2 roster normalization');
      if (roster.modeDefinitionId !== modeDefinitionId) {
        throw new RangeError('ModeQuickMatchServiceV2 roster Mode身份漂移。');
      }
      const assignmentPlan = createModeMatchAssignmentPlanV2({
        schemaVersion: MODE_MATCH_ASSIGNMENT_PLAN_V2_SCHEMA_VERSION,
        matchSeed,
        roster,
      });
      const selection = createMatchContentSelectionV2(this.#callChecked(
        this.#createContent,
        [{
          modeDefinitionId,
          matchSeed,
          roster,
          seeds: assignmentPlan.seeds,
        }],
        'ModeQuickMatchServiceV2 contentProvider',
      ));
      this.#assertCurrentOperationCommit('ModeQuickMatchServiceV2 content normalization');
      const finalAssignment = finalizeMatchParticipantAssignmentV2({ roster, content: selection });
      const humans = finalAssignment.participants.filter(
        ({ controllerKind }) => controllerKind === 'human',
      );
      if (humans.length !== 1) {
        throw new RangeError('ModeQuickMatchServiceV2本地模式必须精确包含1名human。');
      }
      runtime = this.#callChecked(
        this.#createRuntime,
        [{
          modeDefinitionId,
          matchSeed,
          assignmentPlan,
          selection,
          finalAssignment,
        }],
        'ModeQuickMatchServiceV2 runtimeFactory',
      );
      const seedByParticipant = new Map(
        assignmentPlan.seeds.controllers.map(({ participantId, seed }) => [participantId, seed]),
      );
      const controllers: ModeInputControllerBindingV2[] = [];
      for (const participant of finalAssignment.participants) {
        if (participant.participantId === humans[0]!.participantId) continue;
        const seed = seedByParticipant.get(participant.participantId);
        if (seed === undefined) {
          throw new RangeError(`ModeQuickMatchServiceV2缺少controller seed ${participant.participantId}。`);
        }
        const controller = this.#callChecked(
          this.#createController,
          [{
            modeDefinitionId,
            matchSeed,
            seed,
            participant,
            finalAssignment,
          }],
          `ModeQuickMatchServiceV2 controllerFactory ${participant.participantId}`,
        );
        controllerResources.push(controller);
        controllers.push(Object.freeze({ participantId: participant.participantId, controller }) as (
          ModeInputControllerBindingV2
        ));
      }
      const sessionRuntime = runtime as ModeMatchRuntimeV2;
      const sessionControllers = Object.freeze([...controllers]);
      runtime = null;
      controllerResources.length = 0;
      session = new ModeLocalMatchSessionV2({
        runtime: sessionRuntime,
        modeDefinitionId,
        participantIds: finalAssignment.participants.map(({ participantId }) => participantId),
        localParticipantId: humans[0]!.participantId,
        controllers: sessionControllers,
      });
      this.#assertCurrentOperationCommit('ModeQuickMatchServiceV2 session construction');
      const result = Object.freeze({
        modeDefinitionId,
        matchSeed,
        assignmentPlan,
        selection,
        finalAssignment,
        session,
      }) as DeepReadonly<ModeQuickMatchV2>;
      this.#assertCurrentOperationCommit('ModeQuickMatchServiceV2 result publication');
      session = null;
      return result;
    } catch (error) {
      const cleanupErrors: Error[] = [];
      const cleanupCandidates: PendingCleanupResource[] = session !== null
        ? [Object.freeze({ target: session, name: 'ModeQuickMatchServiceV2 session' })]
        : [
          ...controllerResources.slice().reverse().map((target) => Object.freeze({
            target,
            name: 'ModeQuickMatchServiceV2 controller',
          })),
          ...(runtime === null ? [] : [Object.freeze({
            target: runtime,
            name: 'ModeQuickMatchServiceV2 runtime',
          })]),
        ];
      if (this.#reentryError !== null) {
        for (const candidate of cleanupCandidates) {
          this.#retainCleanupResource(candidate.target, candidate.name);
        }
      } else {
        for (let index = 0; index < cleanupCandidates.length; index += 1) {
          const candidate = cleanupCandidates[index]!;
          cleanupErrors.push(...this.#releaseOrRetain(candidate.target, candidate.name));
          if (this.#reentryError !== null) {
            for (const remaining of cleanupCandidates.slice(index + 1)) {
              this.#retainCleanupResource(remaining.target, remaining.name);
            }
            break;
          }
        }
      }
      if (this.#reentrySequence !== reentrySequence
        && this.#reentryError !== null
        && !cleanupErrors.includes(this.#reentryError)) cleanupErrors.push(this.#reentryError);
      const failure = safelyWrapThrownError(error, 'ModeQuickMatchServiceV2创建失败。');
      if (cleanupErrors.length > 0) {
        const combined = new Error('ModeQuickMatchServiceV2创建失败且清理不完整。') as Error & {
          originalError: Error;
          cleanupErrors: readonly Error[];
        };
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
        throw new AggregateError(cleanupErrors, 'ModeQuickMatchServiceV2销毁清理不完整。');
      }
      this.#destroyed = true;
    } finally {
      this.#operation = null;
    }
  }
}
