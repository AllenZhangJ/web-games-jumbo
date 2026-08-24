import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  assertSynchronousReturn,
  combineCleanupFailure,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createProductPublicMatchInfoV2,
  type ProductPublicMatchInfoV2,
} from '@number-strategy-jump/arena-product-contracts';
import {
  createArenaV2ModeHudValidatedStepProjectionV1,
  projectArenaV2SupplyFactsToPresentationCuesV1,
  type ArenaV2ModeHudValidatedStepProjectionV1,
} from '@number-strategy-jump/arena-product-presentation';

export const ARENA_V2_HUD_READY_LEARNING_MODE_SESSION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1,
  status: 'production-unreachable',
  hardGate: false,
  preservesAuthorityAudit: true,
  exposesDirectHudModel: false,
  supplyCueStatus: 'explicit-authority-facts-wired',
  requiresExplicitSupplyFactsEveryStep: true,
  requiresExplicitAuthorityAuditEveryStep: true,
  requiresExplicitSupplyCadenceEveryStep: true,
  requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true,
  requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true,
  validationStatus: 'not-run',
  defaultCompositionWired: false,
  defaultEntryWired: false,
  failedProjectionRetainsLastAuditedProjectionUntilChildCleanup: true,
  cleanupRetriesSameChildOwner: true,
  terminalStateWaitsForChildSession: true,
  constructorTransfersChildOnlyAfterPublicInfoAndPortsValidate: true,
  constructionFailureLeavesChildOwnershipWithCaller: true,
  allLifecycleAndProjectionReadsUseStickyOperationGuard: true,
  swallowedChildOrProjectionReadReentryFailsClosed: true,
  destroyFastPathChecksOperationBeforeIdempotence: true,
} as const);

type PortMethod = (...arguments_: readonly unknown[]) => unknown;

type HudReadyLearningModeSessionOperation =
  | 'start'
  | 'step'
  | 'pause'
  | 'resume'
  | 'settle'
  | 'snapshot-read'
  | 'projection-read'
  | 'destroy';

interface SessionPort {
  readonly start: PortMethod;
  readonly step: PortMethod;
  readonly pause: PortMethod;
  readonly resume: PortMethod;
  readonly settle: PortMethod;
  readonly getSnapshot: PortMethod;
  readonly destroy: PortMethod;
}

const OPTION_KEYS = new Set(['session', 'publicMatchInfo']);
const START_KEYS = new Set([
  'readFrame', 'readFrameAudit', 'supplyCadence', 'localJumpAvailability',
]);
const START_REQUIRED_KEYS = new Set([
  'readFrame', 'readFrameAudit', 'supplyCadence', 'localJumpAvailability',
]);
const STEP_OUTCOME_KEYS = new Set(['matchStep', 'snapshot']);
const MATCH_STEP_KEYS = new Set([
  'events', 'supplyFacts', 'supplyCadence', 'readFrame', 'readFrameAudit', 'inputs', 'result',
  'weaponFeedbackDirectionFactsV2',
  'localJumpAvailability',
]);
const MATCH_STEP_REQUIRED_KEYS = new Set([
  'events', 'supplyFacts', 'supplyCadence', 'readFrame', 'readFrameAudit', 'inputs', 'result',
  'weaponFeedbackDirectionFactsV2', 'localJumpAvailability',
]);

function field(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function method(target: unknown, key: string, name: string): PortMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${name}.${key}()不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) {
      throw new TypeError(`${name}原型链无效。`);
    }
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
  throw new TypeError(`${name}.${key}()不存在。`);
}

function synchronous<T>(value: T, name: string): T {
  assertSynchronousReturn(value, name);
  return value;
}

function exactOptional(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  requiredKeys: ReadonlySet<string>,
  name: string,
): PlainRecord {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, allowedKeys, name);
  for (const key of requiredKeys) field(source, key, name);
  return source;
}

function captureSession(value: unknown): SessionPort {
  const destroy = method(value, 'destroy', 'HUD-ready Learning Mode Session child');
  return Object.freeze({
    start: method(value, 'start', 'HUD-ready Learning Mode Session child'),
    step: method(value, 'step', 'HUD-ready Learning Mode Session child'),
    pause: method(value, 'pause', 'HUD-ready Learning Mode Session child'),
    resume: method(value, 'resume', 'HUD-ready Learning Mode Session child'),
    settle: method(value, 'settle', 'HUD-ready Learning Mode Session child'),
    getSnapshot: method(value, 'getSnapshot', 'HUD-ready Learning Mode Session child'),
    destroy,
  });
}

function projection(
  readFrame: unknown,
  readFrameAudit: unknown,
  events: unknown,
  supplyFacts: unknown,
  supplyCadence: unknown,
  weaponFeedbackDirectionFactsV2: unknown,
  localJumpAvailability: unknown,
  publicMatchInfo: ProductPublicMatchInfoV2,
): ArenaV2ModeHudValidatedStepProjectionV1 {
  const frame = assertPlainRecord(readFrame, 'HUD-ready Learning Mode Session projection frame');
  const world = assertPlainRecord(
    field(frame, 'worldSnapshot', 'HUD-ready Learning Mode Session projection frame'),
    'HUD-ready Learning Mode Session projection world',
  );
  const modeDefinitionId = assertNonEmptyString(
    field(world, 'modeDefinitionId', 'HUD-ready Learning Mode Session projection world'),
    'HUD-ready Learning Mode Session projection modeDefinitionId',
  );
  return createArenaV2ModeHudValidatedStepProjectionV1({
    events,
    weaponFeedbackDirectionFactsV2,
    supplyCues: projectArenaV2SupplyFactsToPresentationCuesV1({
      facts: supplyFacts,
      modeDefinitionId,
    }),
    supplyCadence,
    localJumpAvailability,
    readFrame,
    readFrameAudit,
    publicMatchInfo,
  });
}

/**
 * Keeps Presentation on the same audited frame path as Product/Learning. It
 * exposes only the opaque validated projection; HUD consumers never receive a
 * writable authority object or a hand-built HUD model.
 */
export class ArenaV2HudReadyLearningModeSessionCandidateV1 {
  readonly #publicMatchInfo: ProductPublicMatchInfoV2;
  #session: SessionPort | null;
  #presentationProjection: ArenaV2ModeHudValidatedStepProjectionV1 | null = null;
  #failed = false;
  #destroyed = false;
  #cleanupStarted = false;
  #sessionDestroyed = false;
  #operation: HudReadyLearningModeSessionOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'HUD-ready Learning Mode Session options');
    assertKnownKeys(source, OPTION_KEYS, 'HUD-ready Learning Mode Session options');
    for (const key of OPTION_KEYS) field(source, key, 'HUD-ready Learning Mode Session options');
    const publicMatchInfo = createProductPublicMatchInfoV2(
      field(source, 'publicMatchInfo', 'HUD-ready Learning Mode Session options'),
    );
    const session = captureSession(
      field(source, 'session', 'HUD-ready Learning Mode Session options'),
    );
    this.#publicMatchInfo = publicMatchInfo;
    this.#session = session;
  }

  #child(): SessionPort {
    if (this.#cleanupStarted) throw new Error('HUD-ready Learning Mode Session已开始清理。');
    if (this.#failed) throw new Error('HUD-ready Learning Mode Session已失败关闭。');
    if (this.#destroyed || this.#session === null) {
      throw new Error('HUD-ready Learning Mode Session已销毁。');
    }
    return this.#session;
  }

  #rejectReentry(operation: string): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `HUD-ready Learning Mode Session操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw error;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) this.#rejectReentry(operation);
  }

  #runOperation<T>(operation: HudReadyLearningModeSessionOperation, action: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    const reentrySequence = this.#reentrySequence;
    try {
      const result = action();
      if (this.#reentrySequence !== reentrySequence) {
        return this.#failClosed(
          this.#reentryError
            ?? new Error(`HUD-ready Learning Mode Session ${operation}发生被吞掉的重入。`),
          'HUD-ready Learning Mode Session检测到被Child或读取方吞掉的重入。',
        );
      }
      return result;
    } catch (error) {
      if (this.#reentrySequence !== reentrySequence && !this.#failed) {
        return this.#failClosed(
          error,
          'HUD-ready Learning Mode Session检测到Child或读取方反调。',
        );
      }
      throw error;
    } finally {
      this.#operation = null;
    }
  }

  #failClosed(error: unknown, message: string): never {
    const cleanupErrors: Error[] = [];
    this.#failed = true;
    this.#cleanupStarted = true;
    cleanupErrors.push(...this.#cleanupSession(
      'HUD-ready Learning Mode Session失败清理destroy',
      'HUD-ready Learning Mode Session失败清理不完整。',
    ));
    this.#completeTerminalCleanup();
    if (this.#reentryError !== null && !cleanupErrors.includes(this.#reentryError)) {
      cleanupErrors.push(this.#reentryError);
    }
    const original = new Error(message);
    Object.defineProperty(original, 'cause', { value: error, enumerable: false });
    throw combineCleanupFailure(
      original,
      cleanupErrors,
      'HUD-ready Learning Mode Session失败且清理不完整。',
    );
  }

  #failProjection(error: unknown): never {
    return this.#failClosed(
      error,
      'HUD-ready Learning Mode Session表现投影失败。',
    );
  }

  #cleanupSession(operation: string, failureMessage: string): Error[] {
    if (this.#sessionDestroyed) return [];
    const child = this.#session;
    if (child === null) {
      this.#sessionDestroyed = true;
      return [];
    }
    try {
      synchronous(child.destroy(), operation);
      this.#sessionDestroyed = true;
      return [];
    } catch (cleanupError) {
      const wrapped = new Error(failureMessage);
      Object.defineProperty(wrapped, 'cause', { value: cleanupError, enumerable: false });
      return [wrapped];
    }
  }

  #completeTerminalCleanup(): void {
    if (!this.#sessionDestroyed) return;
    this.#session = null;
    this.#presentationProjection = null;
    this.#destroyed = true;
  }

  start(): unknown {
    return this.#runOperation('start', () => {
      const outcome = synchronous(this.#child().start(), 'HUD-ready Learning Mode Session start');
      try {
        const source = exactOptional(
          outcome,
          START_KEYS,
          START_REQUIRED_KEYS,
          'HUD-ready Learning Mode Session start outcome',
        );
        this.#presentationProjection = projection(
          field(source, 'readFrame', 'HUD-ready Learning Mode Session start outcome'),
          field(source, 'readFrameAudit', 'HUD-ready Learning Mode Session start outcome'),
          Object.freeze([]),
          Object.freeze([]),
          field(source, 'supplyCadence', 'HUD-ready Learning Mode Session start outcome'),
          Object.freeze([]),
          field(
            source,
            'localJumpAvailability',
            'HUD-ready Learning Mode Session start outcome',
          ),
          this.#publicMatchInfo,
        );
        return outcome;
      } catch (error) {
        return this.#failProjection(error);
      }
    });
  }

  step(localInput: unknown): unknown {
    return this.#runOperation('step', () => {
      const outcome = synchronous(
        this.#child().step(localInput),
        'HUD-ready Learning Mode Session step',
      );
      try {
        const source = exactOptional(
          outcome,
          STEP_OUTCOME_KEYS,
          STEP_OUTCOME_KEYS,
          'HUD-ready Learning Mode Session step outcome',
        );
        const matchStep = exactOptional(
          field(source, 'matchStep', 'HUD-ready Learning Mode Session step outcome'),
          MATCH_STEP_KEYS,
          MATCH_STEP_REQUIRED_KEYS,
          'HUD-ready Learning Mode Session matchStep',
        );
        this.#presentationProjection = projection(
          field(matchStep, 'readFrame', 'HUD-ready Learning Mode Session matchStep'),
          field(matchStep, 'readFrameAudit', 'HUD-ready Learning Mode Session matchStep'),
          field(matchStep, 'events', 'HUD-ready Learning Mode Session matchStep'),
          field(matchStep, 'supplyFacts', 'HUD-ready Learning Mode Session matchStep'),
          field(matchStep, 'supplyCadence', 'HUD-ready Learning Mode Session matchStep'),
          field(
            matchStep,
            'weaponFeedbackDirectionFactsV2',
            'HUD-ready Learning Mode Session matchStep',
          ),
          field(
            matchStep,
            'localJumpAvailability',
            'HUD-ready Learning Mode Session matchStep',
          ),
          this.#publicMatchInfo,
        );
        return outcome;
      } catch (error) {
        return this.#failProjection(error);
      }
    });
  }

  pause(): void {
    this.#runOperation('pause', () => {
      synchronous(this.#child().pause(), 'HUD-ready Learning Mode Session pause');
    });
  }

  resume(): void {
    this.#runOperation('resume', () => {
      synchronous(this.#child().resume(), 'HUD-ready Learning Mode Session resume');
    });
  }

  settle(): unknown {
    return this.#runOperation('settle', () => (
      synchronous(this.#child().settle(), 'HUD-ready Learning Mode Session settle')
    ));
  }

  getSnapshot(): unknown {
    return this.#runOperation('snapshot-read', () => (
      synchronous(this.#child().getSnapshot(), 'HUD-ready Learning Mode Session snapshot')
    ));
  }

  getPresentationProjection(): ArenaV2ModeHudValidatedStepProjectionV1 | null {
    return this.#runOperation('projection-read', () => {
      this.#child();
      return this.#presentationProjection;
    });
  }

  destroy(): void {
    this.#assertNoOperation('destroy');
    if (this.#destroyed && this.#session === null) return;
    this.#runOperation('destroy', () => {
      this.#cleanupStarted = true;
      const cleanupErrors = this.#cleanupSession(
        'HUD-ready Learning Mode Session destroy',
        'HUD-ready Learning Mode Session destroy清理不完整。',
      );
      this.#completeTerminalCleanup();
      if (!this.#sessionDestroyed) this.#failed = true;
      if (cleanupErrors.length > 0) {
        throw combineCleanupFailure(
          new Error('HUD-ready Learning Mode Session销毁不完整。'),
          cleanupErrors,
          'HUD-ready Learning Mode Session销毁不完整。',
        );
      }
    });
  }
}
