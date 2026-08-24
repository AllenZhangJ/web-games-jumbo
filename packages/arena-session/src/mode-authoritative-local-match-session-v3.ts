import {
  ARENA_MATCH_EVENT_V6,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  combineCleanupFailure,
  createArenaMatchEventV6,
  createArenaLocalJumpAvailabilityV1,
  createArenaSupplyCadenceSnapshotV1,
  createArenaSupplyAuthorityFactsV1,
  createArenaWeaponFeedbackDirectionFactV2,
  createDeterministicDataHash,
  createMatchReadFrameV3Audit,
  normalizeInputFrame,
  normalizeInputFrames,
  type ArenaInputFrame,
  type ArenaMatchEventV6,
  type ArenaLocalJumpAvailabilityV1,
  type ArenaSupplyCadenceSnapshotV1,
  type ArenaSupplyAuthorityFactV1,
  type ArenaWeaponFeedbackDirectionFactV2,
  type DeepReadonly,
  type MatchReadFrameV3,
  type MatchReadFrameV3AuditOptions,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import {
  validateArenaReplayV6,
  type ArenaReplayV6,
  validateModeMatchRuntimeTerminalEvidenceV1,
  type ModeMatchRuntimeTerminalEvidenceV1,
  validateModeMatchRuntimeTerminalEvidenceV2,
  type ModeMatchRuntimeTerminalEvidenceV2,
} from '@number-strategy-jump/arena-match';
import {
  assertSynchronousPortResult,
  captureOptionalSynchronousDataMethod,
  captureSynchronousDataMethod,
  type SynchronousPortMethod,
} from './synchronous-port-boundary.js';

/**
 * V3 keeps canonical Bot input production inside the runtime owner. This is
 * required by Survival's fixed tick order: supply mutation must commit before
 * the same-tick Bot observation, and controller RNG must travel with the world
 * checkpoint rather than live in a sibling Session resource.
 */
export const MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE = Object.freeze({
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  ENDED: 'ended',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ModeAuthoritativeLocalMatchSessionV3State =
  typeof MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE[
    keyof typeof MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE
  ];

export const MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_LIFECYCLE_POLICY = Object.freeze({
  status: 'production-unreachable',
  hardGate: false,
  operationGuardPrecedesBusinessStateValidation: true,
  runtimeLifecycleAndAuthorityReadsUseStickyOperationGuard: true,
  publicStateAndReadFrameRejectOperationIntermediateState: true,
  swallowedRuntimeOrAuthorityReadReentryFailsClosed: true,
  stickyReentryUsesSequenceAndFirstError: true,
  runtimeCleanupCheckedBeforeOwnershipRelease: true,
  swallowedCleanupReentryRetainsRuntimeOwner: true,
  destroyFastPathChecksOperationBeforeIdempotence: true,
  requiresExplicitLocalJumpAvailabilityEveryStartAndStep: true,
  requiresExplicitWeaponFeedbackDirectionFactsEveryStep: true,
  validationStatus: 'not-run',
} as const);

export interface ModeAuthoritativeMatchRuntimeV3 {
  start(): unknown;
  step(localInput: ArenaInputFrame): unknown;
  pause(): void;
  resume(): void;
  getModeDriverContentHash(): unknown;
  getTerminalAuthorityIdentity(): unknown;
  exportReplayV6(): unknown;
  exportTerminalEvidenceV1(): unknown;
  exportTerminalEvidenceV2?(): unknown;
  destroy(): void;
}

export interface ModeAuthoritativeLocalMatchSessionV3Options {
  readonly runtime: ModeAuthoritativeMatchRuntimeV3;
  readonly modeDefinitionId: string;
  readonly participantIds: readonly string[];
  readonly localParticipantId: string;
}

export interface ModeAuthoritativeLocalMatchSessionV3StartOutcome {
  readonly readFrame: DeepReadonly<MatchReadFrameV3>;
  readonly readFrameAudit: MatchReadFrameV3AuditOptions;
  readonly supplyCadence: DeepReadonly<ArenaSupplyCadenceSnapshotV1> | null;
  readonly localJumpAvailability: ArenaLocalJumpAvailabilityV1;
}

export interface ModeAuthoritativeLocalMatchSessionV3StepOutcome {
  readonly events: readonly DeepReadonly<ArenaMatchEventV6>[];
  readonly supplyFacts: readonly DeepReadonly<ArenaSupplyAuthorityFactV1>[];
  readonly supplyCadence: DeepReadonly<ArenaSupplyCadenceSnapshotV1> | null;
  readonly localJumpAvailability: ArenaLocalJumpAvailabilityV1;
  readonly readFrame: DeepReadonly<MatchReadFrameV3>;
  readonly readFrameAudit: MatchReadFrameV3AuditOptions;
  readonly inputs: readonly ArenaInputFrame[];
  readonly weaponFeedbackDirectionFactsV2:
    readonly DeepReadonly<ArenaWeaponFeedbackDirectionFactV2>[];
  readonly result: DeepReadonly<ModeResultV3Payload> | null;
}

type PortMethod = SynchronousPortMethod;
type ModeAuthoritativeLocalMatchSessionV3Operation =
  | 'start'
  | 'step'
  | 'pause'
  | 'resume'
  | 'mode-driver-content-hash-read'
  | 'terminal-authority-identity-read'
  | 'terminal-replay-read'
  | 'terminal-runtime-evidence-read'
  | 'terminal-runtime-evidence-v2-read'
  | 'destroy';
const OPTION_KEYS = new Set([
  'runtime', 'modeDefinitionId', 'participantIds', 'localParticipantId',
]);
const START_KEYS = new Set([
  'readFrame', 'readFrameAudit', 'supplyCadence', 'localJumpAvailability',
]);
const START_REQUIRED_KEYS = new Set([
  'readFrame', 'readFrameAudit', 'supplyCadence', 'localJumpAvailability',
]);
const STEP_KEYS = new Set([
  'events', 'supplyFacts', 'supplyCadence', 'readFrame', 'readFrameAudit', 'inputs',
  'weaponFeedbackDirectionFactsV2', 'localJumpAvailability',
]);
const STEP_REQUIRED_KEYS = new Set([
  'events', 'supplyFacts', 'supplyCadence', 'readFrame', 'readFrameAudit', 'inputs',
  'weaponFeedbackDirectionFactsV2', 'localJumpAvailability',
]);

interface RuntimePort {
  readonly start: PortMethod;
  readonly step: PortMethod;
  readonly pause: PortMethod;
  readonly resume: PortMethod;
  readonly getModeDriverContentHash: PortMethod;
  readonly getTerminalAuthorityIdentity: PortMethod;
  readonly exportReplayV6: PortMethod;
  readonly exportTerminalEvidenceV1: PortMethod;
  readonly exportTerminalEvidenceV2: PortMethod | null;
  readonly destroy: PortMethod;
}

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

function field(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function method(target: unknown, key: string, name: string): PortMethod {
  return captureSynchronousDataMethod(target, key, name);
}

function synchronous<T>(value: T, name: string): T {
  return assertSynchronousPortResult(value, name);
}

function captureRuntime(value: unknown): RuntimePort {
  const destroy = method(value, 'destroy', 'ModeAuthoritativeMatchRuntimeV3');
  try {
    return Object.freeze({
      start: method(value, 'start', 'ModeAuthoritativeMatchRuntimeV3'),
      step: method(value, 'step', 'ModeAuthoritativeMatchRuntimeV3'),
      pause: method(value, 'pause', 'ModeAuthoritativeMatchRuntimeV3'),
      resume: method(value, 'resume', 'ModeAuthoritativeMatchRuntimeV3'),
      getModeDriverContentHash: method(
        value,
        'getModeDriverContentHash',
        'ModeAuthoritativeMatchRuntimeV3',
      ),
      getTerminalAuthorityIdentity: method(
        value,
        'getTerminalAuthorityIdentity',
        'ModeAuthoritativeMatchRuntimeV3',
      ),
      exportReplayV6: method(value, 'exportReplayV6', 'ModeAuthoritativeMatchRuntimeV3'),
      exportTerminalEvidenceV1: method(
        value,
        'exportTerminalEvidenceV1',
        'ModeAuthoritativeMatchRuntimeV3',
      ),
      exportTerminalEvidenceV2: captureOptionalSynchronousDataMethod(
        value,
        'exportTerminalEvidenceV2',
        'ModeAuthoritativeMatchRuntimeV3',
      ),
      destroy,
    });
  } catch (error) {
    const cleanupErrors: Error[] = [];
    try {
      synchronous(destroy(), 'ModeAuthoritativeMatchRuntimeV3构造期destroy');
    } catch (cleanupError) {
      cleanupErrors.push(wrapped(cleanupError, 'ModeAuthoritativeMatchRuntimeV3构造期清理失败。'));
    }
    throw combineCleanupFailure(
      wrapped(error, 'ModeAuthoritativeMatchRuntimeV3端口捕获失败。'),
      cleanupErrors,
      'ModeAuthoritativeMatchRuntimeV3端口捕获失败且清理不完整。',
    );
  }
}

function participantIds(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 17) {
    throw new RangeError('ModeAuthoritativeLocalMatchSessionV3 participantIds必须包含2-17项。');
  }
  const ids = value.map((entry, index) => assertNonEmptyString(
    entry,
    `ModeAuthoritativeLocalMatchSessionV3 participantIds[${index}]`,
  ));
  for (let index = 1; index < ids.length; index += 1) {
    if (ids[index - 1]! >= ids[index]!) {
      throw new RangeError('ModeAuthoritativeLocalMatchSessionV3 participantIds必须唯一稳定升序。');
    }
  }
  return Object.freeze(ids);
}

function normalizeOutcome(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  requiredKeys: ReadonlySet<string>,
  name: string,
  modeDefinitionId: string,
  expectedParticipantIds: readonly string[],
  localParticipantId: string,
  previousEventSequence: number,
): Readonly<{
  readFrame: DeepReadonly<MatchReadFrameV3>;
  readFrameAudit: MatchReadFrameV3AuditOptions;
  events: readonly DeepReadonly<ArenaMatchEventV6>[];
  supplyFacts: readonly DeepReadonly<ArenaSupplyAuthorityFactV1>[];
  supplyCadence: DeepReadonly<ArenaSupplyCadenceSnapshotV1> | null;
  localJumpAvailability: ArenaLocalJumpAvailabilityV1;
  weaponFeedbackDirectionFactsV2:
    readonly DeepReadonly<ArenaWeaponFeedbackDirectionFactV2>[];
  lastEventSequence: number;
  inputs: readonly ArenaInputFrame[] | null;
}> {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, allowedKeys, name);
  for (const key of requiredKeys) field(source, key, name);
  const audit = cloneFrozenData(
    field(source, 'readFrameAudit', name),
    `${name}.readFrameAudit`,
  ) as unknown as MatchReadFrameV3AuditOptions;
  const readFrame = createMatchReadFrameV3Audit(field(source, 'readFrame', name), audit);
  const worldIds = readFrame.worldSnapshot.participants.map(({ id }) => id);
  if (
    readFrame.worldSnapshot.modeDefinitionId !== modeDefinitionId
    || worldIds.length !== expectedParticipantIds.length
    || worldIds.some((id, index) => id !== expectedParticipantIds[index])
    || readFrame.localActionSidecar.participantId !== localParticipantId
  ) throw new RangeError(`${name}的Mode/participant/local身份与Session不一致。`);

  let events: readonly DeepReadonly<ArenaMatchEventV6>[] = Object.freeze([]);
  if (allowedKeys.has('events')) {
    const rawEvents = field(source, 'events', name);
    if (!Array.isArray(rawEvents)) throw new TypeError(`${name}.events必须是数组。`);
    const normalized = rawEvents.map(createArenaMatchEventV6);
    if (normalized[0] && normalized[0].sequence !== previousEventSequence + 1) {
      throw new RangeError(`${name}.events未连续延续上一批sequence。`);
    }
    for (let index = 1; index < normalized.length; index += 1) {
      if (normalized[index]!.sequence !== normalized[index - 1]!.sequence + 1) {
        throw new RangeError(`${name}.events必须连续唯一升序。`);
      }
    }
    if (normalized.some((event) => (
      event.tick >= readFrame.worldSnapshot.tick
      || event.sequence >= readFrame.worldSnapshot.eventSequence
    ))) throw new RangeError(`${name}.events不能领先或等于post-frame tick/sequence。`);
    events = Object.freeze(normalized);
  }
  const lastEventSequence = events.at(-1)?.sequence ?? previousEventSequence;
  if (readFrame.worldSnapshot.eventSequence !== lastEventSequence + 1) {
    throw new RangeError(`${name}.eventSequence未与已发布事件前缀闭合。`);
  }
  const result = readFrame.worldSnapshot.result;
  const ended = events.filter(({ type }) => type === ARENA_MATCH_EVENT_V6.MATCH_ENDED);
  if (result === null && ended.length > 0) {
    throw new RangeError(`${name}.MatchEnded不能领先终局frame。`);
  }
  if (result !== null) {
    const terminal = events.at(-1);
    if (ended.length !== 1 || terminal?.type !== ARENA_MATCH_EVENT_V6.MATCH_ENDED) {
      throw new RangeError(`${name}.终局frame必须由唯一末尾MatchEnded闭合。`);
    }
    if (
      createDeterministicDataHash(result, `${name} result`)
      !== createDeterministicDataHash(terminal.modeResult, `${name} MatchEnded`)
    ) throw new RangeError(`${name}.MatchEnded与终局frame不一致。`);
  }
  const inputs = allowedKeys.has('inputs')
    ? normalizeInputFrames(field(source, 'inputs', name), {
        tick: readFrame.worldSnapshot.tick - 1,
        participantIds: expectedParticipantIds,
      })
    : null;
  const supplyFacts = allowedKeys.has('supplyFacts')
    ? createArenaSupplyAuthorityFactsV1(field(source, 'supplyFacts', name))
    : Object.freeze([]);
  const supplyCadence = Object.hasOwn(source, 'supplyCadence')
    ? field(source, 'supplyCadence', name) === null
      ? null
      : createArenaSupplyCadenceSnapshotV1(field(source, 'supplyCadence', name))
    : null;
  const localJumpAvailability = createArenaLocalJumpAvailabilityV1(
    field(source, 'localJumpAvailability', name),
  );
  if (
    localJumpAvailability.tick !== readFrame.worldSnapshot.tick
    || localJumpAvailability.eventSequence !== readFrame.worldSnapshot.eventSequence
    || localJumpAvailability.participantId !== localParticipantId
  ) throw new RangeError(`${name}.localJumpAvailability身份漂移。`);
  if (allowedKeys.has('supplyCadence')) {
    const modeKind = readFrame.worldSnapshot.modeProjection.state.kind;
    if (modeKind === 'survival') {
      if (supplyCadence === null) {
        throw new RangeError(`${name}.Survival必须包含权威供给节奏。`);
      }
      if (
        supplyCadence.modeDefinitionId !== modeDefinitionId
        || supplyCadence.snapshotTick !== readFrame.worldSnapshot.tick
      ) throw new RangeError(`${name}.supplyCadence的Mode/tick身份漂移。`);
    } else if (supplyCadence !== null) {
      throw new RangeError(`${name}.非Survival不得包含供给节奏。`);
    }
  }
  const rawDirectionFacts = allowedKeys.has('weaponFeedbackDirectionFactsV2')
    ? field(source, 'weaponFeedbackDirectionFactsV2', name)
    : Object.freeze([]);
  if (!Array.isArray(rawDirectionFacts)) {
    throw new TypeError(`${name}.weaponFeedbackDirectionFactsV2必须是数组。`);
  }
  const weaponFeedbackDirectionFactsV2 = Object.freeze(
    rawDirectionFacts.map(createArenaWeaponFeedbackDirectionFactV2),
  );
  const feedbackEvents = events.filter(
    ({ type }) => type === ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED,
  );
  if (
    weaponFeedbackDirectionFactsV2.length !== feedbackEvents.length
    || feedbackEvents.some((event, index) => {
      const fact = weaponFeedbackDirectionFactsV2[index];
      return fact === undefined
        || event.type !== ARENA_MATCH_EVENT_V6.WEAPON_FEEDBACK_RESOLVED
        || fact.feedbackEventId !== event.id
        || fact.feedbackTick !== event.tick
        || fact.feedbackSequence !== event.sequence
        || fact.feedbackKind !== event.kind;
    })
  ) throw new RangeError(`${name}.weaponFeedbackDirectionFactsV2与反馈事件不闭合。`);
  return Object.freeze({
    readFrame,
    readFrameAudit: audit,
    events,
    supplyFacts,
    supplyCadence,
    localJumpAvailability,
    weaponFeedbackDirectionFactsV2,
    lastEventSequence,
    inputs,
  });
}

export class ModeAuthoritativeLocalMatchSessionV3 {
  readonly #modeDefinitionId: string;
  readonly #participantIds: readonly string[];
  readonly #localParticipantId: string;
  #runtime: RuntimePort | null;
  #state: ModeAuthoritativeLocalMatchSessionV3State =
    MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.CREATED;
  #readFrame: DeepReadonly<MatchReadFrameV3> | null = null;
  #lastEventSequence = -1;
  #lastSupplyFactSequence: number | null = null;
  #supplyFactStreamId: string | null = null;
  #operation: ModeAuthoritativeLocalMatchSessionV3Operation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(options: ModeAuthoritativeLocalMatchSessionV3Options);
  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'ModeAuthoritativeLocalMatchSessionV3 options');
    assertKnownKeys(source, OPTION_KEYS, 'ModeAuthoritativeLocalMatchSessionV3 options');
    for (const key of OPTION_KEYS) field(source, key, 'ModeAuthoritativeLocalMatchSessionV3 options');
    this.#modeDefinitionId = assertNonEmptyString(
      field(source, 'modeDefinitionId', 'ModeAuthoritativeLocalMatchSessionV3 options'),
      'ModeAuthoritativeLocalMatchSessionV3.modeDefinitionId',
    );
    this.#participantIds = participantIds(
      field(source, 'participantIds', 'ModeAuthoritativeLocalMatchSessionV3 options'),
    );
    this.#localParticipantId = assertNonEmptyString(
      field(source, 'localParticipantId', 'ModeAuthoritativeLocalMatchSessionV3 options'),
      'ModeAuthoritativeLocalMatchSessionV3.localParticipantId',
    );
    if (!this.#participantIds.includes(this.#localParticipantId)) {
      throw new RangeError('ModeAuthoritativeLocalMatchSessionV3 local participant不在roster。');
    }
    this.#runtime = captureRuntime(
      field(source, 'runtime', 'ModeAuthoritativeLocalMatchSessionV3 options'),
    );
  }

  get state(): ModeAuthoritativeLocalMatchSessionV3State {
    this.#assertNoOperation('state-read');
    return this.#state;
  }

  get readFrame(): DeepReadonly<MatchReadFrameV3> | null {
    this.#assertNoOperation('read-frame-read');
    return this.#readFrame;
  }

  #rejectReentry(operation: string): never {
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `ModeAuthoritativeLocalMatchSessionV3操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) this.#rejectReentry(operation);
  }

  #beginOperation(
    operation: ModeAuthoritativeLocalMatchSessionV3Operation,
    allowed: readonly ModeAuthoritativeLocalMatchSessionV3State[],
  ): void {
    this.#assertNoOperation(operation);
    if (!allowed.includes(this.#state)) {
      throw new Error(`ModeAuthoritativeLocalMatchSessionV3状态${this.#state}拒绝当前操作。`);
    }
    this.#operation = operation;
    this.#reentryError = null;
  }

  #runOperation<T>(
    operation: ModeAuthoritativeLocalMatchSessionV3Operation,
    allowed: readonly ModeAuthoritativeLocalMatchSessionV3State[],
    action: () => T,
  ): T {
    this.#beginOperation(operation, allowed);
    const reentrySequence = this.#reentrySequence;
    try {
      const result = action();
      if (this.#reentrySequence !== reentrySequence) {
        throw this.#reentryError
          ?? new Error(`ModeAuthoritativeLocalMatchSessionV3 ${operation}发生被吞掉的重入。`);
      }
      return result;
    } catch (error) {
      if (this.#reentrySequence !== reentrySequence
        && this.#state !== MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.FAILED) {
        return this.#fail(error);
      }
      throw error;
    } finally {
      this.#operation = null;
    }
  }

  #assertReentryFree(_operation: string): void {
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #cleanup(): readonly Error[] {
    const runtime = this.#runtime;
    if (runtime === null) return Object.freeze([]);
    const reentrySequence = this.#reentrySequence;
    try {
      synchronous(runtime.destroy(), 'ModeAuthoritativeLocalMatchSessionV3 runtime.destroy');
      if (this.#reentrySequence !== reentrySequence) {
        throw this.#reentryError
          ?? new Error('ModeAuthoritativeLocalMatchSessionV3 runtime清理期间发生重入。');
      }
      this.#runtime = null;
      return Object.freeze([]);
    } catch (error) {
      return Object.freeze([wrapped(error, 'ModeAuthoritativeLocalMatchSessionV3 runtime清理失败。')]);
    }
  }

  #fail(error: unknown): never {
    this.#state = MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.FAILED;
    this.#readFrame = null;
    this.#lastEventSequence = -1;
    this.#lastSupplyFactSequence = null;
    this.#supplyFactStreamId = null;
    const cleanupErrors = [...this.#cleanup()];
    if (this.#reentryError !== null && !cleanupErrors.includes(this.#reentryError)) {
      cleanupErrors.push(this.#reentryError);
    }
    throw combineCleanupFailure(
      wrapped(error, 'ModeAuthoritativeLocalMatchSessionV3运行失败。'),
      cleanupErrors,
      'ModeAuthoritativeLocalMatchSessionV3运行失败且清理不完整。',
    );
  }

  start(): ModeAuthoritativeLocalMatchSessionV3StartOutcome {
    return this.#runOperation(
      'start',
      [MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.CREATED],
      () => {
        try {
      if (this.#runtime === null) throw new Error('ModeAuthoritativeLocalMatchSessionV3 runtime不可用。');
      const outcome = normalizeOutcome(
        synchronous(this.#runtime.start(), 'ModeAuthoritativeLocalMatchSessionV3 runtime.start'),
        START_KEYS,
        START_REQUIRED_KEYS,
        'ModeAuthoritativeLocalMatchSessionV3 start outcome',
        this.#modeDefinitionId,
        this.#participantIds,
        this.#localParticipantId,
        this.#lastEventSequence,
      );
      if (outcome.readFrame.worldSnapshot.result !== null) {
        throw new RangeError('ModeAuthoritativeLocalMatchSessionV3不能从终局frame启动。');
      }
      this.#assertReentryFree('ModeAuthoritativeLocalMatchSessionV3 start');
      this.#readFrame = outcome.readFrame;
      this.#state = MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.RUNNING;
      return Object.freeze({
        readFrame: outcome.readFrame,
        readFrameAudit: outcome.readFrameAudit,
        supplyCadence: outcome.supplyCadence,
        localJumpAvailability: outcome.localJumpAvailability,
      });
        } catch (error) {
          return this.#fail(error);
        }
      },
    );
  }

  step(localInput: unknown): ModeAuthoritativeLocalMatchSessionV3StepOutcome {
    return this.#runOperation(
      'step',
      [MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.RUNNING],
      () => {
        const current = this.#readFrame;
        if (current === null) {
          throw new Error('ModeAuthoritativeLocalMatchSessionV3缺少current frame。');
        }
        const tick = current.worldSnapshot.tick;
        const normalizedLocal = normalizeInputFrame(localInput, {
          expectedTick: tick,
          participantIds: [this.#localParticipantId],
        });
        try {
      if (this.#runtime === null) throw new Error('ModeAuthoritativeLocalMatchSessionV3 runtime不可用。');
      const outcome = normalizeOutcome(
        synchronous(
          this.#runtime.step(normalizedLocal),
          'ModeAuthoritativeLocalMatchSessionV3 runtime.step',
        ),
        STEP_KEYS,
        STEP_REQUIRED_KEYS,
        'ModeAuthoritativeLocalMatchSessionV3 step outcome',
        this.#modeDefinitionId,
        this.#participantIds,
        this.#localParticipantId,
        this.#lastEventSequence,
      );
      if (outcome.readFrame.worldSnapshot.tick !== tick + 1 || outcome.inputs === null) {
        throw new RangeError('ModeAuthoritativeLocalMatchSessionV3每step必须推进1 tick并返回canonical inputs。');
      }
      const canonicalLocal = outcome.inputs.find(
        ({ participantId }) => participantId === this.#localParticipantId,
      );
      if (
        canonicalLocal === undefined
        || createDeterministicDataHash(canonicalLocal, 'authoritative canonical local input')
          !== createDeterministicDataHash(normalizedLocal, 'authoritative requested local input')
      ) throw new RangeError('ModeAuthoritativeMatchRuntimeV3不得替换本地玩家输入。');
      for (const fact of outcome.supplyFacts) {
        if (fact.tick !== tick || fact.modeDefinitionId !== this.#modeDefinitionId) {
          throw new RangeError('ModeAuthoritativeLocalMatchSessionV3 supply fact身份漂移。');
        }
      }
      const firstSupplyFact = outcome.supplyFacts[0];
      if (
        firstSupplyFact !== undefined
        && this.#lastSupplyFactSequence !== null
        && firstSupplyFact.sequence !== this.#lastSupplyFactSequence + 1
      ) throw new RangeError('ModeAuthoritativeLocalMatchSessionV3 supply fact sequence未连续。');
      if (
        firstSupplyFact !== undefined
        && this.#supplyFactStreamId !== null
        && firstSupplyFact.streamId !== this.#supplyFactStreamId
      ) throw new RangeError('ModeAuthoritativeLocalMatchSessionV3 supply fact stream发生漂移。');
      this.#assertReentryFree('ModeAuthoritativeLocalMatchSessionV3 step');
      this.#readFrame = outcome.readFrame;
      this.#lastEventSequence = outcome.lastEventSequence;
      if (firstSupplyFact !== undefined) {
        this.#supplyFactStreamId = firstSupplyFact.streamId;
        this.#lastSupplyFactSequence = outcome.supplyFacts.at(-1)!.sequence;
      }
      const result = outcome.readFrame.worldSnapshot.result;
      if (result !== null) this.#state = MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.ENDED;
      return Object.freeze({
        events: outcome.events,
        supplyFacts: outcome.supplyFacts,
        supplyCadence: outcome.supplyCadence,
        localJumpAvailability: outcome.localJumpAvailability,
        weaponFeedbackDirectionFactsV2: outcome.weaponFeedbackDirectionFactsV2,
        readFrame: outcome.readFrame,
        readFrameAudit: outcome.readFrameAudit,
        inputs: outcome.inputs,
        result,
      });
        } catch (error) {
          return this.#fail(error);
        }
      },
    );
  }

  pause(): void {
    this.#runOperation(
      'pause',
      [MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.RUNNING],
      () => {
        try {
          synchronous(this.#runtime?.pause(), 'ModeAuthoritativeLocalMatchSessionV3 runtime.pause');
          this.#assertReentryFree('ModeAuthoritativeLocalMatchSessionV3 pause');
          this.#state = MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.PAUSED;
        } catch (error) {
          this.#fail(error);
        }
      },
    );
  }

  resume(): void {
    this.#runOperation(
      'resume',
      [MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.PAUSED],
      () => {
        try {
          synchronous(this.#runtime?.resume(), 'ModeAuthoritativeLocalMatchSessionV3 runtime.resume');
          this.#assertReentryFree('ModeAuthoritativeLocalMatchSessionV3 resume');
          this.#state = MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.RUNNING;
        } catch (error) {
          this.#fail(error);
        }
      },
    );
  }

  getModeDriverContentHash(): unknown {
    return this.#runOperation(
      'mode-driver-content-hash-read',
      [MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.CREATED],
      () => {
        if (this.#runtime === null) {
          throw new Error('ModeAuthoritativeLocalMatchSessionV3开局runtime不可用。');
        }
        return synchronous(
          this.#runtime.getModeDriverContentHash(),
          'ModeAuthoritativeLocalMatchSessionV3 mode driver content hash',
        );
      },
    );
  }

  getTerminalAuthorityIdentity(): unknown {
    return this.#runOperation(
      'terminal-authority-identity-read',
      [MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.ENDED],
      () => {
        if (this.#runtime === null) {
          throw new Error('ModeAuthoritativeLocalMatchSessionV3终局runtime不可用。');
        }
        return synchronous(
          this.#runtime.getTerminalAuthorityIdentity(),
          'ModeAuthoritativeLocalMatchSessionV3 terminal authority identity',
        );
      },
    );
  }

  getTerminalReplayV6(): ArenaReplayV6 {
    return this.#runOperation(
      'terminal-replay-read',
      [MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.ENDED],
      () => {
        if (this.#runtime === null) {
          throw new Error('ModeAuthoritativeLocalMatchSessionV3终局runtime不可用。');
        }
        return validateArenaReplayV6(synchronous(
          this.#runtime.exportReplayV6(),
          'ModeAuthoritativeLocalMatchSessionV3 terminal Replay V6',
        ));
      },
    );
  }

  getTerminalRuntimeEvidenceV1(): ModeMatchRuntimeTerminalEvidenceV1 {
    return this.#runOperation(
      'terminal-runtime-evidence-read',
      [MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.ENDED],
      () => {
        if (this.#runtime === null) {
          throw new Error('ModeAuthoritativeLocalMatchSessionV3终局runtime不可用。');
        }
        const evidence = validateModeMatchRuntimeTerminalEvidenceV1(synchronous(
          this.#runtime.exportTerminalEvidenceV1(),
          'ModeAuthoritativeLocalMatchSessionV3 terminal Runtime evidence V1',
        ));
        if (evidence.replay.modeDefinitionId !== this.#modeDefinitionId) {
          throw new RangeError('ModeAuthoritativeLocalMatchSessionV3终局Runtime证据Mode身份漂移。');
        }
        return evidence;
      },
    );
  }

  getTerminalRuntimeEvidenceV2(): ModeMatchRuntimeTerminalEvidenceV2 {
    return this.#runOperation(
      'terminal-runtime-evidence-v2-read',
      [MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.ENDED],
      () => {
        if (this.#runtime === null || this.#runtime.exportTerminalEvidenceV2 === null) {
          throw new Error('ModeAuthoritativeLocalMatchSessionV3终局runtime不提供完整供给证据V2。');
        }
        const evidence = validateModeMatchRuntimeTerminalEvidenceV2(synchronous(
          this.#runtime.exportTerminalEvidenceV2(),
          'ModeAuthoritativeLocalMatchSessionV3 terminal Runtime evidence V2',
        ));
        if (evidence.replay.modeDefinitionId !== this.#modeDefinitionId) {
          throw new RangeError('ModeAuthoritativeLocalMatchSessionV3终局Runtime证据V2 Mode身份漂移。');
        }
        return evidence;
      },
    );
  }

  destroy(): void {
    this.#assertNoOperation('destroy');
    if (
      this.#state === MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.DESTROYED
      && this.#runtime === null
    ) return;
    this.#runOperation('destroy', [
      MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.CREATED,
      MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.RUNNING,
      MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.PAUSED,
      MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.ENDED,
      MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.FAILED,
    ], () => {
      const errors = this.#cleanup();
      this.#readFrame = null;
      this.#lastEventSequence = -1;
      this.#lastSupplyFactSequence = null;
      this.#supplyFactStreamId = null;
      if (errors.length > 0) {
        this.#state = MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.FAILED;
        throw combineCleanupFailure(
          new Error('ModeAuthoritativeLocalMatchSessionV3 destroy失败。'),
          errors,
          'ModeAuthoritativeLocalMatchSessionV3 destroy清理不完整。',
        );
      }
      this.#state = MODE_AUTHORITATIVE_LOCAL_MATCH_SESSION_V3_STATE.DESTROYED;
    });
  }
}
