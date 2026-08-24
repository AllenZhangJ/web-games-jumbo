import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  ARENA_MATCH_EVENT_V6,
  combineCleanupFailure,
  createArenaMatchEventV6,
  createDeterministicDataHash,
  createMatchReadFrameV3Audit,
  createNeutralInputFrame,
  normalizeInputFrame,
  normalizeInputFrames,
  type ArenaInputFrame,
  type ArenaMatchEventV6,
  type DeepReadonly,
  type MatchReadFrameV3,
  type MatchReadFrameV3AuditOptions,
  type ModeResultV3Payload,
  type WorldSnapshotV3,
} from '@number-strategy-jump/arena-contracts';
import {
  assertSynchronousPortResult,
  captureSynchronousDataMethod,
  type SynchronousPortMethod,
} from './synchronous-port-boundary.js';

export const MODE_LOCAL_MATCH_SESSION_V2_STATE = Object.freeze({
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  ENDED: 'ended',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ModeLocalMatchSessionV2State = typeof MODE_LOCAL_MATCH_SESSION_V2_STATE[
  keyof typeof MODE_LOCAL_MATCH_SESSION_V2_STATE
];

export interface ModeInputControllerV2 {
  createInput(worldSnapshot: DeepReadonly<WorldSnapshotV3>): unknown;
  destroy(): void;
}

export interface ModeInputControllerBindingV2 {
  readonly participantId: string;
  readonly controller: ModeInputControllerV2;
}

export interface ModeMatchRuntimeV2 {
  start(): unknown;
  step(inputFrames: readonly ArenaInputFrame[]): unknown;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export interface ModeLocalMatchSessionV2Options {
  readonly runtime: ModeMatchRuntimeV2;
  readonly modeDefinitionId: string;
  readonly participantIds: readonly string[];
  readonly localParticipantId: string;
  readonly controllers: readonly ModeInputControllerBindingV2[];
}

export interface ModeLocalMatchSessionV2StartOutcome {
  readonly readFrame: DeepReadonly<MatchReadFrameV3>;
}

export interface ModeLocalMatchSessionV2StepOutcome {
  readonly events: readonly DeepReadonly<ArenaMatchEventV6>[];
  readonly readFrame: DeepReadonly<MatchReadFrameV3>;
  readonly inputs: readonly ArenaInputFrame[];
  readonly result: DeepReadonly<ModeResultV3Payload> | null;
}

type PortMethod = SynchronousPortMethod;
type ModeLocalMatchSessionV2Operation =
  | 'start'
  | 'step'
  | 'pause'
  | 'resume'
  | 'destroy'
  | 'state-read'
  | 'read-frame-read';

interface RuntimePort {
  readonly start: PortMethod;
  readonly step: PortMethod;
  readonly pause: PortMethod;
  readonly resume: PortMethod;
  readonly destroy: PortMethod;
}

interface ControllerPort {
  readonly participantId: string;
  readonly createInput: PortMethod;
  readonly destroy: PortMethod;
}

const OPTION_KEYS = new Set([
  'runtime', 'modeDefinitionId', 'participantIds', 'localParticipantId', 'controllers',
]);
const CONTROLLER_KEYS = new Set(['participantId', 'controller']);
const START_KEYS = new Set(['readFrame', 'readFrameAudit', 'supplyCadence']);
const START_REQUIRED_KEYS = new Set(['readFrame', 'readFrameAudit']);
const STEP_KEYS = new Set([
  'events', 'supplyFacts', 'supplyCadence', 'readFrame', 'readFrameAudit',
]);
const STEP_REQUIRED_KEYS = new Set(['events', 'readFrame', 'readFrameAudit']);

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

function dataField(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function dataMethod(target: unknown, methodName: string, ownerName: string): PortMethod {
  return captureSynchronousDataMethod(target, methodName, ownerName);
}

function assertSynchronous<T>(value: T, name: string): T {
  return assertSynchronousPortResult(value, name);
}

function runtimePort(value: unknown): RuntimePort {
  const destroy = dataMethod(value, 'destroy', 'ModeMatchRuntimeV2');
  try {
    return Object.freeze({
      start: dataMethod(value, 'start', 'ModeMatchRuntimeV2'),
      step: dataMethod(value, 'step', 'ModeMatchRuntimeV2'),
      pause: dataMethod(value, 'pause', 'ModeMatchRuntimeV2'),
      resume: dataMethod(value, 'resume', 'ModeMatchRuntimeV2'),
      destroy,
    });
  } catch (error) {
    const original = safelyWrapThrownError(error, 'ModeMatchRuntimeV2端口捕获失败。');
    const cleanupErrors: Error[] = [];
    try {
      assertSynchronous(destroy(), 'ModeMatchRuntimeV2构造期destroy');
    } catch (cleanupError) {
      cleanupErrors.push(safelyWrapThrownError(
        cleanupError,
        'ModeMatchRuntimeV2构造期清理失败。',
      ));
    }
    throw combineCleanupFailure(
      original,
      cleanupErrors,
      'ModeMatchRuntimeV2端口捕获失败且清理不完整。',
    );
  }
}

function canonicalParticipantIds(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 17) {
    throw new RangeError('ModeLocalMatchSessionV2 participantIds必须包含2-17项。');
  }
  const ids = value.map((entry, index) => assertNonEmptyString(
    entry,
    `ModeLocalMatchSessionV2 participantIds[${index}]`,
  ));
  for (let index = 1; index < ids.length; index += 1) {
    if (ids[index - 1]! >= ids[index]!) {
      throw new RangeError('ModeLocalMatchSessionV2 participantIds必须唯一稳定升序。');
    }
  }
  return Object.freeze(ids);
}

function destroyPorts(
  runtime: RuntimePort | null,
  controllers: readonly ControllerPort[],
): Readonly<{
  errors: readonly Error[];
  runtime: RuntimePort | null;
  controllers: readonly ControllerPort[];
}> {
  const errors: Error[] = [];
  const retainedControllers: ControllerPort[] = [];
  for (let index = controllers.length - 1; index >= 0; index -= 1) {
    try {
      assertSynchronous(
        controllers[index]!.destroy(),
        'ModeLocalMatchSessionV2 controller destroy',
      );
    } catch (error) {
      errors.push(safelyWrapThrownError(error, 'ModeLocalMatchSessionV2 controller清理失败。'));
      retainedControllers.push(controllers[index]!);
    }
  }
  let retainedRuntime: RuntimePort | null = null;
  if (runtime !== null) {
    try {
      assertSynchronous(runtime.destroy(), 'ModeLocalMatchSessionV2 runtime destroy');
    } catch (error) {
      errors.push(safelyWrapThrownError(error, 'ModeLocalMatchSessionV2 runtime清理失败。'));
      retainedRuntime = runtime;
    }
  }
  return Object.freeze({
    errors: Object.freeze(errors),
    runtime: retainedRuntime,
    controllers: Object.freeze(retainedControllers.reverse()),
  });
}

function normalizeFrameOutcome(
  value: unknown,
  keys: ReadonlySet<string>,
  requiredKeys: ReadonlySet<string>,
  name: string,
  modeDefinitionId: string,
  participantIds: readonly string[],
  localParticipantId: string,
  previousEventSequence: number,
): Readonly<{
  readFrame: DeepReadonly<MatchReadFrameV3>;
  events: readonly DeepReadonly<ArenaMatchEventV6>[];
  lastEventSequence: number;
}> {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of requiredKeys) dataField(source, key, name);
  const audit = dataField(source, 'readFrameAudit', name) as MatchReadFrameV3AuditOptions;
  const readFrame = createMatchReadFrameV3Audit(dataField(source, 'readFrame', name), audit);
  if (readFrame.worldSnapshot.modeDefinitionId !== modeDefinitionId) {
    throw new RangeError(`${name} modeDefinitionId与Session不一致。`);
  }
  const worldIds = readFrame.worldSnapshot.participants.map(({ id }) => id);
  if (
    worldIds.length !== participantIds.length
    || worldIds.some((id, index) => id !== participantIds[index])
  ) {
    throw new RangeError(`${name} participant集合与Session不一致。`);
  }
  if (readFrame.localActionSidecar.participantId !== localParticipantId) {
    throw new RangeError(`${name} localParticipantId与Session不一致。`);
  }
  let events: readonly DeepReadonly<ArenaMatchEventV6>[] = Object.freeze([]);
  if (keys.has('events')) {
    const rawEvents = dataField(source, 'events', name);
    if (!Array.isArray(rawEvents)) throw new TypeError(`${name}.events必须是数组。`);
    const normalized = rawEvents.map(createArenaMatchEventV6);
    if (normalized[0] && normalized[0].sequence !== previousEventSequence + 1) {
      throw new RangeError(`${name}.events必须连续延续上一批sequence。`);
    }
    for (let index = 1; index < normalized.length; index += 1) {
      if (normalized[index]!.sequence !== normalized[index - 1]!.sequence + 1) {
        throw new RangeError(`${name}.events必须按sequence连续唯一升序。`);
      }
    }
    if (normalized.some((event) => (
      event.tick > readFrame.worldSnapshot.tick
      || event.sequence >= readFrame.worldSnapshot.eventSequence
    ))) {
      throw new RangeError(`${name}.events不能领先readFrame。`);
    }
    events = Object.freeze(normalized);
  }
  const lastEventSequence = events.at(-1)?.sequence ?? previousEventSequence;
  if (readFrame.worldSnapshot.eventSequence !== lastEventSequence + 1) {
    throw new RangeError(`${name}.eventSequence必须与已发布事件前缀闭合。`);
  }
  const endedEvents = events.filter(({ type }) => type === ARENA_MATCH_EVENT_V6.MATCH_ENDED);
  const modeResult = readFrame.worldSnapshot.result;
  if (modeResult === null) {
    if (endedEvents.length > 0) {
      throw new RangeError(`${name}.MatchEnded不能领先readFrame终局结果。`);
    }
  } else {
    const terminalEvent = events.at(-1);
    if (endedEvents.length !== 1 || terminalEvent?.type !== ARENA_MATCH_EVENT_V6.MATCH_ENDED) {
      throw new RangeError(`${name}.终局readFrame必须由唯一末尾MatchEnded闭合。`);
    }
    if (
      createDeterministicDataHash(modeResult, `${name} readFrame modeResult`)
      !== createDeterministicDataHash(terminalEvent.modeResult, `${name} MatchEnded modeResult`)
    ) {
      throw new RangeError(`${name}.MatchEnded与readFrame modeResult不一致。`);
    }
  }
  return Object.freeze({
    readFrame,
    events,
    lastEventSequence,
  });
}

export class ModeLocalMatchSessionV2 {
  readonly #modeDefinitionId: string;
  readonly #participantIds: readonly string[];
  readonly #localParticipantId: string;
  #runtime: RuntimePort | null;
  #controllers: readonly ControllerPort[];
  #state: ModeLocalMatchSessionV2State = MODE_LOCAL_MATCH_SESSION_V2_STATE.CREATED;
  #readFrame: DeepReadonly<MatchReadFrameV3> | null = null;
  #lastEventSequence = -1;
  #operation: ModeLocalMatchSessionV2Operation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(options: ModeLocalMatchSessionV2Options);
  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'ModeLocalMatchSessionV2 options');
    assertKnownKeys(source, OPTION_KEYS, 'ModeLocalMatchSessionV2 options');
    for (const key of OPTION_KEYS) dataField(source, key, 'ModeLocalMatchSessionV2 options');
    const modeDefinitionId = assertNonEmptyString(
      dataField(source, 'modeDefinitionId', 'ModeLocalMatchSessionV2 options'),
      'ModeLocalMatchSessionV2.modeDefinitionId',
    );
    const participantIds = canonicalParticipantIds(
      dataField(source, 'participantIds', 'ModeLocalMatchSessionV2 options'),
    );
    const localParticipantId = assertNonEmptyString(
      dataField(source, 'localParticipantId', 'ModeLocalMatchSessionV2 options'),
      'ModeLocalMatchSessionV2.localParticipantId',
    );
    if (!participantIds.includes(localParticipantId)) {
      throw new RangeError('ModeLocalMatchSessionV2 localParticipantId不在participant集合。');
    }
    let runtime: RuntimePort | null = null;
    const controllers: ControllerPort[] = [];
    try {
      runtime = runtimePort(dataField(source, 'runtime', 'ModeLocalMatchSessionV2 options'));
      const rawControllers = dataField(source, 'controllers', 'ModeLocalMatchSessionV2 options');
      if (!Array.isArray(rawControllers)) {
        throw new TypeError('ModeLocalMatchSessionV2 controllers必须是数组。');
      }
      for (let index = 0; index < rawControllers.length; index += 1) {
        const name = `ModeLocalMatchSessionV2 controllers[${index}]`;
        const binding = assertPlainRecord(rawControllers[index], name);
        assertKnownKeys(binding, CONTROLLER_KEYS, name);
        for (const key of CONTROLLER_KEYS) dataField(binding, key, name);
        const participantId = assertNonEmptyString(
          dataField(binding, 'participantId', name),
          `${name}.participantId`,
        );
        const controller = dataField(binding, 'controller', name);
        const destroy = dataMethod(controller, 'destroy', `${name}.controller`);
        try {
          controllers.push(Object.freeze({
            participantId,
            createInput: dataMethod(controller, 'createInput', `${name}.controller`),
            destroy,
          }));
        } catch (error) {
          const original = safelyWrapThrownError(error, `${name}.controller端口捕获失败。`);
          const cleanupErrors: Error[] = [];
          try {
            assertSynchronous(destroy(), `${name}.controller构造期destroy`);
          } catch (cleanupError) {
            cleanupErrors.push(safelyWrapThrownError(
              cleanupError,
              `${name}.controller构造期清理失败。`,
            ));
          }
          throw combineCleanupFailure(
            original,
            cleanupErrors,
            `${name}.controller端口捕获失败且清理不完整。`,
          );
        }
      }
      const expectedControllerIds = participantIds.filter((id) => id !== localParticipantId);
      const controllerIds = controllers.map(({ participantId }) => participantId);
      if (
        controllerIds.length !== expectedControllerIds.length
        || controllerIds.some((id, index) => id !== expectedControllerIds[index])
      ) {
        throw new RangeError('ModeLocalMatchSessionV2 controllers必须覆盖全部非local participant并稳定升序。');
      }
    } catch (error) {
      const original = safelyWrapThrownError(error, 'ModeLocalMatchSessionV2构造失败。');
      throw combineCleanupFailure(
        original,
        destroyPorts(runtime, controllers).errors,
        'ModeLocalMatchSessionV2构造失败且清理不完整。',
      );
    }
    this.#modeDefinitionId = modeDefinitionId;
    this.#participantIds = participantIds;
    this.#localParticipantId = localParticipantId;
    this.#runtime = runtime;
    this.#controllers = Object.freeze(controllers);
  }

  get state(): ModeLocalMatchSessionV2State {
    this.#assertNoOperation('state-read');
    return this.#state;
  }

  get readFrame(): DeepReadonly<MatchReadFrameV3> | null {
    this.#assertNoOperation('read-frame-read');
    return this.#readFrame;
  }

  #rejectReentry(operation: ModeLocalMatchSessionV2Operation): never {
    this.#reentrySequence += 1;
    const error = new Error(
      `ModeLocalMatchSessionV2操作${this.#operation ?? 'unknown'}期间拒绝${operation}重入。`,
    );
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertNoOperation(operation: ModeLocalMatchSessionV2Operation): void {
    if (this.#operation !== null) this.#rejectReentry(operation);
  }

  #beginOperation(
    operation: ModeLocalMatchSessionV2Operation,
    allowed: readonly ModeLocalMatchSessionV2State[] | null,
  ): void {
    this.#assertNoOperation(operation);
    if (allowed !== null && !allowed.includes(this.#state)) {
      throw new Error(`ModeLocalMatchSessionV2状态${this.#state}不接受当前操作。`);
    }
    this.#operation = operation;
    this.#reentryError = null;
  }

  #runOperation<T>(
    operation: ModeLocalMatchSessionV2Operation,
    allowed: readonly ModeLocalMatchSessionV2State[] | null,
    action: () => T,
  ): T {
    this.#beginOperation(operation, allowed);
    const sequence = this.#reentrySequence;
    let failed = false;
    let failureValue: unknown = null;
    let result!: T;
    try {
      result = action();
    } catch (error) {
      failed = true;
      failureValue = error;
    } finally {
      this.#operation = null;
    }
    const reentryError = this.#reentrySequence === sequence
      ? null
      : this.#reentryError
        ?? new Error(`ModeLocalMatchSessionV2 ${operation}发生被吞掉的重入。`);
    this.#reentryError = null;
    if (reentryError !== null) {
      const failure = failed && failureValue !== reentryError
        ? new AggregateError(
          [failureValue, reentryError],
          `ModeLocalMatchSessionV2 ${operation}失败且同步重入。`,
        )
        : reentryError;
      // Normal action failures enter #fail while their operation is still
      // owned. Reinstall that ownership for a swallowed reentry detected at
      // the outer boundary so cleanup can call its snapshotted ports exactly
      // once instead of retaining every owner as "operation missing".
      this.#operation = operation;
      try {
        return this.#fail(failure);
      } finally {
        this.#operation = null;
      }
    }
    if (failed) throw failureValue;
    return result;
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

  #destroyOwnedPorts(): Readonly<{
    errors: readonly Error[];
    runtime: RuntimePort | null;
    controllers: readonly ControllerPort[];
  }> {
    const errors: Error[] = [];
    const retainedControllers: ControllerPort[] = [];
    for (let index = this.#controllers.length - 1; index >= 0; index -= 1) {
      const controller = this.#controllers[index]!;
      try {
        this.#callChecked(
          controller.destroy,
          [],
          `ModeLocalMatchSessionV2 controller ${controller.participantId} destroy`,
        );
      } catch (error) {
        errors.push(safelyWrapThrownError(error, 'ModeLocalMatchSessionV2 controller清理失败。'));
        retainedControllers.push(controller);
      }
      if (this.#reentryError !== null) {
        for (let retainedIndex = index - 1; retainedIndex >= 0; retainedIndex -= 1) {
          retainedControllers.push(this.#controllers[retainedIndex]!);
        }
        return Object.freeze({
          errors: Object.freeze(errors),
          runtime: this.#runtime,
          controllers: Object.freeze(retainedControllers.reverse()),
        });
      }
    }
    let retainedRuntime: RuntimePort | null = null;
    if (this.#runtime !== null) {
      try {
        this.#callChecked(
          this.#runtime.destroy,
          [],
          'ModeLocalMatchSessionV2 runtime destroy',
        );
      } catch (error) {
        errors.push(safelyWrapThrownError(error, 'ModeLocalMatchSessionV2 runtime清理失败。'));
        retainedRuntime = this.#runtime;
      }
    }
    return Object.freeze({
      errors: Object.freeze(errors),
      runtime: retainedRuntime,
      controllers: Object.freeze(retainedControllers.reverse()),
    });
  }

  #fail(error: unknown): never {
    this.#state = MODE_LOCAL_MATCH_SESSION_V2_STATE.FAILED;
    const original = safelyWrapThrownError(error, 'ModeLocalMatchSessionV2运行失败。');
    const cleanup = this.#reentryError === null
      ? this.#destroyOwnedPorts()
      : Object.freeze({
        errors: Object.freeze([this.#reentryError]),
        runtime: this.#runtime,
        controllers: this.#controllers,
      });
    this.#runtime = cleanup.runtime;
    this.#controllers = cleanup.controllers;
    this.#readFrame = null;
    this.#lastEventSequence = -1;
    throw combineCleanupFailure(
      original,
      cleanup.errors,
      'ModeLocalMatchSessionV2运行失败且清理不完整。',
    );
  }

  start(): ModeLocalMatchSessionV2StartOutcome {
    return this.#runOperation('start', [MODE_LOCAL_MATCH_SESSION_V2_STATE.CREATED], () => {
      try {
        const runtime = this.#runtime;
        if (runtime === null) throw new Error('ModeLocalMatchSessionV2 runtime不可用。');
        const outcome = normalizeFrameOutcome(
          this.#callChecked(runtime.start, [], 'ModeLocalMatchSessionV2 runtime start'),
          START_KEYS,
          START_REQUIRED_KEYS,
          'ModeLocalMatchSessionV2 start result',
          this.#modeDefinitionId,
          this.#participantIds,
          this.#localParticipantId,
          this.#lastEventSequence,
        );
        if (outcome.readFrame.worldSnapshot.result !== null) {
          throw new RangeError('ModeLocalMatchSessionV2不能以已结束frame启动。');
        }
        this.#assertCurrentOperationCommit('ModeLocalMatchSessionV2 start publication');
        this.#readFrame = outcome.readFrame;
        this.#state = MODE_LOCAL_MATCH_SESSION_V2_STATE.RUNNING;
        return Object.freeze({ readFrame: outcome.readFrame });
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  step(localInput: unknown): ModeLocalMatchSessionV2StepOutcome {
    return this.#runOperation('step', [MODE_LOCAL_MATCH_SESSION_V2_STATE.RUNNING], () => {
      const currentFrame = this.#readFrame;
      if (currentFrame === null) {
        return this.#fail(new Error('ModeLocalMatchSessionV2尚无readFrame。'));
      }
      const tick = currentFrame.worldSnapshot.tick;
      // A caller-controlled local frame is recoverable: reject it before a
      // controller or authority port is invoked, preserving this session for
      // the exact retry at the current tick.
      const normalizedLocal = normalizeInputFrame(localInput, {
        expectedTick: tick,
        participantIds: [this.#localParticipantId],
      });
      try {
        const candidateInputs: ArenaInputFrame[] = [normalizedLocal];
        for (const controller of this.#controllers) {
          const candidate = this.#callChecked(
            controller.createInput,
            [currentFrame.worldSnapshot],
            `ModeLocalMatchSessionV2 controller ${controller.participantId} createInput`,
          );
          candidateInputs.push(candidate === null || candidate === undefined
            ? createNeutralInputFrame(tick, controller.participantId)
            : normalizeInputFrame(candidate, {
                expectedTick: tick,
                participantIds: [controller.participantId],
              }));
        }
        const inputs = normalizeInputFrames(candidateInputs, {
          tick,
          participantIds: this.#participantIds,
        });
        const runtime = this.#runtime;
        if (runtime === null) throw new Error('ModeLocalMatchSessionV2 runtime不可用。');
        const outcome = normalizeFrameOutcome(
          this.#callChecked(runtime.step, [inputs], 'ModeLocalMatchSessionV2 runtime step'),
          STEP_KEYS,
          STEP_REQUIRED_KEYS,
          'ModeLocalMatchSessionV2 step result',
          this.#modeDefinitionId,
          this.#participantIds,
          this.#localParticipantId,
          this.#lastEventSequence,
        );
        if (outcome.readFrame.worldSnapshot.tick !== tick + 1) {
          throw new RangeError('ModeLocalMatchSessionV2 runtime每次step必须推进精确1 tick。');
        }
        this.#assertCurrentOperationCommit('ModeLocalMatchSessionV2 step publication');
        this.#readFrame = outcome.readFrame;
        this.#lastEventSequence = outcome.lastEventSequence;
        const result = outcome.readFrame.worldSnapshot.result;
        if (result !== null) this.#state = MODE_LOCAL_MATCH_SESSION_V2_STATE.ENDED;
        return Object.freeze({
          events: outcome.events,
          readFrame: outcome.readFrame,
          inputs,
          result,
        });
      } catch (error) {
        return this.#fail(error);
      }
    });
  }

  pause(): void {
    this.#runOperation('pause', [MODE_LOCAL_MATCH_SESSION_V2_STATE.RUNNING], () => {
      try {
        const runtime = this.#runtime;
        if (runtime === null) throw new Error('ModeLocalMatchSessionV2 runtime不可用。');
        this.#callChecked(runtime.pause, [], 'ModeLocalMatchSessionV2 runtime pause');
        this.#state = MODE_LOCAL_MATCH_SESSION_V2_STATE.PAUSED;
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  resume(): void {
    this.#runOperation('resume', [MODE_LOCAL_MATCH_SESSION_V2_STATE.PAUSED], () => {
      try {
        const runtime = this.#runtime;
        if (runtime === null) throw new Error('ModeLocalMatchSessionV2 runtime不可用。');
        this.#callChecked(runtime.resume, [], 'ModeLocalMatchSessionV2 runtime resume');
        this.#state = MODE_LOCAL_MATCH_SESSION_V2_STATE.RUNNING;
      } catch (error) {
        this.#fail(error);
      }
    });
  }

  destroy(): void {
    this.#runOperation('destroy', null, () => {
      if (this.#state === MODE_LOCAL_MATCH_SESSION_V2_STATE.DESTROYED) return;
      const cleanup = this.#destroyOwnedPorts();
      this.#runtime = cleanup.runtime;
      this.#controllers = cleanup.controllers;
      this.#readFrame = null;
      this.#lastEventSequence = -1;
      if (cleanup.errors.length > 0 || this.#reentryError !== null) {
        this.#state = MODE_LOCAL_MATCH_SESSION_V2_STATE.FAILED;
        throw combineCleanupFailure(
          new Error('ModeLocalMatchSessionV2 destroy失败。'),
          this.#reentryError !== null
            ? [...cleanup.errors, this.#reentryError]
            : cleanup.errors,
          'ModeLocalMatchSessionV2 destroy清理不完整。',
        );
      }
      this.#state = MODE_LOCAL_MATCH_SESSION_V2_STATE.DESTROYED;
    });
  }
}

export const MODE_LOCAL_MATCH_SESSION_V2_OPERATION_POLICY = Object.freeze({
  operationGuardPrecedesStateAndInputValidation: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  runtimeAndControllerCallbacksCheckedBeforeFramePublication: true as const,
  publicStateAndReadFrameRejectOperationIntermediateState: true as const,
  cleanupReentryRetainsCurrentAndLaterSessionOwners: true as const,
  terminalFramePublicationWaitsForRuntimeCallbackClosure: true as const,
  validationStatus: 'not-run' as const,
});
